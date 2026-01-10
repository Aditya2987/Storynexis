import { useMemo, useState } from 'react';
import './App.css';
import './enhancements.css';
import './simplified.css';
import './improved-ui.css';

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
  const [continuationIdea, setContinuationIdea] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [generatedOptions, setGeneratedOptions] = useState([]);
  const API_URL = 'http://localhost:8000';

  // Simple idea tracking (no-op for now, can be enhanced later)
  const registerIdea = (idea) => {
    console.log('Idea registered:', idea);
  };

  const fullStoryText = storyBeats.map((beat) => beat.text).join('\n\n');

  const stats = useMemo(() => {
    const cleanStory = fullStoryText.trim();
    const wordCount = cleanStory ? cleanStory.split(/\s+/).length : 0;
    const lastBeat = storyBeats[storyBeats.length - 1];

    return {
      chapters: storyBeats.length,
      words: wordCount,
      lastUpdated: lastBeat ? new Date(lastBeat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--',
    };
  }, [storyBeats, fullStoryText]);

  // Simplified - removed idea bank feature

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
      // Generate opening using AI if user didn't provide one
      let finalOpening = trimmedOpening;
      
      if (!trimmedOpening) {
        // Build prompt for generating opening
        const prompt = `Write an engaging opening paragraph for a ${genre} story titled "${trimmedTitle}". Create an atmospheric beginning that hooks the reader.`;

        const response = await fetch(`${API_URL}/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: prompt,
            tone: 'Adaptive',
            length: 'Short',
            count: 1,
          }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const options = await response.json();
        finalOpening = options[0].text;
        setOpeningLine(finalOpening);
      }

      const openingBeat = {
        id: Date.now().toString(),
        text: finalOpening,
        tone: 'Opening',
        length: 'Intro',
        inspiration: null,
        timestamp: new Date().toISOString(),
      };

      setStoryBeats([openingBeat]);
      setStoryTitle(trimmedTitle);
      setCurrentView('writing');
      setError(null);
    } catch (err) {
      console.error('Generation error:', err);
      setError(`Failed to generate opening: ${err.message}. Make sure the backend is running.`);
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
    
    // Show progress indicator
    const startTime = Date.now();

    const requestCount = parseInt(resultCount, 10) || 1;
    const trimmedIdea = continuationIdea.trim();
    if (trimmedIdea) {
      registerIdea(trimmedIdea);
    }

    try {
      // Build the prompt from the current story context
      const contextPrompt = fullStoryText || openingLine || `A ${genre} story titled "${storyTitle}"`;
      const ideaPrompt = trimmedIdea ? ` ${trimmedIdea}` : '';
      const fullPrompt = `${contextPrompt}${ideaPrompt}\n\n`;

      // Call the backend API
      const response = await fetch(`${API_URL}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: fullPrompt,
          tone: tone,
          length: length,
          count: requestCount,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const options = await response.json();
      
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`✓ Generated ${options.length} option(s) in ${elapsed}s`);

      setGeneratedOptions(options);
      setShowModal(true);
      setContinuationIdea('');
    } catch (err) {
      console.error('Generation error:', err);
      setError(`Failed to generate continuations: ${err.message}. Make sure the backend is running on port 8000.`);
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
      inspiration: option.idea,
      timestamp: new Date().toISOString(),
    };

    setStoryBeats((prev) => [...prev, beat]);
    setTone('');
    setLength('');
    setResultCount('');
    setGeneratedOptions([]);
    setShowModal(false);
  };

  const handleSaveBook = () => {
    const content = `Title: ${storyTitle}\nGenre: ${genre}\n\n${fullStoryText || 'Your story is waiting to be written.'}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${storyTitle.replace(/\s+/g, '_') || 'story'}.txt`;
    link.click();
  };

  const handleNewBook = () => {
    if (!window.confirm('Your current book may not be saved. Do you wish to continue?')) return;

    setCurrentView('initial');
    setGenre('');
    setStoryTitle('');
    setOpeningLine('');
    setStoryBeats([]);
    setTone('');
    setLength('');
    setResultCount('');
    setGeneratedOptions([]);
    setShowModal(false);
    setError(null);
  };

  const genreAccent = genrePalette[genre] || genrePalette.Default;

  const renderInsightPanel = () => (
    <section className="insight-panel">
      <div className="insight-card">
        <span>📝 Words</span>
        <strong>{stats.words}</strong>
      </div>
      <div className="insight-card">
        <span>📚 Chapters</span>
        <strong>{stats.chapters}</strong>
      </div>
    </section>
  );

  const renderStory = () => (
    <section className="story-panel">
      <div className="story-header">
        <h2>{storyTitle}</h2>
        <span className="genre-badge" style={{ backgroundColor: genreAccent }}>{genre}</span>
      </div>
      <div className="story-content">
        {storyBeats.map((beat, index) => (
          <div key={beat.id} className="story-paragraph">
            {beat.text}
          </div>
        ))}
      </div>
    </section>
  );

  return (
    <div className="app-wrapper">
      {/* Title Bar / Navigation */}
      <nav className="title-bar">
        <div className="title-bar-content">
          <div className="brand">
            <span className="brand-icon">📖</span>
            <span className="brand-name">Storynexis</span>
            {currentView === 'writing' && genre && (
              <span className="nav-genre" style={{ backgroundColor: genreAccent }}>
                {genre}
              </span>
            )}
          </div>
          <div className="nav-info">
            {currentView === 'writing' && (
              <>
                <div className="nav-stat">
                  <span className="stat-value">{stats.chapters}</span>
                  <span className="stat-label">Chapters</span>
                </div>
                <div className="nav-stat">
                  <span className="stat-value">{stats.words}</span>
                  <span className="stat-label">Words</span>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      <div className="app-container">
      {currentView === 'initial' && (
        <div className="initial-screen">
          <div className="hero-decoration">
            <div className="floating-icon">✨</div>
            <div className="floating-icon">📚</div>
            <div className="floating-icon">🖋️</div>
            <div className="floating-icon">💫</div>
          </div>
          <h2>Create Your Story</h2>
          <p className="lead-text">Transform your imagination into captivating narratives. Let AI be your co-writer in crafting unforgettable stories.</p>

          <div className="center-card">
            <div className="form-group">
              <label htmlFor="genre-select">Genre *</label>
              <select 
                id="genre-select"
                value={genre} 
                onChange={(e) => setGenre(e.target.value)} 
                className={`form-select ${error && !genre ? 'error' : genre ? 'success' : ''}`}
                aria-required="true"
                aria-describedby="genre-help"
              >
                <option value="">Select genre</option>
                <option value="Fantasy">Fantasy</option>
                <option value="Romance">Romance</option>
                <option value="Horror">Horror</option>
                <option value="Science Fiction">Science Fiction</option>
                <option value="Mystery">Mystery</option>
                <option value="Adventure">Adventure</option>
              </select>
              <small id="genre-help" style={{color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginTop: '6px', display: 'block'}}>
                Choose the genre that best fits your story
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="title-input">Story Title *</label>
              <input
                id="title-input"
                type="text"
                value={storyTitle}
                onChange={(e) => setStoryTitle(e.target.value)}
                placeholder="Enter an engaging title for your story..."
                className={`form-input ${error && !storyTitle.trim() ? 'error' : storyTitle.trim() ? 'success' : ''}`}
                aria-required="true"
                aria-describedby="title-help"
                maxLength={100}
              />
              <small id="title-help" style={{color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginTop: '6px', display: 'block'}}>
                {storyTitle.length}/100 characters
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="opening-input">
                Opening Line 
                <span style={{color: 'rgba(255,255,255,0.6)', fontWeight: 'normal', fontSize: '0.85rem', marginLeft: '8px'}}>
                  (Optional - AI will generate if blank)
                </span>
              </label>
              <textarea
                id="opening-input"
                value={openingLine}
                onChange={(e) => setOpeningLine(e.target.value)}
                placeholder="Leave blank to let AI generate an opening, or write your own captivating first line..."
                rows="4"
                className="form-textarea"
                aria-describedby="opening-help"
                maxLength={500}
              />
              <small id="opening-help" style={{color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginTop: '6px', display: 'block'}}>
                {openingLine.length}/500 characters
              </small>
            </div>

            {error && <div className="error-message" role="alert">{error}</div>}

            <button 
              onClick={handleStartStory} 
              className="btn-primary btn-full" 
              disabled={loading}
              aria-label={loading ? 'Generating story opening' : 'Start your story'}
            >
              {loading ? (
                <>
                  <span className="loading-spinner-enhanced" style={{display: 'inline-block', width: '20px', height: '20px', marginRight: '8px', verticalAlign: 'middle'}}></span>
                  🎬 Generating Opening...
                </>
              ) : '✨ Start Your Story'}
            </button>
          </div>
        </div>
      )}

      {currentView === 'writing' && (
        <>
          {renderInsightPanel()}

          {renderStory()}

          <div className="controls-panel">
            <div className="controls-card">
              <h3>Continue Your Story</h3>
              
              <div className="controls-grid">
                <div className="form-group">
                  <label htmlFor="tone-select">Tone *</label>
                  <select 
                    id="tone-select"
                    value={tone} 
                    onChange={(e) => setTone(e.target.value)} 
                    className={`form-select ${error && !tone ? 'error' : ''}`}
                    aria-required="true"
                  >
                    <option value="">Select tone</option>
                    <option value="Dark">🌑 Dark</option>
                    <option value="Emotional">💔 Emotional</option>
                    <option value="Humorous">😄 Humorous</option>
                    <option value="Inspirational">✨ Inspirational</option>
                    <option value="Mysterious">🔮 Mysterious</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="length-select">Length *</label>
                  <select 
                    id="length-select"
                    value={length} 
                    onChange={(e) => setLength(e.target.value)} 
                    className={`form-select ${error && !length ? 'error' : ''}`}
                    aria-required="true"
                  >
                    <option value="">Select length</option>
                    <option value="Short">📝 Short (~50 words)</option>
                    <option value="Medium">📄 Medium (~100 words)</option>
                    <option value="Long">📖 Long (~150 words)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="count-select">Options *</label>
                  <select 
                    id="count-select"
                    value={resultCount} 
                    onChange={(e) => setResultCount(e.target.value)} 
                    className={`form-select ${error && !resultCount ? 'error' : ''}`}
                    aria-required="true"
                  >
                    <option value="">Select number</option>
                    <option value="1">1 option</option>
                    <option value="2">2 options</option>
                    <option value="3">3 options</option>
                  </select>
                </div>
              </div>

              {error && <div className="error-message" role="alert">{error}</div>}

              <button 
                onClick={handleGenerateContinuation} 
                disabled={loading} 
                className="btn-primary btn-full"
                aria-label={loading ? 'AI is generating story continuation' : 'Generate story continuation'}
              >
                {loading ? (
                  <>
                    <span className="loading-spinner-enhanced" style={{display: 'inline-block', width: '20px', height: '20px', marginRight: '8px', verticalAlign: 'middle'}}></span>
                    ✨ AI is writing your story...
                  </>
                ) : '✨ Generate Continuation'}
              </button>

              <div className="action-buttons">
                <button 
                  onClick={handleSaveBook} 
                  className="btn-outline"
                  aria-label="Save your story to a text file"
                >
                  💾 Save Story
                </button>
                <button 
                  onClick={handleNewBook} 
                  className="btn-outline"
                  aria-label="Start a new story"
                >
                  ➕ New Story
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {showModal && (
        <div 
          className="modal-overlay" 
          onClick={() => setShowModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 id="modal-title">Choose Your Story Continuation</h3>
              <button 
                onClick={() => setShowModal(false)} 
                className="modal-close"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className={`options-grid options-${generatedOptions.length || 1}`}>
                {generatedOptions.map((option, index) => (
                  <div key={option.id} className="option-card">
                    <div className="option-meta">
                      <span className="tone-pill" style={{ backgroundColor: getToneColor(option.tone) }}>
                        {option.tone}
                      </span>
                      <span className="length-chip">{option.length}</span>
                    </div>
                    <p className="option-text">{option.text}</p>
                    {option.idea && <p className="idea-hint">💡 Inspired by "{option.idea}"</p>}
                    <button 
                      onClick={() => handleChooseContinuation(option)} 
                      className="btn-success"
                      aria-label={`Select option ${index + 1}`}
                    >
                      ✓ Use this continuation
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>

    {/* Footer Bar */}
    <footer className="footer-bar">
      <div className="footer-content">
        <div className="footer-section">
          <span className="footer-label">Storynexis v1.0</span>
          <span className="footer-divider">•</span>
          <span className="footer-text">Interactive Story Writing Platform</span>
        </div>
        <div className="footer-section">
          {currentView === 'writing' && (
            <>
              <span className="footer-text">Last saved: {stats.lastUpdated}</span>
              <span className="footer-divider">•</span>
            </>
          )}
          <span className="footer-text">Built with React & Vite</span>
          <span className="footer-divider">•</span>
          <a href="https://github.com/Aditya2987/-Storynexis" target="_blank" rel="noopener noreferrer" className="footer-link">
            GitHub
          </a>
        </div>
      </div>
    </footer>
    </div>
  );
}

export default App;
