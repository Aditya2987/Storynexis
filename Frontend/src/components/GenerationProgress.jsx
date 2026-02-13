import React from 'react';
import './GenerationProgress.css';

const GenerationProgress = ({
    isGenerating,
    progress,
    generatedText,
    onCancel,
    onAccept,
    onReject
}) => {
    if (!isGenerating && !generatedText) return null;

    return (
        <div className="generation-progress">
            {isGenerating && (
                <div className="progress-header">
                    <div className="progress-info">
                        <span className="progress-label">Generating...</span>
                        <span className="progress-percent">{progress}%</span>
                    </div>
                    <button className="cancel-btn" onClick={onCancel} title="Cancel generation">
                        ✕
                    </button>
                </div>
            )}

            {generatedText && (
                <div className="generated-preview">
                    <div className="preview-header">
                        <h4>✨ Generated Text</h4>
                        {!isGenerating && (
                            <div className="preview-actions">
                                <button className="accept-btn" onClick={onAccept} title="Accept and add to story">
                                    ✓ Accept
                                </button>
                                <button className="reject-btn" onClick={onReject} title="Reject and discard">
                                    ✕ Reject
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="preview-content">
                        {generatedText}
                        {isGenerating && <span className="typing-cursor">|</span>}
                    </div>
                </div>
            )}
        </div>
    );
};

export default GenerationProgress;
