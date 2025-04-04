const express = require('express');
const router = express.Router();
const voiceController = require('../controllers/voiceController');
const authMiddleware = require('../middleware/auth');

// Get available voices
router.get('/available', voiceController.getAvailableVoices);

// Generate speech from text
router.post('/generate', authMiddleware, voiceController.generateSpeech);

// Save voice preferences for a character
router.post('/preferences', authMiddleware, voiceController.saveVoicePreference);

// Get user's voice preferences
router.get('/preferences', authMiddleware, voiceController.getVoicePreferences);

// Delete a voice preference
router.delete('/preferences/:id', authMiddleware, voiceController.deleteVoicePreference);

module.exports = router;
