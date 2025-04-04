const axios = require('axios');

// Service for OCR operations
class OCRService {
  constructor() {
    this.googleVisionApiKey = process.env.GOOGLE_VISION_API_KEY;
  }

  // Process image for OCR
  async processImage(imageBuffer) {
    try {
      // For this implementation, we'll use Google Cloud Vision API
      // In a real implementation, you might want to add fallback options
      return await this.processWithGoogleVision(imageBuffer);
    } catch (error) {
      console.error('Error processing image with OCR:', error);
      throw error;
    }
  }

  // Process with Google Cloud Vision API
  async processWithGoogleVision(imageBuffer) {
    const base64Image = imageBuffer.toString('base64');
    
    const requestData = {
      requests: [
        {
          image: {
            content: base64Image
          },
          features: [
            {
              type: 'TEXT_DETECTION'
            }
          ]
        }
      ]
    };

    const response = await axios.post(
      `https://vision.googleapis.com/v1/images:annotate?key=${this.googleVisionApiKey}`,
      requestData
    );

    // Process the response to extract text and bounding boxes
    return this.processGoogleVisionResponse(response.data);
  }

  // Process Google Vision API response
  processGoogleVisionResponse(responseData) {
    const result = {
      fullTextAnnotation: null,
      textBlocks: []
    };

    if (!responseData.responses || responseData.responses.length === 0) {
      return result;
    }

    const response = responseData.responses[0];
    
    // Get full text annotation
    if (response.fullTextAnnotation) {
      result.fullTextAnnotation = response.fullTextAnnotation.text;
    }

    // Get text blocks with bounding boxes
    if (response.textAnnotations && response.textAnnotations.length > 0) {
      // Skip the first annotation as it contains the entire text
      const textAnnotations = response.textAnnotations.slice(1);
      
      result.textBlocks = textAnnotations.map(annotation => {
        const vertices = annotation.boundingPoly.vertices;
        
        // Calculate bounding box
        const boundingBox = {
          x: vertices[0].x,
          y: vertices[0].y,
          width: vertices[2].x - vertices[0].x,
          height: vertices[2].y - vertices[0].y
        };

        return {
          text: annotation.description,
          boundingBox,
          confidence: annotation.confidence || 0.9 // Default confidence if not provided
        };
      });
    }

    return result;
  }

  // Detect speech bubbles in an image
  async detectSpeechBubbles(imageBuffer) {
    // This would typically use a computer vision model trained to detect speech bubbles
    // For simplicity, we'll return a mock response
    
    // In a real implementation, this could use:
    // 1. A custom trained model for speech bubble detection
    // 2. Edge detection + shape analysis to find bubble-like shapes
    // 3. Integration with a service like Google Cloud Vision API with custom model
    
    return [
      {
        boundingBox: { x: 100, y: 100, width: 200, height: 100 },
        confidence: 0.95
      },
      {
        boundingBox: { x: 400, y: 200, width: 180, height: 90 },
        confidence: 0.92
      }
    ];
  }

  // Associate text blocks with speech bubbles
  associateTextWithBubbles(textBlocks, bubbles) {
    const result = [];
    
    for (const bubble of bubbles) {
      const bubbleBox = bubble.boundingBox;
      const containedText = [];
      
      // Find text blocks that are contained within this bubble
      for (const textBlock of textBlocks) {
        const textBox = textBlock.boundingBox;
        
        // Check if the text block is inside the bubble
        if (
          textBox.x >= bubbleBox.x &&
          textBox.y >= bubbleBox.y &&
          textBox.x + textBox.width <= bubbleBox.x + bubbleBox.width &&
          textBox.y + textBox.height <= bubbleBox.y + bubbleBox.height
        ) {
          containedText.push(textBlock);
        }
      }
      
      // Sort text blocks by y-coordinate to get reading order
      containedText.sort((a, b) => a.boundingBox.y - b.boundingBox.y);
      
      // Combine text blocks into a single string
      const text = containedText.map(block => block.text).join(' ');
      
      result.push({
        boundingBox: bubbleBox,
        text,
        confidence: bubble.confidence
      });
    }
    
    return result;
  }
}

module.exports = new OCRService();
