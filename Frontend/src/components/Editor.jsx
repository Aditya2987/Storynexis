import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { generateContinuation } from '../utils/api';
import './Editor.css';

const Editor = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const textareaRef = useRef(null);
  const contentRef = useRef(null);

  // Story metadata
  const [storyId, setStoryId] = useState(null);
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('Any Genre');
  const [content, setContent] = useState('');
  const [chapters, setChapters] = useState([]);

  // Generation controls
  const [tone, setTone] = useState('Adaptive');
  const [length, setLength] = useState('Medium');
  const [optionsCount, setOptionsCount] = useState(3);
  const [customPrompt, setCustomPrompt] = useState('');

  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [generatedOptions, setGeneratedOptions] = useState([]);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [autoSaveTimer, setAutoSaveTimer] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [theme, setTheme] = useState('light'); // light, dark, sepia
  const [fontSize, setFontSize] = useState('medium'); // small, medium, large
  const [showQuickGenerate, setShowQuickGenerate] = useState(false);

  // Undo/Redo
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Stats
  const [stats, setStats] = useState({
    words: 0,
    characters: 0,
    paragraphs: 0,
    sentences: 0,
    readingTime: 0
  });

  // Progress tracking
  const [dailyGoal, setDailyGoal] = useState(1000);
  const [sessionStartWords, setSessionStartWords] = useState(0);

  const genres = ['Any Genre', 'Fantasy', 'Science Fiction', 'Romance', 'Horror', 'Mystery', 'Adventure', 'Thriller', 'Drama', 'Comedy', 'Historical Fiction', 'Young Adult'];
  
  const toneOptions = [
    { id: 'Adaptive', icon: '🎭', label: 'Adaptive', desc: 'Matches your style' },
    { id: 'Dark', icon: '🌑', label: 'Dark', desc: 'Atmospheric & tense' },
    { id: 'Emotional', icon: '💔', label: 'Emotional', desc: 'Deep & resonant' },
    { id: 'Humorous', icon: '😄', label: 'Humorous', desc: 'Witty & fun' },
    { id: 'Inspirational', icon: '✨', label: 'Inspirational', desc: 'Uplifting' },
    { id: 'Mysterious', icon: '🔮', label: 'Mysterious', desc: 'Intriguing' },
    { id: 'Romantic', icon: '💕', label: 'Romantic', desc: 'Tender & passionate' },
    { id: 'Suspenseful', icon: '😰', label: 'Suspenseful', desc: 'Edge of seat' },
  ];

  const lengthOptions = [
    { id: 'Short', icon: '📝', tokens: '~100', time: '1-2s' },
    { id: 'Medium', icon: '📄', tokens: '~200', time: '2-4s' },
    { id: 'Long', icon: '📚', tokens: '~350', time: '4-6s' },
  ];

  const shortcuts = [
    { keys: ['Ctrl', 'S'], action: 'Save to history' },
    { keys: ['Ctrl', 'G'], action: 'Generate continuation' },
    { keys: ['Ctrl', 'Z'], action: 'Undo' },
    { keys: ['Ctrl', 'Y'], action: 'Redo' },
    { keys: ['Ctrl', 'F'], action: 'Toggle focus mode' },
    { keys: ['Esc'], action: 'Exit focus mode' },
  ];

  const quickPrompts = [
    { icon: '🔄', label: 'Plot twist', prompt: 'Add an unexpected plot twist' },
    { icon: '👤', label: 'New character', prompt: 'Introduce a new character' },
    { icon: '💬', label: 'Dialogue', prompt: 'Add a dialogue scene' },
    { icon: '🎭', label: 'Conflict', prompt: 'Introduce a conflict or tension' },
    { icon: '🌄', label: 'Scene change', prompt: 'Transition to a new scene' },
    { icon: '💭', label: 'Inner thoughts', prompt: 'Explore the character\'s inner thoughts' },
  ];

  // Load story from location state or localStorage
  useEffect(() => {
    if (location.state?.loadedStory) {
      const story = location.state.loadedStory;
      setStoryId(story.id);
      setTitle(story.title || '');
      setGenre(story.genre || 'Any Genre');
      setContent(story.content || '');
      setChapters(story.chapters || []);
      setSessionStartWords(story.content?.split(/\s+/).filter(w => w).length || 0);
    } else {
      const sessionData = sessionStorage.getItem('currentStory');
      if (sessionData) {
        const data = JSON.parse(sessionData);
        setTitle(data.title || '');
        setGenre(data.genre || 'Any Genre');
        setContent(data.content || '');
      }
    }
  }, [location]);

  // Calculate stats
  useEffect(() => {
    const text = content.trim();
    const words = text ? text.split(/\s+/).filter(w => w).length : 0;
    const characters = text.length;
    const paragraphs = text ? text.split(/\n\n+/).filter(p => p.trim()).length : 0;
    const sentences = text ? text.split(/[.!?]+/).filter(s => s.trim()).length : 0;
    const readingTime = Math.ceil(words / 200);

    setStats({ words, characters, paragraphs, sentences, readingTime });
  }, [content]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') {
          e.preventDefault();
          saveToHistory();
        } else if (e.key === 'g') {
          e.preventDefault();
          handleGenerate();
        } else if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          handleUndo();
        } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
          e.preventDefault();
          handleRedo();
        } else if (e.key === 'f') {
          e.preventDefault();
          setFocusMode(!focusMode);
        }
      }
      if (e.key === 'Escape') {
        if (focusMode) setFocusMode(false);
        if (showOptionsModal) setShowOptionsModal(false);
        if (showShortcuts) setShowShortcuts(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [content, focusMode, showOptionsModal, showShortcuts]);

  // Auto-save
  useEffect(() => {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);

    const timer = setTimeout(() => {
      saveToSession();
    }, 2000);

    setAutoSaveTimer(timer);
    return () => clearTimeout(timer);
  }, [title, content, genre]);

  const saveToSession = useCallback(() => {
    sessionStorage.setItem('currentStory', JSON.stringify({
      title, genre, content, chapters,
      timestamp: new Date().toISOString()
    }));
  }, [title, genre, content, chapters]);

  const saveToHistory = useCallback(() => {
    // Use user ID if logged in, or 'guest' for anonymous users
    const userId = user?.uid || 'guest';

    const story = {
      id: storyId || `story_${Date.now()}`,
      title: title || 'Untitled Story',
      genre, content, chapters,
      wordCount: stats.words,
      timestamp: new Date().toISOString()
    };

    try {
      const storiesKey = `stories_${userId}`;
      const existingStories = JSON.parse(localStorage.getItem(storiesKey) || '[]');
      
      const storyIndex = existingStories.findIndex(s => s.id === story.id);
      if (storyIndex >= 0) {
        existingStories[storyIndex] = story;
      } else {
        existingStories.unshift(story);
      }

      localStorage.setItem(storiesKey, JSON.stringify(existingStories));
      setStoryId(story.id);
      setSaveStatus('saved');
      setSuccessMessage('Story saved successfully!');
      setTimeout(() => {
        setSaveStatus('');
        setSuccessMessage('');
      }, 2000);
    } catch (error) {
      console.error('Error saving story:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(''), 2000);
    }
  }, [user, storyId, title, genre, content, chapters, stats.words]);

  const handleContentChange = (e) => {
    const newContent = e.target.value;
    
    if (historyIndex === -1 || history[historyIndex] !== content) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(content);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }

    setContent(newContent);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setContent(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setContent(history[historyIndex + 1]);
    }
  };

  const handleGenerate = async (quickPromptText = null) => {
    if (!content.trim()) {
      setError('Please write some content first to generate continuation.');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setError('');
    setLoading(true);
    setShowQuickGenerate(false);

    try {
      const direction = quickPromptText || customPrompt;
      const contextPrompt = direction 
        ? `${content}\n\nContinue the story with focus on: ${direction}`
        : content;

      const options = await generateContinuation({
        prompt: contextPrompt,
        tone,
        length,
        count: parseInt(optionsCount)
      });

      setGeneratedOptions(options);
      setShowOptionsModal(true);
    } catch (err) {
      console.error('Generation error:', err);
      setError(err.message || 'Failed to generate continuation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (option) => {
    const newContent = content + '\n\n' + option.text;
    setContent(newContent);
    setShowOptionsModal(false);
    setCustomPrompt('');
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(content);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

    setSuccessMessage('Continuation added!');
    setTimeout(() => setSuccessMessage(''), 2000);
  };

  const handleAddChapter = () => {
    if (newChapterTitle.trim()) {
      const newChapter = {
        id: Date.now().toString(),
        title: newChapterTitle.trim(),
        position: content.length,
        timestamp: new Date().toISOString()
      };
      setChapters([...chapters, newChapter]);
      setContent(content + `\n\n--- Chapter ${chapters.length + 1}: ${newChapterTitle.trim()} ---\n\n`);
      setNewChapterTitle('');
      setShowChapterModal(false);
    }
  };

  const handleDownload = () => {
    const fullContent = `${title || 'Untitled Story'}\n\n${content}`;
    const blob = new Blob([fullContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'story'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    setSuccessMessage('Story downloaded!');
    setTimeout(() => setSuccessMessage(''), 2000);
  };

  const handleNewStory = () => {
    if (content.trim() && !confirm('Start a new story? Current progress will be saved to history.')) {
      return;
    }

    if (content.trim()) saveToHistory();

    setStoryId(null);
    setTitle('');
    setGenre('Any Genre');
    setContent('');
    setChapters([]);
    setCustomPrompt('');
    sessionStorage.removeItem('currentStory');
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const progressPercent = Math.min((stats.words / dailyGoal) * 100, 100);
  const sessionWords = stats.words - sessionStartWords;

  const getThemeClass = () => {
    if (focusMode) return 'theme-focus';
    return `theme-${theme}`;
  };

  const getFontSizeClass = () => `font-${fontSize}`;

  return (
    <div className={`editor-wrapper ${getThemeClass()} ${getFontSizeClass()}`}>
      {/* Top Navigation Bar */}
      <nav className={`editor-navbar ${focusMode ? 'hidden' : ''}`}>
        <div className="editor-navbar-content">
          <div className="editor-navbar-left">
            <div className="editor-brand" onClick={() => navigate('/')}>
              <span className="brand-icon">📖</span>
              <span className="brand-text">Storynexis</span>
            </div>
            <div className="nav-divider"></div>
            <div className="title-section">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Untitled Story"
                className="title-input"
              />
              {saveStatus === 'saved' && <span className="save-badge">✓ Saved</span>}
              {saveStatus === 'error' && <span className="save-badge error">✗ Failed</span>}
            </div>
          </div>

          <div className="editor-nav-center">
            <div className="genre-selector">
              <span className="genre-icon">📚</span>
              <select value={genre} onChange={(e) => setGenre(e.target.value)} className="genre-select">
                {genres.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          <div className="editor-nav-actions">
            <button className="nav-btn" onClick={() => setShowShortcuts(true)} title="Keyboard Shortcuts">
              <span>⌨️</span>
            </button>
            <button className={`nav-btn ${focusMode ? 'active' : ''}`} onClick={() => setFocusMode(!focusMode)} title="Focus Mode">
              <span>🎯</span>
            </button>
            <div className="theme-switcher">
              <button className={`theme-btn ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')} title="Light">☀️</button>
              <button className={`theme-btn ${theme === 'sepia' ? 'active' : ''}`} onClick={() => setTheme('sepia')} title="Sepia">📜</button>
              <button className={`theme-btn ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')} title="Dark">🌙</button>
            </div>
            <div className="nav-divider"></div>
            {user ? (
              <>
                <button className="nav-btn" onClick={() => navigate('/profile')} title="Profile">👤</button>
                <button className="btn-logout" onClick={handleLogout}>Logout</button>
              </>
            ) : (
              <button className="btn-login" onClick={() => navigate('/login')}>Login</button>
            )}
          </div>
        </div>
      </nav>

      {/* Progress Bar */}
      <div className={`progress-section ${focusMode ? 'hidden' : ''}`}>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
          <div className="progress-milestone" style={{ left: '25%' }}></div>
          <div className="progress-milestone" style={{ left: '50%' }}></div>
          <div className="progress-milestone" style={{ left: '75%' }}></div>
        </div>
        <div className="progress-info">
          <span className="progress-stats">
            <strong>{stats.words.toLocaleString()}</strong> / {dailyGoal.toLocaleString()} words
          </span>
          <span className="session-stats">
            +{sessionWords} this session
          </span>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="toast toast-success">
          <span>✓</span> {successMessage}
        </div>
      )}
      {error && (
        <div className="toast toast-error">
          <span>⚠️</span> {error}
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      <div className="editor-container">
        {/* Left Sidebar */}
        <aside className={`editor-sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${focusMode ? 'hidden' : ''}`}>
          <button className="sidebar-toggle" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            {sidebarCollapsed ? '→' : '←'}
          </button>

          {!sidebarCollapsed && (
            <div className="sidebar-scroll">
              {/* AI Generation Panel */}
              <div className="sidebar-panel primary">
                <div className="panel-header">
                  <h3><span className="panel-icon">✨</span> AI Generation</h3>
                </div>
                
                <div className="control-section">
                  <label className="control-label">Writing Tone</label>
                  <div className="tone-grid">
                    {toneOptions.map(t => (
                      <button 
                        key={t.id} 
                        className={`tone-card ${tone === t.id ? 'active' : ''}`}
                        onClick={() => setTone(t.id)}
                      >
                        <span className="tone-icon">{t.icon}</span>
                        <span className="tone-label">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="control-section">
                  <label className="control-label">Length</label>
                  <div className="length-cards">
                    {lengthOptions.map(l => (
                      <button 
                        key={l.id}
                        className={`length-card ${length === l.id ? 'active' : ''}`}
                        onClick={() => setLength(l.id)}
                      >
                        <span className="length-icon">{l.icon}</span>
                        <span className="length-name">{l.id}</span>
                        <span className="length-meta">{l.time}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="control-section">
                  <label className="control-label">Options to Generate</label>
                  <div className="options-selector">
                    {[1, 2, 3].map(n => (
                      <button 
                        key={n}
                        className={`option-btn ${optionsCount === n ? 'active' : ''}`}
                        onClick={() => setOptionsCount(n)}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="control-section">
                  <label className="control-label">
                    Direction <span className="optional">(optional)</span>
                  </label>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="E.g., Add a plot twist, introduce a villain, create tension..."
                    className="direction-input"
                    rows="2"
                  />
                  <div className="quick-prompts">
                    {quickPrompts.slice(0, 3).map(qp => (
                      <button 
                        key={qp.label}
                        className="quick-prompt-btn"
                        onClick={() => setCustomPrompt(qp.prompt)}
                      >
                        {qp.icon} {qp.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleGenerate()}
                  disabled={loading || !content.trim()}
                  className="btn-generate"
                >
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <span className="btn-icon">✨</span>
                      <span>Generate Continuation</span>
                    </>
                  )}
                </button>
                <p className="shortcut-hint">Press <kbd>Ctrl</kbd> + <kbd>G</kbd></p>
              </div>

              {/* Stats Panel */}
              <div className="sidebar-panel">
                <div className="panel-header">
                  <h3><span className="panel-icon">📊</span> Statistics</h3>
                </div>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-value">{stats.words.toLocaleString()}</div>
                    <div className="stat-label">Words</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{stats.characters.toLocaleString()}</div>
                    <div className="stat-label">Characters</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{stats.paragraphs}</div>
                    <div className="stat-label">Paragraphs</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{stats.readingTime}m</div>
                    <div className="stat-label">Read Time</div>
                  </div>
                </div>
              </div>

              {/* Actions Panel */}
              <div className="sidebar-panel">
                <div className="panel-header">
                  <h3><span className="panel-icon">⚡</span> Actions</h3>
                </div>
                <div className="action-list">
                  <button onClick={saveToHistory} className="action-btn primary">
                    <span className="action-icon">💾</span>
                    <span className="action-text">Save to History</span>
                    <kbd>Ctrl+S</kbd>
                  </button>
                  <button onClick={handleDownload} className="action-btn">
                    <span className="action-icon">📥</span>
                    <span className="action-text">Download TXT</span>
                  </button>
                  <button onClick={() => setShowChapterModal(true)} className="action-btn">
                    <span className="action-icon">📑</span>
                    <span className="action-text">Add Chapter</span>
                  </button>
                  <button onClick={handleNewStory} className="action-btn danger">
                    <span className="action-icon">➕</span>
                    <span className="action-text">New Story</span>
                  </button>
                </div>
              </div>

              {/* Chapters Panel */}
              {chapters.length > 0 && (
                <div className="sidebar-panel">
                  <div className="panel-header">
                    <h3><span className="panel-icon">📚</span> Chapters</h3>
                  </div>
                  <div className="chapters-list">
                    {chapters.map((ch, idx) => (
                      <div key={ch.id} className="chapter-item">
                        <span className="chapter-num">{idx + 1}</span>
                        <span className="chapter-title">{ch.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>

        {/* Main Editor Area */}
        <main className={`editor-main ${focusMode ? 'focus' : ''}`}>
          {/* Toolbar */}
          <div className={`editor-toolbar ${focusMode ? 'minimal' : ''}`}>
            <div className="toolbar-left">
              <div className="toolbar-group">
                <button onClick={handleUndo} disabled={historyIndex <= 0} className="toolbar-btn" title="Undo">
                  ↶
                </button>
                <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="toolbar-btn" title="Redo">
                  ↷
                </button>
              </div>
              <div className="toolbar-divider"></div>
              <div className="font-size-control">
                <button className={`size-btn ${fontSize === 'small' ? 'active' : ''}`} onClick={() => setFontSize('small')}>A</button>
                <button className={`size-btn medium ${fontSize === 'medium' ? 'active' : ''}`} onClick={() => setFontSize('medium')}>A</button>
                <button className={`size-btn large ${fontSize === 'large' ? 'active' : ''}`} onClick={() => setFontSize('large')}>A</button>
              </div>
              {focusMode && (
                <button onClick={() => setFocusMode(false)} className="toolbar-btn exit-focus">
                  Exit Focus Mode
                </button>
              )}
            </div>
            <div className="toolbar-right">
              <span className="word-count">
                <strong>{stats.words.toLocaleString()}</strong> words
              </span>
              <span className="reading-time">{stats.readingTime} min read</span>
            </div>
          </div>

          {/* Writing Area */}
          <div className="editor-content" ref={contentRef}>
            <div className="editor-paper">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={handleContentChange}
                placeholder="Begin your story here...

Let your imagination flow freely. Write your opening paragraph, then use the AI to generate creative continuations.

Tips to get started:
• Create a compelling hook to draw readers in
• Set the scene with vivid sensory details
• Introduce your main character
• Press Ctrl+G to generate AI continuations anytime"
                className="story-textarea"
                spellCheck="true"
              />
            </div>
          </div>

          {/* Floating Action Buttons */}
          <div className="floating-actions">
            {showQuickGenerate && (
              <div className="quick-generate-panel">
                <div className="quick-panel-header">
                  <span>Quick Generate</span>
                  <button onClick={() => setShowQuickGenerate(false)}>✕</button>
                </div>
                <div className="quick-prompts-grid">
                  {quickPrompts.map(qp => (
                    <button 
                      key={qp.label}
                      className="quick-action-btn"
                      onClick={() => handleGenerate(qp.prompt)}
                    >
                      <span>{qp.icon}</span>
                      <span>{qp.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <button 
              className="fab fab-secondary"
              onClick={() => setShowQuickGenerate(!showQuickGenerate)}
              title="Quick prompts"
            >
              ⚡
            </button>
            
            <button 
              className="fab fab-primary"
              onClick={() => handleGenerate()}
              disabled={loading || !content.trim()}
              title="Generate Continuation (Ctrl+G)"
            >
              {loading ? '⏳' : '✨'}
            </button>
          </div>
        </main>
      </div>

      {/* Options Modal */}
      {showOptionsModal && (
        <div className="modal-overlay" onClick={() => setShowOptionsModal(false)}>
          <div className="options-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-section">
                <h2>✨ Choose Your Path</h2>
                <p className="modal-subtitle">Select the continuation that best fits your story</p>
              </div>
              <button className="modal-close" onClick={() => setShowOptionsModal(false)}>✕</button>
            </div>
            
            <div className="options-container">
              {generatedOptions.map((option, index) => (
                <div key={option.id} className={`option-card variant-${index + 1}`}>
                  <div className="option-header">
                    <div className="option-badge">
                      {index === 0 ? '🅰️ Option A' : index === 1 ? '🅱️ Option B' : '🅲 Option C'}
                    </div>
                    <div className="option-meta">
                      <span className="meta-tag tone">{option.tone}</span>
                      <span className="meta-tag length">{option.length}</span>
                    </div>
                  </div>
                  <div className="option-preview">
                    {option.text}
                  </div>
                  <div className="option-footer">
                    <span className="word-info">{option.text.split(/\s+/).length} words</span>
                    <button className="btn-select" onClick={() => handleSelectOption(option)}>
                      <span>✓</span> Select This
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="modal-actions">
              <button className="btn-regenerate" onClick={() => { setShowOptionsModal(false); handleGenerate(); }}>
                🔄 Regenerate Options
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chapter Modal */}
      {showChapterModal && (
        <div className="modal-overlay" onClick={() => setShowChapterModal(false)}>
          <div className="chapter-modal" onClick={(e) => e.stopPropagation()}>
            <h3>📑 Add New Chapter</h3>
            <input
              type="text"
              value={newChapterTitle}
              onChange={(e) => setNewChapterTitle(e.target.value)}
              placeholder="Enter chapter title..."
              className="chapter-input"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleAddChapter()}
            />
            <div className="modal-buttons">
              <button className="btn-cancel" onClick={() => setShowChapterModal(false)}>Cancel</button>
              <button className="btn-confirm" onClick={handleAddChapter}>Add Chapter</button>
            </div>
          </div>
        </div>
      )}

      {/* Shortcuts Modal */}
      {showShortcuts && (
        <div className="modal-overlay" onClick={() => setShowShortcuts(false)}>
          <div className="shortcuts-modal" onClick={(e) => e.stopPropagation()}>
            <h3>⌨️ Keyboard Shortcuts</h3>
            <div className="shortcuts-list">
              {shortcuts.map((s, i) => (
                <div key={i} className="shortcut-item">
                  <span className="shortcut-action">{s.action}</span>
                  <span className="shortcut-keys">
                    {s.keys.map((k, j) => (
                      <kbd key={j}>{k}</kbd>
                    ))}
                  </span>
                </div>
              ))}
            </div>
            <button className="btn-close-modal" onClick={() => setShowShortcuts(false)}>Got it!</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Editor;
