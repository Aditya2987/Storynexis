# AI Model Information

## Qwen2.5-1.5B-Instruct

This directory contains the AI model used by Storynexis for story generation.

### Model Details
- **Name**: Qwen2.5-1.5B-Instruct
- **Parameters**: 1.5 billion
- **Type**: Instruction-tuned Large Language Model
- **Developer**: Alibaba Cloud (Qwen Team)
- **License**: Apache 2.0
- **Size**: ~3.1GB

### Download Instructions

The model is **NOT included** in this repository due to its size. You must download it separately:

#### Method 1: Hugging Face CLI (Recommended)
```bash
pip install huggingface-hub
huggingface-cli download Qwen/Qwen2.5-1.5B-Instruct --local-dir Model/Qwen2.5-1.5B-Instruct
```

#### Method 2: Python Script
```python
from huggingface_hub import snapshot_download

snapshot_download(
    repo_id="Qwen/Qwen2.5-1.5B-Instruct",
    local_dir="Model/Qwen2.5-1.5B-Instruct"
)
```

#### Method 3: Manual Download
1. Visit: https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct
2. Click "Files and versions"
3. Download all files to `Model/Qwen2.5-1.5B-Instruct/`

### Features
- ✅ Optimized for creative writing and storytelling
- ✅ GPU-accelerated inference (CUDA 12.1+)
- ✅ Fast generation: 2-7 seconds with GPU
- ✅ Support for multiple genres and tones
- ✅ Advanced context understanding
- ✅ 20-30% faster than the 3B variant

### Hardware Requirements
- **GPU Mode** (Recommended):
  - NVIDIA GPU with 3GB+ VRAM
  - CUDA 12.1 or higher
  - ~3GB VRAM usage during inference
  
- **CPU Mode** (Fallback):
  - 4GB+ system RAM
  - Slower generation times (10-20 seconds)

### Model Location
After downloading, the model should be at:
```
D:\Story\Model\Qwen2.5-1.5B-Instruct\
├── config.json
├── generation_config.json
├── model.safetensors (or pytorch_model.bin)
├── tokenizer.json
├── tokenizer_config.json
└── ...other files
```

### Usage in Backend
The model is automatically loaded by `Backend/main.py`:
```python
MODEL_PATH = r"D:\Story\Model\Qwen2.5-1.5B-Instruct"
```

### Performance Tips
1. First generation includes model loading (~3-5 seconds extra)
2. Subsequent generations are much faster
3. Use GPU for best performance
4. Short length setting = fastest results

### Links
- Model Page: https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct
- Documentation: https://github.com/QwenLM/Qwen2.5
- License: https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct/blob/main/LICENSE