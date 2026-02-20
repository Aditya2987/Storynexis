import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { saveStory } from '../utils/api';
import './Editor.css';
import StoryBible from './StoryBible';
import RichTextEditor from './RichTextEditor';
import AmbientPlayer from './AmbientPlayer';
import { stripHtml } from '../utils/textUtils';
import { useTTS } from '../hooks/useTTS';
import { exportToPdf, exportToEpub } from '../utils/exportUtils';
import { generateContinuationStream, getBibleItems, getStoryById, generateBibleItems } from '../utils/api';
import { tonePalette } from '../constants/landingPageData';


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

  // UI states
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [saveStatus, setSaveStatus] = useState('saved'); // saved, saving, error
  const [lastSaved, setLastSaved] = useState(null);
  const [autoSaveTimer, setAutoSaveTimer] = useState(null);
  // sidebarCollapsed removed - sidebar is always open in normal mode
  const [focusMode, setFocusMode] = useState(false);

  const [showShortcuts, setShowShortcuts] = useState(false);
  const [theme, setTheme] = useState('light'); // light, dark, sepia
  const [fontSize, setFontSize] = useState('medium'); // small, medium, large
  const [sidebarTab, setSidebarTab] = useState('chapters'); // chapters, bible

  // AI Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedOptions, setGeneratedOptions] = useState([]);
  const [showGenerationModal, setShowGenerationModal] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  const [tone, setTone] = useState('Adaptive');
  const [length, setLength] = useState('Medium');
  const [loreItems, setLoreItems] = useState([]);
  const [editorUpdateTrigger, setEditorUpdateTrigger] = useState(0);
  const abortControllerRef = useRef(null);
  const initialStreamAbortRef = useRef(null);
  const isSavingRef = useRef(false); // Prevent concurrent saves
  const errorTimerRef = useRef(null); // Track error message timer
  const successTimerRef = useRef(null); // Track success message timer

  // Whether the editor is currently streaming initial story generation
  const [isStreamingInitial, setIsStreamingInitial] = useState(false);
  const [bibleUpdateTrigger, setBibleUpdateTrigger] = useState(0);

  // Lore-Aware Context Fetching
  useEffect(() => {
    if (storyId) {
      getBibleItems(storyId)
        .then(items => setLoreItems(items || []))
        .catch(err => console.error("Failed to fetch lore:", err));
    } else {
      setLoreItems([]);
    }
  }, [storyId]);




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



  const shortcuts = [
    { keys: ['Ctrl', 'S'], action: 'Save to history' },
    { keys: ['Ctrl', 'Z'], action: 'Undo' },
    { keys: ['Ctrl', 'Y'], action: 'Redo' },
    { keys: ['Ctrl', 'F'], action: 'Toggle focus mode' },
    { keys: ['Esc'], action: 'Exit focus mode' },
  ];

  // Load story from location state or localStorage
  useEffect(() => {
    const loadStoryData = async () => {
      // ── NEW: stream prompt from home page ──────────────────────────────────
      if (location.state?.streamPrompt) {
        const { streamPrompt, initialTitle, initialGenre } = location.state;
        console.log('🌊 Stream prompt detected — starting initial generation');

        setStoryId(null);
        setTitle(initialTitle || '');
        setGenre(initialGenre || 'Any Genre');
        setContent('');
        setChapters([]);
        setIsStreamingInitial(true);

        initialStreamAbortRef.current = new AbortController();
        const signal = initialStreamAbortRef.current.signal;
        let accumulatedText = '';

        try {
          await generateContinuationStream(
            {
              prompt: streamPrompt,
              tone: 'Adaptive',
              length: 'Long',
              max_length: 2000,
            },
            (chunk) => {
              // onChunk — append and render word-by-word
              accumulatedText += chunk;
              const paragraphs = accumulatedText
                .split('\n')
                .filter(line => line.trim())
                .map(line => `<p>${line}</p>`)
                .join('');
              setContent(paragraphs);
              setEditorUpdateTrigger(prev => prev + 1);
            },
            async (fullText) => {
              // onComplete
              const paragraphs = fullText
                .split('\n')
                .filter(line => line.trim())
                .map(line => `<p>${line}</p>`)
                .join('');
              setContent(paragraphs);
              setEditorUpdateTrigger(prev => prev + 1);
              setIsStreamingInitial(false);
              console.log('✅ Initial story stream complete');

              // ── Auto-save and Auto-extract Bible details ──────────────────
              // Note: we pass `paragraphs` explicitly because the `content`
              // state from the saveToCloud closure is stale at this point.
              try {
                setSuccessMessage('✨ Populating Story Bible...');
                const savedStory = await saveStory(
                  {
                    title: initialTitle || 'Untitled Story',
                    genre: initialGenre || 'Any Genre',
                    content: paragraphs,
                    settings: {},
                    status: 'draft',
                  },
                  null // new story
                );

                const currentId = savedStory?.id;
                if (currentId) {
                  setStoryId(currentId);
                  console.log('🔮 Auto-extracting Story Bible...');
                  await generateBibleItems(currentId);

                  const updatedLore = await getBibleItems(currentId);
                  setLoreItems(updatedLore || []);
                  setBibleUpdateTrigger(prev => prev + 1);
                  setSuccessMessage('✨ Story Bible populated!');
                  setTimeout(() => setSuccessMessage(''), 3000);
                  console.log('✨ Story Bible auto-populated');
                } else {
                  setSuccessMessage('');
                }
              } catch (autoErr) {
                console.error('Failed to auto-populate Story Bible:', autoErr);
                setSuccessMessage('');
              }
            },
            (err) => {
              if (signal.aborted) return;
              console.error('Initial stream error:', err);
              setError('Story generation failed. You can still write manually.');
              setTimeout(() => setError(''), 4000);
              setIsStreamingInitial(false);
            },
            signal
          );
        } catch (err) {
          if (!signal.aborted) {
            console.error('Initial stream catch:', err);
            setIsStreamingInitial(false);
          }
        }
        return; // Don't fall through to loadedStory or sessionStorage
      }

      // ── Existing: load story passed from dashboard / profile ────────────────
      if (location.state?.loadedStory) {
        let story = location.state.loadedStory;

        // If story has ID but no content, fetch full story
        if (story.id && typeof story.id === 'string' && !/^\d+$/.test(story.id) && !story.content) {
          try {
            console.log('Fetching full story content for:', story.id);
            const fullStory = await getStoryById(story.id);
            story = { ...story, ...fullStory };
          } catch (err) {
            console.error('Failed to fetch full story:', err);
            setError('Failed to load story content');
          }
        }

        // Only set storyId if it's a valid Firestore ID
        if (story.id && typeof story.id === 'string' && !/^\d+$/.test(story.id)) {
          setStoryId(story.id);
          console.log('Loading existing story via navigation:', story.id);
        } else {
          setStoryId(null);
          console.log('New story - will create in Firestore on first save');
        }

        setTitle(story.title || '');
        setGenre(story.genre || 'Any Genre');
        setContent(story.content || '');
        setChapters(story.chapters || []);
        setSessionStartWords(story.content?.split(/\s+/).filter(w => w).length || 0);
      } else {
        const sessionData = sessionStorage.getItem('currentStory');
        if (sessionData) {
          try {
            const data = JSON.parse(sessionData);
            setTitle(data.title || '');
            setGenre(data.genre || 'Any Genre');
            setContent(data.content || '');
            setChapters(data.chapters || []);
            console.log('Restored story from session storage');
          } catch (e) {
            console.warn('Corrupt session data, ignoring:', e);
            sessionStorage.removeItem('currentStory');
          }
        }
      }
    };

    loadStoryData();

    // Cleanup: abort any in-progress initial stream when location changes
    return () => {
      if (initialStreamAbortRef.current) {
        initialStreamAbortRef.current.abort();
      }
    };
  }, [location]);

  // TTS Hook
  const { isSpeaking, isPaused, speak, pause, resume, stop } = useTTS();

  // Calculate stats
  useEffect(() => {
    try {
      const text = stripHtml(content).trim();
      const words = text ? text.split(/\s+/).filter(w => w).length : 0;
      const characters = text.length;
      const paragraphs = text ? text.split(/\n\n+/).filter(p => p.trim()).length : 0;
      const sentences = text ? text.split(/[.!?]+/).filter(s => s.trim()).length : 0;
      const readingTime = Math.ceil(words / 200);

      setStats({ words, characters, paragraphs, sentences, readingTime });
    } catch (e) {
      console.error("Error calculating stats:", e);
    }
  }, [content]);

  const saveToSession = useCallback(() => {
    sessionStorage.setItem('currentStory', JSON.stringify({
      title, genre, content, chapters,
      timestamp: new Date().toISOString()
    }));
  }, [title, genre, content, chapters]);

  // Save to cloud (Firestore via backend API)
  const saveToCloud = useCallback(async () => {
    if (!user) return null;
    if (!title.trim()) return null;
    if (isSavingRef.current) return null; // Prevent concurrent saves

    isSavingRef.current = true;
    try {
      setSaveStatus('saving');
      console.log('Saving to cloud...', storyId ? `Updating ${storyId}` : 'Creating new');

      const storyData = {
        title: title.trim(),
        genre,
        content,
        settings: {},
        status: 'draft'
      };

      const response = await saveStory(storyData, storyId); // Pass storyId for updates

      // If this is a new story, set the ID
      if (!storyId && response.id) {
        setStoryId(response.id);
        console.log('New story created with ID:', response.id);
      }

      setSaveStatus('saved');
      setLastSaved(new Date());
      console.log('✅ Story saved to cloud');
      return response;
    } catch (error) {
      console.error('Error saving to cloud:', error);
      setSaveStatus('error');
      return null;
    } finally {
      isSavingRef.current = false;
    }
  }, [user, storyId, title, genre, content]);

  // Manual save (with user feedback)
  const saveToHistory = useCallback(async () => {
    if (!user) {
      setError('Please sign in to save your story');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (!title.trim()) {
      setError('Please add a title to your story before saving');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      setSaveStatus('saving');
      await saveToCloud();
      setSuccessMessage('Story saved successfully!');
      setTimeout(() => {
        setSuccessMessage('');
      }, 2000);
    } catch (error) {
      console.error('Error saving story:', error);
      setError('Failed to save story. Please try again.');
      setTimeout(() => setError(''), 3000);
    }
  }, [user, title, saveToCloud]);

  const handleContentChange = (newHtml) => {
    setContent(newHtml);
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


  const handleDownload = async () => {
    try {
      await exportToPdf({
        title,
        content,
        genre,
        chapters,
        author: user?.displayName || 'Storynexis Writer'
      });
      setSuccessMessage('Story downloaded as PDF!');
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (e) {
      setError('Failed to download PDF');
      setTimeout(() => setError(''), 3000);
    }
  };

  const getRelevantLore = (text) => {
    if (!loreItems.length || !text) return '';

    const lowerText = text.toLowerCase();
    const relevant = loreItems.filter(item => lowerText.includes(item.name.toLowerCase()));

    if (relevant.length === 0) return '';

    let context = "Story Context (Use these details):\n";
    relevant.forEach(item => {
      context += `- [${item.category}] ${item.name}: ${item.description}\n`;
      if (item.attributes && Object.keys(item.attributes).length > 0) {
        context += `  Attributes: ${JSON.stringify(item.attributes)}\n`;
      }
    });
    return context + "\n";
  };

  const handleEpubExport = async () => {
    try {
      setSuccessMessage('Generating ePub...');
      await exportToEpub({
        title,
        content,
        storyId,
        chapters,
        author: user?.displayName || 'Storynexis Writer'
      });
      setSuccessMessage('ePub exported successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setError("Failed to export ePub.");
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleSyncBible = useCallback(async () => {
    if (!storyId) return;
    try {
      console.log('🔄 Manually syncing Story Bible...');
      // Ensure latest content is saved first
      await saveToCloud();

      await generateBibleItems(storyId, true); // sync=true

      const updatedLore = await getBibleItems(storyId);
      setLoreItems(updatedLore || []);
      setBibleUpdateTrigger(prev => prev + 1);
      console.log('✨ Story Bible synced successfully');
    } catch (err) {
      console.error('Manual Bible sync failed:', err);
    }
  }, [storyId, saveToCloud]);

  // AI Generation Handlers
  const handleGenerate = async () => {
    console.log('🔮 Regenerate Story triggered');

    if (isGenerating) {
      console.log('Already generating, aborting previous request...');
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setIsGenerating(false);
      return;
    }

    const plainText = stripHtml(content).trim();
    console.log(`Content length: ${plainText.length} chars`);

    if (!plainText && !title) {
      console.warn('No content or title available for context');
      setGenerationError('Please write some text or a title for context.');
      return;
    }

    setGenerationError(null);
    setIsGenerating(true);
    setGeneratedOptions([]);
    setShowGenerationModal(true);

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    const streamId = Date.now().toString();
    let currentText = '';

    try {
      // Prepare context: rewrite the full story with lore
      console.log('Preparing generation context...');
      const loreContext = getRelevantLore(plainText);
      console.log(`Lore context found: ${loreContext.length > 0 ? 'Yes' : 'No'} (${loreContext.length} chars)`);

      const promptBase = plainText || `Title: ${title}\nGenre: ${genre}`;

      const finalPrompt = `${loreContext}Please rewrite the entire following story to improve its quality, flow, and descriptive detail. Incorporate the provided Story Context where relevant. Maintain the original plot and characters. If the story is empty, write a new one based on the title '${title}'.\n\n${promptBase}`;

      console.log(`Final prompt length: ${finalPrompt.length} chars`);

      await generateContinuationStream(
        {
          prompt: finalPrompt,
          tone: 'Adaptive',
          length: 'Long',
          max_length: 2000 // Increased for full rewrites
        },
        (chunk) => {
          currentText += chunk;
          setGeneratedOptions([{
            id: streamId,
            text: currentText,
            tone,
            length
          }]);
        },
        (fullText) => {
          setIsGenerating(false);
          setGeneratedOptions([{
            id: streamId,
            text: fullText,
            tone,
            length
          }]);
        },
        (err) => {
          if (signal.aborted) return;
          console.error('Generation error:', err);
          setGenerationError(err.message || 'Failed to generate.');
          setIsGenerating(false);
        },
        signal
      );
    } catch (error) {
      if (signal.aborted) return;
      console.error('Generation error:', error);
      setGenerationError('Failed to start generation.');
      setIsGenerating(false);
    }
  };

  const handleChoose = (option) => {
    // Replace content logic
    const text = option.text.trim();
    // Convert newlines to paragraphs if raw text
    const formatted = text.split('\n').filter(line => line.trim()).map(line => `<p>${line}</p>`).join('');

    if (window.confirm('This will replace your current story content. Are you sure?')) {
      setContent(formatted);
      setEditorUpdateTrigger(prev => prev + 1); // Force editor update
      setShowGenerationModal(false);

      // ── Auto-extract Bible details after regeneration ─────────────
      // Use `formatted` directly to avoid stale closure from saveToCloud
      const freshContent = formatted;
      setTimeout(async () => {
        try {
          setSuccessMessage('✨ Syncing Story Bible...');
          const savedStory = await saveStory(
            { title, genre, content: freshContent, settings: {}, status: 'draft' },
            storyId
          );
          const currentId = savedStory?.id || storyId;
          if (currentId) {
            if (!storyId) setStoryId(currentId);
            console.log('🔮 Auto-extracting Bible details after regeneration...');
            await generateBibleItems(currentId);
            const updatedLore = await getBibleItems(currentId);
            setLoreItems(updatedLore || []);
            setBibleUpdateTrigger(prev => prev + 1);
            setSuccessMessage('✨ Story Bible synced!');
            setTimeout(() => setSuccessMessage(''), 3000);
          }
        } catch (err) {
          console.error('Extraction failed after regeneration:', err);
          setSuccessMessage('');
        }
      }, 500); // Small delay to ensure content state is settled
    }
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
    sessionStorage.removeItem('currentStory');

    // Redirect to home page
    navigate('/');
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') {
          e.preventDefault();
          saveToHistory();
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
        if (showShortcuts) setShowShortcuts(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [content, focusMode, showShortcuts, saveToHistory, handleUndo, handleRedo]);

  // Cloud Auto-save (debounced 3 seconds)
  useEffect(() => {
    if (!user) return; // Only auto-save for logged-in users
    if (!title.trim()) return; // Don't save untitled stories automatically

    if (autoSaveTimer) clearTimeout(autoSaveTimer);

    const timer = setTimeout(() => {
      saveToCloud();
    }, 3000); // 3 second debounce for cloud saves

    setAutoSaveTimer(timer);
    return () => clearTimeout(timer);
  }, [title, content, genre, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Session storage backup (immediate)
  useEffect(() => {
    saveToSession();
  }, [title, content, genre, saveToSession]);

  return (
    <div className={`editor-wrapper ${getThemeClass()} ${getFontSizeClass()}`}>
      {/* Top Navigation Bar */}
      <nav className={`editor-navbar ${focusMode ? 'hidden' : ''}`}>
        <div className="editor-navbar-content">
          <div className="editor-navbar-left">
            <div className="editor-brand" onClick={() => navigate('/')}>
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
              {saveStatus === 'saving' && <span className="save-badge saving">Saving...</span>}
              {saveStatus === 'saved' && <span className="save-badge saved">Saved{lastSaved && ` ${Math.floor((new Date() - lastSaved) / 1000)}s ago`}</span>}
              {saveStatus === 'error' && <span className="save-badge error">Save failed</span>}
            </div>
          </div>

          <div className="editor-nav-center">
            <div className="genre-selector">
              <select value={genre} onChange={(e) => setGenre(e.target.value)} className="genre-select">
                {genres.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          <div className="editor-nav-actions">
            <AmbientPlayer />
            <button className="nav-btn" onClick={() => setShowShortcuts(true)} title="Keyboard Shortcuts">
              <span>?</span>
            </button>
            <button className={`nav-btn ${focusMode ? 'active' : ''}`} onClick={() => setFocusMode(!focusMode)} title="Focus Mode">
              <span>Focus</span>
            </button>
            <div className="theme-switcher">
              <button className={`theme-btn ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')} title="Light">Light</button>
              <button className={`theme-btn ${theme === 'sepia' ? 'active' : ''}`} onClick={() => setTheme('sepia')} title="Sepia">Sepia</button>
              <button className={`theme-btn ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')} title="Dark">Dark</button>
            </div>
            <div className="nav-divider"></div>
            {user ? (
              <>
                <button className="nav-btn" onClick={() => navigate('/profile')} title="Profile">Profile</button>
                <button className="btn-logout" onClick={handleLogout}>Logout</button>
              </>
            ) : (
              <button className="btn-login" onClick={() => navigate('/login')}>Login</button>
            )}
          </div>
        </div>
      </nav>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="toast toast-success">
          {successMessage}
        </div>
      )}
      {error && (
        <div className="toast toast-error">
          {error}
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      <div className="editor-container">
        {/* Left Sidebar */}
        <aside className={`editor-sidebar ${focusMode ? 'hidden' : ''}`}>
          <div className="sidebar-scroll">
            <div className="sidebar-tabs">
              <button
                className={`sidebar-tab-btn ${sidebarTab === 'chapters' ? 'active' : ''}`}
                onClick={() => setSidebarTab('chapters')}
              >
                Chapters
              </button>
              <button
                className={`sidebar-tab-btn ${sidebarTab === 'bible' ? 'active' : ''}`}
                onClick={() => setSidebarTab('bible')}
              >
                Bible
              </button>
            </div>

            {sidebarTab === 'chapters' ? (
              <>
                {/* AI Generation Panel */}
                {/* AI Assistant removed */}

                {/* Actions Panel */}
                <div className="sidebar-panel">
                  <div className="panel-header">
                    <h3>Actions</h3>
                  </div>
                  <div className="action-list">
                    <button onClick={handleGenerate} className="action-btn primary" title="Rewrite the entire story">
                      <span className="action-text">{isGenerating ? 'Rewriting...' : '✨ Regenerate Story'}</span>
                    </button>
                    <button onClick={saveToHistory} className="action-btn primary">
                      <span className="action-text">Save to History</span>
                      <kbd>Ctrl+S</kbd>
                    </button>
                    <button onClick={handleDownload} className="action-btn">
                      <span className="action-text">Download PDF</span>
                    </button>
                    <button onClick={handleEpubExport} className="action-btn">
                      <span className="action-text">Download ePub</span>
                    </button>

                    <button onClick={handleNewStory} className="action-btn danger">
                      <span className="action-text">New Story</span>
                    </button>
                  </div>
                </div>

                {/* Chapters Panel */}
                {chapters.length > 0 && (
                  <div className="sidebar-panel">
                    <div className="panel-header">
                      <h3>Chapters</h3>
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
              </>
            ) : (
              <StoryBible
                storyId={storyId}
                refreshTrigger={bibleUpdateTrigger}
                onSync={handleSyncBible}
              />
            )}
          </div>
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

              {/* Voice Controls */}
              <div className="toolbar-group">
                {!isSpeaking ? (
                  <button onClick={() => speak(content)} className="toolbar-btn" title="Read Aloud">
                    ▶ <span style={{ fontSize: '0.8rem', marginLeft: '4px' }}>Read</span>
                  </button>
                ) : (
                  <>
                    {isPaused ? (
                      <button onClick={resume} className="toolbar-btn" title="Resume Reading">
                        ▶ <span style={{ fontSize: '0.8rem', marginLeft: '4px' }}>Resume</span>
                      </button>
                    ) : (
                      <button onClick={pause} className="toolbar-btn active" title="Pause Reading">
                        ⏸ <span style={{ fontSize: '0.8rem', marginLeft: '4px' }}>Pause</span>
                      </button>
                    )}
                    <button onClick={stop} className="toolbar-btn" title="Stop Reading">
                      ⏹
                    </button>
                  </>
                )}
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
              <RichTextEditor
                key={storyId || 'unsaved'}
                content={content}
                onChange={handleContentChange}
                placeholder="Begin your story here..."
                editorUpdateTrigger={editorUpdateTrigger}
              />
            </div>
          </div>


        </main>
      </div>





      {/* Generation Modal */}
      {showGenerationModal && (
        <div className="modal-overlay" onClick={() => !isGenerating && setShowGenerationModal(false)}>
          <div className="chapter-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', margin: 0 }}>{isGenerating ? 'Drafting Improvements...' : 'Review Rewritten Story'}</h3>
              <button onClick={() => {
                if (isGenerating && abortControllerRef.current) {
                  abortControllerRef.current.abort();
                  abortControllerRef.current = null;
                  setIsGenerating(false);
                }
                setShowGenerationModal(false);
              }} className="close-btn" style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' }}>&times;</button>
            </div>

            {generationError ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#ef4444' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
                <h4 style={{ margin: '0 0 10px', fontWeight: '600' }}>Generation Failed</h4>
                <p style={{ margin: 0 }}>{generationError}</p>
              </div>
            ) : isGenerating && generatedOptions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div className="loading-spinner" style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
                <p style={{ color: '#6b7280', marginBottom: '16px' }}>AI is expanding your story...</p>
                <button onClick={() => {
                  if (abortControllerRef.current) {
                    abortControllerRef.current.abort();
                    abortControllerRef.current = null;
                  }
                  setIsGenerating(false);
                  setShowGenerationModal(false);
                }} style={{ padding: '8px 24px', background: 'none', border: '1px solid #d1d5db', borderRadius: '8px', color: '#6b7280', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600', transition: 'all 0.2s' }}>
                  Cancel
                </button>
              </div>
            ) : (
              <div className="options-grid" style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '60vh', overflowY: 'auto' }}>
                {generatedOptions.map((option, idx) => (
                  <div key={idx} className="option-card" onClick={() => handleChoose(option)} style={{ padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <div className="option-meta" style={{ marginBottom: '8px' }}>
                      <span className="tone-tag" style={{ fontSize: '0.75rem', fontWeight: '600', color: tonePalette[option.tone] || '#666', background: '#f3f4f6', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>{option.tone}</span>
                    </div>
                    <p className="option-text" style={{ fontSize: '1rem', lineHeight: '1.6', color: '#374151', whiteSpace: 'pre-wrap' }}>{option.text}</p>
                    <div className="option-select-hint" style={{ fontSize: '0.8rem', color: '#3b82f6', marginTop: '8px', fontWeight: '500', textAlign: 'right' }}>Click to Replace Original Story →</div>
                  </div>
                ))}
                {isGenerating && (
                  <div style={{ padding: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: '#6b7280', fontSize: '0.9rem', fontStyle: 'italic' }}>Continuing generation...</span>
                    <button onClick={() => {
                      if (abortControllerRef.current) {
                        abortControllerRef.current.abort();
                        abortControllerRef.current = null;
                      }
                      setIsGenerating(false);
                    }} style={{ padding: '6px 20px', background: 'none', border: '1px solid #d1d5db', borderRadius: '8px', color: '#6b7280', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', transition: 'all 0.2s' }}>
                      Stop Generating
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Shortcuts Modal */}
      {showShortcuts && (
        <div className="modal-overlay" onClick={() => setShowShortcuts(false)}>
          <div className="shortcuts-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Keyboard Shortcuts</h3>
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
