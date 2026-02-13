/**
 * Generate multiple story variations
 * @param {Object} params - Generation parameters
 * @returns {Promise} - Variations array with quality scores
 */
export const generateVariations = async (params) => {
    try {
        const response = await authenticatedFetch('/generate/variations', {
            method: 'POST',
            body: JSON.stringify(params),
        }, { maxRetries: 1, timeout: 180000 });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Request failed' }));
            throw new ApiError(
                error.detail || 'Failed to generate variations',
                response.status
            );
        }

        return response.json();
    } catch (error) {
        console.error('generateVariations error:', error);
        throw error;
    }
};
