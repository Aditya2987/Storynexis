# Streaming Text Generation Endpoint

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
    """
    Generate text and yield chunks in real-time via Server-Sent Events
    """
    try:
        # Prepare the full prompt
        full_prompt = f"{prompt}\n\n[Continue the story in a {tone} tone]"
        
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
        
        # Send completion event with final cleaned text
        yield f"data: {json.dumps({'type': 'done', 'fullText': cleaned_text})}\n\n"
        
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
        print(f"  Max tokens: {request.max_length}")
        
        # Get model and tokenizer from app state
        model = app.state.model
        tokenizer = app.state.tokenizer
        
        return StreamingResponse(
            generate_text_stream(
                prompt=request.prompt,
                tone=request.tone,
                length=request.length,
                max_length=request.max_length,
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
