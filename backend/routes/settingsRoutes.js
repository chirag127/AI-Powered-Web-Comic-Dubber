/**
 * Settings Routes
 * 
 * Handles user voice settings and preferences
 */

const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const userController = require('../controllers/userController');

// Get user settings
router.get('/', userController.protect, settingsController.getSettings);

// Update user settings
router.put('/', userController.protect, settingsController.updateSettings);

// Get character voice settings
router.get('/characters', userController.protect, settingsController.getCharacterVoices);

// Update character voice settings
router.put('/characters', userController.protect, settingsController.updateCharacterVoices);

module.exports = router;
