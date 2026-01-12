from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
from typing import Optional, List
from contextlib import asynccontextmanager
import os
from firebase_auth import initialize_firebase, get_current_user
import re

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
        
    except Exception as e:
        print(f"Error loading model: {e}")
        import traceback
        traceback.print_exc()
        raise
    
    yield
    
    # Shutdown
    print("Shutting down...")

app = FastAPI(title="Fiction Story Generator API", lifespan=lifespan)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Vite default port
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
    request: GenerateRequest,
    current_user: dict = Depends(get_current_user)  # Require authentication
):
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        print(f"\n🎬 User {current_user['email']} generating {request.count} continuation(s) with {request.tone} tone, {request.length} length")
        
        # Adjust max_length based on length parameter (optimized for speed)
        length_map = {
            "Short": 100,     # Fast, punchy continuations
            "Medium": 200,    # Balanced speed and content
            "Long": 800       # Fuller stories for initial generation
        }
        # Use request.max_length if provided and greater than default, otherwise use length_map
        default_tokens = length_map.get(request.length, 200)
        max_new_tokens = max(default_tokens, request.max_length) if request.max_length > 0 else default_tokens
        
        # Cap at 2000 tokens to avoid memory issues
        max_new_tokens = min(max_new_tokens, 2000)
        
        print(f"  Using max_new_tokens: {max_new_tokens}")
        
        # Adjust temperature based on tone (lower = faster, more focused)
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
        temperature = tone_temp_map.get(request.tone, 0.68)
        
        results = []
        
        for i in range(request.count):
            print(f"  Generating option {i+1}/{request.count}...")
            
            # Compact but effective system prompt for speed
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
            tone_desc = tone_keywords.get(request.tone, "engaging")
            
            system_message = f"""You are a creative fiction writer. Write {tone_desc} prose that is coherent and complete.

Rules:
- Continue the story naturally with vivid descriptions
- Always end with a complete sentence (ending in . ! or ?)
- Create meaningful story progression
- Write only the story continuation, no commentary"""
            
            # Format using Qwen chat template
            messages = [
                {"role": "system", "content": system_message},
                {"role": "user", "content": f"Continue this story with a complete, coherent passage:\n\n{request.prompt[-2000:]}"}  # Limit context for speed
            ]
            
            # Apply chat template
            text = tokenizer.apply_chat_template(
                messages,
                tokenize=False,
                add_generation_prompt=True
            )
            
            # Encode the prompt
            inputs = tokenizer(text, return_tensors="pt").to(device)
            
            # Generate text with speed-optimized parameters
            with torch.no_grad():
                outputs = model.generate(
                    **inputs,
                    max_new_tokens=max_new_tokens,
                    temperature=temperature,
                    top_p=0.85,          # Focused sampling for speed
                    top_k=30,            # Reduced for faster token selection
                    do_sample=True,
                    num_return_sequences=1,
                    pad_token_id=tokenizer.pad_token_id,
                    eos_token_id=tokenizer.eos_token_id,
                    repetition_penalty=1.12,
                    use_cache=True,      # Enable KV cache for speed
                )
            
            # Decode only the generated part
            generated_ids = outputs[0][inputs.input_ids.shape[1]:]
            continuation = tokenizer.decode(generated_ids, skip_special_tokens=True).strip()
            
            # Clean up and ensure complete sentences
            continuation = clean_and_complete_text(continuation)
            
            print(f"  ✓ Generated {len(continuation)} characters")
            
            results.append({
                "id": f"gen-{i}-{hash(continuation) % 10000}",
                "text": continuation,
                "tone": request.tone,
                "length": request.length
            })
        
        print(f"✅ Successfully generated {len(results)} continuation(s)\n")
        return results
    
    except Exception as e:
        print(f"❌ Generation error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
