/**
 * Voice Settings Model
 */

const mongoose = require('mongoose');

const VoiceSettingsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  characters: {
    type: Map,
    of: String,
    default: {}
  },
  defaultVoice: {
    type: String,
    default: 'UK English Male'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('VoiceSettings', VoiceSettingsSchema);
