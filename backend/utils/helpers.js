/**
 * Helper Utilities
 */

/**
 * Extract character names from text
 * @param {string} text - Text to analyze
 * @returns {string|null} Character name or null if not found
 */
exports.extractCharacterName = (text) => {
  if (!text) return null;
  
  // Look for patterns like "Character: Text" or "CHARACTER: Text"
  const match = text.match(/^([A-Z][a-z]*|[A-Z]+):/);
  if (match) {
    return match[1];
  }
  
  return null;
};

/**
 * Clean OCR text
 * @param {string} text - OCR text to clean
 * @returns {string} Cleaned text
 */
exports.cleanOcrText = (text) => {
  if (!text) return '';
  
  // Remove line breaks and extra spaces
  let cleaned = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  
  // Fix common OCR errors
  cleaned = cleaned
    .replace(/\b0\b/g, 'O')
    .replace(/\b1\b/g, 'I')
    .replace(/\b5\b/g, 'S')
    .replace(/\b8\b/g, 'B');
  
  return cleaned.trim();
};

/**
 * Generate a random color
 * @returns {string} Hex color code
 */
exports.randomColor = () => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};
