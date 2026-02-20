import { useAuth } from '../contexts/AuthContext';
import { updateDisplayName } from '../firebase/auth';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { getStories, deleteStory } from '../utils/api';
import './Dashboard.css';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStory, setSelectedStory] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [editingName, setEditingName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [exportingStories, setExportingStories] = useState(false);

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

  const loadUserStories = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError('');
      const fetchedStories = await getStories();

      // Convert metadata timestamps to timestamp for compatibility
      const normalized = fetchedStories.map(story => ({
        ...story,
        timestamp: story.metadata?.updatedAt || story.metadata?.createdAt,
        wordCount: story.metadata?.wordCount || 0
      }));

      setStories(normalized.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    } catch (error) {
      console.error('Error loading stories:', error);
      setError('Failed to load stories. Please try again.');
    } finally {
      setLoading(false);
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

  const handleDeleteStory = async (storyId) => {
    if (!confirm('Are you sure you want to delete this story?')) return;

    try {
      await deleteStory(storyId);
      // Update local state
      const updatedStories = stories.filter(s => s.id !== storyId);
      setStories(updatedStories);
      if (selectedStory?.id === storyId) {
        setSelectedStory(null);
      }
    } catch (error) {
      console.error('Error deleting story:', error);
      alert('Failed to delete story. Please try again.');
    }
  };

  const handleLoadStory = (story) => {
    navigate('/edit', { state: { loadedStory: story } });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '—';
    try {
      return new Date(timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return '—';
    }
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return '—';
    try {
      const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
      if (seconds < 0 || isNaN(seconds)) return '—';
      if (seconds < 60) return 'Just now';
      if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
      if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
      if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
      return formatDate(timestamp);
    } catch {
      return '—';
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getDaysSinceJoined = () => {
    if (!user?.metadata?.creationTime) return '...';
    const created = new Date(user.metadata.creationTime);
    const now = new Date();
    const days = Math.floor((now - created) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const handleSaveDisplayName = async () => {
    if (!newDisplayName.trim()) return;
    try {
      setSavingName(true);
      await updateDisplayName(newDisplayName.trim());
      setEditingName(false);
    } catch (err) {
      console.error('Failed to update display name:', err);
      alert('Failed to update name. Please try again.');
    } finally {
      setSavingName(false);
    }
  };

  const handleExportAll = async () => {
    if (stories.length === 0) return;
    setExportingStories(true);
    try {
      const exportData = stories.map(s => ({
        title: s.title || 'Untitled',
        genre: s.genre || 'Any Genre',
        content: s.content || '',
        wordCount: s.wordCount || 0,
        createdAt: s.timestamp,
      }));
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `storynexis-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. Please try again.');
    } finally {
      setExportingStories(false);
    }
  };

  const handleDeleteAll = async () => {
    if (stories.length === 0) return;
    const confirmed = confirm(`This will permanently delete all ${stories.length} stories. Are you sure?`);
    if (!confirmed) return;
    const doubleConfirm = confirm('This cannot be undone. Last chance — proceed?');
    if (!doubleConfirm) return;

    try {
      let failed = 0;
      for (const story of stories) {
        try {
          await deleteStory(story.id);
        } catch {
          failed++;
        }
      }
      if (failed > 0) {
        alert(`${failed} stories could not be deleted. Refreshing list.`);
      }
      await loadUserStories();
      setSelectedStory(null);
    } catch (err) {
      console.error('Delete all failed:', err);
      alert('Delete operation failed. Please refresh and try again.');
      loadUserStories();
    }
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

  const getGenreInitial = (genre) => {
    if (!genre || genre === 'Any Genre') return 'A';
    return genre.charAt(0).toUpperCase();
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
                    {user?.emailVerified ? '✓ Verified' : 'Unverified'}
                  </span>
                  <span className="member-badge">
                    Writing for {getDaysSinceJoined()} days
                  </span>
                </div>
              </div>
            </div>

            <div className="profile-quick-stats">
              {loading ? (
                <>
                  <div className="quick-stat">
                    <span className="quick-stat-value skeleton-loader">--</span>
                    <span className="quick-stat-label">Stories</span>
                  </div>
                  <div className="quick-stat">
                    <span className="quick-stat-value skeleton-loader">--</span>
                    <span className="quick-stat-label">Words</span>
                  </div>
                  <div className="quick-stat">
                    <span className="quick-stat-value skeleton-loader">--</span>
                    <span className="quick-stat-label">Top Genre</span>
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="tab-content">
            {/* Stats Dashboard */}
            <div className="stats-dashboard">
              {loading ? (
                <>
                  <div className="stat-card-large primary">
                    <div className="stat-card-content">
                      <span className="stat-card-value skeleton-loader">--</span>
                      <span className="stat-card-label">Stories</span>
                    </div>
                  </div>
                  <div className="stat-card-large">
                    <div className="stat-card-content">
                      <span className="stat-card-value skeleton-loader">--</span>
                      <span className="stat-card-label">Words written</span>
                    </div>
                  </div>
                  <div className="stat-card-large">
                    <div className="stat-card-content">
                      <span className="stat-card-value skeleton-loader">--</span>
                      <span className="stat-card-label">Avg per story</span>
                    </div>
                  </div>
                  <div className="stat-card-large">
                    <div className="stat-card-content">
                      <span className="stat-card-value skeleton-loader">--</span>
                      <span className="stat-card-label">Top genre</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="stat-card-large primary">
                    <div className="stat-card-content">
                      <span className="stat-card-value">{stats.totalStories}</span>
                      <span className="stat-card-label">Stories</span>
                    </div>
                  </div>

                  <div className="stat-card-large">
                    <div className="stat-card-content">
                      <span className="stat-card-value">{stats.totalWords.toLocaleString()}</span>
                      <span className="stat-card-label">Words written</span>
                    </div>
                  </div>

                  <div className="stat-card-large">
                    <div className="stat-card-content">
                      <span className="stat-card-value">{stats.avgWords}</span>
                      <span className="stat-card-label">Avg per story</span>
                    </div>
                  </div>

                  <div className="stat-card-large">
                    <div className="stat-card-content">
                      <span className="stat-card-value">{stats.topGenre}</span>
                      <span className="stat-card-label">Top genre</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="action-grid">
              <div className="action-card-new primary" onClick={handleStartWriting}>
                <h3>New story</h3>
                <p>Start a fresh draft with AI assistance</p>
                <span className="action-arrow">→</span>
              </div>

              <div className="action-card-new" onClick={() => setActiveTab('stories')}>
                <h3>My library</h3>
                <p>{stories.length} {stories.length === 1 ? 'story' : 'stories'} saved</p>
                <span className="action-arrow">→</span>
              </div>

              <div className="action-card-new" onClick={() => navigate('/edit')}>
                <h3>Continue writing</h3>
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
                        <span className="story-cover-initial">{getGenreInitial(story.genre)}</span>
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
          </div>
        )}

        {activeTab === 'stories' && (
          <div className="tab-content">
            <div className="stories-toolbar">
              <div className="search-box">
                <span className="search-icon">⌕</span>
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
                <h3>{searchQuery ? 'No stories found' : 'No stories yet'}</h3>
                <p>{searchQuery ? 'Try a different search term' : 'Start your creative journey by writing your first story.'}</p>
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
                    <div className="story-card-header" style={{ borderTopColor: getGenreColor(story.genre) }}>
                      <span className="story-genre-tag" style={{ background: getGenreColor(story.genre) }}>
                        {story.genre || 'Any Genre'}
                      </span>
                      <div className="story-card-actions-inline">
                        <button className="card-action-btn-sm" onClick={(e) => { e.stopPropagation(); handleLoadStory(story); }} title="Edit">
                          Edit
                        </button>
                        <button className="card-action-btn-sm danger" onClick={(e) => { e.stopPropagation(); handleDeleteStory(story.id); }} title="Delete">
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="story-card-body" onClick={() => handleViewStory(story)}>
                      <h3 className="story-card-title">{story.title || 'Untitled Story'}</h3>
                      <p className="story-card-preview">
                        {story.content ? story.content.substring(0, 100) + '...' : 'No preview available'}
                      </p>
                      <div className="story-card-footer">
                        <span className="footer-meta">{story.wordCount || 0} words</span>
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
                <h3>Account</h3>
                <div className="settings-field">
                  <label>Display Name</label>
                  <div className="field-value">
                    {editingName ? (
                      <div className="inline-edit">
                        <input
                          className="edit-name-input"
                          type="text"
                          value={newDisplayName}
                          onChange={(e) => setNewDisplayName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveDisplayName()}
                          autoFocus
                        />
                        <button className="edit-btn" onClick={handleSaveDisplayName} disabled={savingName}>
                          {savingName ? 'Saving...' : 'Save'}
                        </button>
                        <button className="edit-btn cancel" onClick={() => setEditingName(false)}>Cancel</button>
                      </div>
                    ) : (
                      <>
                        <span>{user?.displayName || 'Not set'}</span>
                        <button className="edit-btn" onClick={() => { setNewDisplayName(user?.displayName || ''); setEditingName(true); }}>Edit</button>
                      </>
                    )}
                  </div>
                </div>
                <div className="settings-field">
                  <label>Email</label>
                  <div className="field-value">
                    <span>{user?.email}</span>
                    <button className="copy-email-btn" onClick={copyEmail}>
                      {copied ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
                <div className="settings-field">
                  <label>Status</label>
                  <div className="field-value">
                    <span className={user?.emailVerified ? 'verified-text' : 'unverified-text'}>
                      {user?.emailVerified ? '✓ Verified' : 'Not verified'}
                    </span>
                  </div>
                </div>
                <div className="settings-field">
                  <label>Joined</label>
                  <div className="field-value">
                    <span>{formatDate(user?.metadata?.creationTime)}</span>
                  </div>
                </div>
              </div>

              <div className="settings-card danger-zone">
                <h3>Data</h3>
                <div className="settings-field">
                  <label>Export all stories as JSON</label>
                  <button className="btn-export" onClick={handleExportAll} disabled={stories.length === 0 || exportingStories}>
                    {exportingStories ? 'Exporting...' : `Download (${stories.length})`}
                  </button>
                </div>
                <div className="settings-field">
                  <label>Permanently delete all stories</label>
                  <button className="btn-danger" onClick={handleDeleteAll} disabled={stories.length === 0}>
                    Delete all ({stories.length})
                  </button>
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
                  <span>{selectedStory.wordCount || 0} words</span>
                  <span>{selectedStory.tone || 'Adaptive'}</span>
                  <span>{formatDate(selectedStory.timestamp)}</span>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedStory(null)}>✕</button>
            </div>

            <div className="story-modal-content">
              {selectedStory.content}
            </div>

            <div className="story-modal-footer">
              <button className="btn-modal-primary" onClick={() => handleLoadStory(selectedStory)}>
                Edit
              </button>
              <button className="btn-modal-secondary" onClick={() => {
                const blob = new Blob([selectedStory.content], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${selectedStory.title || 'story'}.txt`;
                a.click();
              }}>
                Download
              </button>
              <button className="btn-modal-danger" onClick={() => handleDeleteStory(selectedStory.id)}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
