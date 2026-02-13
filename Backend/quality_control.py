"""
Quality Control Module for Story Generation

Provides quality scoring and filtering for generated text.
"""

import re
from typing import Dict, Tuple


def calculate_quality_score(text: str, original: str = "") -> Dict[str, float]:
    """
    Calculate quality metrics for generated text
    
    Returns dict with scores for:
    - repetition: 0-1 (higher is better, less repetition)
    - coherence: 0-1 (higher is better, more diverse vocabulary)
    - length: 0-1 (higher is better, appropriate length)
    - variety: 0-1 (higher is better, varied sentence structure)
    - overall: 0-1 (weighted average)
    """
    scores = {}
    
    # 1. Repetition detection
    scores['repetition'] = detect_repetition(text)
    
    # 2. Coherence (vocabulary diversity)
    scores['coherence'] = calculate_coherence(text)
    
    # 3. Length appropriateness
    scores['length'] = check_length_quality(text)
    
    # 4. Sentence structure variety
    scores['variety'] = sentence_variety(text)
    
    # Overall score (weighted average)
    scores['overall'] = (
        scores['repetition'] * 0.3 +
        scores['coherence'] * 0.3 +
        scores['length'] * 0.2 +
        scores['variety'] * 0.2
    )
    
    return scores


def detect_repetition(text: str) -> float:
    """
    Detect repetitive patterns (0-1, higher is better)
    Checks for repeated 3-word phrases
    """
    words = text.lower().split()
    if len(words) < 10:
        return 1.0
    
    # Check for repeated phrases (3+ words)
    phrases = []
    for i in range(len(words) - 2):
        phrase = ' '.join(words[i:i+3])
        phrases.append(phrase)
    
    unique_phrases = len(set(phrases))
    total_phrases = len(phrases)
    
    diversity = unique_phrases / total_phrases if total_phrases > 0 else 1.0
    return diversity


def calculate_coherence(text: str) -> float:
    """
    Calculate vocabulary diversity (0-1, higher is better)
    Uses type-token ratio
    """
    words = [w.lower() for w in re.findall(r'\b\w+\b', text)]
    if len(words) < 10:
        return 1.0
    
    unique_words = len(set(words))
    total_words = len(words)
    
    # Type-token ratio
    ttr = unique_words / total_words
    
    # Normalize (typical TTR is 0.4-0.6 for good text)
    normalized = min(ttr / 0.5, 1.0)
    return normalized


def check_length_quality(text: str) -> float:
    """
    Check if length is appropriate (0-1, higher is better)
    Penalizes very short or excessively long outputs
    """
    words = text.split()
    word_count = len(words)
    
    # Penalize very short or very long outputs
    if word_count < 20:
        return word_count / 20
    elif word_count > 500:
        return max(0.5, 1.0 - (word_count - 500) / 500)
    else:
        return 1.0


def sentence_variety(text: str) -> float:
    """
    Check sentence structure variety (0-1, higher is better)
    Measures variance in sentence lengths
    """
    sentences = re.split(r'[.!?]+', text)
    sentences = [s.strip() for s in sentences if s.strip()]
    
    if len(sentences) < 2:
        return 0.5
    
    # Check sentence length variety
    lengths = [len(s.split()) for s in sentences]
    avg_length = sum(lengths) / len(lengths)
    variance = sum((l - avg_length) ** 2 for l in lengths) / len(lengths)
    
    # Normalize variance (good variety has variance > 10)
    variety_score = min(variance / 10, 1.0)
    return variety_score


def filter_low_quality(text: str, original: str = "", threshold: float = 0.5) -> Tuple[bool, Dict]:
    """
    Filter out low-quality generations
    
    Args:
        text: Generated text to evaluate
        original: Original prompt/context (optional)
        threshold: Minimum acceptable quality score (0-1)
    
    Returns:
        (is_acceptable, scores)
    """
    scores = calculate_quality_score(text, original)
    is_acceptable = scores['overall'] >= threshold
    
    return is_acceptable, scores
