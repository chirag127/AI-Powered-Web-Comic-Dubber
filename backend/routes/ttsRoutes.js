/**
 * TTS Routes
 * 
 * Handles text-to-speech processing
 */

const express = require('express');
const router = express.Router();
const ttsController = require('../controllers/ttsController');
const userController = require('../controllers/userController');

// Generate speech from text
router.post('/generate', userController.protect, ttsController.generateSpeech);

// Get available voices
router.get('/voices', ttsController.getVoices);

module.exports = router;
