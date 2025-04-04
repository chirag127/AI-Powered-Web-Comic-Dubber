const axios = require('axios');

/**
 * Fetch an image from a URL and convert it to base64
 * @param {string} imageUrl - URL of the image to fetch
 * @returns {Promise<string>} - Base64 encoded image data
 */
async function fetchImageAsBase64(imageUrl) {
  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer'
    });
    
    const buffer = Buffer.from(response.data, 'binary');
    const base64 = buffer.toString('base64');
    
    // Determine the MIME type based on the URL or response headers
    let mimeType = 'image/jpeg'; // Default
    
    if (imageUrl.endsWith('.png')) {
      mimeType = 'image/png';
    } else if (imageUrl.endsWith('.gif')) {
      mimeType = 'image/gif';
    } else if (response.headers['content-type']) {
      mimeType = response.headers['content-type'];
    }
    
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error('Error fetching image:', error);
    throw new Error('Failed to fetch image: ' + error.message);
  }
}

/**
 * Validate a base64 image string
 * @param {string} base64String - Base64 encoded image data
 * @returns {boolean} - Whether the string is a valid base64 image
 */
function isValidBase64Image(base64String) {
  // Check if it's a data URL
  if (base64String.startsWith('data:image/')) {
    // Extract the base64 part
    const base64Data = base64String.split(',')[1];
    
    // Check if it's a valid base64 string
    try {
      return /^[A-Za-z0-9+/=]+$/.test(base64Data);
    } catch (e) {
      return false;
    }
  }
  
  // If it's not a data URL, check if it's a raw base64 string
  try {
    return /^[A-Za-z0-9+/=]+$/.test(base64String);
  } catch (e) {
    return false;
  }
}

module.exports = {
  fetchImageAsBase64,
  isValidBase64Image
};
