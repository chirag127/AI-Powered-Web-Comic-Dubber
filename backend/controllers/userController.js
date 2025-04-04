const User = require('../models/User');
const UserSettings = require('../models/UserSettings');

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { username, email } = req.body;
    
    // Build update object
    const updateFields = {};
    if (username) updateFields.username = username;
    if (email) updateFields.email = email;
    
    // Update user
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (err) {
    console.error('Error updating user profile:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user settings
exports.getSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    
    let settings = await UserSettings.findOne({ userId });
    
    if (!settings) {
      // Create default settings if none exist
      settings = new UserSettings({
        userId,
        defaultVoiceProvider: 'elevenlabs',
        autoplay: true,
        highlightBubbles: true,
        playbackSpeed: 1.0
      });
      await settings.save();
    }
    
    res.json(settings);
  } catch (err) {
    console.error('Error fetching user settings:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update user settings
exports.updateSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { defaultVoiceProvider, autoplay, highlightBubbles, playbackSpeed } = req.body;
    
    // Build update object
    const updateFields = {};
    if (defaultVoiceProvider) updateFields.defaultVoiceProvider = defaultVoiceProvider;
    if (autoplay !== undefined) updateFields.autoplay = autoplay;
    if (highlightBubbles !== undefined) updateFields.highlightBubbles = highlightBubbles;
    if (playbackSpeed) updateFields.playbackSpeed = playbackSpeed;
    
    // Update or create settings
    let settings = await UserSettings.findOne({ userId });
    
    if (settings) {
      // Update existing settings
      settings = await UserSettings.findOneAndUpdate(
        { userId },
        { $set: updateFields },
        { new: true }
      );
    } else {
      // Create new settings
      settings = new UserSettings({
        userId,
        defaultVoiceProvider: defaultVoiceProvider || 'elevenlabs',
        autoplay: autoplay !== undefined ? autoplay : true,
        highlightBubbles: highlightBubbles !== undefined ? highlightBubbles : true,
        playbackSpeed: playbackSpeed || 1.0
      });
      await settings.save();
    }
    
    res.json(settings);
  } catch (err) {
    console.error('Error updating user settings:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
