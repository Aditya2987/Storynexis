# Storynexis - AI-Powered Interactive Story Generator

An AI-assisted story writing platform where users and AI co-create engaging narratives.

## Quick Start Guide

### 🚀 Running the Application

#### Option 1: Use the Startup Script (Recommended)
```powershell
.\start.ps1
```
This will automatically start both backend and frontend servers.

#### Option 2: Manual Start

**Terminal 1 - Backend (GPU-accelerated):**
```powershell
cd Backend
.\venv_gpu\Scripts\activate
python main.py
```

**Terminal 2 - Frontend:**
```powershell
cd Frontend
npm run dev
```

### 🌐 Access the Application

- **Frontend**: http://localhost:5173 or http://localhost:5174
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 📦 Model Information

- **Model Name**: Qwen2.5-1.5B-Instruct
- **Model Type**: Instruction-tuned Large Language Model (1.5B parameters)
- **Source**: [Hugging Face Hub](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct)
- **Location**: `D:\Story\Model\Qwen2.5-1.5B-Instruct`
- **Size**: ~3.1GB
- **Features**: 
  - Advanced instruction-following
  - Creative writing capabilities
  - Optimized for fast generation (20-30% faster than 3B)
  - GPU-accelerated with CUDA support

## 🎮 How to Use

1. **Start Your Story**
   - Select a genre (Fantasy, Romance, Horror, Science Fiction, Mystery, Adventure)
   - Enter a story title
   - Write an opening line (Optional - AI will generate if left blank)
   - Click "Start Story"

2. **Generate Continuations**
   - Choose a tone (Dark, Emotional, Humorous, Inspirational, Mysterious, Adaptive)
   - Select length (Short, Medium, Long)
   - Choose how many options to generate (1-3)
   - Optionally add your own idea or direction
   - Click "Generate Continuation"

3. **Build Your Story**
   - Review the AI-generated options
   - Select the one that fits your narrative
   - Repeat to continue building your story

4. **Save Your Work**
   - Click "💾 Save Book" to download as .txt file
   - Click "➕ New Book" to start a new story

## 🔧 Technical Details

### Backend API Endpoints

#### `GET /`
Health check endpoint
```json
{
  "status": "Fiction Story Generator API is running",
  "model_loaded": true
}
```

#### `GET /health`
Detailed health status
```json
{
  "status": "healthy",
  "model_loaded": true,
  "device": "cpu"
}
```

#### `POST /generate`
Generate story continuations

**Request Body:**
```json
{
  "prompt": "Your story context...",
  "tone": "Dark",
  "length": "Medium",
  "count": 3,
  "max_length": 150,
  "temperature": 0.8,
  "top_p": 0.9
}
```

**Response:**
```json
[
  {
    "id": "gen-0-1234",
    "text": "Generated continuation text...",
    "tone": "Dark",
    "length": "Medium"
  }
]
```

### Generation Parameters (Optimized for Speed)

**Tone Temperature Settings:**
- Dark: 0.65
- Emotional: 0.75
- Humorous: 0.8
- Inspirational: 0.7
- Mysterious: 0.75
- Adaptive: 0.7

**Length Token Limits:**
- Short: 70 tokens (~2-3 seconds)
- Medium: 120 tokens (~3-4 seconds)
- Long: 180 tokens (~5-7 seconds)

**Quality Settings**:
- `top_p`: 0.85 (nucleus sampling)
- `top_k`: 40 (top-k sampling)
- `repetition_penalty`: 1.1 (reduces repetition)
- GPU acceleration with float16 precision

## 🐛 Troubleshooting

### Backend Issues

**Problem**: Model fails to load
- **Solution**: Verify the model path in `Backend/main.py` matches your model location
- Check: `D:\Story\Model\Qwen2.5-1.5B-Instruct`

**Problem**: "Module not found" errors
- **Solution**: Ensure you're running Python from the GPU virtual environment:
  ```powershell
  .\Backend\venv_gpu\Scripts\activate
  python Backend\main.py
  ```

**Problem**: GPU not detected
- **Solution**: 
  1. Check Device Manager for NVIDIA GPU
  2. Verify CUDA installation (should be 12.1+)
  3. Ensure PyTorch with CUDA is installed in venv_gpu
  4. Check backend startup logs for "Using device: cuda"

**Problem**: Port 8000 already in use
- **Solution**: 
  ```powershell
  # Find process using port 8000
  netstat -ano | findstr :8000
  # Kill the process (replace PID with actual number)
  taskkill /PID <process_id> /F
  ```

### Frontend Issues

**Problem**: CORS errors
- **Solution**: Ensure backend is running and CORS is configured correctly
- Check the `API_URL` in `Frontend/src/App.jsx` matches your backend URL

**Problem**: "Failed to generate continuations"
- **Solution**: 
  1. Verify backend is running: http://localhost:8000/health
  2. Check browser console for detailed error messages
  3. Ensure story context is not empty

### Performance Tips

**Slow generation?**
- First generation includes model warmup (~3-5 seconds extra)
- Subsequent generations are faster (2-7 seconds)
- Use "Short" length for fastest results
- Ensure GPU is being utilized (check backend startup logs)

**Out of memory?**
- The model requires ~3GB VRAM for GPU mode
- Close other GPU-intensive applications (games, video editors)
- Reduce number of options generated simultaneously (use 1 instead of 3)
- If GPU memory issues persist, model will fall back to CPU

## 📝 Development Notes

### Model Architecture
- Based on Qwen2.5 architecture (1.5 billion parameters)
- Instruction-tuned for creative writing and storytelling
- Optimized for speed without sacrificing quality
- Supports various genres, tones, and writing styles
- Advanced context understanding and narrative coherence

### API Design
- RESTful API with FastAPI framework
- FastAPI with automatic OpenAPI documentation
- CORS enabled for local development
- Async request handling

### Frontend Architecture
- React 19.2.3 with hooks
- Vite for fast development builds
- Pure CSS styling
- No external UI libraries

## 🔐 Security Notes

- This is a development setup - not production-ready
- CORS is configured for localhost only
- No authentication implemented
- Do not expose backend to public internet without proper security measures

## 📊 System Requirements

- **Python**: 3.9 or higher
- **Node.js**: 16.x or higher
- **RAM**: Minimum 4GB system RAM (8GB recommended)
- **GPU**: NVIDIA GPU with 3GB+ VRAM for GPU acceleration (optional but recommended)
- **Disk Space**: ~3.5GB (3.1GB for model + dependencies)
- **OS**: Windows (instructions provided), macOS and Linux compatible with minor adjustments

## 📚 Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Transformers Documentation](https://huggingface.co/docs/transformers)
- [React Documentation](https://react.dev/)
- [Qwen2.5 Model on Hugging Face](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct)

## 🤝 Contributing

This is a personal project workspace. Feel free to fork and modify for your own needs!

## 📄 License

Check the model's license on Hugging Face and respect the terms of use for the transformers library and other dependencies.
