from fastapi import FastAPI, HTTPException, Depends, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from transformers import AutoModelForCausalLM, AutoTokenizer, TextIteratorStreamer
import torch
from typing import Optional, List, Dict, Any, AsyncGenerator
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv
from firebase_auth import initialize_firebase, get_current_user
import re
import json
import asyncio
from threading import Thread
from firestore_service import (
    create_story,
    update_story,
    get_story,
    list_user_stories,
    delete_story,
    add_bible_item,
    get_bible_items,
    update_bible_item,
    delete_bible_item
)

# Load environment variables from .env file
load_dotenv()

def clean_and_complete_text(text):
    """Clean generated text and ensure it ends with complete sentences."""
    if not text:
        return text
    
    # Remove any meta-commentary or instructions that leaked through
    unwanted_patterns = [
        r'^(Here\'s|Here is|I\'ll|Let me|Continuing|The story continues).*?:\s*',
        r'\n\s*\[.*?\]\s*$',
        r'\n\s*\(.*?\)\s*$',
        r'---+.*$',
    ]
    for pattern in unwanted_patterns:
        text = re.sub(pattern, '', text, flags=re.IGNORECASE | re.DOTALL)
    
    text = text.strip()
    
    # Check if text ends with proper punctuation
    if text and text[-1] in '.!?"\'':
        return text
    
    # Find the last complete sentence
    # Look for sentence endings: . ! ? followed by space or end, or closing quote
    sentence_endings = []
    for match in re.finditer(r'[.!?]["\']?\s', text):
        sentence_endings.append(match.end() - 1)
    
    # Also check for endings at the very end
    for match in re.finditer(r'[.!?]["\']?$', text):
        sentence_endings.append(match.end())
    
    if sentence_endings:
        # Get the last complete sentence ending
        last_end = max(sentence_endings)
        text = text[:last_end].strip()
    else:
        # No sentence ending found - add a period if it looks like a sentence
        if len(text) > 20 and text[-1] not in '.!?,"\'':
            # Try to find a natural break point
            last_comma = text.rfind(',')
            last_and = text.rfind(' and ')
            last_but = text.rfind(' but ')
            
            break_point = max(last_comma, last_and, last_but)
            if break_point > len(text) * 0.5:  # Only use if in latter half
                text = text[:break_point].rstrip(',').strip() + '.'
            else:
                text = text + '.'
    
    return text


def build_qwen_prompt(content: str, tone: str, genre: str = None) -> str:
    """
    Build optimized prompt for Qwen 2.5 model
    Uses Qwen's chat template format for best results
    """
    # System message
    system_msg = "You are a creative story writer. Write engaging, coherent narratives that maintain consistency with the existing story. Focus on vivid descriptions, compelling dialogue, and natural story progression."
    
    # Tone-specific instructions
    tone_instructions = {
        "Dark": "Use atmospheric descriptions, building tension and foreboding. Include shadows, mysteries, and ominous elements.",
        "Humorous": "Include wit, wordplay, and comedic situations. Use lighthearted tone and amusing character interactions.",
        "Romantic": "Focus on emotions, relationships, and intimate moments. Emphasize feelings and connections between characters.",
        "Mysterious": "Build suspense, include subtle clues, and maintain intrigue. Keep readers guessing.",
        "Action": "Write dynamic scenes with movement, excitement, and fast pacing. Include vivid action sequences.",
        "Dramatic": "Emphasize conflict, deep emotions, and character development. Explore internal struggles.",
        "Any Genre": "Write naturally and engagingly, following the established tone and style of the story."
    }
    
    tone_guide = tone_instructions.get(tone, tone_instructions["Any Genre"])
    
    # Truncate context if too long (keep last 1000 tokens)
    truncated_content = truncate_context(content, max_tokens=1000)
    
    # Build structured prompt using Qwen format
    prompt = f"""<|im_start|>system
{system_msg}<|im_end|>
<|im_start|>user
Continue this story. {tone_guide}

Story so far:
{truncated_content}

Continue the story naturally from where it left off. Write in the same style and maintain character consistency.<|im_end|>
<|im_start|>assistant
"""
    
    return prompt


