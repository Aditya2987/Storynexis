import { useMemo, useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Signup from './components/Signup';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './components/Dashboard';
import Editor from './components/Editor';
import { generateContinuation, generateContinuationStream } from './utils/api';
import './App.css';
import StoryGenerationLoader from './components/StoryGenerationLoader';
import {
  tonePalette,
  genrePalette,
  navLinks,
  heroGenres,
  featureHighlights
} from './constants/landingPageData';

const getToneColor = (tone) => tonePalette[tone] || tonePalette.Default;

const howItWorksSteps = [
  {
    title: 'Imagine',
    description: 'A title, a premise, or just a mood. That’s enough to begin.',
    number: '1',
  },
  {
    title: 'Generate',
    description: 'The AI drafts an opening that fits your genre and intent.',
    number: '2',
  },
  {
    title: 'Shape',
    description: 'Edit freely. Ask for continuations. Steer the direction.',
    number: '3',
  },
  {
    title: 'Keep',
    description: 'Your work saves automatically. Come back to any draft.',
    number: '4',
  },
];

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Fantasy Author',
    text: 'I finished my 80k-word novel in three months instead of a year. The branching continuations alone saved me weeks of plotting.',
    initials: 'SC',
  },
  {
    name: 'Marcus Johnson',
    role: 'Game Writer',
    text: 'Perfect for prototyping quest dialogues. I draft branching scenes in Storynexis and export them straight into our design doc.',
    initials: 'MJ',
  },
  {
    name: 'Elena Rodriguez',
    role: 'Screenwriter',
    text: 'I sketch alternate scenes here before committing to a full script. The tone matching keeps my characters consistent across drafts.',
    initials: 'ER',
  },
];

const personaProfiles = [
  {
    title: 'Novel Teams',
    description: 'Outline sagas with editors watching pacing and POV consistency.',
    metrics: '4 co-authors / 120k words',
  },
  {
    title: 'Game Lore Leads',
    description: 'Author branching quests, faction logs, and seasonal updates.',
    metrics: '19 live worlds / 80 quests',
  },
  {
    title: 'Screenwriters',
    description: 'Prototype alternate scenes and maintain emotional beats.',
    metrics: '8 acts / 24 scene swaps',
  },
  {
    title: 'Educators & Hobbyists',
    description: 'Create bedtime tales, class exercises, or narrative podcasts.',
    metrics: '2x faster draft cycles',
  },
];

const faqList = [
  {
    question: 'Can I edit the AI output?',
    answer: 'Absolutely. Each continuation is editable, and you can lock tone + pacing before generating the next beat.'
  },
  {
    question: 'How does Storynexis stay on-voice?',
    answer: 'We track prior beats, high-level synopsis notes, and a live tone matrix so continuations inherit your narrative DNA.'
  },
  {
    question: 'Is there a word limit?',
    answer: 'You can grow novels well past 100k words. Insight cards keep tabs on length while you branch chapters.'
  },
  {
    question: 'Do you store my stories?',
    answer: 'Projects remain private in your browser unless you opt into cloud sync. Offline demo mode keeps everything on-device.'
  },
];

const previewChapters = [
  { title: 'Hook', text: 'The aurora cracked like stained glass as Elara stepped onto the skybridge.' },
  { title: 'Rising Stakes', text: 'Every city light blinked twice—the signal that the archives were awake.' },
  { title: 'Cliffhanger', text: 'A second sun rose behind the horizon, carrying her name on its surface.' },
];

const partnerBrands = ['Mythos Labs', 'Nova Ink', 'Orbit Press', 'IndieForge', 'Studio Lantern'];

