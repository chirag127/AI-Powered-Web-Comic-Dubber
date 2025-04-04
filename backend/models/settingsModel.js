/**
 * Settings Model
 * 
 * Defines the schema for user settings data
 */

const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  enabled: {
    type: Boolean,
    default: true
  },
  defaultVoice: {
    type: String,
    default: 'default'
  },
  characterVoices: {
    type: Object,
    default: {}
  },
  highlightBubbles: {
    type: Boolean,
    default: true
  },
  autoDetect: {
    type: Boolean,
    default: false
  },
  volume: {
    type: Number,
    default: 1.0,
    min: 0,
    max: 1
  },
  rate: {
    type: Number,
    default: 1.0,
    min: 0.5,
    max: 2
  },
  pitch: {
    type: Number,
    default: 1.0,
    min: 0.5,
    max: 2
  }
}, {
  timestamps: true
});

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings;
