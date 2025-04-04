const geminiService = require('../services/geminiService');
const imageUtils = require('../utils/imageUtils');

/**
 * Process an image for OCR
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function processImage(req, res) {
  try {
    let imageData;
    
    // Check if the request contains an image URL or base64 data
    if (req.body.imageUrl) {
      // Fetch image from URL
      imageData = await imageUtils.fetchImageAsBase64(req.body.imageUrl);
    } else if (req.body.imageBase64) {
      // Use provided base64 data
      imageData = req.body.imageBase64;
      
      // Validate the base64 data
      if (!imageUtils.isValidBase64Image(imageData)) {
        return res.status(400).json({
          error: 'Invalid image data',
          message: 'The provided base64 data is not a valid image'
        });
      }
    } else {
      return res.status(400).json({
        error: 'Missing image data',
        message: 'Please provide either imageUrl or imageBase64'
      });
    }
    
    // Process the image with Gemini API
    const ocrResults = await geminiService.processImageOCR(imageData);
    
    // Return the OCR results
    res.status(200).json({
      success: true,
      data: ocrResults
    });
  } catch (error) {
    console.error('Error in OCR controller:', error);
    res.status(500).json({
      error: 'OCR processing failed',
      message: error.message
    });
  }
}

module.exports = {
  processImage
};
