/**
 * Speech Bubble Detector
 * Uses computer vision techniques to detect speech bubbles in comics
 */
class BubbleDetector {
  constructor() {
    this.initialized = false;
    this.processing = false;
    this.cv = null; // OpenCV.js instance
  }

  /**
   * Initialize the bubble detector
   * @returns {Promise} Resolves when initialization is complete
   */
  async initialize() {
    if (this.initialized) {
      return Promise.resolve();
    }

    // Wait for OpenCV.js to be loaded
    return new Promise((resolve) => {
      if (typeof cv !== 'undefined') {
        this.cv = cv;
        this.initialized = true;
        resolve();
      } else {
        // Check if OpenCV is loaded every 100ms
        const checkInterval = setInterval(() => {
          if (typeof cv !== 'undefined') {
            clearInterval(checkInterval);
            this.cv = cv;
            this.initialized = true;
            resolve();
          }
        }, 100);

        // Timeout after 5 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          console.error('OpenCV.js failed to load');
          resolve();
        }, 5000);
      }
    });
  }

  /**
   * Detect speech bubbles in the current page
   * @returns {Promise<Array>} Array of detected bubbles with coordinates and dimensions
   */
  async detectBubbles() {
    if (this.processing) {
      return Promise.reject('Already processing an image');
    }

    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.cv) {
      return Promise.reject('OpenCV.js not loaded');
    }

    this.processing = true;

    try {
      // Get all images on the page
      const images = Array.from(document.querySelectorAll('img'));
      
      // Filter out small images and icons
      const comicImages = images.filter(img => {
        const rect = img.getBoundingClientRect();
        return rect.width > 200 && rect.height > 200;
      });

      if (comicImages.length === 0) {
        this.processing = false;
        return [];
      }

      // Process each potential comic image
      const allBubbles = [];
      
      for (const img of comicImages) {
        const bubbles = await this.processImage(img);
        allBubbles.push(...bubbles);
      }

      this.processing = false;
      return allBubbles;
    } catch (error) {
      this.processing = false;
      console.error('Error detecting bubbles:', error);
      return Promise.reject(error);
    }
  }

  /**
   * Process a single image to detect speech bubbles
   * @param {HTMLImageElement} img - The image element to process
   * @returns {Promise<Array>} Array of detected bubbles
   */
  async processImage(img) {
    return new Promise((resolve) => {
      // Create a canvas to draw the image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set canvas dimensions to match the image
      const rect = img.getBoundingClientRect();
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      
      // Draw the image on the canvas
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Convert to OpenCV format
      const src = this.cv.matFromImageData(imageData);
      
      // Convert to grayscale
      const gray = new this.cv.Mat();
      this.cv.cvtColor(src, gray, this.cv.COLOR_RGBA2GRAY);
      
      // Apply Gaussian blur to reduce noise
      const blurred = new this.cv.Mat();
      const ksize = new this.cv.Size(5, 5);
      this.cv.GaussianBlur(gray, blurred, ksize, 0);
      
      // Apply adaptive threshold to get binary image
      const binary = new this.cv.Mat();
      this.cv.adaptiveThreshold(
        blurred,
        binary,
        255,
        this.cv.ADAPTIVE_THRESH_GAUSSIAN_C,
        this.cv.THRESH_BINARY_INV,
        11,
        2
      );
      
      // Find contours
      const contours = new this.cv.MatVector();
      const hierarchy = new this.cv.Mat();
      this.cv.findContours(
        binary,
        contours,
        hierarchy,
        this.cv.RETR_EXTERNAL,
        this.cv.CHAIN_APPROX_SIMPLE
      );
      
      // Filter contours to find potential speech bubbles
      const bubbles = [];
      
      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const area = this.cv.contourArea(contour);
        
        // Filter out small contours
        if (area < 1000) {
          continue;
        }
        
        // Get bounding rectangle
        const rect = this.cv.boundingRect(contour);
        
        // Calculate aspect ratio
        const aspectRatio = rect.width / rect.height;
        
        // Filter out non-bubble shapes (too elongated)
        if (aspectRatio > 3 || aspectRatio < 0.3) {
          continue;
        }
        
        // Calculate solidity (area / convex hull area)
        const hull = new this.cv.Mat();
        this.cv.convexHull(contour, hull);
        const hullContour = new this.cv.MatVector();
        hullContour.push_back(hull);
        const hullArea = this.cv.contourArea(hull);
        const solidity = area / hullArea;
        
        // Filter out non-solid shapes
        if (solidity < 0.7) {
          continue;
        }
        
        // Calculate circularity
        const perimeter = this.cv.arcLength(contour, true);
        const circularity = (4 * Math.PI * area) / (perimeter * perimeter);
        
        // Filter out non-circular/oval shapes
        if (circularity < 0.4) {
          continue;
        }
        
        // Convert to absolute coordinates on the page
        const scaleFactor = {
          x: img.naturalWidth / rect.width,
          y: img.naturalHeight / rect.height
        };
        
        const absoluteRect = {
          x: rect.x / scaleFactor.x + img.getBoundingClientRect().left + window.scrollX,
          y: rect.y / scaleFactor.y + img.getBoundingClientRect().top + window.scrollY,
          width: rect.width / scaleFactor.x,
          height: rect.height / scaleFactor.y,
          imageElement: img
        };
        
        bubbles.push(absoluteRect);
      }
      
      // Clean up OpenCV objects
      src.delete();
      gray.delete();
      blurred.delete();
      binary.delete();
      contours.delete();
      hierarchy.delete();
      
      resolve(bubbles);
    });
  }
}

// Export the BubbleDetector class
window.BubbleDetector = BubbleDetector;
