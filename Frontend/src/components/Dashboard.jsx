import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import './Dashboard.css';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [stories, setStories] = useState([]);
  const [selectedStory, setSelectedStory] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleStartWriting = () => {
    navigate('/');
  };

  const copyEmail = () => {
    if (user?.email) {
      navigator.clipboard.writeText(user.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    if (user?.uid) {
      loadUserStories();
    }
  }, [user]);

  const loadUserStories = () => {
    try {
      const storiesKey = `stories_${user.uid}`;
      const savedStories = localStorage.getItem(storiesKey);
      if (savedStories) {
        const parsed = JSON.parse(savedStories);
        setStories(parsed.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
      }
    } catch (error) {
      console.error('Error loading stories:', error);
    }
  };

  // Computed stats
  const stats = useMemo(() => {
    const totalWords = stories.reduce((sum, s) => sum + (s.wordCount || 0), 0);
    const genreCounts = {};
    stories.forEach(s => {
      const genre = s.genre || 'Other';
      genreCounts[genre] = (genreCounts[genre] || 0) + 1;
    });
    const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0];
    
    return {
      totalStories: stories.length,
      totalWords,
      avgWords: stories.length ? Math.round(totalWords / stories.length) : 0,
      topGenre: topGenre ? topGenre[0] : 'None yet',
      streak: 7,
      lastActive: stories[0]?.timestamp || null
    };
  }, [stories]);

  // Filtered and sorted stories
  const filteredStories = useMemo(() => {
    let result = [...stories];
    
    if (searchQuery) {
      result = result.filter(s => 
        s.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.genre?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    switch (sortBy) {
      case 'oldest':
        result.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        break;
      case 'words':
        result.sort((a, b) => (b.wordCount || 0) - (a.wordCount || 0));
        break;
      case 'title':
        result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        break;
      default:
        result.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
    
    return result;
  }, [stories, searchQuery, sortBy]);

  const handleViewStory = (story) => {
    setSelectedStory(story);
  };

  const handleDeleteStory = (storyId) => {
    if (confirm('Are you sure you want to delete this story?')) {
      try {
        const storiesKey = `stories_${user.uid}`;
        const updatedStories = stories.filter(s => s.id !== storyId);
        localStorage.setItem(storiesKey, JSON.stringify(updatedStories));
        setStories(updatedStories);
        if (selectedStory?.id === storyId) {
          setSelectedStory(null);
        }
      } catch (error) {
        console.error('Error deleting story:', error);
      }
    }
  };

  const handleLoadStory = (story) => {
    navigate('/edit', { state: { loadedStory: story } });
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTimeAgo = (timestamp) => {
    const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return formatDate(timestamp);
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getDaysSinceJoined = () => {
    if (!user?.metadata?.creationTime) return 0;
    const created = new Date(user.metadata.creationTime);
    const now = new Date();
    return Math.floor((now - created) / (1000 * 60 * 60 * 24));
  };

  const getGenreColor = (genre) => {
    const colors = {
      'Fantasy': '#8b5cf6',
      'Romance': '#ec4899',
      'Mystery': '#6366f1',
      'Sci-Fi': '#06b6d4',
      'Horror': '#ef4444',
      'Thriller': '#f59e0b',
      'Adventure': '#10b981',
      'Action': '#f97316',
      'Any Genre': '#6b7280',
    };
    return colors[genre] || '#6b7280';
  };

  const getGenreEmoji = (genre) => {
    const emojis = {
      'Fantasy': '🏰',
      'Romance': '💕',
      'Mystery': '🔍',
      'Sci-Fi': '🚀',
      'Horror': '👻',
      'Thriller': '🔪',
      'Adventure': '🗺️',
      'Action': '💥',
      'Any Genre': '📖',
    };
    return emojis[genre] || '📖';
  };

  return (
    <div className="dashboard-wrapper">
      {/* Enhanced Navbar */}
      <nav className="profile-nav">
        <div className="profile-nav-content">
          <div className="brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <span className="brand-icon">📖</span>
            <span>Storynexis</span>
          </div>
          <div className="nav-tabs">
            <button 
              className={`nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button 
              className={`nav-tab ${activeTab === 'stories' ? 'active' : ''}`}
              onClick={() => setActiveTab('stories')}
            >
              My Stories
              {stories.length > 0 && <span className="tab-badge">{stories.length}</span>}
            </button>
            <button 
              className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              Settings
            </button>
          </div>
          <div className="nav-actions">
            <button className="btn-home" onClick={() => navigate('/')}>
              ← Home
            </button>
            <button className="btn-logout" onClick={handleLogout}>
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <div className="dashboard-container">
        {/* Profile Hero Section */}
        <div className="profile-hero">
          <div className="profile-hero-bg"></div>
          <div className="profile-hero-content">
            <div className="profile-avatar-section">
              <div className="profile-avatar">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Profile" />
                ) : (
                  <span className="avatar-initials">{getInitials(user?.displayName || user?.email)}</span>
                )}
                <div className="avatar-status"></div>
              </div>
              <div className="profile-identity">
                <h1 className="profile-name">{user?.displayName || 'Creative Writer'}</h1>
                <p className="profile-email">{user?.email}</p>
                <div className="profile-badges">
                  <span className={`status-badge ${user?.emailVerified ? 'verified' : 'unverified'}`}>
                    {user?.emailVerified ? '✓ Verified' : '⚠ Unverified'}
                  </span>
                  <span className="member-badge">
                    🎭 Writer for {getDaysSinceJoined()} days
                  </span>
                </div>
              </div>
            </div>
            
            <div className="profile-quick-stats">
              <div className="quick-stat">
                <span className="quick-stat-value">{stats.totalStories}</span>
                <span className="quick-stat-label">Stories</span>
              </div>
              <div className="quick-stat">
                <span className="quick-stat-value">{stats.totalWords.toLocaleString()}</span>
                <span className="quick-stat-label">Words</span>
              </div>
              <div className="quick-stat">
                <span className="quick-stat-value">{stats.topGenre}</span>
                <span className="quick-stat-label">Top Genre</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="tab-content">
            {/* Stats Dashboard */}
            <div className="stats-dashboard">
              <div className="stat-card-large primary">
                <div className="stat-card-icon">✍️</div>
                <div className="stat-card-content">
                  <span className="stat-card-value">{stats.totalStories}</span>
                  <span className="stat-card-label">Total Stories</span>
                </div>
                <div className="stat-card-trend">
                  <span className="trend-up">↑ Keep writing!</span>
                </div>
              </div>
              
              <div className="stat-card-large">
                <div className="stat-card-icon">📝</div>
                <div className="stat-card-content">
                  <span className="stat-card-value">{stats.totalWords.toLocaleString()}</span>
                  <span className="stat-card-label">Words Written</span>
                </div>
              </div>
              
              <div className="stat-card-large">
                <div className="stat-card-icon">📊</div>
                <div className="stat-card-content">
                  <span className="stat-card-value">{stats.avgWords}</span>
                  <span className="stat-card-label">Avg. Words/Story</span>
                </div>
              </div>
              
              <div className="stat-card-large">
                <div className="stat-card-icon">🔥</div>
                <div className="stat-card-content">
                  <span className="stat-card-value">{stats.streak}</span>
                  <span className="stat-card-label">Day Streak</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="section-header">
              <h2>Quick Actions</h2>
            </div>
            
            <div className="action-grid">
              <div className="action-card-new primary" onClick={handleStartWriting}>
                <div className="action-card-shine"></div>
                <div className="action-icon-circle">✨</div>
                <h3>Create New Story</h3>
                <p>Start a new creative journey with AI assistance</p>
                <span className="action-arrow">→</span>
              </div>

              <div className="action-card-new" onClick={() => setActiveTab('stories')}>
                <div className="action-icon-circle">📚</div>
                <h3>My Library</h3>
                <p>Access your {stories.length} saved {stories.length === 1 ? 'story' : 'stories'}</p>
                <span className="action-arrow">→</span>
              </div>

              <div className="action-card-new" onClick={() => navigate('/edit')}>
                <div className="action-icon-circle">🖊️</div>
                <h3>Continue Writing</h3>
                <p>Pick up where you left off</p>
                <span className="action-arrow">→</span>
              </div>
            </div>

            {/* Recent Stories */}
            {stories.length > 0 && (
              <>
                <div className="section-header">
                  <h2>Recent Stories</h2>
                  <button className="see-all-btn" onClick={() => setActiveTab('stories')}>
                    See All →
                  </button>
                </div>
                
                <div className="recent-stories-grid">
                  {stories.slice(0, 3).map(story => (
                    <div key={story.id} className="recent-story-card" onClick={() => handleLoadStory(story)}>
                      <div className="story-cover" style={{ '--genre-color': getGenreColor(story.genre) }}>
                        <span className="story-cover-icon">{getGenreEmoji(story.genre)}</span>
                      </div>
                      <div className="story-info">
                        <h4>{story.title || 'Untitled Story'}</h4>
                        <div className="story-meta-row">
                          <span className="genre-tag" style={{ color: getGenreColor(story.genre) }}>
                            {story.genre || 'Any Genre'}
                          </span>
                          <span className="word-count">{story.wordCount || 0} words</span>
                        </div>
                        <span className="story-time">{formatTimeAgo(story.timestamp)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Writing Tips */}
            <div className="section-header">
              <h2>Writing Tips</h2>
            </div>
            
            <div className="tips-carousel">
              <div className="tip-card">
                <span className="tip-emoji">💡</span>
                <h4>Use Specific Prompts</h4>
                <p>The more detail you provide in your story idea, the better the AI can match your vision.</p>
              </div>
              <div className="tip-card">
                <span className="tip-emoji">🎭</span>
                <h4>Experiment with Tones</h4>
                <p>Try different tones like "Mysterious" or "Humorous" to discover new narrative styles.</p>
              </div>
              <div className="tip-card">
                <span className="tip-emoji">⌨️</span>
                <h4>Keyboard Shortcuts</h4>
                <p>Press Ctrl+G to generate, Ctrl+S to save, and Escape for focus mode.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stories' && (
          <div className="tab-content">
            <div className="stories-toolbar">
              <div className="search-box">
                <span className="search-icon">🔍</span>
                <input 
                  type="text"
                  placeholder="Search stories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button className="clear-search" onClick={() => setSearchQuery('')}>✕</button>
                )}
              </div>
              
              <div className="sort-dropdown">
                <label>Sort by:</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="recent">Most Recent</option>
                  <option value="oldest">Oldest First</option>
                  <option value="words">Word Count</option>
                  <option value="title">Title (A-Z)</option>
                </select>
              </div>
              
              <button className="btn-new-story" onClick={handleStartWriting}>
                + New Story
              </button>
            </div>

            {filteredStories.length === 0 ? (
              <div className="empty-stories">
                <div className="empty-icon">📝</div>
                <h3>{searchQuery ? 'No stories found' : 'No stories yet'}</h3>
                <p>{searchQuery ? 'Try a different search term' : 'Start your creative journey by writing your first story!'}</p>
                {!searchQuery && (
                  <button className="btn-create" onClick={handleStartWriting}>
                    Create Your First Story
                  </button>
                )}
              </div>
            ) : (
              <div className="stories-grid-new">
                {filteredStories.map(story => (
                  <div key={story.id} className="story-card-new">
                    <div className="story-card-cover" style={{ '--genre-color': getGenreColor(story.genre) }}>
                      <span className="cover-emoji">{getGenreEmoji(story.genre)}</span>
                      <div className="story-card-actions">
                        <button className="card-action-btn" onClick={(e) => { e.stopPropagation(); handleLoadStory(story); }} title="Edit">
                          ✏️
                        </button>
                        <button className="card-action-btn" onClick={(e) => { e.stopPropagation(); handleDeleteStory(story.id); }} title="Delete">
                          🗑️
                        </button>
                      </div>
                    </div>
                    <div className="story-card-body" onClick={() => handleViewStory(story)}>
                      <span className="story-genre-tag" style={{ background: getGenreColor(story.genre) }}>
                        {story.genre || 'Any Genre'}
                      </span>
                      <h3 className="story-card-title">{story.title || 'Untitled Story'}</h3>
                      <p className="story-card-preview">
                        {story.content?.substring(0, 100)}...
                      </p>
                      <div className="story-card-footer">
                        <span className="footer-meta">📝 {story.wordCount || 0} words</span>
                        <span className="footer-date">{formatDate(story.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="tab-content">
            <div className="settings-grid">
              <div className="settings-card">
                <h3>Account Information</h3>
                <div className="settings-field">
                  <label>Display Name</label>
                  <div className="field-value">
                    <span>{user?.displayName || 'Not set'}</span>
                    <button className="edit-btn">Edit</button>
                  </div>
                </div>
                <div className="settings-field">
                  <label>Email Address</label>
                  <div className="field-value">
                    <span>{user?.email}</span>
                    <button className="copy-email-btn" onClick={copyEmail}>
                      {copied ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
                <div className="settings-field">
                  <label>Email Status</label>
                  <div className="field-value">
                    <span className={user?.emailVerified ? 'verified-text' : 'unverified-text'}>
                      {user?.emailVerified ? '✓ Verified' : '⚠ Not Verified'}
                    </span>
                  </div>
                </div>
                <div className="settings-field">
                  <label>Member Since</label>
                  <div className="field-value">
                    <span>{formatDate(user?.metadata?.creationTime)}</span>
                  </div>
                </div>
              </div>

              <div className="settings-card">
                <h3>Writing Preferences</h3>
                <div className="settings-field">
                  <label>Default Genre</label>
                  <select className="settings-select">
                    <option value="Any Genre">Any Genre</option>
                    <option value="Fantasy">Fantasy</option>
                    <option value="Romance">Romance</option>
                    <option value="Mystery">Mystery</option>
                    <option value="Sci-Fi">Sci-Fi</option>
                    <option value="Horror">Horror</option>
                  </select>
                </div>
                <div className="settings-field">
                  <label>Default Tone</label>
                  <select className="settings-select">
                    <option value="Adaptive">Adaptive</option>
                    <option value="Dark">Dark</option>
                    <option value="Emotional">Emotional</option>
                    <option value="Humorous">Humorous</option>
                    <option value="Mysterious">Mysterious</option>
                  </select>
                </div>
                <div className="settings-field">
                  <label>Default Length</label>
                  <select className="settings-select">
                    <option value="Medium">Medium</option>
                    <option value="Short">Short</option>
                    <option value="Long">Long</option>
                  </select>
                </div>
              </div>

              <div className="settings-card danger-zone">
                <h3>Data Management</h3>
                <div className="settings-field">
                  <label>Export Stories</label>
                  <button className="btn-export">Download All Stories</button>
                </div>
                <div className="settings-field">
                  <label>Clear Data</label>
                  <button className="btn-danger">Delete All Stories</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Story Detail Modal */}
      {selectedStory && (
        <div className="story-modal-overlay" onClick={() => setSelectedStory(null)}>
          <div className="story-modal" onClick={(e) => e.stopPropagation()}>
            <div className="story-modal-header">
              <div className="modal-title-section">
                <span className="modal-genre-tag" style={{ background: getGenreColor(selectedStory.genre) }}>
                  {selectedStory.genre || 'Any Genre'}
                </span>
                <h2>{selectedStory.title || 'Untitled Story'}</h2>
                <div className="modal-meta">
                  <span>📝 {selectedStory.wordCount || 0} words</span>
                  <span>🎭 {selectedStory.tone || 'Adaptive'}</span>
                  <span>📅 {formatDate(selectedStory.timestamp)}</span>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedStory(null)}>✕</button>
            </div>
            
            <div className="story-modal-content">
              {selectedStory.content}
            </div>
            
            <div className="story-modal-footer">
              <button className="btn-modal-primary" onClick={() => handleLoadStory(selectedStory)}>
                ✏️ Edit Story
              </button>
              <button className="btn-modal-secondary" onClick={() => {
                const blob = new Blob([selectedStory.content], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${selectedStory.title || 'story'}.txt`;
                a.click();
              }}>
                📥 Download
              </button>
              <button className="btn-modal-danger" onClick={() => handleDeleteStory(selectedStory.id)}>
                🗑️ Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
