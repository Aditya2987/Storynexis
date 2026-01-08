from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
from typing import Optional, List
from contextlib import asynccontextmanager
import os

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

@app.post("/generate", response_model=List[GeneratedOption])
async def generate_continuation(request: GenerateRequest):
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        print(f"\n🎬 Generating {request.count} continuation(s) with {request.tone} tone, {request.length} length")
        
        # Adjust max_length based on length parameter (optimized for speed)
        length_map = {
            "Short": 70,      # Reduced from 80 for 15% speed boost
            "Medium": 120,    # Reduced from 150 for 20% speed boost
            "Long": 180       # Reduced from 250 for 28% speed boost
        }
        max_new_tokens = length_map.get(request.length, 120)
        
        # Adjust temperature based on tone (lowered for faster, more focused generation)
        tone_temp_map = {
            "Dark": 0.65,
            "Emotional": 0.75,
            "Humorous": 0.8,
            "Inspirational": 0.7,
            "Mysterious": 0.75,
            "Adaptive": 0.7
        }
        temperature = tone_temp_map.get(request.tone, 0.7)
        
        results = []
        
        for i in range(request.count):
            print(f"  Generating option {i+1}/{request.count}...")
            
            # Create instruction for the model using Qwen's chat format
            tone_instruction = f"Write in a {request.tone.lower()} tone."
            length_instruction = f"Keep it concise and focused."
            
            system_message = f"You are a creative fiction writer. {tone_instruction} {length_instruction} Continue the story naturally and engagingly. Write only the continuation, nothing else."
            
            # Format using Qwen chat template
            messages = [
                {"role": "system", "content": system_message},
                {"role": "user", "content": f"Continue this story:\n\n{request.prompt}"}
            ]
            
            # Apply chat template
            text = tokenizer.apply_chat_template(
                messages,
                tokenize=False,
                add_generation_prompt=True
            )
            
            # Encode the prompt
            inputs = tokenizer(text, return_tensors="pt").to(device)
            
            # Generate text with optimized parameters
            with torch.no_grad():
                outputs = model.generate(
                    **inputs,
                    max_new_tokens=max_new_tokens,
                    temperature=temperature,
                    top_p=0.85,          # Reduced from 0.9 for faster sampling
                    top_k=40,            # Reduced from 50 for faster sampling
                    do_sample=True,
                    num_return_sequences=1,
                    pad_token_id=tokenizer.pad_token_id,
                    eos_token_id=tokenizer.eos_token_id,
                    repetition_penalty=1.1  # Reduced from 1.15 for faster generation
                )
            
            # Decode only the generated part
            generated_ids = outputs[0][inputs.input_ids.shape[1]:]
            continuation = tokenizer.decode(generated_ids, skip_special_tokens=True).strip()
            
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
