import React, { useState, useEffect } from 'react';
import { getBibleItems, createBibleItem, updateBibleItem, deleteBibleItem, generateBibleItems } from '../utils/api';
// Styles will be handled in Editor.css
import './StoryBible.css';

const StoryBible = ({ storyId, refreshTrigger, onSync }) => {
    const [activeTab, setActiveTab] = useState('Character');
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [isSyncing, setIsSyncing] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        attributes: {}
    });

    const CATEGORIES = ['Character', 'Location', 'Item', 'Lore'];

    useEffect(() => {
        if (storyId && typeof storyId === 'string' && storyId.trim()) {
            fetchItems();
        } else {
            setItems([]);
        }
    }, [storyId, activeTab, refreshTrigger]);

    const fetchItems = async () => {
        setIsLoading(true);
        try {
            const data = await getBibleItems(storyId, activeTab);
            setItems(data);
            setError('');
        } catch (err) {
            setError('Failed to load items');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    // handleSync triggers the parent's sync logic
    const handleSync = async () => {
        if (!onSync) return;
        setIsSyncing(true);
        setError('');
        try {
            await onSync();
            await fetchItems();
        } catch (err) {
            setError('Failed to sync with story.');
        } finally {
            setIsSyncing(false);
        }
    };

    // handleGenerate removed - now automated in Editor.jsx

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            if (editingItem) {
                await updateBibleItem(storyId, editingItem.id, {
                    ...formData,
                    category: activeTab
                });
            } else {
                await createBibleItem(storyId, {
                    ...formData,
                    category: activeTab
                });
            }

            await fetchItems();
            resetForm();
        } catch (err) {
            setError(editingItem ? 'Failed to update item' : 'Failed to create item');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (itemId) => {
        if (!window.confirm('Are you sure you want to delete this item?')) return;

        setIsLoading(true);
        try {
            await deleteBibleItem(storyId, itemId);
            await fetchItems();
        } catch (err) {
            setError('Failed to delete item');
        } finally {
            setIsLoading(false);
        }
    };

    const startEdit = (item) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            description: item.description,
            attributes: item.attributes || {}
        });
        setIsAdding(true);
    };

    const resetForm = () => {
        setFormData({ name: '', description: '', attributes: {} });
        setEditingItem(null);
        setIsAdding(false);
        setError('');
    };



    return (
        <div className="story-bible-panel">
            <div className="bible-header">
                <h3>Story Bible</h3>
            </div>

            <div className="bible-tabs">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat}
                        className={`bible-tab ${activeTab === cat ? 'active' : ''}`}
                        onClick={() => { setActiveTab(cat); resetForm(); }}
                    >
                        {cat}s
                    </button>
                ))}
            </div>

            <div className="bible-content">
                {error && <div className="bible-error">{error}</div>}

                {!storyId ? (
                    <div className="bible-empty">
                        Save your story first to start building your Story Bible.
                    </div>
                ) : !isAdding ? (
                    <>
                        <button className="bible-add-btn" onClick={() => setIsAdding(true)}>
                            <span>+</span> Add New {activeTab}
                        </button>

                        <button
                            className={`bible-generate-btn ${isSyncing ? 'syncing' : ''}`}
                            onClick={handleSync}
                            disabled={isSyncing || isLoading}
                            title="Sync Bible with current story content (detects additions and removals)"
                            style={{
                                marginLeft: '10px',
                                backgroundColor: isSyncing ? '#9ca3af' : '#6366f1',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            {isSyncing ? (
                                <>
                                    <span style={{ animation: 'spin 1.5s linear infinite', display: 'inline-block' }}>↻</span>
                                    Syncing...
                                </>
                            ) : (
                                <>
                                    <span>↻</span>
                                    Sync with Story
                                </>
                            )}
                        </button>

                        {isLoading && items.length === 0 ? (
                            <div className="bible-loading">
                                <span className="loading-spinner-small"></span> Loading...
                            </div>
                        ) : (
                            <div className="bible-list">
                                {items.length === 0 ? (
                                    <div className="bible-empty">
                                        No {activeTab.toLowerCase()}s recorded yet.
                                    </div>
                                ) : (
                                    items.map(item => (
                                        <div key={item.id} className="bible-item">
                                            <div className="bible-item-header">
                                                <span className="bible-item-name">{item.name}</span>
                                                <div className="bible-item-actions">
                                                    <button onClick={() => startEdit(item)} title="Edit">Edit</button>
                                                    <button onClick={() => handleDelete(item.id)} title="Delete">Del</button>
                                                </div>
                                            </div>
                                            <p className="bible-item-desc">{item.description}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    <form className="bible-form" onSubmit={handleSubmit}>
                        <div className="bible-form-header">
                            <h4>{editingItem ? 'Edit' : 'New'} {activeTab}</h4>
                            <button type="button" className="bible-form-close" onClick={resetForm}>&times;</button>
                        </div>

                        <div className="form-group">
                            <label>Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                                className="bible-input"
                                placeholder={
                                    activeTab === 'Character' ? 'e.g. Elena Blackwood' :
                                        activeTab === 'Location' ? 'e.g. The Floating Isles' :
                                            activeTab === 'Item' ? 'e.g. The Crimson Blade' :
                                                'e.g. The Great Sundering'
                                }
                                autoFocus
                            />
                        </div>

                        <div className="form-group">
                            <label>Description</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                required
                                className="bible-textarea"
                                placeholder={
                                    activeTab === 'Character' ? 'Background, personality, appearance, motivations...' :
                                        activeTab === 'Location' ? 'Geography, atmosphere, significance to the story...' :
                                            activeTab === 'Item' ? 'Origin, properties, who possesses it...' :
                                                'History, rules, how it affects the world...'
                                }
                                rows={5}
                            />
                        </div>

                        <div className="form-actions">
                            <button type="button" onClick={resetForm} disabled={isLoading} className="btn-cancel">Cancel</button>
                            <button type="submit" className="btn-confirm" disabled={isLoading || !formData.name.trim()}>
                                {isLoading ? 'Saving...' : editingItem ? 'Update' : 'Save'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default StoryBible;
