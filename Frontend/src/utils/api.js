import { auth } from '../firebase/auth';

// Get API URL from environment variable, fallback to localhost
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

console.log('🌐 API URL:', API_URL);

// Custom API Error class for better error handling
export class ApiError extends Error {
  constructor(message, status, code = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

/**
 * Sleep for a specified duration
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calculate exponential backoff delay
 */
const getBackoffDelay = (attempt, baseDelay = RETRY_CONFIG.baseDelay) => {
  const delay = Math.min(
    baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
    RETRY_CONFIG.maxDelay
  );
  return delay;
};

/**
 * Check if error is retryable
 */
const isRetryable = (status) => RETRY_CONFIG.retryableStatuses.includes(status);

/**
 * Get Firebase auth token
 */
const getAuthToken = async () => {
  const user = auth.currentUser;
  if (user) {
    try {
      return await user.getIdToken(true);
    } catch (error) {
      console.warn('Failed to get auth token:', error);
      return null;
    }
  }
  return null;
};

/**
 * Get user-friendly error message
 */
const getErrorMessage = (status, serverMessage) => {
  const messages = {
    400: 'Invalid request. Please check your input.',
    401: 'Session expired. Please sign in again.',
    403: 'You don\'t have permission to perform this action.',
    404: 'Resource not found.',
    408: 'Request timeout. Please try again.',
    429: 'Too many requests. Please wait a moment.',
    500: 'Server error. We\'re working on it.',
    502: 'Server temporarily unavailable. Please try again.',
    503: 'Service unavailable. Please try again later.',
    504: 'Request timeout. Please try again.',
  };

  return serverMessage || messages[status] || 'An unexpected error occurred.';
};

/**
 * Make an authenticated API request with retry logic
 * Automatically includes the Firebase ID token in the Authorization header
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Fetch options
 * @param {Object} retryOptions - Retry configuration override
 */
export const authenticatedFetch = async (
  endpoint,
  options = {},
  retryOptions = {}
) => {
  const config = { ...RETRY_CONFIG, ...retryOptions };
  let lastError = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      // Get current user's ID token (if logged in)
      const user = auth.currentUser;
      let token = null;

      if (user) {
        try {
          token = await user.getIdToken(true); // Force refresh to ensure valid token
          console.log('Token obtained successfully');
        } catch (tokenError) {
          console.warn('Failed to get token, continuing as guest:', tokenError);
        }
      } else {
        console.log('No authenticated user, proceeding as guest');
      }

      // Prepare headers
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      // Add authorization header only if we have a token
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Create abort controller for timeout - 180s for long story generation
      const controller = new AbortController();
      const timeoutMs = retryOptions.timeout || 180000; // Default 180s for model generation
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      // Handle external abort signal
      if (options.signal) {
        options.signal.addEventListener('abort', () => {
          controller.abort();
        });
        if (options.signal.aborted) {
          controller.abort();
        }
      }

      // Make the request
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle 401 errors specially - retry with fresh token
      if (response.status === 401) {
        console.log('Got 401, attempting to refresh token and retry...');
        if (attempt < config.maxRetries) {
          await sleep(1000); // Wait before retry
          continue;
        }
        throw new ApiError('Authentication failed. Please sign in again.', 401);
      }

      // Handle non-retryable errors immediately
      if (!response.ok && !isRetryable(response.status)) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          getErrorMessage(response.status, errorData.detail),
          response.status,
          errorData.code
        );
      }

      // Handle retryable errors
      if (!response.ok && isRetryable(response.status)) {
        if (attempt < config.maxRetries) {
          const delay = getBackoffDelay(attempt, config.baseDelay);
          console.log(`Request failed (${response.status}), retrying in ${delay}ms...`);
          await sleep(delay);
          continue;
        }

        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          getErrorMessage(response.status, errorData.detail),
          response.status
        );
      }

      return response;
    } catch (error) {
      lastError = error;

      // Handle abort/timeout
      if (error.name === 'AbortError') {
        if (attempt < config.maxRetries) {
          const delay = getBackoffDelay(attempt, config.baseDelay);
          console.log(`Request timeout, retrying in ${delay}ms...`);
          await sleep(delay);
          continue;
        }
        throw new ApiError('Request timeout. Please check your connection.', 408);
      }

      // Handle network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        if (attempt < config.maxRetries) {
          const delay = getBackoffDelay(attempt, config.baseDelay);
          console.log(`Network error, retrying in ${delay}ms...`);
          await sleep(delay);
          continue;
        }
        throw new ApiError('Network error. Please check your connection.', 0);
      }

      // Re-throw API errors
      if (error instanceof ApiError) {
        throw error;
      }

      // For unknown errors, retry
      if (attempt < config.maxRetries) {
        const delay = getBackoffDelay(attempt, config.baseDelay);
        await sleep(delay);
        continue;
      }

      throw error;
    }
  }

  throw lastError || new ApiError('Maximum retries exceeded', 500);
};

/**
 * Generate story continuation with authentication
 * @param {Object} params - Generation parameters
 * @param {Function} onProgress - Optional progress callback
 */
export const generateContinuation = async (params, onProgress = null, signal = null) => {
  if (onProgress) onProgress('connecting');

  console.log('generateContinuation called with params:', params);

  try {
    // Use longer timeout for longer content
    const timeout = params.max_length > 500 ? 300000 : 180000; // 5min for long, 3min for short
    console.log(`Using timeout: ${timeout / 1000}s for max_length: ${params.max_length}`);

    const response = await authenticatedFetch('/generate', {
      method: 'POST',
      body: JSON.stringify(params),
      signal, // Pass the signal
    }, { maxRetries: 1, timeout }); // Single retry, custom timeout

    if (onProgress) onProgress('generating');

    console.log('Response status:', response.status, response.ok);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      console.error('Response not ok:', error);
      throw new ApiError(
        error.detail || 'Failed to generate continuation',
        response.status
      );
    }

    if (onProgress) onProgress('complete');
    const data = await response.json();
    console.log('Parsed response data:', data);
    return data;
  } catch (error) {
    console.error('generateContinuation error:', error);
    throw error;
  }
};

