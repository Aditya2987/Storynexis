import React, { useState, useEffect, useRef } from 'react';
import './AmbientPlayer.css';

const SOUNDS = [
    { id: 'rain', name: 'Heavy Rain', icon: '🌧️', url: 'https://raw.githubusercontent.com/Muges/ambientsounds/master/heavy-rain.ogg' },
    { id: 'fire', name: 'Fireplace', icon: '🔥', url: 'https://raw.githubusercontent.com/Muges/ambientsounds/master/fireplace.ogg' },
    { id: 'cafe', name: 'Coffee Shop', icon: '☕', url: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg' },
    { id: 'forest', name: 'Night Forest', icon: '🦗', url: 'https://raw.githubusercontent.com/Muges/ambientsounds/master/forest-rain.ogg' }
];

const AmbientPlayer = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentSoundId, setCurrentSoundId] = useState(null);
    const [volume, setVolume] = useState(0.5);

    const audioRef = useRef(new Audio());

    useEffect(() => {
        const audio = audioRef.current;
        audio.loop = true;

        return () => {
            audio.pause();
            audio.src = '';
        };
    }, []);

    useEffect(() => {
        audioRef.current.volume = volume;
    }, [volume]);

    const toggleSound = (sound) => {
        if (currentSoundId === sound.id && isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
            setCurrentSoundId(null);
        } else {
            if (currentSoundId !== sound.id) {
                audioRef.current.src = sound.url;
                setCurrentSoundId(sound.id);
            }
            audioRef.current.play().catch(e => console.error("Audio play error:", e));
            setIsPlaying(true);
        }
    };

    const handleVolumeChange = (e) => {
        setVolume(parseFloat(e.target.value));
    };

    return (
        <div className="ambient-player">
            <button
                className={`ambient-toggle ${isPlaying ? 'active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                title="Zen Mode: Ambient Sounds"
            >
                {isPlaying ? '🎧' : '🔈'}
            </button>

            {isOpen && (
                <div className="ambient-menu">
                    <div className="ambient-header">
                        <h4>Zen Ambience</h4>
                        <button
                            className="btn-close-modal"
                            style={{ padding: '4px', fontSize: '0.8rem' }}
                            onClick={() => setIsOpen(false)}
                        >✕</button>
                    </div>

                    <div className="sound-list">
                        {SOUNDS.map(sound => (
                            <div
                                key={sound.id}
                                className={`sound-item ${currentSoundId === sound.id && isPlaying ? 'playing' : ''}`}
                                onClick={() => toggleSound(sound)}
                            >
                                <span className="sound-icon">{sound.icon}</span>
                                <div className="sound-info">
                                    <span className="sound-name">{sound.name}</span>
                                    <span className="sound-status">
                                        {currentSoundId === sound.id && isPlaying ? 'Playing' : 'Click to play'}
                                    </span>
                                </div>
                                {currentSoundId === sound.id && isPlaying && (
                                    <div className="playing-bars">
                                        <div className="bar"></div>
                                        <div className="bar"></div>
                                        <div className="bar"></div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="volume-control">
                        <span className="volume-icon">🔊</span>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={volume}
                            onChange={handleVolumeChange}
                            className="volume-slider"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default AmbientPlayer;
