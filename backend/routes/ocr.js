const express = require('express');
const router = express.Router();
const ocrController = require('../controllers/ocrController');
const authMiddleware = require('../middleware/auth');

// Process image for OCR
router.post('/process', authMiddleware, ocrController.processImage);

// Process base64 image data
router.post('/process-base64', authMiddleware, ocrController.processBase64);

module.exports = router;