const showcaseStories = [
  {
    title: 'Embers of Lyria',
    genre: 'Fantasy',
    blurb: 'Crystal-powered guilds wage quiet wars across floating archipelagos. A young mage discovers her power could unite or destroy them all.',
    wordCount: '45,000',
    chapters: 24,
    cover: '🏰',
  },
  {
    title: 'Static Bloom',
    genre: 'Science Fiction',
    blurb: 'An archivist deciphers feelings left inside abandoned radio towers. Each frequency reveals memories of a world before the silence.',
    wordCount: '32,000',
    chapters: 18,
    cover: '🛸',
  },
  {
    title: 'Velvet Orbit',
    genre: 'Romance',
    blurb: 'Starship diplomats fall for each other between ceasefire negotiations. But their love could spark an interstellar incident.',
    wordCount: '28,000',
    chapters: 15,
    cover: '💫',
  },
  {
    title: 'Midnight Protocol',
    genre: 'Thriller',
    blurb: 'A cybersecurity expert uncovers a conspiracy that reaches the highest levels. Trust no one, not even your own code.',
    wordCount: '52,000',
    chapters: 28,
    cover: '🔐',
  },
];

// Typewriter hook for hero text
const useTypewriter = (text, speed = 50, delay = 0) => {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let timeout;
    let charIndex = 0;

    const startTyping = () => {
      timeout = setTimeout(() => {
        if (charIndex < text.length) {
          setDisplayText(text.substring(0, charIndex + 1));
          charIndex++;
          startTyping();
        } else {
          setIsComplete(true);
        }
      }, speed);
    };

    const delayTimeout = setTimeout(startTyping, delay);
    return () => {
      clearTimeout(timeout);
      clearTimeout(delayTimeout);
    };
  }, [text, speed, delay]);

  return { displayText, isComplete };
};

// Animated counter hook
const useCounter = (end, duration = 2000, start = 0) => {
  const [count, setCount] = useState(start);
  const countRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          let startTime;
          const animate = (currentTime) => {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);
            setCount(Math.floor(progress * (end - start) + start));
            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };
          requestAnimationFrame(animate);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    if (countRef.current) {
      observer.observe(countRef.current);
    }

    return () => observer.disconnect();
  }, [end, duration, start]);

  return { count, ref: countRef };
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

