const mongoose = require('mongoose');

const VoicePreferenceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  characterName: {
    type: String,
    required: true
  },
  comicSource: {
    type: String,
    default: 'general'
  },
  voiceId: {
    type: String,
    required: true
  },
  provider: {
    type: String,
    default: 'elevenlabs',
    enum: ['elevenlabs', 'google', 'amazon', 'other']
  },
  settings: {
    type: Object,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field on save
VoicePreferenceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('VoicePreference', VoicePreferenceSchema);
