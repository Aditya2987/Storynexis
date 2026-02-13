import React, { useState } from 'react';
import './VariationSelector.css';

const VariationSelector = ({ variations, onSelect, onRegenerate, onCancel }) => {
    const [selectedId, setSelectedId] = useState(null);

    const handleSelect = (variation) => {
        setSelectedId(variation.id);
    };

    const handleAccept = () => {
        const selected = variations.find(v => v.id === selectedId);
        if (selected) {
            onSelect(selected);
        }
    };

    const getQualityLabel = (score) => {
        if (score > 0.7) return 'Excellent';
        if (score > 0.5) return 'Good';
        return 'Fair';
    };

    const getQualityClass = (score) => {
        if (score > 0.7) return 'high';
        if (score > 0.5) return 'medium';
        return 'low';
    };

    return (
        <div className="variation-selector-overlay">
            <div className="variation-selector">
                <div className="variation-header">
                    <h3>✨ Choose Your Favorite</h3>
                    <button className="close-btn" onClick={onCancel} title="Close">
                        ✕
                    </button>
                </div>

                <div className="variations-grid">
                    {variations.map((variation, index) => (
                        <div
                            key={variation.id}
                            className={`variation-card ${selectedId === variation.id ? 'selected' : ''}`}
                            onClick={() => handleSelect(variation)}
                        >
                            <div className="variation-card-header">
                                <span className="variation-number">Option {index + 1}</span>
                                <div className="quality-info">
                                    <span className={`quality-badge ${getQualityClass(variation.quality.overall)}`}>
                                        {getQualityLabel(variation.quality.overall)}
                                    </span>
                                    <span className="quality-score">
                                        {Math.round(variation.quality.overall * 100)}%
                                    </span>
                                </div>
                            </div>

                            <div className="variation-text">
                                {variation.text}
                            </div>

                            <div className="variation-footer">
                                <span className="word-count">
                                    📝 {variation.wordCount} words
                                </span>
                                <div className="quality-metrics">
                                    <span title="Vocabulary diversity">
                                        🎨 {Math.round(variation.quality.coherence * 100)}%
                                    </span>
                                    <span title="Originality">
                                        ✨ {Math.round(variation.quality.repetition * 100)}%
                                    </span>
                                </div>
                            </div>

                            {selectedId === variation.id && (
                                <div className="selected-indicator">✓ Selected</div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="variation-actions">
                    <button className="regenerate-btn" onClick={onRegenerate}>
                        🔄 Generate More
                    </button>
                    <div className="action-buttons">
                        <button className="cancel-action-btn" onClick={onCancel}>
                            Cancel
                        </button>
                        <button
                            className="accept-btn"
                            onClick={handleAccept}
                            disabled={!selectedId}
                        >
                            ✓ Accept Selected
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VariationSelector;
