/**
 * OCR Module
 * Extracts text from speech bubbles using Optical Character Recognition
 */

class OCRProcessor {
  constructor() {
    this.worker = null;
    this.initialized = false;
    this.processingQueue = [];
    this.isProcessing = false;
  }

  /**
   * Initialize the OCR processor
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      // Load Tesseract.js from CDN
      await this.loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract.min.js');
      
      // Initialize Tesseract worker
      this.worker = await Tesseract.createWorker('eng');
      
      this.initialized = true;
      console.log('OCR processor initialized');
      
      // Process any queued items
      this.processQueue();
    } catch (error) {
      console.error('Failed to initialize OCR processor:', error);
    }
  }

  /**
   * Load a script dynamically
   * @param {string} src - Script URL
   * @returns {Promise} - Resolves when script is loaded
   */
  loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * Process the queue of pending OCR requests
   */
  async processQueue() {
    if (this.isProcessing || this.processingQueue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.processingQueue.length > 0) {
      const { bubble, resolve, reject } = this.processingQueue.shift();
      
      try {
        const text = await this.processImage(bubble);
        resolve(text);
      } catch (error) {
        console.error('Error processing OCR:', error);
        reject(error);
      }
    }
    
    this.isProcessing = false;
  }

  /**
   * Extract text from a speech bubble
   * @param {Object} bubble - The bubble object with coordinates
   * @returns {Promise<string>} - The extracted text
   */
  async extractText(bubble) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    // If the bubble already has text, return it
    if (bubble.text && bubble.text !== 'Mock speech bubble text') {
      return bubble.text;
    }
    
    // Add to processing queue
    return new Promise((resolve, reject) => {
      this.processingQueue.push({ bubble, resolve, reject });
      
      // Start processing if not already in progress
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process an image to extract text
   * @param {Object} bubble - The bubble object with coordinates
   * @returns {Promise<string>} - The extracted text
   */
  async processImage(bubble) {
    // Create a canvas to extract the bubble region
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const { sourceImage, boundingBox } = bubble;
    
    // Set canvas dimensions to match the bubble
    canvas.width = boundingBox.width;
    canvas.height = boundingBox.height;
    
    // Draw only the bubble region to the canvas
    ctx.drawImage(
      sourceImage,
      boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height,
      0, 0, boundingBox.width, boundingBox.height
    );
    
    // Get image data as base64
    const imageData = canvas.toDataURL('image/png');
    
    try {
      // Try to use the backend OCR service first
      const text = await this.processWithBackend(imageData);
      return text;
    } catch (error) {
      console.warn('Backend OCR failed, falling back to local OCR:', error);
      
      // Fall back to local Tesseract OCR
      if (this.worker) {
        const result = await this.worker.recognize(imageData);
        return result.data.text.trim();
      } else {
        throw new Error('OCR worker not initialized');
      }
    }
  }

  /**
   * Process image with backend OCR service
   * @param {string} imageData - Base64 encoded image data
   * @returns {Promise<string>} - The extracted text
   */
  async processWithBackend(imageData) {
    const response = await fetch('http://localhost:5000/api/ocr/process-base64', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': localStorage.getItem('authToken') || ''
      },
      body: JSON.stringify({ imageData })
    });
    
    if (!response.ok) {
      throw new Error(`OCR service returned ${response.status}`);
    }
    
    const data = await response.json();
    return data.fullTextAnnotation || '';
  }

  /**
   * Clean up resources
   */
  async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
    this.initialized = false;
  }
}

// Create and export the OCR processor instance
window.ocrProcessor = new OCRProcessor();

// Initialize when the page is fully loaded
window.addEventListener('load', async () => {
  // Delay initialization to prioritize bubble detection
  setTimeout(async () => {
    await window.ocrProcessor.initialize();
  }, 1000);
});
