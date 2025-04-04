/**
 * Utility functions for the AI-Powered Web Comic Dubber extension
 */

// Global namespace for utilities
const ComicDubberUtils = {
  /**
   * Debounce a function to prevent multiple rapid calls
   * @param {Function} func - The function to debounce
   * @param {number} wait - The debounce wait time in milliseconds
   * @returns {Function} - The debounced function
   */
  debounce: function(func, wait) {
    let timeout;
    return function(...args) {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  },
  
  /**
   * Format a string with placeholders
   * @param {string} str - The string with placeholders {0}, {1}, etc.
   * @param {...any} args - The values to replace placeholders with
   * @returns {string} - The formatted string
   */
  format: function(str, ...args) {
    return str.replace(/{(\d+)}/g, (match, index) => {
      return typeof args[index] !== 'undefined' ? args[index] : match;
    });
  },
  
  /**
   * Safely parse JSON with error handling
   * @param {string} str - The JSON string to parse
   * @param {any} fallback - The fallback value if parsing fails
   * @returns {any} - The parsed object or fallback value
   */
  safeJsonParse: function(str, fallback = null) {
    try {
      return JSON.parse(str);
    } catch (error) {
      console.error('Error parsing JSON:', error);
      return fallback;
    }
  },
  
  /**
   * Generate a unique ID
   * @returns {string} - A unique ID
   */
  generateId: function() {
    return 'id_' + Math.random().toString(36).substr(2, 9);
  },
  
  /**
   * Check if a URL is an image
   * @param {string} url - The URL to check
   * @returns {boolean} - True if the URL is likely an image
   */
  isImageUrl: function(url) {
    if (!url) return false;
    
    // Check file extension
    const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const hasImageExtension = extensions.some(ext => url.toLowerCase().endsWith(ext));
    
    // Check URL path
    const urlObj = new URL(url);
    const pathEndsWithImage = extensions.some(ext => urlObj.pathname.toLowerCase().endsWith(ext));
    
    return hasImageExtension || pathEndsWithImage;
  },
  
  /**
   * Extract the main domain from a URL
   * @param {string} url - The URL to extract from
   * @returns {string} - The main domain
   */
  extractDomain: function(url) {
    try {
      const urlObj = new URL(url);
      const hostParts = urlObj.hostname.split('.');
      
      // Handle special cases like co.uk
      if (hostParts.length > 2 && 
          (hostParts[hostParts.length - 2] === 'co' || 
           hostParts[hostParts.length - 2] === 'com')) {
        return hostParts.slice(-3).join('.');
      }
      
      return hostParts.slice(-2).join('.');
    } catch (error) {
      return '';
    }
  },
  
  /**
   * Get a readable file size string
   * @param {number} bytes - The size in bytes
   * @returns {string} - Human-readable size
   */
  formatFileSize: function(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },
  
  /**
   * Truncate a string to a maximum length
   * @param {string} str - The string to truncate
   * @param {number} maxLength - The maximum length
   * @param {string} suffix - The suffix to add if truncated
   * @returns {string} - The truncated string
   */
  truncate: function(str, maxLength, suffix = '...') {
    if (!str) return '';
    if (str.length <= maxLength) return str;
    
    return str.substring(0, maxLength - suffix.length) + suffix;
  },
  
  /**
   * Check if the browser supports the Web Speech API
   * @returns {boolean} - True if supported
   */
  isSpeechSynthesisSupported: function() {
    return 'speechSynthesis' in window;
  },
  
  /**
   * Check if the browser supports the Canvas API
   * @returns {boolean} - True if supported
   */
  isCanvasSupported: function() {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext && canvas.getContext('2d'));
  },
  
  /**
   * Log a message with the extension prefix
   * @param {...any} args - The arguments to log
   */
  log: function(...args) {
    console.log('[Comic Dubber]', ...args);
  },
  
  /**
   * Log an error with the extension prefix
   * @param {...any} args - The arguments to log
   */
  error: function(...args) {
    console.error('[Comic Dubber]', ...args);
  }
};

// Export the utilities
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ComicDubberUtils;
}
