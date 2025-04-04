const ocrService = require('../services/ocrService');

// Process image for OCR
exports.processImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    const imageBuffer = req.file.buffer;
    const result = await ocrService.processImage(imageBuffer);
    
    res.json(result);
  } catch (err) {
    console.error('Error processing image for OCR:', err);
    res.status(500).json({ message: 'Failed to process image' });
  }
};

// Process base64 image data
exports.processBase64 = async (req, res) => {
  try {
    const { imageData } = req.body;
    
    if (!imageData) {
      return res.status(400).json({ message: 'No image data provided' });
    }

    // Remove data URL prefix if present
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    const result = await ocrService.processImage(imageBuffer);
    
    res.json(result);
  } catch (err) {
    console.error('Error processing base64 image for OCR:', err);
    res.status(500).json({ message: 'Failed to process image' });
  }
};