/**
 * Generate story continuation with streaming (real-time text generation)
 * @param {Object} params - Generation parameters
 * @param {Function} onChunk - Callback for each text chunk
 * @param {Function} onComplete - Callback when generation completes
 * @param {Function} onError - Callback for errors
 * @param {AbortSignal} signal - Optional abort signal for cancellation
 */
export const generateContinuationStream = async (
  params,
  onChunk,
  onComplete,
  onError,
  signal = null
) => {
  try {
    const token = await getAuthToken();

    const response = await fetch(`${API_URL}/generate/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify(params),
      signal  // For cancellation
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new ApiError(
        error.detail || 'Failed to start streaming',
        response.status
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'start') {
              console.log('🌊 Streaming started');
            } else if (data.type === 'chunk') {
              onChunk(data.text);
            } else if (data.type === 'done') {
              console.log('✅ Streaming complete');
              onComplete(data.fullText);
            } else if (data.type === 'error') {
              onError(new Error(data.message));
            }
          } catch (parseError) {
            console.error('Error parsing SSE data:', parseError);
          }
        }
      }
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('⏹️ Generation cancelled by user');
    } else {
      console.error('Streaming error:', error);
      onError(error);
    }
  }
};

/**
 * Get current user info from backend
 */
export const getUserInfo = async () => {
  const response = await authenticatedFetch('/user/me');

  if (!response.ok) {
    throw new ApiError('Failed to fetch user info', response.status);
  }

  return response.json();
};

/**
 * Save story to backend
 * @param {Object} storyData - Story data to save
 * @param {string} storyId - Optional story ID for updating existing story
 */
export const saveStory = async (storyData, storyId = null) => {
  const endpoint = storyId ? `/stories?story_id=${storyId}` : '/stories';

  const response = await authenticatedFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(storyData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ApiError(
      error.detail || 'Failed to save story',
      response.status
    );
  }

  return response.json();
};

/**
 * Get user's stories from backend
 */
export const getStories = async () => {
  const response = await authenticatedFetch('/stories');

  if (!response.ok) {
    throw new ApiError('Failed to fetch stories', response.status);
  }

  return response.json();
};

/**
 * Get a single story by ID from backend
 * @param {string} storyId - Story ID to fetch
 */
export const getStoryById = async (storyId) => {
  const response = await authenticatedFetch(`/stories/${storyId}`);

  if (!response.ok) {
    throw new ApiError('Failed to fetch story', response.status);
  }

  return response.json();
};

/**
 * Delete a story
 * @param {string} storyId - Story ID to delete
 */
export const deleteStory = async (storyId) => {
  const response = await authenticatedFetch(`/stories/${storyId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new ApiError('Failed to delete story', response.status);
  }

  return response.json();
};

/**
 * Create a new bible item
 */
export const createBibleItem = async (storyId, itemData) => {
  const response = await authenticatedFetch(`/stories/${storyId}/items`, {
    method: 'POST',
    body: JSON.stringify(itemData),
  });

  if (!response.ok) {
    throw new ApiError('Failed to create item', response.status);
  }

  return response.json();
};

/**
 * Get bible items for a story
 */
export const getBibleItems = async (storyId, category = null) => {
  let endpoint = `/stories/${storyId}/items`;
  if (category) {
    endpoint += `?category=${encodeURIComponent(category)}`;
  }

  const response = await authenticatedFetch(endpoint);

  if (!response.ok) {
    throw new ApiError('Failed to fetch items', response.status);
  }

  return response.json();
};

/**
 * Update a bible item
 */
export const updateBibleItem = async (storyId, itemId, itemData) => {
  const response = await authenticatedFetch(`/stories/${storyId}/items/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify(itemData),
  });

  if (!response.ok) {
    throw new ApiError('Failed to update item', response.status);
  }

  return response.json();
};

/**
 * Delete a bible item
 */
export const deleteBibleItem = async (storyId, itemId) => {
  const response = await authenticatedFetch(`/stories/${storyId}/items/${itemId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new ApiError('Failed to delete item', response.status);
  }

  return response.json();
};

/**
 * Auto-generate bible items from story content
 */
export const generateBibleItems = async (storyId) => {
  const response = await authenticatedFetch(`/stories/${storyId}/bible/generate`, {
    method: 'POST',
  }, { timeout: 300000 }); // 5 min timeout for analysis

  if (!response.ok) {
    throw new ApiError('Failed to generate bible items', response.status);
  }

  return response.json();
};

/**
 * Health check for the API
 */
export const healthCheck = async () => {
  try {
    const response = await fetch(`${API_URL}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return response.ok;
  } catch {
    return false;
  }
};

/**
 * Rewrite selected text
 * @param {Object} params - { text, instruction, context }
 */
export const rewriteText = async (params) => {
  const response = await authenticatedFetch('/rewrite', {
    method: 'POST',
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new ApiError('Failed to rewrite text', response.status);
  }

  return response.json();
};

export default {
  ApiError,
  authenticatedFetch,
  generateContinuation,
  generateContinuationStream,
  rewriteText,
  getUserInfo,
  saveStory,
  getStories,
  getStoryById,
  getStoryById,
  deleteStory,
  createBibleItem,
  getBibleItems,
  updateBibleItem,
  deleteBibleItem,
  generateBibleItems,
  healthCheck,
};
