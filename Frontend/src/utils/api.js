import { auth } from '../firebase/auth';

const API_URL = 'http://localhost:8000';

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
export const generateContinuation = async (params, onProgress = null) => {
  if (onProgress) onProgress('connecting');
  
  console.log('generateContinuation called with params:', params);
  
  try {
    // Use longer timeout for longer content
    const timeout = params.max_length > 500 ? 300000 : 180000; // 5min for long, 3min for short
    console.log(`Using timeout: ${timeout/1000}s for max_length: ${params.max_length}`);
    
    const response = await authenticatedFetch('/generate', {
      method: 'POST',
      body: JSON.stringify(params),
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
 */
export const saveStory = async (storyData) => {
  const response = await authenticatedFetch('/stories', {
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

export default {
  ApiError,
  authenticatedFetch,
  generateContinuation,
  getUserInfo,
  saveStory,
  getStories,
  deleteStory,
  healthCheck,
};