def truncate_context(content: str, max_tokens: int = 1000) -> str:
    """
    Truncate content to fit context window while preserving story coherence
    Keeps the most recent context
    """
    # Simple word-based truncation (approximate)
    # Qwen tokenizer roughly: 1 token ≈ 0.75 words
    max_words = int(max_tokens * 0.75)
    
    words = content.split()
    if len(words) <= max_words:
        return content
    
    # Keep last N words (most recent context)
    truncated_words = words[-max_words:]
    truncated_text = ' '.join(truncated_words)
    
    # Try to start at a sentence boundary for better coherence
    sentences = truncated_text.split('. ')
    if len(sentences) > 1:
        # Skip first partial sentence
        return '. '.join(sentences[1:])
    
    return truncated_text

# Model configuration
MODEL_PATH = r"D:\Story\Model\Qwen2.5-1.5B-Instruct"
MODEL_NAME = "Qwen/Qwen2.5-1.5B-Instruct"
model = None
tokenizer = None
device = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global model, tokenizer, device
    
    # Initialize Firebase
    initialize_firebase()
    
    try:
        print(f"Loading model from {MODEL_PATH}...")
        
        # Check for GPU
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"Using device: {device}")
        
        if torch.cuda.is_available():
            print(f"GPU: {torch.cuda.get_device_name(0)}")
            print(f"GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.2f} GB")
        
        tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH, trust_remote_code=True)
        
        # Load model with GPU optimization
        if torch.cuda.is_available():
            model = AutoModelForCausalLM.from_pretrained(
                MODEL_PATH,
                torch_dtype=torch.float16,  # Use half precision for GPU
                device_map="auto",  # Automatically distribute across GPUs
                trust_remote_code=True
            )
        else:
            model = AutoModelForCausalLM.from_pretrained(
                MODEL_PATH,
                trust_remote_code=True
            )
            model.to(device)
        
        # Set pad token if not set
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token
        
        model.eval()
        print(f"Model loaded successfully on {device}")
        
        # Attach to app state
        app.state.model = model
        app.state.tokenizer = tokenizer
        
    except Exception as e:
        print(f"Error loading model: {e}")
        import traceback
        traceback.print_exc()
        raise
    
    yield
    
    # Shutdown
    print("Shutting down...")

app = FastAPI(title="Fiction Story Generator API", lifespan=lifespan)

# Configure CORS - Get allowed origins from environment variable
allowed_origins_str = os.getenv(
    'ALLOWED_ORIGINS',
    'http://localhost:5173,http://localhost:3000,https://storynexis.web.app,https://storynexis.firebaseapp.com'
)
allowed_origins = [origin.strip() for origin in allowed_origins_str.split(',')]

