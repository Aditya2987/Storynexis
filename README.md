# 📖 Storynexis

**Storynexis** is an AI-powered interactive story writing platform built with React. Create compelling narratives with intelligent AI assistance that generates multiple story continuation options based on your chosen tone, length, and style.

![Demo Mode](https://img.shields.io/badge/Status-Demo%20Mode-yellow)
![React](https://img.shields.io/badge/React-19.2.3-blue)
![Vite](https://img.shields.io/badge/Vite-7.2.4-purple)

## ✨ Features

### 🎭 Story Creation
- **Genre Selection**: Choose from Fantasy, Romance, Horror, Science Fiction, Mystery, and Adventure
- **Custom Opening**: Write your own story opening line
- **Beautiful Book View**: Read your story in an elegant, book-like interface with serif fonts

### 🤖 AI-Powered Continuation
- **Multiple Options**: Generate 1-3 continuation options per request
- **Tone Control**: Select from Dark, Emotional, Humorous, Inspirational, or Mysterious tones
- **Length Selection**: Choose Short, Medium, or Long continuations
- **Optional Guidance**: Provide your own ideas to guide the AI

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
git clone https://github.com/Aditya2987/-Storynexis.git
cd Storynexis
```

2. **Navigate to Frontend directory**
```bash
cd Frontend
```

3. **Install dependencies**
```bash
npm install
```

4. **Start development server**
```bash
npm run dev
```

5. **Open your browser**
```
http://localhost:5173
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

- **Frontend Framework**: React 19.2.3
- **Build Tool**: Vite 7.2.4
- **Language**: JavaScript (JSX)
- **Styling**: Pure CSS with custom designs
- **State Management**: React Hooks (useState)

## 📁 Project Structure

```
Storynexis/
├── Frontend/
│   ├── public/
│   │   └── vite.svg
│   ├── src/
│   │   ├── App.jsx          # Main application component
│   │   ├── App.css          # Application styles
│   │   ├── main.jsx         # Entry point
│   │   └── index.css        # Global styles
│   ├── index.html           # HTML template
│   ├── package.json         # Dependencies
│   └── vite.config.js       # Vite configuration
├── Backend/                 # (Future backend integration)
├── Model/                   # (Future AI model integration)
└── README.md
```

## 🔮 Future Enhancements

- [ ] **Backend Integration**: Connect to Django/FastAPI backend
- [ ] **Real AI Model**: Integrate with GPT, Claude, or custom LLM
- [ ] **User Authentication**: Save stories to user accounts
- [ ] **Story History**: Browse and edit previous stories
- [ ] **Collaborative Writing**: Multi-user story creation
- [ ] **Export Formats**: PDF, EPUB, DOCX support
- [ ] **Story Templates**: Pre-built story structures
- [ ] **Character Management**: Track characters and their development
- [ ] **Plot Analysis**: AI-powered story structure insights

## 🎨 Demo Mode

Currently, Storynexis runs in **demo mode** with simulated AI responses. The continuations are generated based on your selected tone and length preferences, providing a realistic preview of the full AI-powered experience.

To connect a real backend:
1. Set `DEMO_MODE = false` in `App.jsx`
2. Configure your API endpoint
3. Implement the backend API handler

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
