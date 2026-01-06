import { useState } from 'react';
import './App.css';

/**
 * Storynexis - Interactive Story Writing AI
 * Two-state interface: Initial setup → Writing mode with story generation
 * Currently using demo mode (mock AI) until backend is ready
 */
function App() {
  // View state management
  const [currentView, setCurrentView] = useState('initial'); // 'initial' or 'writing'
  
  // Initial story setup
  const [genre, setGenre] = useState('');
  const [storyTitle, setStoryTitle] = useState('');
  const [openingLine, setOpeningLine] = useState('');
  
  // Story content
  const [storyContent, setStoryContent] = useState('');
  
  // Continuation controls
  const [tone, setTone] = useState('');
  const [length, setLength] = useState('');
  const [resultCount, setResultCount] = useState('');
  const [continuationIdea, setContinuationIdea] = useState('');
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [generatedOptions, setGeneratedOptions] = useState([]);
  
  // Backend API endpoint - currently in demo mode
  const DEMO_MODE = true; // Set to false when backend is ready

  /**
   * Generate demo continuation options
   */
  const generateDemoContinuations = (count) => {
    const continuations = [
      `The ${tone.toLowerCase() || 'mysterious'} atmosphere deepened as shadows danced across the walls. Every step forward revealed new secrets waiting to be uncovered, drawing our protagonist deeper into the heart of the mystery.`,
      
      `With a sudden burst of ${tone.toLowerCase() || 'emotional'} energy, the character realized that everything they believed was about to change. The journey ahead would test not just their strength, but their very understanding of reality itself.`,
      
      `${length === 'Long' ? 'As the hours turned into days, and the days into weeks, the story unfolded with intricate detail. Each moment built upon the last, creating a tapestry of events that would forever alter the course of destiny. Characters emerged from the shadows, each with their own tales to tell, their own burdens to bear. The world expanded, revealing layers of complexity that had been hidden beneath the surface, waiting for the right moment to be revealed.' : 'The story took an unexpected turn, challenging everything that had come before.'}`
    ];
    
    return continuations.slice(0, parseInt(count));
  };

  /**
   * Start the story - transition from initial to writing view
   */
  const handleStartStory = () => {
    if (!genre || !storyTitle || !openingLine) {
      setError('Please complete all fields before starting your story.');
      return;
    }
    
    setStoryContent(openingLine);
    setCurrentView('writing');
    setError(null);
  };

  /**
   * Generate continuation options
   */
  const handleGenerateContinuation = async () => {
    if (!tone || !length || !resultCount) {
      setError('Please select tone, length, and number of results.');
      return;
    }
    
    setError(null);
    setLoading(true);
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const options = generateDemoContinuations(resultCount);
      setGeneratedOptions(options);
      setShowModal(true);
    } catch (err) {
      setError('Failed to generate continuations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Choose a continuation option and add to story
   */
  const handleChooseContinuation = (option) => {
    setStoryContent(prev => prev + '\n\n' + option);
    
    // Reset continuation controls
    setTone('');
    setLength('');
    setResultCount('');
    setContinuationIdea('');
    
    setShowModal(false);
  };

  /**
   * Save the story book as a text file
   */
  const handleSaveBook = () => {
    const content = `Title: ${storyTitle}\nGenre: ${genre}\n\n${storyContent}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${storyTitle.replace(/\s+/g, '_')}.txt`;
    link.click();
  };

  /**
   * Start a new book
   */
  const handleNewBook = () => {
    if (window.confirm('Your current book may not be saved. Do you wish to continue?')) {
      // Reset all state
      setCurrentView('initial');
      setGenre('');
      setStoryTitle('');
      setOpeningLine('');
      setStoryContent('');
      setTone('');
      setLength('');
      setResultCount('');
      setContinuationIdea('');
      setError(null);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>📖 Storynexis</h1>
        <p>AI-Powered Interactive Story Writing</p>
        {DEMO_MODE && (
          <div className="demo-badge">Demo Mode - AI Simulation Active</div>
        )}
      </header>

      {/* ========= STATE 1: INITIAL SCREEN ========= */}
      {currentView === 'initial' && (
        <div className="initial-screen">
          <div className="center-card">
            <h2>Start Your Story</h2>

            <div className="form-group">
              <label>Genre</label>
              <select 
                value={genre} 
                onChange={(e) => setGenre(e.target.value)}
                className="form-select"
              >
                <option value="">Select genre</option>
                <option value="Fantasy">Fantasy</option>
                <option value="Romance">Romance</option>
                <option value="Horror">Horror</option>
                <option value="Science Fiction">Science Fiction</option>
                <option value="Mystery">Mystery</option>
                <option value="Adventure">Adventure</option>
              </select>
            </div>

            <div className="form-group">
              <label>Story Title</label>
              <input
                type="text"
                value={storyTitle}
                onChange={(e) => setStoryTitle(e.target.value)}
                placeholder="Enter story title..."
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Opening Line</label>
              <textarea
                value={openingLine}
                onChange={(e) => setOpeningLine(e.target.value)}
                placeholder="Once upon a time..."
                rows="4"
                className="form-textarea"
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button onClick={handleStartStory} className="btn-primary btn-full">
              Start Story
            </button>
          </div>
        </div>
      )}

      {/* ========= STATE 2: WRITING SCREEN ========= */}
      {currentView === 'writing' && (
        <div className="writing-screen">
          <div className="writing-layout">
            
            {/* LEFT: CONTROLS */}
            <div className="controls-panel">
              <div className="panel-card">
                <h3>Continue Story</h3>
                <p className="hint">Tone, length & results required. Idea optional.</p>

                <div className="form-group">
                  <label>Tone</label>
                  <select 
                    value={tone} 
                    onChange={(e) => setTone(e.target.value)}
                    className="form-select"
                  >
                    <option value="">Select tone</option>
                    <option value="Dark">Dark</option>
                    <option value="Emotional">Emotional</option>
                    <option value="Humorous">Humorous</option>
                    <option value="Inspirational">Inspirational</option>
                    <option value="Mysterious">Mysterious</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Story Length</label>
                  <select 
                    value={length} 
                    onChange={(e) => setLength(e.target.value)}
                    className="form-select"
                  >
                    <option value="">Select length</option>
                    <option value="Short">Short</option>
                    <option value="Medium">Medium</option>
                    <option value="Long">Long</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Number of Results</label>
                  <select 
                    value={resultCount} 
                    onChange={(e) => setResultCount(e.target.value)}
                    className="form-select"
                  >
                    <option value="">Select number</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Your Next Line / Idea (optional)</label>
                  <textarea
                    value={continuationIdea}
                    onChange={(e) => setContinuationIdea(e.target.value)}
                    placeholder="Optional guidance..."
                    rows="3"
                    className="form-textarea"
                  />
                </div>

                {error && <div className="error-message">{error}</div>}

                <button 
                  onClick={handleGenerateContinuation} 
                  disabled={loading}
                  className="btn-success btn-full"
                >
                  {loading ? 'Generating...' : 'Generate Continuation'}
                </button>
              </div>
            </div>

            {/* RIGHT: BOOK VIEW */}
            <div className="book-panel">
              <div className="book-actions">
                <button onClick={handleSaveBook} className="btn-outline">
                  💾 Save Book
                </button>
                <button onClick={handleNewBook} className="btn-outline-danger">
                  ➕ New Book
                </button>
              </div>

              <h3>📘 Story Book</h3>

              <div className="book-view">
                <div className="book-title">{storyTitle}</div>
                <div className="book-genre">{genre}</div>
                <hr />
                <div className="book-content">{storyContent}</div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========= MODAL: CONTINUATION OPTIONS ========= */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Choose Continuation</h3>
              <button onClick={() => setShowModal(false)} className="modal-close">
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className={`options-grid options-${resultCount}`}>
                {generatedOptions.map((option, index) => (
                  <div key={index} className="option-card">
                    <p className="option-text">{option}</p>
                    <button 
                      onClick={() => handleChooseContinuation(option)}
                      className="btn-success"
                    >
                      Choose
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