print(f"🌐 CORS enabled for origins: {allowed_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GenerateRequest(BaseModel):
    prompt: str
    tone: str
    length: str
    count: int = 1
    max_length: int = 150
    temperature: float = 0.8
    top_p: float = 0.9

class GeneratedOption(BaseModel):
    id: str
    text: str
    tone: str
    length: str

# Story management models

class ChapterMetadata(BaseModel):
    wordCount: int = 0
    characterCount: int = 0
    createdAt: str
    updatedAt: str

class Chapter(BaseModel):
    id: str
    title: str
    content: str
    order: int
    status: str = "draft"  # draft, complete
    metadata: ChapterMetadata

class StoryCreate(BaseModel):
    title: str
    genre: str
    content: Optional[str] = ""  # Legacy field for backward compatibility
    chapters: Optional[List[Chapter]] = []
    settings: Optional[Dict[str, Any]] = None
    status: str = "draft"

class StoryUpdate(BaseModel):
    title: Optional[str] = None
    genre: Optional[str] = None
    content: Optional[str] = None  # Legacy field
    chapters: Optional[List[Chapter]] = None
    settings: Optional[Dict[str, Any]] = None
    status: Optional[str] = None

class StoryResponse(BaseModel):
    id: str
    userId: str
    title: str
    genre: str
    content: Optional[str] = ""  # Legacy field for backward compatibility
    chapters: Optional[List[Dict[str, Any]]] = []
    metadata: Dict[str, Any]
    settings: Dict[str, Any]
    status: str

class StoryListResponse(BaseModel):
    id: str
    userId: str
    title: str
    genre: str
    metadata: Dict[str, Any]
    settings: Dict[str, Any]
    status: str

# Bible Item Models
class BibleItemCreate(BaseModel):
    name: str
    category: str
    description: str
    attributes: Optional[Dict[str, Any]] = None
    imageUrl: Optional[str] = None

class BibleItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    attributes: Optional[Dict[str, Any]] = None
    imageUrl: Optional[str] = None

class BibleItemResponse(BaseModel):
    id: str
    name: str
    category: str
    description: str
    attributes: Optional[Dict[str, Any]] = None
    imageUrl: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

@app.get("/")
async def root():
    return {
        "status": "Fiction Story Generator API is running",
        "model": "Qwen/Qwen2.5-1.5B-Instruct",
        "model_loaded": model is not None
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "model": "Qwen/Qwen2.5-1.5B-Instruct",
        "model_loaded": model is not None,
        "device": "cuda" if torch.cuda.is_available() else "cpu"
    }

@app.get("/user/me")
async def get_user_info(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user information"""
    return current_user

@app.post("/generate", response_model=List[GeneratedOption])
async def generate_continuation(
    request: Request,
    request_body: GenerateRequest,  # Renamed to avoid collision with request
    current_user: dict = Depends(get_current_user)  # Require authentication
):
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        print(f"\n🎬 User {current_user['email']} generating {request_body.count} continuation(s) with {request_body.tone} tone, {request_body.length} length")
        
        # Adjust max_length based on length parameter (optimized for speed)
        length_map = {
            "Short": 100,     # Fast, punchy continuations
            "Medium": 200,    # Balanced speed and content
            "Long": 800       # Fuller stories for initial generation
        }
        # Use request.max_length if provided and greater than default, otherwise use length_map
        default_tokens = length_map.get(request_body.length, 200)
        max_new_tokens = max(default_tokens, request_body.max_length) if request_body.max_length > 0 else default_tokens
        
        # Cap at 2000 tokens to avoid memory issues
        max_new_tokens = min(max_new_tokens, 2000)
        
        print(f"  Using max_new_tokens: {max_new_tokens}")
        
        # Adjust temperature based on tone
        tone_temp_map = {
            "Dark": 0.65,
            "Emotional": 0.70,
            "Humorous": 0.75,
            "Inspirational": 0.65,
            "Mysterious": 0.70,
            "Romantic": 0.70,
            "Suspenseful": 0.65,
            "Adaptive": 0.68
        }
        temperature = tone_temp_map.get(request_body.tone, 0.68)
        
        results = []
        
        for i in range(request_body.count):
            # Check for client disconnect before starting next generation
            if await request.is_disconnected():
                print("⚠️ Client disconnected between generations. Stopping.")
                break

            print(f"  Generating option {i+1}/{request_body.count}...")
            
            tone_keywords = {
                "Dark": "dark and atmospheric",
                "Emotional": "emotionally resonant",
                "Humorous": "witty and entertaining",
                "Inspirational": "uplifting and hopeful",
                "Mysterious": "intriguing and suspenseful",
                "Romantic": "tender and passionate",
                "Suspenseful": "tense and gripping",
                "Adaptive": "naturally flowing"
            }
            tone_desc = tone_keywords.get(request_body.tone, "engaging")
            
            system_message = f"""You are a creative fiction writer. Write {tone_desc} prose that is coherent and complete.

Rules:
- Continue the story naturally with vivid descriptions
- Always end with a complete sentence (ending in . ! or ?)
- Create meaningful story progression
- Write only the story continuation, no commentary"""
            
            messages = [
                {"role": "system", "content": system_message},
                {"role": "user", "content": f"Continue this story with a complete, coherent passage:\n\n{request_body.prompt[-2000:]}"}
            ]
            
            text = tokenizer.apply_chat_template(
                messages,
                tokenize=False,
                add_generation_prompt=True
            )
            
            inputs = tokenizer(text, return_tensors="pt").to(device)
            
            # Use Streamer to allow for cancellation
            streamer = TextIteratorStreamer(
                tokenizer, 
                skip_prompt=True, 
                skip_special_tokens=True
            )
            
            generation_kwargs = dict(
                **inputs,
                max_new_tokens=max_new_tokens,
                temperature=temperature,
                top_p=0.85,
                top_k=30,
                do_sample=True,
                num_return_sequences=1,
                pad_token_id=tokenizer.pad_token_id,
                eos_token_id=tokenizer.eos_token_id,
                repetition_penalty=1.12,
                use_cache=True,
                streamer=streamer  # Add streamer
            )

            # Run generation in a separate thread
            thread = Thread(target=model.generate, kwargs=generation_kwargs)
            thread.start()
            
            generated_text = ""
            is_aborted = False

            # Consume the stream
            for new_text in streamer:
                # Check for disconnection
                if await request.is_disconnected():
                    print(f"🛑 Client disconnected during generation of option {i+1}. Aborting...")
                    is_aborted = True
                    break 
                
                generated_text += new_text
                await asyncio.sleep(0.01) # Yield control to event loop to allow disconnect check
            
            if is_aborted:
                # Break out of the outer loop too
                break

            # Process the result
            continuation = generated_text.strip()
            continuation = clean_and_complete_text(continuation)
            
            print(f"  ✓ Generated {len(continuation)} characters")
            
            results.append({
                "id": f"gen-{i}-{hash(continuation) % 10000}",
                "text": continuation,
                "tone": request_body.tone,
                "length": request_body.length
            })
        
        if not results and await request.is_disconnected():
             print("❌ Request completely aborted.")
             # Raise exception or just return empty list? 
             # FastAPI might have already noticed the disconnect and won't send response.
             return []

        print(f"✅ Successfully generated {len(results)} continuation(s)\n")
        return results
    
    except Exception as e:
        print(f"❌ Generation error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")


# Streaming Text Generation
async def generate_text_stream(
    prompt: str,
    tone: str,
    length: str,
    max_length: int,
    temperature: float,
    top_p: float,
    model,
    tokenizer
) -> AsyncGenerator[str, None]:
    """Generate text and yield chunks in real-time via Server-Sent Events"""
    try:
        # Prepare the full prompt using the optimized Qwen template
        full_prompt = build_qwen_prompt(prompt, tone)
        
        # Tokenize input
        inputs = tokenizer(full_prompt, return_tensors="pt").to(model.device)
        
        # Create text streamer
        streamer = TextIteratorStreamer(
            tokenizer,
            skip_prompt=True,
            skip_special_tokens=True
        )
        
        # Prepare generation kwargs
        generation_kwargs = {
            "input_ids": inputs.input_ids,
            "attention_mask": inputs.attention_mask,
            "max_new_tokens": max_length,
            "temperature": temperature,
            "top_p": top_p,
            "do_sample": True,
            "pad_token_id": tokenizer.pad_token_id or tokenizer.eos_token_id,
            "eos_token_id": tokenizer.eos_token_id,
            "repetition_penalty": 1.12,
            "use_cache": True,
            "streamer": streamer
        }
        
        # Start generation in background thread
        thread = Thread(target=model.generate, kwargs=generation_kwargs)
        thread.start()
        
        # Send start event
        yield f"data: {json.dumps({'type': 'start'})}\n\n"
        
        # Yield chunks as they're generated
        full_text = ""
        for text_chunk in streamer:
            full_text += text_chunk
            yield f"data: {json.dumps({'type': 'chunk', 'text': text_chunk})}\n\n"
            await asyncio.sleep(0)  # Allow other tasks to run
        
        # Clean up the generated text
        cleaned_text = clean_and_complete_text(full_text)
        
        # Calculate quality score
        from quality_control import calculate_quality_score
        quality_scores = calculate_quality_score(cleaned_text, prompt)
        
        # Send completion event with final cleaned text and quality metrics
        completion_data = {
            'type': 'done',
            'fullText': cleaned_text,
            'quality': quality_scores
        }
        yield f"data: {json.dumps(completion_data)}\n\n"
        
    except Exception as e:
        print(f"❌ Streaming error: {e}")
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"


@app.post("/generate/stream")
async def generate_stream(request: GenerateRequest):
    """
    Stream generated text in real-time using Server-Sent Events
    
    This endpoint provides a better user experience by showing text as it's generated
    instead of waiting for the entire generation to complete.
    """
    try:
        print(f"\n🌊 Starting streaming generation...")
        print(f"  Prompt length: {len(request.prompt)} chars")
        print(f"  Tone: {request.tone}, Length: {request.length}")
        print(f"  Tone: {request.tone}, Length: {request.length}")
        
        # Adjust max_length based on length parameter
        length_map = {
            "Short": 150,
            "Medium": 300,
            "Long": 600
        }
        # Use request.max_length if provided and valid, otherwise use logic based on length enum
        target_length = request.max_length if request.max_length > 50 else length_map.get(request.length, 300)
        
        print(f"  Target tokens: {target_length}")
        
        # Get model and tokenizer from app state
        model = app.state.model
        tokenizer = app.state.tokenizer
        
        return StreamingResponse(
            generate_text_stream(
                prompt=request.prompt,
                tone=request.tone,
                length=request.length,
                max_length=target_length,
                temperature=request.temperature,
                top_p=request.top_p,
                model=model,
                tokenizer=tokenizer
            ),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",  # Disable nginx buffering
                "Connection": "keep-alive"
            }
        )
    except Exception as e:
        print(f"❌ Stream endpoint error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Streaming failed: {str(e)}")


@app.post("/generate/variations")
async def generate_variations(request: GenerateRequest):
    """
    Generate multiple story variations simultaneously
    Returns 2-3 options ranked by quality for user to choose from
    """
    try:
        variations_count = min(request.count, 3)  # Max 3 variations
        
        print(f"\n🎲 Generating {variations_count} variations...")
        print(f"  Prompt length: {len(request.prompt)} chars")
        print(f"  Tone: {request.tone}, Length: {request.length}")
        
        # Adjust max_length
        length_map = {"Short": 100, "Medium": 200, "Long": 400}
        max_new_tokens = length_map.get(request.length, 200)
        
        # Use optimized prompt
        full_prompt = build_qwen_prompt(request.prompt, request.tone)
        inputs = tokenizer(full_prompt, return_tensors="pt").to(device)
        
        variations = []
        from quality_control import calculate_quality_score
        
        for i in range(variations_count):
            print(f"  Generating variation {i+1}/{variations_count}...")
            
            # Vary temperature for diversity
            temp = request.temperature + (i * 0.15)
            temp = min(temp, 1.0)  # Cap at 1.0
            
            with torch.no_grad():
                outputs = model.generate(
                    inputs.input_ids,
                    attention_mask=inputs.attention_mask,
                    max_new_tokens=max_new_tokens,
                    temperature=temp,
                    top_p=request.top_p,
                    do_sample=True,
                    pad_token_id=tokenizer.pad_token_id or tokenizer.eos_token_id,
                    eos_token_id=tokenizer.eos_token_id,
                    repetition_penalty=1.12,
                    use_cache=True,
                )
            
            generated_ids = outputs[0][inputs.input_ids.shape[1]:]
            text = tokenizer.decode(generated_ids, skip_special_tokens=True).strip()
            cleaned = clean_and_complete_text(text)
            
            # Calculate quality
            quality_scores = calculate_quality_score(cleaned, request.prompt)
            
            variations.append({
                "id": f"var-{i}",
                "text": cleaned,
                "temperature": temp,
                "quality": quality_scores,
                "wordCount": len(cleaned.split())
            })
        
        # Sort by quality (best first)
        variations.sort(key=lambda x: x['quality']['overall'], reverse=True)
        
        print(f"✅ Generated {len(variations)} variations")
        print(f"   Quality scores: {[round(v['quality']['overall'], 2) for v in variations]}")
        
        return {"variations": variations}
        
    except Exception as e:
        print(f"❌ Variation generation error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

class RewriteRequest(BaseModel):
    text: str
    instruction: str
    context: Optional[str] = None
    tone: Optional[str] = None

@app.post("/rewrite")
async def rewrite_text(request: RewriteRequest):
    """
    Rewrite selected text based on specific instructions
    Useful for "Show, don't tell", tone shifts, or expanding descriptions
    """
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
        
    try:
        print(f"\n✍️ Rewriting text...")
        print(f"  Instruction: {request.instruction}")
        print(f"  Text length: {len(request.text)} chars")
        
        # Build prompt for rewriting
        system_msg = "You are an expert editor and creative writer. Rewrite the provided text according to the user's instruction. Maintain the original meaning and context unless asked to change it."
        
        user_content = f"Instruction: {request.instruction}\n\nOriginal Text:\n{request.text}"
        if request.context:
            user_content += f"\n\nContext:\n{request.context}"
            
        messages = [
            {"role": "system", "content": system_msg},
            {"role": "user", "content": user_content}
        ]
        
        text = tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True
        )
        
        inputs = tokenizer(text, return_tensors="pt").to(device)
        
        with torch.no_grad():
            outputs = model.generate(
                inputs.input_ids,
                attention_mask=inputs.attention_mask,
                max_new_tokens=400,  # Enough for a paragraph
                temperature=0.7,
                top_p=0.9,
                do_sample=True,
                pad_token_id=tokenizer.pad_token_id or tokenizer.eos_token_id,
                eos_token_id=tokenizer.eos_token_id,
                repetition_penalty=1.1
            )
            
        generated_ids = outputs[0][inputs.input_ids.shape[1]:]
        rewritten_text = tokenizer.decode(generated_ids, skip_special_tokens=True).strip()
        rewritten_text = clean_and_complete_text(rewritten_text)
        
        print(f"✅ Rewrite complete ({len(rewritten_text)} chars)")
        
        return {"rewritten": rewritten_text}
        
    except Exception as e:
        print(f"❌ Rewrite error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# Story Management Endpoints

@app.post("/stories", response_model=StoryResponse)
async def create_or_update_story(
    story_data: StoryCreate,
    story_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new story or update existing one
    If story_id is provided in query params, updates that story
    Otherwise creates a new story
    """
    try:
        user_id = current_user['uid']
        
        # Convert chapters from Pydantic models to dicts
        chapters_data = None
        if story_data.chapters:
            chapters_data = [ch.dict() if hasattr(ch, 'dict') else ch for ch in story_data.chapters]
        
        if story_id:
            # Update existing story
            print(f"📝 Updating story {story_id} for user {current_user['email']} (UID: {user_id})")
            updated_story = await update_story(
                story_id=story_id,
                user_id=user_id,
                title=story_data.title,
                genre=story_data.genre,
                content=story_data.content,
                chapters=chapters_data,
                settings=story_data.settings,
                status=story_data.status
            )
            return updated_story
        else:
            # Create new story
            print(f"📖 Creating new story for user {current_user['email']} (UID: {user_id})")
            new_story = await create_story(
                user_id=user_id,
                title=story_data.title,
                genre=story_data.genre,
                content=story_data.content,
                chapters=chapters_data,
                settings=story_data.settings,
                status=story_data.status
            )
            print(f"✅ Story created with ID: {new_story['id']}, userId: {new_story['userId']}")
            return new_story
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error creating/updating story: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stories", response_model=List[StoryListResponse])
async def get_user_stories(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    status: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Get all stories for the current user
    Returns list of stories without full content for performance
    """
    try:
        user_id = current_user['uid']
        print(f"📚 Fetching stories for user {current_user['email']} (UID: {user_id})")
        
        stories = await list_user_stories(
            user_id=user_id,
            limit=limit,
            offset=offset,
            status=status
        )
        
        print(f"✅ Found {len(stories)} stories for UID: {user_id}")
        if len(stories) > 0:
            print(f"   First story userId: {stories[0].get('userId', 'MISSING')}")
        return stories
    except Exception as e:
        print(f"❌ Error fetching stories: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stories/{story_id}", response_model=StoryResponse)
async def get_story_by_id(
    story_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a single story by ID with full content
    User must own the story
    """
    try:
        user_id = current_user['uid']
        print(f"📖 Fetching story {story_id} for user {current_user['email']}")
        
        story = await get_story(story_id=story_id, user_id=user_id)
        return story
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching story: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/stories/{story_id}")
async def delete_story_by_id(
    story_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a story by ID
    User must own the story
    """
    try:
        user_id = current_user['uid']
        print(f"🗑️  Deleting story {story_id} for user {current_user['email']}")
        
        result = await delete_story(story_id=story_id, user_id=user_id)
        print(f"✅ Story deleted successfully")
        return result
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error deleting story: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def extract_json_from_text(text: str) -> Optional[Dict]:
    """Extract JSON object from text, handling potential markdown code blocks"""
    try:
        # Try finding JSON within code blocks first
        match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text)
        if match:
            json_str = match.group(1)
        else:
            # Try finding the first { and last }
            start = text.find('{')
            end = text.rfind('}')
            if start != -1 and end != -1:
                json_str = text[start:end+1]
            else:
                return None
        
        return json.loads(json_str)
    except json.JSONDecodeError:
        return None

async def generate_bible_items(story_content: str, existing_items: List[Dict] = []) -> List[Dict]:
    """
    Generate Story Bible items from story content using the model.
    """
    if not story_content:
        return []
        
    print(f"🧠 Analyzing story content ({len(story_content)} chars) for Bible items...")
    
    # Existing items context to avoid duplicates (simplified)
    existing_names = [item.get('name', '').lower() for item in existing_items]
    
    prompt = f"""<|im_start|>system
You are an expert literary analyst and story bible creator. Your task is to extract key entities from a story and structure them into a JSON format.
<|im_end|>
<|im_start|>user
Analyze the following story text and extract key Characters, Locations, Items, and Lore.
Return a valid JSON object with a "items" key containing a list of objects.
Each object must have:
- "name": Name of the entity
- "category": One of "Character", "Location", "Item", "Lore"
- "description": specific details from the text (max 50 words)
- "attributes": Key-value pairs of specific traits (e.g., Age, Role, Color)

Exclude these already existing entities: {", ".join(existing_names[:20])}

Story Text:
{truncate_context(story_content, max_tokens=3000)}

Output ONLY valid JSON.
<|im_end|>
<|im_start|>assistant
```json
"""
    
    try:
        inputs = tokenizer(prompt, return_tensors="pt").to(device)
        
        with torch.no_grad():
            outputs = model.generate(
                inputs.input_ids,
                attention_mask=inputs.attention_mask,
                max_new_tokens=1000,
                temperature=0.3, # Low temp for structured output
                do_sample=True,
                pad_token_id=tokenizer.pad_token_id or tokenizer.eos_token_id,
                eos_token_id=tokenizer.eos_token_id
            )
            
        generated_ids = outputs[0][inputs.input_ids.shape[1]:]
        text = tokenizer.decode(generated_ids, skip_special_tokens=True).strip()
        
        # Parse JSON
        data = extract_json_from_text(text)
        
        if data and 'items' in data and isinstance(data['items'], list):
            valid_items = []
            for item in data['items']:
                # Basic validation
                if all(k in item for k in ('name', 'category', 'description')):
                    # Normalize category
                    cat = item['category'].capitalize()
                    if cat in ['Character', 'Location', 'Item', 'Lore']:
                        item['category'] = cat
                        valid_items.append(item)
            
            print(f"✅ Extracted {len(valid_items)} new Bible items")
            return valid_items
            
        print("⚠️ Failed to parse valid JSON from model output")
        return []
        
    except Exception as e:
        print(f"❌ Error generating bible items: {e}")
        return []


@app.post("/stories/{story_id}/bible/generate", response_model=List[BibleItemResponse])
async def generate_bible_endpoint(
    story_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Automatically generate Bible items from story content
    """
    try:
        user_id = current_user['uid']
        
        # 1. Get Story
        story = await get_story(story_id, user_id)
        
        # Determine content source (legacy 'content' or recent chapters)
        content = story.get('content', '')
        if not content and story.get('chapters'):
            # Concatenate chapter contents
            content = "\n\n".join([ch.get('content', '') for ch in story.get('chapters', [])])
            
        if not content:
             raise HTTPException(status_code=400, detail="Story has no content to analyze")
             
        # 2. Get existing items to avoid duplicates
        existing_items = await get_bible_items(story_id, user_id)
        
        # 3. Generate new items
        new_items_data = await generate_bible_items(content, existing_items)
        
        saved_items = []
        # 4. Save to Firestore
        for item_data in new_items_data:
            # Check for duplicate names (case-insensitive)
            if not any(existing['name'].lower() == item_data['name'].lower() for existing in existing_items):
                 saved = await add_bible_item(story_id, item_data, user_id)
                 saved_items.append(saved)
                 existing_items.append(saved) # Add to local list check
        
        return saved_items
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in generate bible endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Bible Item Endpoints

@app.post("/stories/{story_id}/items", response_model=BibleItemResponse)
async def create_bible_item_endpoint(
    story_id: str,
    item: BibleItemCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new bible item"""
    try:
        user_id = current_user['uid']
        return await add_bible_item(story_id, item.dict(), user_id)
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error creating bible item: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stories/{story_id}/items", response_model=List[BibleItemResponse])
async def list_bible_items_endpoint(
    story_id: str,
    category: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """List bible items for a story"""
    try:
        user_id = current_user['uid']
        return await get_bible_items(story_id, user_id, category)
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error listing bible items: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/stories/{story_id}/items/{item_id}", response_model=BibleItemResponse)
async def update_bible_item_endpoint(
    story_id: str,
    item_id: str,
    item: BibleItemUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a bible item"""
    try:
        user_id = current_user['uid']
        # Filter out None values
        item_data = {k: v for k, v in item.dict().items() if v is not None}
        return await update_bible_item(story_id, item_id, item_data, user_id)
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error updating bible item: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/stories/{story_id}/items/{item_id}")
async def delete_bible_item_endpoint(
    story_id: str,
    item_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a bible item"""
    try:
        user_id = current_user['uid']
        return await delete_bible_item(story_id, item_id, user_id)
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error deleting bible item: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
