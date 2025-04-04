/**
 * Settings Controller
 * 
 * Handles user voice settings and preferences
 */

const Settings = require('../models/settingsModel');

/**
 * Get user settings
 */
exports.getSettings = async (req, res) => {
  try {
    // Find settings for the user
    let settings = await Settings.findOne({ user: req.user._id });
    
    // If no settings exist, create default settings
    if (!settings) {
      settings = await Settings.create({
        user: req.user._id,
        enabled: true,
        defaultVoice: 'default',
        characterVoices: {},
        highlightBubbles: true,
        autoDetect: false,
        volume: 1.0,
        rate: 1.0,
        pitch: 1.0
      });
    }
    
    res.json(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update user settings
 */
exports.updateSettings = async (req, res) => {
  try {
    const {
      enabled,
      defaultVoice,
      highlightBubbles,
      autoDetect,
      volume,
      rate,
      pitch
    } = req.body;
    
    // Find settings for the user
    let settings = await Settings.findOne({ user: req.user._id });
    
    // If no settings exist, create new settings
    if (!settings) {
      settings = new Settings({
        user: req.user._id
      });
    }
    
    // Update settings
    if (enabled !== undefined) settings.enabled = enabled;
    if (defaultVoice) settings.defaultVoice = defaultVoice;
    if (highlightBubbles !== undefined) settings.highlightBubbles = highlightBubbles;
    if (autoDetect !== undefined) settings.autoDetect = autoDetect;
    if (volume !== undefined) settings.volume = volume;
    if (rate !== undefined) settings.rate = rate;
    if (pitch !== undefined) settings.pitch = pitch;
    
    // Save updated settings
    const updatedSettings = await settings.save();
    
    res.json(updatedSettings);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get character voice settings
 */
exports.getCharacterVoices = async (req, res) => {
  try {
    // Find settings for the user
    const settings = await Settings.findOne({ user: req.user._id });
    
    if (!settings) {
      return res.json({ characterVoices: {} });
    }
    
    res.json({ characterVoices: settings.characterVoices });
  } catch (error) {
    console.error('Get character voices error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update character voice settings
 */
exports.updateCharacterVoices = async (req, res) => {
  try {
    const { characterVoices } = req.body;
    
    if (!characterVoices) {
      return res.status(400).json({ message: 'Character voices are required' });
    }
    
    // Find settings for the user
    let settings = await Settings.findOne({ user: req.user._id });
    
    // If no settings exist, create new settings
    if (!settings) {
      settings = new Settings({
        user: req.user._id,
        characterVoices
      });
    } else {
      // Update character voices
      settings.characterVoices = characterVoices;
    }
    
    // Save updated settings
    const updatedSettings = await settings.save();
    
    res.json({ characterVoices: updatedSettings.characterVoices });
  } catch (error) {
    console.error('Update character voices error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
