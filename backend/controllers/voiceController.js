const VoicePreference = require('../models/VoicePreference');
const ttsService = require('../services/ttsService');

// Get available voices
exports.getAvailableVoices = async (req, res) => {
  try {
    const provider = req.query.provider || 'elevenlabs'; // Default to ElevenLabs
    const voices = await ttsService.getAvailableVoices(provider);
    res.json(voices);
  } catch (err) {
    console.error('Error fetching available voices:', err);
    res.status(500).json({ message: 'Failed to fetch available voices' });
  }
};

// Generate speech from text
exports.generateSpeech = async (req, res) => {
  try {
    const { text, voiceId, provider, settings } = req.body;
    
    if (!text || !voiceId) {
      return res.status(400).json({ message: 'Text and voiceId are required' });
    }

    const audioData = await ttsService.generateSpeech(text, voiceId, provider, settings);
    res.json({ audioData });
  } catch (err) {
    console.error('Error generating speech:', err);
    res.status(500).json({ message: 'Failed to generate speech' });
  }
};

// Save voice preference for a character
exports.saveVoicePreference = async (req, res) => {
  try {
    const { characterName, comicSource, voiceId, provider, settings } = req.body;
    const userId = req.user.id;

    if (!characterName || !voiceId) {
      return res.status(400).json({ message: 'Character name and voiceId are required' });
    }

    // Check if preference already exists
    let preference = await VoicePreference.findOne({ 
      userId, 
      characterName, 
      comicSource 
    });

    if (preference) {
      // Update existing preference
      preference.voiceId = voiceId;
      preference.provider = provider || 'elevenlabs';
      preference.settings = settings || {};
      await preference.save();
    } else {
      // Create new preference
      preference = new VoicePreference({
        userId,
        characterName,
        comicSource,
        voiceId,
        provider: provider || 'elevenlabs',
        settings: settings || {}
      });
      await preference.save();
    }

    res.json(preference);
  } catch (err) {
    console.error('Error saving voice preference:', err);
    res.status(500).json({ message: 'Failed to save voice preference' });
  }
};

// Get user's voice preferences
exports.getVoicePreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const comicSource = req.query.comicSource;
    
    let query = { userId };
    if (comicSource) {
      query.comicSource = comicSource;
    }
    
    const preferences = await VoicePreference.find(query);
    res.json(preferences);
  } catch (err) {
    console.error('Error fetching voice preferences:', err);
    res.status(500).json({ message: 'Failed to fetch voice preferences' });
  }
};

// Delete a voice preference
exports.deleteVoicePreference = async (req, res) => {
  try {
    const preferenceId = req.params.id;
    const userId = req.user.id;

    const preference = await VoicePreference.findById(preferenceId);
    
    if (!preference) {
      return res.status(404).json({ message: 'Voice preference not found' });
    }

    // Check if the preference belongs to the user
    if (preference.userId.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to delete this preference' });
    }

    await VoicePreference.findByIdAndDelete(preferenceId);
    res.json({ message: 'Voice preference deleted successfully' });
  } catch (err) {
    console.error('Error deleting voice preference:', err);
    res.status(500).json({ message: 'Failed to delete voice preference' });
  }
};
