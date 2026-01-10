import { useMemo, useState } from 'react';
import './App.css'; 

const tonePalette = {
  Dark: '#4b2d5c',
  Emotional: '#c95a7d',
  Humorous: '#f4a259',
  Inspirational: '#2fbf71',
  Mysterious: '#5c7aea',
  Adaptive: '#4c5fd5',
  Opening: '#4c5fd5',
  Default: '#4c5fd5',
};

const genrePalette = {
  Fantasy: '#8b5cf6',
  Romance: '#ff7dac',
  Horror: '#ff6b6b',
  'Science Fiction': '#22d3ee',
  Mystery: '#c084fc',
  Adventure: '#f0abfc',
  Default: '#f472b6',
};

const getToneColor = (tone) => tonePalette[tone] || tonePalette.Default;

function App() {
  const [currentView, setCurrentView] = useState('initial');
  const [genre, setGenre] = useState('');
  const [storyTitle, setStoryTitle] = useState('');
  const [openingLine, setOpeningLine] = useState('');
  const [storyBeats, setStoryBeats] = useState([]);
  const [tone, setTone] = useState('');
  const [length, setLength] = useState('');
  const [resultCount, setResultCount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [generatedOptions, setGeneratedOptions] = useState([]);
  
  const API_URL = 'http://localhost:8000';

  const fullStoryText = storyBeats.map((beat) => beat.text).join('\n\n');

  const stats = useMemo(() => {
    const cleanStory = fullStoryText.trim();
    const wordCount = cleanStory ? cleanStory.split(/\s+/).length : 0;
    return {
      chapters: storyBeats.length,
      words: wordCount,
    };
  }, [storyBeats, fullStoryText]);

  const handleStartStory = async () => {
    const trimmedTitle = storyTitle.trim();
    const trimmedOpening = openingLine.trim();

    if (!genre || !trimmedTitle) {
      setError('Please select genre and enter story title.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      let finalOpening = trimmedOpening;
      
      if (!trimmedOpening) {
        const prompt = `Write an engaging opening paragraph for a ${genre} story titled "${trimmedTitle}". Create an atmospheric beginning that hooks the reader.`;
        const response = await fetch(`${API_URL}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: prompt, tone: 'Adaptive', length: 'Short', count: 1 }),
        });

        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const options = await response.json();
        finalOpening = options[0].text;
      }

      const openingBeat = {
        id: Date.now().toString(),
        text: finalOpening,
        tone: 'Opening',
        length: 'Intro',
        timestamp: new Date().toISOString(),
      };

      setStoryBeats([openingBeat]);
      setStoryTitle(trimmedTitle);
      setOpeningLine(finalOpening);
      setCurrentView('writing');
      setError(null);
    } catch (err) {
      console.error('Generation error:', err);
      // Fallback for demo/offline mode
      const fallbackOpening = `The ${genre} world of "${trimmedTitle}" was silent, except for the beating of my own heart. (Backend not connected, using offline mode)`;
      const fallbackBeat = { id: Date.now().toString(), text: fallbackOpening, tone: 'Opening' };
      setStoryBeats([fallbackBeat]);
      setStoryTitle(trimmedTitle);
      setCurrentView('writing');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateContinuation = async () => {
    if (!tone || !length || !resultCount) {
      setError('Please select tone, length, and number of results.');
      return;
    }
    setError(null);
    setLoading(true);
    
    try {
      const contextPrompt = fullStoryText || `A ${genre} story titled "${storyTitle}"`;
      const fullPrompt = `${contextPrompt}\n\n`;

      const response = await fetch(`${API_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: fullPrompt, tone: tone, length: length, count: parseInt(resultCount) }),
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const options = await response.json();
      setGeneratedOptions(options);
      setShowModal(true);
    } catch (err) {
      console.error(err);
      // Demo fallback
      setGeneratedOptions([
        { id: 1, text: "Suddenly, a mysterious figure appeared from the shadows, holding a glowing artifact.", tone: tone, length: length },
        { id: 2, text: "The wind howled, whispering secrets of the ancient past that had been long forgotten.", tone: tone, length: length }
      ]);
      setShowModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleChooseContinuation = (option) => {
    const beat = {
      id: Date.now().toString(),
      text: option.text,
      tone: option.tone,
      length: option.length,
      timestamp: new Date().toISOString(),
    };
    setStoryBeats((prev) => [...prev, beat]);
    setShowModal(false);
  };

  const handleNewBook = () => {
    if (!window.confirm('Start new story? Unsaved progress will be lost.')) return;
    setCurrentView('initial');
    setGenre('');
    setStoryTitle('');
    setOpeningLine('');
    setStoryBeats([]);
    setError(null);
  };

  return (
    <div className="app-wrapper">
      <nav className="title-bar">
        <div className="title-bar-content">
          <div className="brand">
            <span className="brand-icon">📖</span>
            <span>Storynexis</span>
          </div>
          <div className="nav-info">
            {currentView === 'writing' && (
              <span style={{ color: 'white', fontWeight: 600 }}>{stats.words} Words</span>
            )}
          </div>
        </div>
      </nav>

      <div className="app-container">
        {/* The 'key' prop here is crucial for the view transition animation */}
        <div key={currentView} className="view-transition">
          
          {currentView === 'initial' && (
            <div className="initial-screen">
              
              {/* Floating Background Icons */}
              <div className="hero-decoration">
                <div className="floating-icon">✨</div>
                <div className="floating-icon">🖋️</div>
                <div className="floating-icon">🐉</div>
                <div className="floating-icon">🚀</div>
              </div>

              <h2 className="hero-title">Weave Your Legend</h2>
              <p className="hero-subtitle">
                Collaborate with AI to craft immersive, interactive stories in any genre.
              </p>

              <div className="center-card">
                <div className="form-group">
                  <label>Genre</label>
                  <select className="form-select" value={genre} onChange={(e) => setGenre(e.target.value)}>
                    <option value="">Select a Genre</option>
                    {Object.keys(genrePalette).filter(k => k !== 'Default').map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Story Title</label>
                  <input className="form-input" placeholder="e.g. The Last Starship" value={storyTitle} onChange={(e) => setStoryTitle(e.target.value)} />
                </div>

                <div className="form-group">
                  <label>Opening Line (Optional)</label>
                  <textarea className="form-textarea" placeholder="Start typing or leave blank for AI..." rows="3" value={openingLine} onChange={(e) => setOpeningLine(e.target.value)} />
                </div>

                {error && <div className="error-message">{error}</div>}

                <button onClick={handleStartStory} className="btn-primary" disabled={loading}>
                  {loading ? <><span className="loading-spinner"></span> Creating...</> : '✨ Begin Adventure'}
                </button>
              </div>
            </div>
          )}

          {currentView === 'writing' && (
            <div className="writing-layout">
              
              {/* Left: Controls */}
              <div className="controls-panel">
                <div className="controls-card">
                  <h3 className="controls-title">Story Controls</h3>
                  
                  <div className="form-group">
                    <label>Tone</label>
                    <select className="form-select" value={tone} onChange={(e) => setTone(e.target.value)}>
                      <option value="">Select Tone</option>
                      {Object.keys(tonePalette).filter(k => k !== 'Default' && k !== 'Opening').map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Length</label>
                    <select className="form-select" value={length} onChange={(e) => setLength(e.target.value)}>
                      <option value="">Select Length</option>
                      <option value="Short">Short (~50 words)</option>
                      <option value="Medium">Medium (~100 words)</option>
                      <option value="Long">Long (~150 words)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Options</label>
                    <select className="form-select" value={resultCount} onChange={(e) => setResultCount(e.target.value)}>
                      <option value="">Select Count</option>
                      <option value="1">1 Option</option>
                      <option value="2">2 Options</option>
                      <option value="3">3 Options</option>
                    </select>
                  </div>

                  {error && <div className="error-message">{error}</div>}

                  <button onClick={handleGenerateContinuation} className="btn-primary" disabled={loading} style={{ marginBottom: '15px' }}>
                     {loading ? <><span className="loading-spinner"></span> Writing...</> : '🔮 Generate Next'}
                  </button>

                  <button onClick={handleNewBook} className="btn-outline" style={{ width: '100%' }}>Start New Story</button>
                </div>
              </div>

              {/* Right: Story Book */}
              <div className="story-panel">
                <div className="story-header">
                  <h2>{storyTitle}</h2>
                  <span className="genre-badge" style={{ background: genrePalette[genre] || '#ccc' }}>{genre}</span>
                </div>
                
                <div className="story-content">
                  {storyBeats.map((beat) => (
                    <div key={beat.id} className="story-paragraph">
                      {beat.text}
                    </div>
                  ))}
                  {/* Anchor for scrolling could go here */}
                </div>
              </div>

            </div>
          )}

        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom">
              <h3>Choose a Path</h3>
              <button onClick={() => setShowModal(false)} className="close-btn">&times;</button>
            </div>
            
            <div className="options-grid">
              {generatedOptions.map((option, idx) => (
                <div key={idx} className="option-card" onClick={() => handleChooseContinuation(option)}>
                  <div className="option-meta">
                    <span className="tone-tag" style={{ color: getToneColor(option.tone) }}>{option.tone}</span>
                  </div>
                  <p className="option-text">{option.text}</p>
                  <div className="option-select-hint">Select This Path →</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <footer className="footer-bar">
        © 2026 Storynexis • Interactive AI Storytelling
      </footer>
    </div>
  );
}

export default App;