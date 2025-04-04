/**
 * Speech Bubble Detector
 * Detects speech bubbles in web comics using computer vision techniques
 */

class BubbleDetector {
  constructor() {
    this.bubbles = [];
    this.imageElements = [];
    this.canvasContext = null;
    this.initialized = false;
  }

  /**
   * Initialize the bubble detector
   */
  async initialize() {
    if (this.initialized) return;
    
    // Create a canvas for image processing
    const canvas = document.createElement('canvas');
    canvas.style.display = 'none';
    document.body.appendChild(canvas);
    this.canvasContext = canvas.getContext('2d');
    
    // Find all images on the page that might be comic panels
    this.findComicImages();
    
    this.initialized = true;
    console.log('BubbleDetector initialized');
  }

  /**
   * Find all images on the page that might be comic panels
   */
  findComicImages() {
    // Get all images on the page
    const allImages = Array.from(document.querySelectorAll('img'));
    
    // Filter for likely comic images (larger than a certain size)
    this.imageElements = allImages.filter(img => {
      const rect = img.getBoundingClientRect();
      // Images larger than 200x200 pixels are potential comic panels
      return rect.width > 200 && rect.height > 200;
    });
    
    console.log(`Found ${this.imageElements.length} potential comic images`);
  }

  /**
   * Detect speech bubbles in all found comic images
   */
  async detectBubbles() {
    if (!this.initialized) await this.initialize();
    
    this.bubbles = [];
    
    for (const img of this.imageElements) {
      try {
        const bubbles = await this.detectBubblesInImage(img);
        this.bubbles.push(...bubbles);
      } catch (error) {
        console.error('Error detecting bubbles in image:', error);
      }
    }
    
    console.log(`Detected ${this.bubbles.length} speech bubbles`);
    return this.bubbles;
  }

  /**
   * Detect speech bubbles in a single image
   * @param {HTMLImageElement} img - The image element to process
   * @returns {Array} - Array of detected bubbles with coordinates
   */
  async detectBubblesInImage(img) {
    // Resize canvas to match image dimensions
    const canvas = this.canvasContext.canvas;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    
    // Draw image to canvas
    this.canvasContext.drawImage(img, 0, 0);
    
    // Get image data for processing
    const imageData = this.canvasContext.getImageData(0, 0, canvas.width, canvas.height);
    
    // For a real implementation, we would use computer vision algorithms here
    // For this prototype, we'll use a simplified approach:
    // 1. Convert to grayscale
    // 2. Apply edge detection
    // 3. Find contours that might be speech bubbles
    
    // For now, we'll use the backend OCR service to detect bubbles
    // Convert canvas to base64 image data
    const base64Image = canvas.toDataURL('image/jpeg');
    
    // Send to backend for processing
    try {
      const response = await fetch('http://localhost:5000/api/ocr/process-base64', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': localStorage.getItem('authToken') || ''
        },
        body: JSON.stringify({ imageData: base64Image })
      });
      
      if (!response.ok) {
        throw new Error(`OCR service returned ${response.status}`);
      }
      
      const data = await response.json();
      
      // Map the detected bubbles to include the source image
      return data.textBlocks.map(bubble => ({
        ...bubble,
        sourceImage: img,
        sourceRect: img.getBoundingClientRect()
      }));
    } catch (error) {
      console.error('Error calling OCR service:', error);
      
      // Fallback: Return mock bubbles for testing
      return this.getMockBubbles(img);
    }
  }

  /**
   * Generate mock speech bubbles for testing
   * @param {HTMLImageElement} img - The image element
   * @returns {Array} - Array of mock bubbles
   */
  getMockBubbles(img) {
    const rect = img.getBoundingClientRect();
    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;
    
    // Create 2-3 mock bubbles per image
    const numBubbles = 2 + Math.floor(Math.random());
    const bubbles = [];
    
    for (let i = 0; i < numBubbles; i++) {
      // Random position within the image
      const x = Math.floor(Math.random() * (imgWidth - 100));
      const y = Math.floor(Math.random() * (imgHeight - 50));
      
      // Random size for the bubble
      const width = 80 + Math.floor(Math.random() * 120);
      const height = 40 + Math.floor(Math.random() * 60);
      
      bubbles.push({
        boundingBox: { x, y, width, height },
        text: 'Mock speech bubble text',
        confidence: 0.9,
        sourceImage: img,
        sourceRect: rect
      });
    }
    
    return bubbles;
  }

  /**
   * Highlight detected bubbles on the page
   * @param {boolean} show - Whether to show or hide highlights
   */
  highlightBubbles(show = true) {
    // Remove any existing highlights
    document.querySelectorAll('.comic-dubber-bubble-highlight').forEach(el => el.remove());
    
    if (!show || this.bubbles.length === 0) return;
    
    // Create highlights for each bubble
    this.bubbles.forEach((bubble, index) => {
      const highlight = document.createElement('div');
      highlight.className = 'comic-dubber-bubble-highlight';
      highlight.dataset.bubbleIndex = index;
      
      // Position the highlight over the bubble
      const sourceRect = bubble.sourceRect;
      const scale = sourceRect.width / bubble.sourceImage.naturalWidth;
      
      highlight.style.position = 'absolute';
      highlight.style.left = `${sourceRect.left + bubble.boundingBox.x * scale}px`;
      highlight.style.top = `${sourceRect.top + bubble.boundingBox.y * scale}px`;
      highlight.style.width = `${bubble.boundingBox.width * scale}px`;
      highlight.style.height = `${bubble.boundingBox.height * scale}px`;
      highlight.style.border = '2px solid rgba(255, 0, 0, 0.7)';
      highlight.style.borderRadius = '10px';
      highlight.style.pointerEvents = 'none';
      highlight.style.zIndex = '9999';
      
      document.body.appendChild(highlight);
    });
  }
}

// Create and export the bubble detector instance
window.bubbleDetector = new BubbleDetector();

// Initialize when the page is fully loaded
window.addEventListener('load', async () => {
  await window.bubbleDetector.initialize();
});
