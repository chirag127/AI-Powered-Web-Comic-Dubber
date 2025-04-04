/**
 * Settings Controller
 */

const VoiceSettings = require('../models/VoiceSettings');

/**
 * Get user's voice settings
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getVoiceSettings = async (req, res) => {
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
};

/**
 * Save user's voice settings
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.saveVoiceSettings = async (req, res) => {
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
      voiceSettings.updatedAt = Date.now();
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
};

/**
 * Reset user's voice settings
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.resetVoiceSettings = async (req, res) => {
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
};
