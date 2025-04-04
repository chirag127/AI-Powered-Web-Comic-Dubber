/**
 * Audio Player
 * Manages playback of AI-generated speech for comic bubbles
 */

class AudioPlayer {
  constructor() {
    this.bubbles = [];
    this.audioElements = {};
    this.currentBubbleIndex = -1;
    this.isPlaying = false;
    this.autoplay = true;
    this.highlightBubbles = true;
    this.playbackSpeed = 1.0;
    this.characterVoices = {};
    this.defaultVoiceId = null;
    this.defaultProvider = 'elevenlabs';
  }

  /**
   * Initialize the audio player
   */
  async initialize() {
    // Create UI controls
    this.createControls();
    
    // Load user settings
    await this.loadSettings();
    
    // Listen for messages from the background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'updateSettings') {
        this.updateSettings(message.settings);
        sendResponse({ success: true });
      }
    });
    
    console.log('AudioPlayer initialized');
  }

  /**
   * Create playback control UI
   */
  createControls() {
    // Create control panel
    const controlPanel = document.createElement('div');
    controlPanel.className = 'comic-dubber-controls';
    controlPanel.style.position = 'fixed';
    controlPanel.style.bottom = '20px';
    controlPanel.style.right = '20px';
    controlPanel.style.zIndex = '10000';
    controlPanel.style.background = 'rgba(0, 0, 0, 0.8)';
    controlPanel.style.borderRadius = '8px';
    controlPanel.style.padding = '10px';
    controlPanel.style.display = 'flex';
    controlPanel.style.flexDirection = 'column';
    controlPanel.style.gap = '10px';
    controlPanel.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.3)';
    
    // Create buttons
    const playButton = document.createElement('button');
    playButton.textContent = 'Play';
    playButton.style.padding = '8px 16px';
    playButton.style.borderRadius = '4px';
    playButton.style.border = 'none';
    playButton.style.background = '#4CAF50';
    playButton.style.color = 'white';
    playButton.style.cursor = 'pointer';
    playButton.onclick = () => this.togglePlayback();
    
    const prevButton = document.createElement('button');
    prevButton.textContent = 'Previous';
    prevButton.style.padding = '8px 16px';
    prevButton.style.borderRadius = '4px';
    prevButton.style.border = 'none';
    prevButton.style.background = '#2196F3';
    prevButton.style.color = 'white';
    prevButton.style.cursor = 'pointer';
    prevButton.onclick = () => this.playPrevious();
    
    const nextButton = document.createElement('button');
    nextButton.textContent = 'Next';
    nextButton.style.padding = '8px 16px';
    nextButton.style.borderRadius = '4px';
    nextButton.style.border = 'none';
    nextButton.style.background = '#2196F3';
    nextButton.style.color = 'white';
    nextButton.style.cursor = 'pointer';
    nextButton.onclick = () => this.playNext();
    
    const detectButton = document.createElement('button');
    detectButton.textContent = 'Detect Bubbles';
    detectButton.style.padding = '8px 16px';
    detectButton.style.borderRadius = '4px';
    detectButton.style.border = 'none';
    detectButton.style.background = '#FF9800';
    detectButton.style.color = 'white';
    detectButton.style.cursor = 'pointer';
    detectButton.onclick = () => this.detectAndPrepareBubbles();
    
    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '5px';
    buttonContainer.appendChild(prevButton);
    buttonContainer.appendChild(playButton);
    buttonContainer.appendChild(nextButton);
    
    // Add buttons to control panel
    controlPanel.appendChild(detectButton);
    controlPanel.appendChild(buttonContainer);
    
    // Add control panel to page
    document.body.appendChild(controlPanel);
    
    // Store reference to play button for updating text
    this.playButton = playButton;
  }

  /**
   * Load user settings from storage
   */
  async loadSettings() {
    try {
      // Try to get settings from background script
      const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
      
      if (response && response.settings) {
        this.updateSettings(response.settings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // Use default settings
    }
  }

  /**
   * Update player settings
   * @param {Object} settings - User settings
   */
  updateSettings(settings) {
    if (settings.autoplay !== undefined) {
      this.autoplay = settings.autoplay;
    }
    
    if (settings.highlightBubbles !== undefined) {
      this.highlightBubbles = settings.highlightBubbles;
      
      // Update bubble highlights
      if (window.bubbleDetector) {
        window.bubbleDetector.highlightBubbles(this.highlightBubbles);
      }
    }
    
    if (settings.playbackSpeed) {
      this.playbackSpeed = settings.playbackSpeed;
      
      // Update playback speed for all audio elements
      Object.values(this.audioElements).forEach(audio => {
        audio.playbackRate = this.playbackSpeed;
      });
    }
    
    if (settings.defaultVoiceProvider) {
      this.defaultProvider = settings.defaultVoiceProvider;
    }
    
    if (settings.characterVoices) {
      this.characterVoices = settings.characterVoices;
    }
    
    if (settings.defaultVoiceId) {
      this.defaultVoiceId = settings.defaultVoiceId;
    }
  }

  /**
   * Detect speech bubbles and prepare for playback
   */
  async detectAndPrepareBubbles() {
    if (!window.bubbleDetector) {
      console.error('Bubble detector not initialized');
      return;
    }
    
    // Detect bubbles
    this.bubbles = await window.bubbleDetector.detectBubbles();
    
    if (this.bubbles.length === 0) {
      alert('No speech bubbles detected');
      return;
    }
    
    // Highlight bubbles if enabled
    if (this.highlightBubbles) {
      window.bubbleDetector.highlightBubbles(true);
    }
    
    // Extract text from bubbles
    for (const bubble of this.bubbles) {
      if (!bubble.text || bubble.text === 'Mock speech bubble text') {
        try {
          bubble.text = await window.ocrProcessor.extractText(bubble);
        } catch (error) {
          console.error('Error extracting text from bubble:', error);
          bubble.text = 'Text extraction failed';
        }
      }
    }
    
    // Reset playback state
    this.currentBubbleIndex = -1;
    this.isPlaying = false;
    this.playButton.textContent = 'Play';
    
    // Start playback if autoplay is enabled
    if (this.autoplay) {
      this.togglePlayback();
    }
  }

  /**
   * Toggle playback state
   */
  togglePlayback() {
    if (this.isPlaying) {
      this.pausePlayback();
    } else {
      this.startPlayback();
    }
  }

  /**
   * Start or resume playback
   */
  startPlayback() {
    if (this.bubbles.length === 0) {
      alert('No speech bubbles detected. Click "Detect Bubbles" first.');
      return;
    }
    
    this.isPlaying = true;
    this.playButton.textContent = 'Pause';
    
    // If no bubble is currently selected, start from the beginning
    if (this.currentBubbleIndex === -1) {
      this.playNext();
    } else {
      // Resume current bubble
      const audio = this.audioElements[this.currentBubbleIndex];
      if (audio) {
        audio.play();
      } else {
        this.playBubble(this.currentBubbleIndex);
      }
    }
  }

  /**
   * Pause playback
   */
  pausePlayback() {
    this.isPlaying = false;
    this.playButton.textContent = 'Play';
    
    // Pause current audio if any
    if (this.currentBubbleIndex !== -1) {
      const audio = this.audioElements[this.currentBubbleIndex];
      if (audio) {
        audio.pause();
      }
    }
  }

  /**
   * Play the next bubble
   */
  playNext() {
    if (this.bubbles.length === 0) return;
    
    // Move to next bubble
    const nextIndex = this.currentBubbleIndex + 1;
    
    if (nextIndex >= this.bubbles.length) {
      // End of bubbles reached
      this.currentBubbleIndex = -1;
      this.pausePlayback();
      return;
    }
    
    this.playBubble(nextIndex);
  }

  /**
   * Play the previous bubble
   */
  playPrevious() {
    if (this.bubbles.length === 0) return;
    
    // Move to previous bubble
    const prevIndex = this.currentBubbleIndex - 1;
    
    if (prevIndex < 0) {
      // Beginning of bubbles reached
      return;
    }
    
    this.playBubble(prevIndex);
  }

  /**
   * Play a specific bubble
   * @param {number} index - Bubble index to play
   */
  async playBubble(index) {
    if (index < 0 || index >= this.bubbles.length) return;
    
    // Stop current audio if any
    if (this.currentBubbleIndex !== -1) {
      const currentAudio = this.audioElements[this.currentBubbleIndex];
      if (currentAudio) {
        currentAudio.pause();
      }
    }
    
    this.currentBubbleIndex = index;
    const bubble = this.bubbles[index];
    
    // Highlight current bubble
    if (this.highlightBubbles) {
      // Remove active class from all highlights
      document.querySelectorAll('.comic-dubber-bubble-highlight').forEach(el => {
        el.style.borderColor = 'rgba(255, 0, 0, 0.7)';
      });
      
      // Add active class to current highlight
      const highlight = document.querySelector(`.comic-dubber-bubble-highlight[data-bubble-index="${index}"]`);
      if (highlight) {
        highlight.style.borderColor = 'rgba(0, 255, 0, 0.7)';
      }
    }
    
    // Check if audio already exists for this bubble
    if (this.audioElements[index]) {
      const audio = this.audioElements[index];
      audio.currentTime = 0;
      audio.play();
      return;
    }
    
    // Generate speech for the bubble text
    try {
      const audioData = await this.generateSpeech(bubble.text);
      
      // Create audio element
      const audio = new Audio(audioData);
      audio.playbackRate = this.playbackSpeed;
      
      // Set up event listeners
      audio.onended = () => {
        if (this.isPlaying) {
          this.playNext();
        }
      };
      
      audio.onerror = (error) => {
        console.error('Error playing audio:', error);
        if (this.isPlaying) {
          this.playNext();
        }
      };
      
      // Store audio element
      this.audioElements[index] = audio;
      
      // Start playback
      audio.play();
    } catch (error) {
      console.error('Error generating speech:', error);
      // Move to next bubble on error
      if (this.isPlaying) {
        this.playNext();
      }
    }
  }

  /**
   * Generate speech for text
   * @param {string} text - Text to convert to speech
   * @returns {Promise<string>} - Audio data URL
   */
  async generateSpeech(text) {
    try {
      // Determine character from text (simplified)
      const characterName = this.detectCharacter(text);
      
      // Get voice settings for character
      let voiceId = this.defaultVoiceId;
      let provider = this.defaultProvider;
      let settings = {};
      
      if (characterName && this.characterVoices[characterName]) {
        const voiceSettings = this.characterVoices[characterName];
        voiceId = voiceSettings.voiceId;
        provider = voiceSettings.provider || this.defaultProvider;
        settings = voiceSettings.settings || {};
      }
      
      // If no voice ID is set, use a default
      if (!voiceId) {
        voiceId = 'default'; // This should be replaced with an actual default voice ID
      }
      
      // Call backend to generate speech
      const response = await fetch('http://localhost:5000/api/voice/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': localStorage.getItem('authToken') || ''
        },
        body: JSON.stringify({
          text,
          voiceId,
          provider,
          settings
        })
      });
      
      if (!response.ok) {
        throw new Error(`Voice generation failed with status ${response.status}`);
      }
      
      const data = await response.json();
      return data.audioData;
    } catch (error) {
      console.error('Error generating speech:', error);
      
      // Return a fallback audio (text-to-speech using browser API)
      return this.generateFallbackSpeech(text);
    }
  }

  /**
   * Generate fallback speech using browser's SpeechSynthesis API
   * @param {string} text - Text to convert to speech
   * @returns {Promise<string>} - Audio data URL
   */
  generateFallbackSpeech(text) {
    return new Promise((resolve) => {
      // For this prototype, we'll just return a dummy audio URL
      // In a real implementation, we could use the browser's SpeechSynthesis API
      // or a simple beep sound
      
      // Create a simple beep sound
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.value = 440; // A4 note
      gainNode.gain.value = 0.5;
      
      oscillator.start();
      
      // Record the audio
      const recorder = new MediaRecorder(audioContext.destination.stream);
      const chunks = [];
      
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        resolve(url);
      };
      
      recorder.start();
      
      // Stop after 1 second
      setTimeout(() => {
        oscillator.stop();
        recorder.stop();
      }, 1000);
    });
  }

  /**
   * Simple character detection from text
   * @param {string} text - Bubble text
   * @returns {string|null} - Detected character name or null
   */
  detectCharacter(text) {
    // This is a simplified implementation
    // In a real app, this would use more sophisticated NLP techniques
    
    // Look for text patterns like "Character Name: Text"
    const colonMatch = text.match(/^([^:]+):/);
    if (colonMatch) {
      return colonMatch[1].trim();
    }
    
    // Look for text in quotes followed by "said"
    const saidMatch = text.match(/"[^"]*"\s+said\s+([^,.]+)/);
    if (saidMatch) {
      return saidMatch[1].trim();
    }
    
    return null;
  }

  /**
   * Clean up resources
   */
  cleanup() {
    // Stop all audio playback
    Object.values(this.audioElements).forEach(audio => {
      audio.pause();
    });
    
    // Remove UI elements
    document.querySelectorAll('.comic-dubber-controls, .comic-dubber-bubble-highlight').forEach(el => {
      el.remove();
    });
  }
}

// Create and export the audio player instance
window.audioPlayer = new AudioPlayer();

// Initialize when the page is fully loaded
window.addEventListener('load', async () => {
  await window.audioPlayer.initialize();
});
