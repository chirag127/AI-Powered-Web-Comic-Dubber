const express = require('express');
const router = express.Router();
const ocrController = require('../controllers/ocrController');

// Define the POST route for OCR requests
// POST /api/ocr
router.post('/', ocrController.processImageForOcr);

module.exports = router;
