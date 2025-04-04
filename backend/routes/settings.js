/**
 * Settings Routes
 */

const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');

// Import models
const VoiceSettings = require('../models/VoiceSettings');

// Import middleware
const auth = require('../middleware/auth');

/**
 * @route   GET /api/settings/voices
 * @desc    Get user's voice settings
 * @access  Private
 */
router.get('/voices', auth, async (req, res) => {
  try {
    // Get user's voice settings
    const voiceSettings = await VoiceSettings.findOne({ user: req.user.id });
    
    if (!voiceSettings) {
      return res.json({
        success: true,
        settings: {
          characters: {},
          defaultVoice: 'UK English Male'
        }
      });
    }
    
    res.json({
      success: true,
      settings: voiceSettings
    });
  } catch (err) {
    console.error('Error in get voice settings:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @route   POST /api/settings/voices
 * @desc    Save user's voice settings
 * @access  Private
 */
router.post(
  '/voices',
  [
    auth,
    [
      check('characters', 'Characters object is required').isObject(),
      check('defaultVoice', 'Default voice is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    const { characters, defaultVoice } = req.body;
    
    try {
      // Find user's voice settings
      let voiceSettings = await VoiceSettings.findOne({ user: req.user.id });
      
      if (!voiceSettings) {
        // Create new voice settings
        voiceSettings = new VoiceSettings({
          user: req.user.id,
          characters,
          defaultVoice
        });
      } else {
        // Update existing voice settings
        voiceSettings.characters = characters;
        voiceSettings.defaultVoice = defaultVoice;
      }
      
      // Save voice settings
      await voiceSettings.save();
      
      res.json({
        success: true,
        settings: voiceSettings
      });
    } catch (err) {
      console.error('Error in save voice settings:', err.message);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
);

/**
 * @route   DELETE /api/settings/voices
 * @desc    Reset user's voice settings
 * @access  Private
 */
router.delete('/voices', auth, async (req, res) => {
  try {
    // Find and remove user's voice settings
    await VoiceSettings.findOneAndRemove({ user: req.user.id });
    
    res.json({
      success: true,
      message: 'Voice settings reset'
    });
  } catch (err) {
    console.error('Error in reset voice settings:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
