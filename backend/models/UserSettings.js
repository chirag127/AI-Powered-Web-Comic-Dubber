const mongoose = require('mongoose');

const UserSettingsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  defaultVoiceProvider: {
    type: String,
    default: 'elevenlabs',
    enum: ['elevenlabs', 'google', 'amazon', 'other']
  },
  autoplay: {
    type: Boolean,
    default: true
  },
  highlightBubbles: {
    type: Boolean,
    default: true
  },
  playbackSpeed: {
    type: Number,
    default: 1.0,
    min: 0.5,
    max: 2.0
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field on save
UserSettingsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('UserSettings', UserSettingsSchema);
