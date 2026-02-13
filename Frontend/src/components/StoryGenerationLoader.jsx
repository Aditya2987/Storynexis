import React, { useEffect, useState } from 'react';
import './StoryGenerationLoader.css';

const loadingSteps = [
    "Analyzing your prompt...",
    "Weaving narrative threads...",
    "Constructing the world...",
    "Developing characters...",
    "Polishing the prose...",
    "Finalizing your story..."
];

const StoryGenerationLoader = ({ onCancel }) => {
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentStep((prev) => (prev + 1) % loadingSteps.length);
        }, 2000); // Change step every 2 seconds

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="loader-overlay">
            <div className="loader-content">
                <div className="orb-container">
                    <div className="orb"></div>
                    <div className="orb-ring"></div>
                    <div className="orb-ring-outer"></div>
                </div>
                <h2 className="loader-title">Crafting Your Story</h2>
                <div className="loader-step" key={currentStep}>
                    {loadingSteps[currentStep]}
                </div>
                <div className="loader-progress-bar">
                    <div className="loader-progress-fill"></div>
                </div>
                {onCancel && (
                    <button className="loader-cancel-btn" onClick={onCancel}>
                        Cancel
                    </button>
                )}
            </div>
        </div>
    );
};

export default StoryGenerationLoader;
