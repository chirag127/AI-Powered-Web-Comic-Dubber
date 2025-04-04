/**
 * Word Highlighting Library
 * Provides functionality for highlighting words in sync with audio playback
 */

const WordHighlighting = {
  // Current highlighting state
  currentDialogue: null,
  currentWord: -1,
  words: [],
  wordTimings: [],
  highlightElements: [],
  
  /**
   * Initialize word highlighting for a dialogue
   * @param {string} text - The dialogue text to highlight
   * @param {number} duration - Estimated duration in milliseconds
   * @param {HTMLElement} container - Container element for the highlighted text
   */
  init: function(text, duration, container) {
    // Clear previous state
    this.reset();
    
    // Set current dialogue
    this.currentDialogue = text;
    
    // Split text into words
    this.words = text.split(/\s+/);
    
    // Calculate estimated timing for each word
    this.calculateWordTimings(duration);
    
    // Create highlighted elements
    this.createHighlightElements(container);
    
    return this;
  },
  
  /**
   * Calculate estimated timing for each word
   * @param {number} duration - Total duration in milliseconds
   */
  calculateWordTimings: function(duration) {
    // Simple approach: distribute time evenly based on word length
    const totalChars = this.words.reduce((sum, word) => sum + word.length, 0);
    const msPerChar = duration / totalChars;
    
    let currentTime = 0;
    this.wordTimings = this.words.map(word => {
      const wordDuration = word.length * msPerChar;
      const timing = {
        start: currentTime,
        end: currentTime + wordDuration
      };
      currentTime += wordDuration;
      return timing;
    });
  },
  
  /**
   * Create highlighted elements for each word
   * @param {HTMLElement} container - Container element
   */
  createHighlightElements: function(container) {
    // Clear container
    container.innerHTML = '';
    
    // Create span for each word
    this.highlightElements = this.words.map((word, index) => {
      const span = document.createElement('span');
      span.className = 'highlight-word';
      span.textContent = word + ' ';
      span.dataset.index = index;
      container.appendChild(span);
      return span;
    });
  },
  
  /**
   * Update highlighting based on current playback time
   * @param {number} currentTime - Current playback time in milliseconds
   */
  update: function(currentTime) {
    // Find the current word based on timing
    const wordIndex = this.wordTimings.findIndex(timing => 
      currentTime >= timing.start && currentTime <= timing.end
    );
    
    // If word changed, update highlighting
    if (wordIndex !== this.currentWord && wordIndex !== -1) {
      this.highlightWord(wordIndex);
    }
  },
  
  /**
   * Highlight a specific word
   * @param {number} index - Word index to highlight
   */
  highlightWord: function(index) {
    // Remove highlight from previous word
    if (this.currentWord !== -1 && this.highlightElements[this.currentWord]) {
      this.highlightElements[this.currentWord].classList.remove('active');
    }
    
    // Add highlight to current word
    if (this.highlightElements[index]) {
      this.highlightElements[index].classList.add('active');
    }
    
    // Update current word
    this.currentWord = index;
  },
  
  /**
   * Reset highlighting state
   */
  reset: function() {
    // Remove highlight from all words
    if (this.highlightElements.length > 0) {
      this.highlightElements.forEach(element => {
        if (element) {
          element.classList.remove('active');
        }
      });
    }
    
    // Reset state
    this.currentDialogue = null;
    this.currentWord = -1;
    this.words = [];
    this.wordTimings = [];
    this.highlightElements = [];
  }
};

// Export the module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WordHighlighting;
}
