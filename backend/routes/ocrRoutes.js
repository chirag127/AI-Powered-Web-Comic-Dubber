/**
 * OCR Routes
 * 
 * Handles OCR processing and enhancement
 */

const express = require('express');
const router = express.Router();
const ocrController = require('../controllers/ocrController');
const userController = require('../controllers/userController');

// Process image for OCR
router.post('/process', userController.protect, ocrController.processImage);

// Enhance OCR results
router.post('/enhance', userController.protect, ocrController.enhanceText);

module.exports = router;
