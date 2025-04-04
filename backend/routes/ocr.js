const express = require('express');
const router = express.Router();
const ocrController = require('../controllers/ocrController');

/**
 * @route POST /api/ocr/process
 * @desc Process an image for OCR
 * @access Public
 */
router.post('/process', ocrController.processImage);

module.exports = router;
