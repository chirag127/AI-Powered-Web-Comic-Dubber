/**
 * Speech Bubble Detection Library
 * Uses computer vision techniques to detect speech bubbles in comic images
 */

const BubbleDetection = {
  /**
   * Detect speech bubbles in an image
   * @param {HTMLImageElement} img - The image element to analyze
   * @returns {Promise<Array>} - Array of detected bubble positions
   */
  detectBubbles: async function(img) {
    // Create a canvas to process the image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0, img.width, img.height);
    
    // Get image data for processing
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Convert to grayscale for easier processing
    const grayscaleData = this.convertToGrayscale(imageData);
    
    // Apply edge detection
    const edgeData = this.detectEdges(grayscaleData, canvas.width, canvas.height);
    
    // Find contours (potential speech bubbles)
    const contours = this.findContours(edgeData, canvas.width, canvas.height);
    
    // Filter contours to find likely speech bubbles
    const bubbles = this.filterBubbles(contours, canvas.width, canvas.height);
    
    // Convert to relative positions (0-1 range)
    return bubbles.map(bubble => ({
      x: bubble.x / canvas.width,
      y: bubble.y / canvas.height,
      width: bubble.width / canvas.width,
      height: bubble.height / canvas.height
    }));
  },
  
  /**
   * Convert image data to grayscale
   * @param {ImageData} imageData - Original image data
   * @returns {Uint8ClampedArray} - Grayscale image data
   */
  convertToGrayscale: function(imageData) {
    const data = imageData.data;
    const grayscale = new Uint8ClampedArray(data.length / 4);
    
    for (let i = 0; i < data.length; i += 4) {
      // Convert RGB to grayscale using luminance formula
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      grayscale[i / 4] = gray;
    }
    
    return grayscale;
  },
  
  /**
   * Apply simple edge detection using Sobel operator
   * @param {Uint8ClampedArray} grayscale - Grayscale image data
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @returns {Uint8ClampedArray} - Edge detection result
   */
  detectEdges: function(grayscale, width, height) {
    const edges = new Uint8ClampedArray(grayscale.length);
    const threshold = 30; // Edge detection threshold
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        
        // Apply simple Sobel operator for edge detection
        const gx = 
          -1 * grayscale[idx - width - 1] +
          -2 * grayscale[idx - 1] +
          -1 * grayscale[idx + width - 1] +
           1 * grayscale[idx - width + 1] +
           2 * grayscale[idx + 1] +
           1 * grayscale[idx + width + 1];
           
        const gy = 
          -1 * grayscale[idx - width - 1] +
          -2 * grayscale[idx - width] +
          -1 * grayscale[idx - width + 1] +
           1 * grayscale[idx + width - 1] +
           2 * grayscale[idx + width] +
           1 * grayscale[idx + width + 1];
           
        // Calculate gradient magnitude
        const magnitude = Math.sqrt(gx * gx + gy * gy);
        
        // Apply threshold
        edges[idx] = magnitude > threshold ? 255 : 0;
      }
    }
    
    return edges;
  },
  
  /**
   * Find contours in edge-detected image
   * @param {Uint8ClampedArray} edges - Edge detection result
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @returns {Array} - Array of contour objects
   */
  findContours: function(edges, width, height) {
    // This is a simplified contour detection
    // In a real implementation, we would use a more sophisticated algorithm
    
    // Find connected components (blobs)
    const visited = new Uint8Array(edges.length);
    const contours = [];
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        
        if (edges[idx] > 0 && !visited[idx]) {
          // Start a new contour
          const contour = {
            points: [],
            minX: x,
            minY: y,
            maxX: x,
            maxY: y
          };
          
          // Use flood fill to find connected pixels
          this.floodFill(edges, visited, x, y, width, height, contour);
          
          // Calculate bounding box
          contour.x = contour.minX;
          contour.y = contour.minY;
          contour.width = contour.maxX - contour.minX;
          contour.height = contour.maxY - contour.minY;
          
          contours.push(contour);
        }
      }
    }
    
    return contours;
  },
  
  /**
   * Flood fill algorithm to find connected components
   * @param {Uint8ClampedArray} edges - Edge detection result
   * @param {Uint8Array} visited - Visited pixels
   * @param {number} x - Starting x coordinate
   * @param {number} y - Starting y coordinate
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @param {Object} contour - Contour object to update
   */
  floodFill: function(edges, visited, x, y, width, height, contour) {
    // Check boundaries
    if (x < 0 || y < 0 || x >= width || y >= height) {
      return;
    }
    
    const idx = y * width + x;
    
    // Check if pixel is part of edge and not visited
    if (edges[idx] === 0 || visited[idx]) {
      return;
    }
    
    // Mark as visited
    visited[idx] = 1;
    
    // Add to contour
    contour.points.push({ x, y });
    
    // Update bounding box
    contour.minX = Math.min(contour.minX, x);
    contour.minY = Math.min(contour.minY, y);
    contour.maxX = Math.max(contour.maxX, x);
    contour.maxY = Math.max(contour.maxY, y);
    
    // Recursively check neighbors
    this.floodFill(edges, visited, x + 1, y, width, height, contour);
    this.floodFill(edges, visited, x - 1, y, width, height, contour);
    this.floodFill(edges, visited, x, y + 1, width, height, contour);
    this.floodFill(edges, visited, x, y - 1, width, height, contour);
  },
  
  /**
   * Filter contours to find likely speech bubbles
   * @param {Array} contours - Array of contour objects
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @returns {Array} - Array of filtered bubble objects
   */
  filterBubbles: function(contours, width, height) {
    // Filter based on size, shape, and position
    const minSize = Math.min(width, height) * 0.05; // Minimum size (5% of image)
    const maxSize = Math.min(width, height) * 0.5;  // Maximum size (50% of image)
    
    return contours.filter(contour => {
      // Size filter
      if (contour.width < minSize || contour.height < minSize) {
        return false;
      }
      
      if (contour.width > maxSize || contour.height > maxSize) {
        return false;
      }
      
      // Shape filter - check if it's roughly rectangular or oval
      const aspectRatio = contour.width / contour.height;
      if (aspectRatio < 0.3 || aspectRatio > 3) {
        return false;
      }
      
      // Check if it has enough points to be a closed shape
      if (contour.points.length < 20) {
        return false;
      }
      
      return true;
    });
  },
  
  /**
   * Map detected bubbles to OCR results
   * @param {Array} bubbles - Array of detected bubble positions
   * @param {Array} ocrResults - Array of OCR results
   * @returns {Array} - Array of mapped results
   */
  mapBubblesToOCR: function(bubbles, ocrResults) {
    // If we have the same number of bubbles and OCR results, map them directly
    if (bubbles.length === ocrResults.length) {
      return ocrResults.map((result, index) => ({
        ...result,
        position: bubbles[index]
      }));
    }
    
    // If we have more bubbles than OCR results, use the first bubbles
    if (bubbles.length > ocrResults.length) {
      return ocrResults.map((result, index) => ({
        ...result,
        position: bubbles[index] || null
      }));
    }
    
    // If we have more OCR results than bubbles, use the first OCR results
    if (ocrResults.length > bubbles.length) {
      return ocrResults.slice(0, bubbles.length).map((result, index) => ({
        ...result,
        position: bubbles[index]
      }));
    }
    
    return [];
  }
};

// Export the module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BubbleDetection;
}