function AppContent() {
  const navigate = useNavigate();
  const [genre, setGenre] = useState('Any Genre');
  const [storyTitle, setStoryTitle] = useState('');
  const [openingLine, setOpeningLine] = useState('');
  const [storyBeats, setStoryBeats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [generatedOptions, setGeneratedOptions] = useState([]);
  const [copyStatus, setCopyStatus] = useState('');
  const [activeFaq, setActiveFaq] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Ref to track cancellation
  const abortControllerRef = useRef(null);
  const generationAbortRef = useRef(false); // Keep this for logic checks, or rely on controller

  const API_URL = 'http://localhost:8000';

  // Helper function to make authenticated API calls for backward compatibility
  const makeAuthenticatedCall = async (params, signal) => {
    try {
      return await generateContinuation(params, null, signal);
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Request aborted via makeAuthenticatedCall');
        throw error;
      }
      console.error('API call failed:', error);
      throw error;
    }
  };

  const fullStoryText = storyBeats.map((beat) => beat.text).join('\n\n');

  const stats = useMemo(() => {
    const cleanStory = fullStoryText.trim();
    const wordCount = cleanStory ? cleanStory.split(/\s+/).length : 0;
    const readingMinutes = wordCount ? Math.max(1, Math.ceil(wordCount / 150)) : 0;
    return {
      chapters: storyBeats.length,
      words: wordCount,
      readingMinutes,
    };
  }, [storyBeats, fullStoryText]);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleFaqToggle = (index) => {
    setActiveFaq((prev) => (prev === index ? null : index));
  };

  const handleCancelGeneration = () => {
    generationAbortRef.current = true;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    console.log('Generation cancelled by user');
  };

  const handleStartStory = async () => {
    const trimmedTitle = storyTitle.trim();
    const trimmedOpening = openingLine.trim();

    if (!trimmedTitle && !trimmedOpening) {
      setError('Please enter at least a story title or story idea.');
      return;
    }

    setError(null);
    generationAbortRef.current = false; // Reset abort flag

    // Create new AbortController
    if (abortControllerRef.current) {
      abortControllerRef.current.abort(); // ensure prev is cleared
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setLoading(true);

    try {
      let finalTitle = trimmedTitle || 'Untitled Story';
      let finalOpening = '';
      let needsGeneration = false;

      // Determine if we need to generate content
      if (!trimmedTitle || !trimmedOpening) {
        needsGeneration = true;
      }

      // If user provided both title and idea, generate opening from both
      if (trimmedTitle && trimmedOpening) {
        console.log('Generating opening from title and idea...');
        finalTitle = trimmedTitle;

        // Generate opening paragraph from the idea
        try {
          const openingPrompt = `Write a compelling story opening for a ${genre || 'fiction'} story titled "${trimmedTitle}" based on this idea: "${trimmedOpening}".

Requirements:
- Write 300-500 words (3-5 paragraphs)
- Establish the setting and mood
- Introduce the main character
- Create intrigue that hooks the reader
- Use vivid details and strong prose
- End with a complete sentence
- Write ONLY the story, no meta-commentary`;

          const openingOptions = await makeAuthenticatedCall({
            prompt: openingPrompt,
            tone: 'Adaptive',
            length: 'Long',
            count: 1,
            max_length: 800
          });

          if (generationAbortRef.current) return; // Check if cancelled

          console.log('API Response (title+idea):', openingOptions);

          if (!openingOptions || !Array.isArray(openingOptions) || openingOptions.length === 0) {
            console.error('Invalid response format:', openingOptions);
            throw new Error('Invalid response from server');
          }

          let generatedText = openingOptions[0].text.trim();

          // Ensure text ends with proper punctuation
          const lastChar = generatedText[generatedText.length - 1];
          if (!['.', '!', '?', '"', "'"].includes(lastChar)) {
            // Find the last complete sentence
            const lastPeriod = generatedText.lastIndexOf('.');
            const lastExclamation = generatedText.lastIndexOf('!');
            const lastQuestion = generatedText.lastIndexOf('?');
            const lastPunctuation = Math.max(lastPeriod, lastExclamation, lastQuestion);

            if (lastPunctuation > 0) {
              generatedText = generatedText.substring(0, lastPunctuation + 1).trim();
              console.log('Trimmed incomplete sentence');
            } else {
              generatedText += '.';
            }
          }

          finalOpening = generatedText;
          console.log('Generated opening from title+idea:', finalOpening.substring(0, 100) + '...');
        } catch (openingError) {
          if (generationAbortRef.current) return;
          console.error('Error generating opening:', openingError);
          console.error('Error details:', openingError.message, openingError.status);
          if (openingError.status === 401) {
            setError('Your session has expired. Please sign out and sign in again.');
          } else if (openingError.message?.includes('timeout') || openingError.name === 'AbortError') {
            setError('Generation is taking too long. The server may still be processing. Please wait and try again.');
          } else {
            setError(`Failed to generate story opening: ${openingError.message || 'Please try again.'}`);
          }
          setLoading(false);
          return;
        }
      }
      // If only idea provided, generate both title and story opening
      else if (!trimmedTitle && trimmedOpening) {
        console.log('Generating title and opening from idea...');

        // Generate title first
        try {
          const titlePrompt = `Based on this story idea: "${trimmedOpening.substring(0, 200)}", create a compelling story title (5-8 words maximum). Reply with ONLY the title, no quotes or extra text.`;

          const titleOptions = await makeAuthenticatedCall({
            prompt: titlePrompt,
            tone: 'Adaptive',
            length: 'Short',
            count: 1,
            max_length: 40
          }, signal);

          if (generationAbortRef.current) return;

          console.log('API Response (title):', titleOptions);

          if (!titleOptions || !Array.isArray(titleOptions) || titleOptions.length === 0) {
            console.error('Invalid title response:', titleOptions);
            throw new Error('Invalid title response from server');
          }

          finalTitle = titleOptions[0].text.trim().replace(/^["']|["']$/g, '').split('\n')[0].split('.')[0];
          console.log('Generated title:', finalTitle);
        } catch (titleError) {
          console.log('Title generation had an issue:', titleError);
        }

        // Then generate opening paragraph from the idea
        try {
          const openingPrompt = `Write a compelling story opening based on this concept: "${trimmedOpening}".

Requirements:
- Write 300-500 words (3-5 paragraphs)
- Establish the setting and mood
- Introduce the main character
- Create intrigue that hooks the reader
- Use vivid details and strong prose
- End with a complete sentence
- Write ONLY the story, no meta-commentary`;

          const openingOptions = await makeAuthenticatedCall({
            prompt: openingPrompt,
            tone: 'Adaptive',
            length: 'Long',
            count: 1,
            max_length: 800
          });

          if (generationAbortRef.current) return;

          console.log('API Response (idea only):', openingOptions);

          if (!openingOptions || !Array.isArray(openingOptions) || openingOptions.length === 0) {
            console.error('Invalid opening response:', openingOptions);
            throw new Error('Invalid opening response from server');
          }

          let generatedText = openingOptions[0].text.trim();

          // Ensure text ends with proper punctuation
          const lastChar = generatedText[generatedText.length - 1];
          if (!['.', '!', '?', '"', "'"].includes(lastChar)) {
            // Find the last complete sentence
            const lastPeriod = generatedText.lastIndexOf('.');
            const lastExclamation = generatedText.lastIndexOf('!');
            const lastQuestion = generatedText.lastIndexOf('?');
            const lastPunctuation = Math.max(lastPeriod, lastExclamation, lastQuestion);

            if (lastPunctuation > 0) {
              generatedText = generatedText.substring(0, lastPunctuation + 1).trim();
              console.log('Trimmed incomplete sentence');
            } else {
              generatedText += '.';
            }
          }

          finalOpening = generatedText;
          console.log('Generated opening:', finalOpening.substring(0, 100) + '...');
        } catch (openingError) {
          if (generationAbortRef.current) return;
          console.error('Error generating opening:', openingError);
          // Don't use the raw idea as opening - this causes confusion
          setError('Failed to generate story opening. Please try again.');
          setLoading(false);
          return; // Stop here - don't proceed to writing view
        }

        // Verify we have both title and opening before proceeding
        if (!finalTitle || !finalOpening) {
          setError('Failed to generate complete story. Please try again.');
          setLoading(false);
          return;
        }
      }
      // If only title provided, generate opening
      else if (trimmedTitle && !trimmedOpening) {
        console.log('Generating opening from title...');

        const openingPrompt = `Write a compelling story opening for a ${genre || 'fiction'} story titled "${trimmedTitle}".

Requirements:
- Write 300-500 words (3-5 paragraphs)
- Establish the setting and mood
- Introduce the main character
- Create intrigue that hooks the reader
- Use vivid details and strong prose
- End with a complete sentence
- Write ONLY the story, no meta-commentary`;

        try {
          const openingOptions = await makeAuthenticatedCall({
            prompt: openingPrompt,
            tone: 'Adaptive',
            length: 'Long',
            count: 1,
            max_length: 800
          });

          if (generationAbortRef.current) return;

          let generatedText = (openingOptions[0].text || '').trim();

          // Ensure text ends with proper punctuation
          const lastChar = generatedText[generatedText.length - 1];
          if (!['.', '!', '?', '"', "'"].includes(lastChar)) {
            // Find the last complete sentence
            const lastPeriod = generatedText.lastIndexOf('.');
            const lastExclamation = generatedText.lastIndexOf('!');
            const lastQuestion = generatedText.lastIndexOf('?');
            const lastPunctuation = Math.max(lastPeriod, lastExclamation, lastQuestion);

            if (lastPunctuation > 0) {
              generatedText = generatedText.substring(0, lastPunctuation + 1).trim();
              console.log('Trimmed incomplete sentence');
            } else {
              generatedText += '.';
            }
          }

          finalOpening = generatedText;
          console.log('Generated opening:', finalOpening.substring(0, 100) + '...');
        } catch (openingError) {
          if (generationAbortRef.current) return;
          console.error('Error generating opening:', openingError);
          setError('Failed to generate story opening. Please try again.');
          setLoading(false);
          return; // Stop here - don't proceed
        }
      }

      if (generationAbortRef.current) return;

      // Final verification - must have both title and opening
      if (!finalTitle || !finalOpening || finalOpening.trim() === '') {
        console.error('Verification failed - Title:', finalTitle, 'Opening:', finalOpening);
        setError('Failed to generate story. Please try again.');
        setLoading(false);
        return;
      }

      const openingBeat = {
        id: Date.now().toString(),
        text: finalOpening,
        tone: 'Opening',
        length: 'Intro',
        timestamp: new Date().toISOString(),
      };

      console.log('Story ready - Title:', finalTitle, 'Opening length:', finalOpening.length);
      setStoryBeats([openingBeat]);
      setStoryTitle(finalTitle);
      setOpeningLine(finalOpening);

      // Prepare story data for Editor
      const storyData = {
        id: Date.now().toString(),
        title: finalTitle,
        genre: genre || 'Any Genre',
        content: finalOpening,
        chapters: [],
        createdAt: new Date().toISOString(),
      };

      // Save to sessionStorage as backup
      sessionStorage.setItem('currentStory', JSON.stringify(storyData));

      // Navigate to editor with story data
      navigate('/edit', { state: { loadedStory: storyData } });
      setError(null);
    } catch (err) {
      if (generationAbortRef.current) return;
      console.error('Generation error:', err);
      setError('Failed to start story. Please make sure the backend is running and try again.');
      setLoading(false);
      return; // Don't proceed to edit page on error
    } finally {
      if (!generationAbortRef.current) {
        setLoading(false);
      }
    }
  };

  const handleGenerateContinuation = async () => {
    if (!length) {
      setError('Please select a length.');
      return;
    }
    setError(null);
    setLoading(true); // Start loading spinner (Connection phase)

    try {
      const contextPrompt = fullStoryText || `A ${genre} story titled "${storyTitle}"`;
      const fullPrompt = `${contextPrompt}\n\n`;

      const streamId = Date.now();
      let currentText = '';

      // Call streaming API
      await generateContinuationStream(
        {
          prompt: fullPrompt,
          tone: 'Adaptive',
          length: length,
          // Calculate max tokens based on length selection to match backend logic
          max_length: length === 'Short' ? 150 : length === 'Medium' ? 300 : 600
        },
        (chunk) => {
          // onChunk: user receives text token by token
          currentText += chunk;

          // Update options in real-time
          setGeneratedOptions([{
            id: streamId,
            text: currentText,
            tone: 'Adaptive',
            length: length,
            isStreaming: true
          }]);

          // Once we have data, stop the "loading" spinner and show the modal
          setLoading(false);
          setShowModal(true);
        },
        (fullText) => {
          // onComplete
          setGeneratedOptions([{
            id: streamId,
            text: fullText,
            tone: 'Adaptive',
            length: length,
            isStreaming: false
          }]);
          setLoading(false);
        },
        (err) => {
          // onError
          console.error(err);
          setError(err.message || 'Failed to generate stream.');
          setLoading(false);
        }
      );

    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to start generation.');
      setLoading(false);
    }
  };

  const handleCopyStory = async () => {
    if (!storyBeats.length) {
      setCopyStatus('Add a passage first.');
      setTimeout(() => setCopyStatus(''), 2000);
      return;
    }

    const storyPayload = `${storyTitle ? `${storyTitle}\n\n` : ''}${fullStoryText}`;

    if (!navigator.clipboard) {
      setCopyStatus('Clipboard unavailable.');
      setTimeout(() => setCopyStatus(''), 2000);
      return;
    }

    try {
      await navigator.clipboard.writeText(storyPayload);
      setCopyStatus('Story copied!');
    } catch (err) {
      console.error('Copy failed:', err);
      setCopyStatus('Copy failed.');
    } finally {
      setTimeout(() => setCopyStatus(''), 2000);
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
    setGenre('');
    setStoryTitle('');
    setOpeningLine('');
    setStoryBeats([]);
    setError(null);
    navigate('/');
  };

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/" element={
        <LandingPage
          genre={genre}
          setGenre={setGenre}
          storyTitle={storyTitle}
          setStoryTitle={setStoryTitle}
          openingLine={openingLine}
          setOpeningLine={setOpeningLine}
          error={error}
          loading={loading}
          handleStartStory={handleStartStory}
          handleCancelGeneration={handleCancelGeneration}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          scrollToSection={scrollToSection}
          activeFaq={activeFaq}
          handleFaqToggle={handleFaqToggle}
        />
      } />
      <Route path="/edit" element={<Editor />} />
      <Route path="/profile" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
    </Routes>
  );
}

function LandingPage({
  genre, setGenre, storyTitle, setStoryTitle, openingLine, setOpeningLine,
  error, loading, handleStartStory, handleCancelGeneration, mobileMenuOpen, setMobileMenuOpen,
  scrollToSection, activeFaq, handleFaqToggle
}) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [hoveredFeature, setHoveredFeature] = useState(null);
  const heroTitle = useTypewriter("Write stories you actually want to read", 40, 300);

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Clear inputs on mount (fresh start)
  useEffect(() => {
    setGenre('Any Genre');
    setStoryTitle('');
    setOpeningLine('');
  }, [setGenre, setStoryTitle, setOpeningLine]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="app-wrapper">
      {loading && <StoryGenerationLoader onCancel={handleCancelGeneration} />}
      {/* Animated background particles */}
      <div className="hero-particles">
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
      </div>

      <nav className="title-bar">
        <div className="title-bar-content">
          <div className="brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <span className="brand-icon">📖</span>
            <span>Storynexis</span>
          </div>
          <button className="hamburger" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu">
            <span></span>
            <span></span>
            <span></span>
          </button>
          <div className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            {navLinks.map((link) => (
              <button key={link.label} className="nav-link" onClick={() => { scrollToSection(link.target); setMobileMenuOpen(false); }}>
                {link.label}
              </button>
            ))}
          </div>
          <div className="nav-actions">
            {user ? (
              <>
                <button className="nav-link nav-ghost" onClick={() => navigate('/profile')}>
                  👤 Profile
                </button>
                <button className="btn-nav" onClick={handleLogout}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <button className="nav-link nav-ghost" onClick={() => navigate('/login')}>Log In</button>
                <button className="btn-nav" onClick={() => navigate('/signup')}>Sign Up Free</button>
              </>
            )}
          </div>
        </div>
      </nav>

      <div className="app-container">
        <div className="view-transition">
          <div className="initial-screen">
            {/* Enhanced Hero Section - Compact Layout */}
            <section id="site-hero" className="hero-section hero-compact">
              <div className="hero-split">
                {/* Left: Text Content */}
                <div className="hero-text-side">
                  <h1 className="hero-title-animated">
                    {heroTitle.displayText}
                    <span className={`cursor ${heroTitle.isComplete ? 'blink' : ''}`}>|</span>
                  </h1>
                  <p className="hero-subtitle-compact">
                    An AI writing tool that adapts to your voice. Pick a genre, describe your idea, and start drafting in seconds.
                  </p>
                </div>

                {/* Right: Prompt Panel */}
                <div className="hero-form-side">
                  <div className="prompt-panel-compact">
                    <div className="prompt-panel-header">
                      <span className="prompt-icon">✍️</span>
                      <h3>Start Your Story</h3>
                    </div>

                    <div className="prompt-form">
                      <div className="form-group">
                        {/* <label>Story Title</label> */}
                        <input
                          className="form-input"
                          placeholder="e.g. The Last Cartographer"
                          value={storyTitle}
                          onChange={(e) => setStoryTitle(e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        {/* <label>Story Idea</label> */}
                        <textarea
                          className="form-textarea"
                          rows="3"
                          placeholder="A retired astronaut discovers coordinates hidden in her daughter's drawings..."
                          value={openingLine}
                          onChange={(e) => setOpeningLine(e.target.value)}
                        />
                      </div>

                      {/* Inline Genre Selection */}
                      <div className="form-group">
                        {/* <label>Genre</label> */}
                        <div className="genre-inline-row">
                          {['Any Genre', 'Fantasy', 'Romance', 'Mystery', 'Sci-Fi', 'Horror', 'Thriller'].map((chip) => (
                            <button
                              key={chip}
                              className={`genre-chip-inline ${genre === chip ? 'active' : ''}`}
                              onClick={() => setGenre(chip)}
                              style={{ '--chip-color': genrePalette[chip] || '#94a3b8' }}
                            >
                              {chip}
                            </button>
                          ))}
                        </div>
                      </div>

                      {error && <div className="error-message-enhanced">{error}</div>}

                      <button className="btn-primary-enhanced" onClick={handleStartStory} disabled={loading}>
                        {loading ? (
                          <>
                            <span className="loading-spinner"></span>
                            <span>Creating...</span>
                          </>
                        ) : (
                          <span>Start writing</span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* More Genres - Collapsible */}
              <details className="more-genres-section">
                <summary className="more-genres-toggle">
                  <span>More Genres</span>
                  <span className="toggle-arrow">▼</span>
                </summary>
                <div className="genre-chip-row-expanded">
                  {heroGenres.filter(g => !['Any Genre', 'Fantasy', 'Romance', 'Mystery', 'Sci-Fi', 'Horror', 'Thriller'].includes(g)).map((chip) => (
                    <button
                      key={chip}
                      className={`genre-chip-enhanced ${genre === chip ? 'active' : ''}`}
                      onClick={() => setGenre(chip)}
                      style={{ '--chip-color': genrePalette[chip] || '#94a3b8' }}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </details>
            </section>



            <section id="feature-grid" className="features-section">
              <div className="section-heading-enhanced">
                <h2 className="section-title-enhanced">Built for the way you write</h2>
                <p className="section-subtitle-enhanced">
                  Tools that stay out of your way until you need them.
                </p>
              </div>

              <div className="features-grid-enhanced">
                {featureHighlights.map((feature, index) => (
                  <div
                    key={feature.title}
                    className={`feature-card-enhanced ${hoveredFeature === index ? 'hovered' : ''}`}
                    onMouseEnter={() => setHoveredFeature(index)}
                    onMouseLeave={() => setHoveredFeature(null)}
                  >
                    <div className="feature-accent-line" style={{ background: feature.accentColor }}></div>
                    <h3 className="feature-title">{feature.title}</h3>
                    <p className="feature-description">{feature.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section id="how-it-works" className="how-it-works-section">
              <div className="section-heading-enhanced">
                <h2 className="section-title-enhanced">Four steps. That's it.</h2>
              </div>

              <div className="steps-timeline">
                {howItWorksSteps.map((step, index) => (
                  <div key={step.title} className="step-card-enhanced">
                    <div className="step-connector">
                      <div className="step-number-circle">{step.number}</div>
                      {index < howItWorksSteps.length - 1 && <div className="step-line"></div>}
                    </div>
                    <div className="step-content">
                      <h3 className="step-title">{step.title}</h3>
                      <p className="step-description">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section id="story-showcase" className="showcase-section-enhanced">
              <div className="section-heading-enhanced">
                <h2 className="section-title-enhanced">Written with Storynexis</h2>
                <p className="section-subtitle-enhanced">
                  Real stories crafted by our community.
                </p>
              </div>

              <div className="showcase-grid-enhanced">
                {showcaseStories.map((story) => (
                  <div key={story.title} className="showcase-card-enhanced">
                    <div className="showcase-cover" style={{ '--genre-color': genrePalette[story.genre] || '#94a3b8' }}>
                      <span className="showcase-emoji">{story.cover}</span>
                    </div>
                    <div className="showcase-content">
                      <span className="showcase-genre-tag" style={{ color: genrePalette[story.genre] }}>{story.genre}</span>
                      <h4 className="showcase-title">{story.title}</h4>
                      <p className="showcase-blurb">{story.blurb}</p>
                      <div className="showcase-meta">
                        <span>{story.chapters} chapters</span>
                        <span>{story.wordCount} words</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="testimonials-section">
              <div className="section-heading-enhanced">
                <h2 className="section-title-enhanced">What writers are saying</h2>
              </div>

              <div className="testimonials-carousel">
                {testimonials.map((testimonial, index) => (
                  <div
                    key={testimonial.name}
                    className={`testimonial-card ${index === activeTestimonial ? 'active' : ''}`}
                  >
                    <div className="testimonial-quote-mark">&ldquo;</div>
                    <p className="testimonial-text">{testimonial.text}</p>
                    <div className="testimonial-author">
                      <span className="testimonial-initials">{testimonial.initials}</span>
                      <div className="testimonial-info">
                        <span className="testimonial-name">{testimonial.name}</span>
                        <span className="testimonial-role">{testimonial.role}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="testimonial-dots">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    className={`dot ${index === activeTestimonial ? 'active' : ''}`}
                    onClick={() => setActiveTestimonial(index)}
                  />
                ))}
              </div>
            </section>

            <section id="faq" className="faq-section-enhanced">
              <div className="section-heading-enhanced">
                <h2 className="section-title-enhanced">Common questions</h2>
              </div>

              <div className="faq-list-enhanced">
                {faqList.map((item, index) => (
                  <div
                    key={item.question}
                    className={`faq-item-enhanced ${activeFaq === index ? 'open' : ''}`}
                  >
                    <button
                      className="faq-question-enhanced"
                      onClick={() => handleFaqToggle(index)}
                    >
                      <span className="faq-q-text">{item.question}</span>
                      <span className="faq-chevron">{activeFaq === index ? '−' : '+'}</span>
                    </button>
                    <div className={`faq-answer-enhanced ${activeFaq === index ? 'show' : ''}`}>
                      <p>{item.answer}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>

      <footer className="footer-bar">
        <div className="footer-content">
          <div className="footer-simple">
            <div className="footer-brand">
              <div className="brand">
                <span className="brand-icon">📖</span>
                <span>Storynexis</span>
              </div>
              <p>AI-assisted story writing.</p>
            </div>
            <div className="footer-nav-links">
              <a href="#site-hero">Overview</a>
              <a href="#feature-grid">Features</a>
              <a href="#story-showcase">Stories</a>
              <a href="#faq">FAQ</a>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2026 Storynexis</p>
            <div className="footer-legal">
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function EditorPage({
  stats, tone, setTone, length, setLength, resultCount, setResultCount,
  error, loading, handleGenerateContinuation, handleNewBook, storyTitle,
  genre, storyBeats, handleCopyStory, copyStatus, showModal, setShowModal,
  generatedOptions, handleChooseContinuation, getToneColor
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="app-wrapper">
      <nav className="title-bar">
        <div className="title-bar-content">
          <div className="brand">
            <span className="brand-icon">📖</span>
            <span>Storynexis</span>
          </div>
          <div className="nav-actions">
            <span className="word-count-chip">{stats.words} Words</span>
            {user && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  {user.displayName || user.email}
                </span>
                <button
                  onClick={handleLogout}
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.875rem',
                    background: '#fff',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="app-container">
        <div className="view-transition">
          <div className="writing-layout">

            {/* Left: Controls */}
            <div className="controls-panel">
              <div className="controls-card">
                <h3 className="controls-title">Story Controls</h3>

                <div className="form-group">
                  <label>Length</label>
                  <select className="form-select" value={length} onChange={(e) => setLength(e.target.value)}>
                    <option value="">Select Length</option>
                    <option value="Short">Short (~50 words)</option>
                    <option value="Medium">Medium (~100 words)</option>
                    <option value="Long">Long (~150 words)</option>
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
            <div className="story-column">
              <div className="insight-panel">
                <div className="insight-card">
                  <span>Chapters</span>
                  <strong>{stats.chapters}</strong>
                </div>
                <div className="insight-card">
                  <span>Word Count</span>
                  <strong>{stats.words.toLocaleString()}</strong>
                </div>
                <div className="insight-card">
                  <span>Reading Time</span>
                  <strong>{stats.readingMinutes ? `${stats.readingMinutes} min` : '—'}</strong>
                </div>
              </div>

              <div className="story-utilities">
                <button onClick={handleCopyStory} className="btn-outline copy-button">📋 Copy Story</button>
                {copyStatus && <span className="copy-status">{copyStatus}</span>}
              </div>

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
                </div>
              </div>
            </div>

          </div>
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
    </div>
  );
}

export default App;
