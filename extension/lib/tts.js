// TTS utility functions
const TTS = {
  // Get available voices
  getVoices: function() {
    return window.speechSynthesis.getVoices();
  },
  
  // Speak text with given settings
  speak: function(text, settings) {
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set voice
    const voices = this.getVoices();
    if (settings.voice !== undefined && voices[settings.voice]) {
      utterance.voice = voices[settings.voice];
    }
    
    // Set other properties
    if (settings.rate !== undefined) {
      utterance.rate = parseFloat(settings.rate);
    }
    
    if (settings.pitch !== undefined) {
      utterance.pitch = parseFloat(settings.pitch);
    }
    
    if (settings.volume !== undefined) {
      utterance.volume = parseFloat(settings.volume);
    }
    
    // Add callbacks
    if (settings.onstart) {
      utterance.onstart = settings.onstart;
    }
    
    if (settings.onend) {
      utterance.onend = settings.onend;
    }
    
    if (settings.onerror) {
      utterance.onerror = settings.onerror;
    }
    
    // Speak
    window.speechSynthesis.speak(utterance);
    
    return utterance;
  },
  
  // Stop all speech
  stop: function() {
    window.speechSynthesis.cancel();
  },
  
  // Pause speech
  pause: function() {
    window.speechSynthesis.pause();
  },
  
  // Resume speech
  resume: function() {
    window.speechSynthesis.resume();
  }
};
