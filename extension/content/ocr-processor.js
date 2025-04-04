/**
 * OCR Processor
 * Uses Tesseract.js to extract text from speech bubbles
 */
class OCRProcessor {
  constructor() {
    this.initialized = false;
    this.processing = false;
    this.worker = null;
  }

  /**
   * Initialize the OCR processor
   * @returns {Promise} Resolves when initialization is complete
   */
  async initialize() {
    if (this.initialized) {
      return Promise.resolve();
    }

    try {
      // Initialize Tesseract worker
      this.worker = Tesseract.createWorker();
      await this.worker.load();
      await this.worker.loadLanguage('eng');
      await this.worker.initialize('eng');
      
      // Set parameters for better comic text recognition
      await this.worker.setParameters({
        tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,!?\'"-:;()[]{}',
        preserve_interword_spaces: '1',
      });
      
      this.initialized = true;
      return Promise.resolve();
    } catch (error) {
      console.error('Error initializing OCR:', error);
      return Promise.reject(error);
    }
  }

  /**
   * Extract text from detected speech bubbles
   * @param {Array} bubbles - Array of detected bubble coordinates
   * @returns {Promise<Array>} Array of bubbles with extracted text
   */
  async extractText(bubbles) {
    if (this.processing) {
      return Promise.reject('Already processing OCR');
    }

    if (!this.initialized) {
      await this.initialize();
    }

    this.processing = true;

    try {
      const bubblesWithText = [];
      
      for (const bubble of bubbles) {
        const text = await this.processRegion(bubble);
        
        if (text && text.trim() !== '') {
          bubblesWithText.push({
            ...bubble,
            text: text.trim()
          });
        }
      }
      
      this.processing = false;
      return bubblesWithText;
    } catch (error) {
      this.processing = false;
      console.error('Error extracting text:', error);
      return Promise.reject(error);
    }
  }

  /**
   * Process a single region to extract text
   * @param {Object} region - The region coordinates
   * @returns {Promise<string>} Extracted text
   */
  async processRegion(region) {
    return new Promise(async (resolve) => {
      try {
        // Create a canvas to capture the region
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas dimensions to match the region
        canvas.width = region.width;
        canvas.height = region.height;
        
        // Draw the region on the canvas
        ctx.drawImage(
          region.imageElement,
          region.x - region.imageElement.getBoundingClientRect().left - window.scrollX,
          region.y - region.imageElement.getBoundingClientRect().top - window.scrollY,
          region.width,
          region.height,
          0,
          0,
          region.width,
          region.height
        );
        
        // Get image data as base64
        const imageData = canvas.toDataURL('image/png');
        
        // Recognize text using Tesseract
        const result = await this.worker.recognize(imageData);
        
        // Clean up the text
        let text = result.data.text;
        
        // Remove line breaks and extra spaces
        text = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
        
        resolve(text);
      } catch (error) {
        console.error('Error processing region:', error);
        resolve('');
      }
    });
  }

  /**
   * Terminate the OCR worker
   */
  async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.initialized = false;
    }
  }
}

// Export the OCRProcessor class
window.OCRProcessor = OCRProcessor;
