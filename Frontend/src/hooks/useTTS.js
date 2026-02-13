import { useState, useRef, useEffect, useCallback } from 'react';
import { stripHtml } from '../utils/textUtils';

export const useTTS = () => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const speechRef = useRef(null);

    const stop = useCallback(() => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        setIsSpeaking(false);
        setIsPaused(false);
    }, []);

    const speak = useCallback((htmlContent) => {
        if (typeof window === 'undefined' || !window.speechSynthesis) {
            alert("Text-to-speech is not supported in this browser.");
            return;
        }

        // Cancel any ongoing speech first
        window.speechSynthesis.cancel();

        const text = stripHtml(htmlContent);
        if (!text.trim()) return;

        try {
            const utterance = new SpeechSynthesisUtterance(text);
            speechRef.current = utterance;

            // Voice selection for "soft" voice
            const voices = window.speechSynthesis.getVoices();
            // Try to find a female or "soft" sounding voice
            const softVoice = voices.find(v =>
                v.name.includes("Zira") || // Windows
                v.name.includes("Google US English") || // Chrome
                v.name.includes("Samantha") || // Mac
                v.name.includes("Female")
            );

            if (softVoice) {
                utterance.voice = softVoice;
            }

            // Adjust pitch and rate for a calmer tone
            utterance.pitch = 0.9;
            utterance.rate = 0.9;

            utterance.onend = () => {
                setIsSpeaking(false);
                setIsPaused(false);
            };

            utterance.onerror = (e) => {
                console.error("Speech error:", e);
                setIsSpeaking(false);
                setIsPaused(false);
            };

            window.speechSynthesis.speak(utterance);
            setIsSpeaking(true);
            setIsPaused(false);
        } catch (e) {
            console.error("TTS Start Error:", e);
            setIsSpeaking(false);
        }
    }, []);

    const pause = useCallback(() => {
        if (window.speechSynthesis) {
            window.speechSynthesis.pause();
            setIsPaused(true);
        }
    }, []);

    const resume = useCallback(() => {
        if (window.speechSynthesis) {
            window.speechSynthesis.resume();
            setIsPaused(false);
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    return {
        isSpeaking,
        isPaused,
        speak,
        pause,
        resume,
        stop
    };
};
