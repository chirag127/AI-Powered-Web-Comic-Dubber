/**
 * Voice Player
 * Uses ResponsiveVoice API to play text as speech
 */
class VoicePlayer {
  constructor() {
    this.initialized = false;
    this.playing = false;
    this.paused = false;
    this.currentBubbleIndex = -1;
    this.bubbles = [];
    this.voiceSettings = {};
    this.volume = 0.7;
    this.highlightElements = [];
    this.apiKey = 'bL12uCnj'; // ResponsiveVoice API key
  }

  /**
   * Initialize the voice player
   * @returns {Promise} Resolves when initialization is complete
   */
  async initialize() {
    if (this.initialized) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      // Check if ResponsiveVoice is already loaded
      if (typeof responsiveVoice !== 'undefined') {
        this.initialized = true;
        resolve();
        return;
      }

      // Load ResponsiveVoice script if not already loaded
      const script = document.createElement('script');
      script.src = `https://code.responsivevoice.org/responsivevoice.js?key=${this.apiKey}`;
      script.onload = () => {
        // Initialize ResponsiveVoice
        if (typeof responsiveVoice !== 'undefined') {
          responsiveVoice.init();
          this.initialized = true;
          resolve();
        } else {
          console.error('ResponsiveVoice failed to load');
          resolve();
        }
      };
      script.onerror = () => {
        console.error('Error loading ResponsiveVoice');
        resolve();
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Play audio for the detected bubbles
   * @param {Array} bubbles - Array of bubbles with text
   * @param {Object} voiceSettings - Voice settings for characters
   * @param {number} volume - Volume level (0-1)
   * @returns {Promise<boolean>} Success status
   */
  async play(bubbles, voiceSettings, volume) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (typeof responsiveVoice === 'undefined') {
      return Promise.reject('ResponsiveVoice not loaded');
    }

    // Stop any current playback
    this.stop();

    // Set new bubbles and settings
    this.bubbles = bubbles;
    this.voiceSettings = voiceSettings || {};
    this.volume = volume !== undefined ? volume : 0.7;

    // Create highlight elements for each bubble
    this.createHighlightElements();

    // Start playback
    this.playing = true;
    this.paused = false;
    this.currentBubbleIndex = -1;

    // Play the first bubble
    this.playNextBubble();

    return Promise.resolve(true);
  }

  /**
   * Pause the current playback
   * @returns {boolean} Success status
   */
  pause() {
    if (!this.playing) {
      return false;
    }

    if (this.paused) {
      // Resume playback
      this.paused = false;
      responsiveVoice.resume();
    } else {
      // Pause playback
      this.paused = true;
      responsiveVoice.pause();
    }

    return true;
  }

  /**
   * Stop the current playback
   * @returns {boolean} Success status
   */
  stop() {
    if (!this.playing && !this.paused) {
      return false;
    }

    // Stop ResponsiveVoice
    responsiveVoice.cancel();

    // Reset state
    this.playing = false;
    this.paused = false;
    this.currentBubbleIndex = -1;

    // Remove highlight elements
    this.removeHighlightElements();

    return true;
  }

  /**
   * Update the volume level
   * @param {number} volume - Volume level (0-1)
   */
  updateVolume(volume) {
    this.volume = volume;
    
    if (this.playing) {
      responsiveVoice.setVolume(this.volume);
    }
  }

  /**
   * Play the next bubble in the sequence
   */
  playNextBubble() {
    if (!this.playing || this.paused) {
      return;
    }

    this.currentBubbleIndex++;

    // Check if we've reached the end
    if (this.currentBubbleIndex >= this.bubbles.length) {
      this.stop();
      return;
    }

    const bubble = this.bubbles[this.currentBubbleIndex];
    
    // Highlight the current bubble
    this.highlightBubble(this.currentBubbleIndex);
    
    // Determine which voice to use
    let voice = 'UK English Male'; // Default voice
    
    // Check if text contains a character indicator (e.g., "Character: Text")
    const characterMatch = bubble.text.match(/^([A-Z][a-z]*|[A-Z]+):/);
    if (characterMatch) {
      const character = characterMatch[1];
      
      // Use character-specific voice if available
      if (this.voiceSettings[character]) {
        voice = this.voiceSettings[character];
      }
      
      // Remove character prefix from text
      bubble.processedText = bubble.text.replace(/^[A-Z][a-z]*:|^[A-Z]+:/, '').trim();
    } else {
      bubble.processedText = bubble.text;
    }
    
    // Play the text
    responsiveVoice.speak(
      bubble.processedText,
      voice,
      {
        volume: this.volume,
        onend: () => this.playNextBubble(),
        rate: 1.0,
        pitch: 1.0
      }
    );
  }

  /**
   * Create highlight elements for each bubble
   */
  createHighlightElements() {
    // Remove any existing highlights
    this.removeHighlightElements();
    
    // Create new highlight elements
    this.bubbles.forEach((bubble) => {
      const highlight = document.createElement('div');
      highlight.className = 'comic-dubber-bubble-highlight';
      highlight.style.left = `${bubble.x}px`;
      highlight.style.top = `${bubble.y}px`;
      highlight.style.width = `${bubble.width}px`;
      highlight.style.height = `${bubble.height}px`;
      
      document.body.appendChild(highlight);
      this.highlightElements.push(highlight);
    });
  }

  /**
   * Remove all highlight elements
   */
  removeHighlightElements() {
    this.highlightElements.forEach((element) => {
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });
    
    this.highlightElements = [];
  }

  /**
   * Highlight a specific bubble
   * @param {number} index - Index of the bubble to highlight
   */
  highlightBubble(index) {
    // Remove active class from all highlights
    this.highlightElements.forEach((element) => {
      element.classList.remove('active');
    });
    
    // Add active class to current highlight
    if (index >= 0 && index < this.highlightElements.length) {
      this.highlightElements[index].classList.add('active');
      
      // Scroll to the bubble if needed
      this.scrollToBubble(index);
    }
  }

  /**
   * Scroll to a specific bubble if it's not in view
   * @param {number} index - Index of the bubble to scroll to
   */
  scrollToBubble(index) {
    if (index >= 0 && index < this.bubbles.length) {
      const bubble = this.bubbles[index];
      
      // Check if bubble is in view
      const rect = {
        top: bubble.y,
        left: bubble.x,
        bottom: bubble.y + bubble.height,
        right: bubble.x + bubble.width
      };
      
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      // If bubble is not fully in view, scroll to it
      if (
        rect.top < window.scrollY ||
        rect.bottom > window.scrollY + viewportHeight ||
        rect.left < window.scrollX ||
        rect.right > window.scrollX + viewportWidth
      ) {
        // Calculate scroll position to center the bubble
        const scrollX = rect.left + (bubble.width / 2) - (viewportWidth / 2);
        const scrollY = rect.top + (bubble.height / 2) - (viewportHeight / 2);
        
        // Scroll smoothly
        window.scrollTo({
          top: Math.max(0, scrollY),
          left: Math.max(0, scrollX),
          behavior: 'smooth'
        });
      }
    }
  }
}

// Export the VoicePlayer class
window.VoicePlayer = VoicePlayer;
