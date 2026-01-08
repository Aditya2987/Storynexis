# 📖 Storynexis

**Storynexis** is an AI-powered interactive story writing platform built with React and Python FastAPI backend. Create compelling narratives with intelligent AI assistance using the Qwen2.5-1.5B-Instruct model that generates multiple story continuation options based on your chosen tone, length, and style.

![Status](https://img.shields.io/badge/Status-Active-green)
![React](https://img.shields.io/badge/React-19.2.3-blue)
![Vite](https://img.shields.io/badge/Vite-7.2.4-purple)
![Python](https://img.shields.io/badge/Python-3.11-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.128.0-green)
![PyTorch](https://img.shields.io/badge/PyTorch-2.5.1-red)

## ✨ Features

### 🎭 Story Creation
- **Genre Selection**: Choose from Fantasy, Romance, Horror, Science Fiction, Mystery, and Adventure
- **Auto-Generate Opening**: AI generates compelling opening if left blank
- **Modern UI**: Full-screen glassmorphism design with deep purple creative theme
- **Floating Creative Icons**: Animated storytelling elements enhance the experience

### 🤖 AI-Powered Continuation
- **Multiple Options**: Generate 1-3 continuation options per request
- **Tone Control**: Select from Dark, Emotional, Humorous, Inspirational, Mysterious, or Adaptive tones
- **Length Selection**: Choose Short (2-3s), Medium (3-4s), or Long (5-7s) continuations
- **Optional Guidance**: Provide your own ideas to guide the AI
- **GPU Acceleration**: CUDA-enabled for fast generation (20-30% faster than 3B model)

### 💾 Story Management
- **Save to File**: Download your completed story as a `.txt` file
- **New Book**: Start fresh with confirmation to prevent accidental loss
- **Live Preview**: See your story build in real-time

### 🎨 User Experience
- **Two-State Interface**: Clean initial setup → immersive writing mode
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Modal Selection**: Choose continuations in an elegant popup interface
- **Form Validation**: Helpful error messages guide the creation process

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/Aditya2987/Storynexis.git
cd Storynexis
```

2. **Download the AI Model**

The model is not included in the repository due to its size (3.1GB). Download it using one of these methods:

**Option A: Using Hugging Face CLI (Recommended)**
```bash
pip install huggingface-hub
huggingface-cli download Qwen/Qwen2.5-1.5B-Instruct --local-dir Model/Qwen2.5-1.5B-Instruct
```

**Option B: Using Python Script**
```python
from huggingface_hub import snapshot_download
snapshot_download(
    repo_id="Qwen/Qwen2.5-1.5B-Instruct",
    local_dir="Model/Qwen2.5-1.5B-Instruct"
)
```

3. **Backend Setup (GPU-accelerated)**
```bash
cd Backend
python -m venv venv_gpu
.\venv_gpu\Scripts\activate  # On Windows
pip install -r requirements.txt
```

4. **Frontend Setup**
```bash
cd ../Frontend
npm install
```

5. **Start the servers**

**Option A: Use the Startup Script (Recommended)**
```powershell
.\start.ps1
```

**Option B: Manual Start**

Terminal 1 (Backend):
```bash
cd Backend
.\venv_gpu\Scripts\activate
python main.py
```

Terminal 2 (Frontend):
```bash
cd Frontend
npm run dev
```

6. **Open your browser**
```
Frontend: http://localhost:5173 (or :5174)
Backend API: http://localhost:8000
API Docs: http://localhost:8000/docs
```

## 🎯 How to Use

### Step 1: Start Your Story
1. Select a **genre** from the dropdown
2. Enter your **story title**
3. Write an **opening line**
4. Click **"Start Story"**

### Step 2: Continue Writing
1. Choose a **tone** for the continuation
2. Select the **length** (Short/Medium/Long)
3. Pick how many **options** you want (1-3)
4. Optionally add your own **idea or direction**
5. Click **"Generate Continuation"**

### Step 3: Select & Build
1. Review the generated options in the modal
2. Click **"Choose"** on your preferred continuation
3. The story updates automatically
4. Repeat to keep building your narrative

### Step 4: Save Your Work
- Click **"💾 Save Book"** to download as a text file
- Click **"➕ New Book"** to start a fresh story

## 🛠️ Tech Stack

**Frontend:**
- React 19.2.3
- Vite 7.2.4
- JavaScript (JSX)
- Pure CSS

**Backend:**
- Python 3.11
- FastAPI 0.128.0
- PyTorch 2.5.1+cu121 (CUDA 12.1)
- Transformers 4.57.3
- GPU Acceleration with NVIDIA CUDA

**AI Model:**
- Qwen2.5-1.5B-Instruct (1.5 billion parameters)
- Advanced instruction-tuned language model from Alibaba Cloud
- Optimized for speed: 2-7 second generation times with GPU
- Model: [Qwen/Qwen2.5-1.5B-Instruct](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct)

## 📁 Project Structure

```
Storynexis/
├── Frontend/
│   ├── public/              # Static assets
│   ├── src/
│   │   ├── App.jsx          # Main React component
│   │   ├── App.css          # Glassmorphism & animations
│   │   ├── simplified.css   # Story panel styling
│   │   ├── main.jsx         # Entry point
│   │   └── index.css        # Global styles
│   ├── index.html           # HTML template
│   ├── package.json         # Node dependencies
│   └── vite.config.js       # Vite configuration
├── Backend/
│   ├── main.py              # FastAPI server with GPU inference
│   ├── requirements.txt     # Python dependencies
│   └── venv_gpu/            # GPU-enabled virtual environment
├── Model/
│   ├── Qwen2.5-1.5B-Instruct/  # AI model (download separately)
│   └── Readme.md            # Model information
├── start.ps1                # Automated startup script
├── USAGE_GUIDE.md           # Comprehensive usage documentation
├── .gitignore               # Git ignore rules
└── README.md
```

## 🔮 Future Enhancements

- [ ] **User Authentication**: Save stories to user accounts
- [ ] **Story History**: Browse and edit previous stories
- [ ] **Collaborative Writing**: Multi-user story creation
- [ ] **Export Formats**: PDF, EPUB, DOCX support
- [ ] **Story Templates**: Pre-built story structures and prompts
- [ ] **Character Management**: Track characters and their development
- [ ] **Plot Analysis**: AI-powered story structure insights
- [ ] **Cloud Deployment**: Host on AWS/Azure with scalable GPU backend
- [ ] **Streaming Responses**: Real-time token streaming for better UX

## 📖 Documentation

For detailed usage instructions, troubleshooting, and API documentation, see [USAGE_GUIDE.md](USAGE_GUIDE.md)

## ⚙️ System Requirements

- **Python**: 3.9 or higher (3.11 recommended)
- **Node.js**: 16.x or higher
- **RAM**: 4GB minimum (8GB recommended)
- **GPU**: NVIDIA GPU with 3GB+ VRAM for GPU acceleration (optional but recommended)
- **Disk Space**: ~3.5GB (3.1GB for model + dependencies)
- **OS**: Windows 10/11 (macOS and Linux compatible with adjustments)

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests
- Improve documentation

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 👨‍💻 Author

**Aditya**
- GitHub: [@Aditya2987](https://github.com/Aditya2987)

## 🙏 Acknowledgments

- Inspired by interactive storytelling platforms
- Built with modern React best practices
- Designed for creative writers and storytellers

---

**Happy Story Writing! 📖✨**
