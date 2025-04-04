/**
 * Character Recognition Library
 * Handles character tracking, identification, and voice assignment
 */

const CharacterRecognition = {
  // Store for character data
  characters: {},
  
  /**
   * Initialize character recognition
   * @returns {Promise<void>}
   */
  init: async function() {
    // Load characters from storage
    try {
      const result = await new Promise(resolve => {
        chrome.storage.local.get('characterDatabase', resolve);
      });
      
      if (result.characterDatabase) {
        this.characters = result.characterDatabase;
      }
    } catch (error) {
      console.error('Error loading character database:', error);
      this.characters = {};
    }
  },
  
  /**
   * Save character database to storage
   * @returns {Promise<void>}
   */
  saveCharacters: async function() {
    try {
      await new Promise(resolve => {
        chrome.storage.local.set({ characterDatabase: this.characters }, resolve);
      });
    } catch (error) {
      console.error('Error saving character database:', error);
    }
  },
  
  /**
   * Process dialogues to identify and track characters
   * @param {Array} dialogues - Array of dialogue objects
   * @returns {Array} - Processed dialogues with character information
   */
  processDialogues: function(dialogues) {
    // Initialize if needed
    if (Object.keys(this.characters).length === 0) {
      this.init();
    }
    
    // Track characters in this comic
    const comicCharacters = {};
    
    // Process each dialogue
    const processedDialogues = dialogues.map(dialogue => {
      let speaker = dialogue.speaker;
      
      // If speaker is unknown or empty, try to identify based on context
      if (!speaker || speaker === 'Unknown') {
        speaker = this.identifySpeakerFromContext(dialogue, dialogues);
      }
      
      // Track this character
      if (speaker && speaker !== 'Unknown') {
        // Add to comic characters
        comicCharacters[speaker] = true;
        
        // Add or update in global database
        if (!this.characters[speaker]) {
          this.characters[speaker] = {
            name: speaker,
            appearances: 1,
            voiceIndex: 0, // Default voice
            lastSeen: new Date().toISOString()
          };
        } else {
          this.characters[speaker].appearances++;
          this.characters[speaker].lastSeen = new Date().toISOString();
        }
      }
      
      return {
        ...dialogue,
        speaker: speaker || 'Unknown'
      };
    });
    
    // Save updated character database
    this.saveCharacters();
    
    return processedDialogues;
  },
  
  /**
   * Try to identify speaker based on context
   * @param {Object} dialogue - Current dialogue
   * @param {Array} allDialogues - All dialogues in the comic
   * @returns {string} - Identified speaker or 'Unknown'
   */
  identifySpeakerFromContext: function(dialogue, allDialogues) {
    // Simple heuristic: check if this dialogue is a response to a known speaker
    const index = allDialogues.indexOf(dialogue);
    
    if (index > 0) {
      const previousDialogue = allDialogues[index - 1];
      
      // If previous dialogue has a known speaker, this might be a response
      if (previousDialogue.speaker && previousDialogue.speaker !== 'Unknown') {
        // Check if we have other characters in our database
        const otherCharacters = Object.keys(this.characters).filter(
          char => char !== previousDialogue.speaker
        );
        
        if (otherCharacters.length > 0) {
          // Use the most frequent character as the likely responder
          otherCharacters.sort((a, b) => 
            this.characters[b].appearances - this.characters[a].appearances
          );
          
          return otherCharacters[0];
        }
      }
    }
    
    // If we can't determine from context, return Unknown
    return 'Unknown';
  },
  
  /**
   * Get all known characters
   * @returns {Object} - Character database
   */
  getAllCharacters: function() {
    return this.characters;
  },
  
  /**
   * Get character voice settings
   * @returns {Object} - Character voice mappings
   */
  getCharacterVoices: function() {
    const voices = {};
    
    Object.keys(this.characters).forEach(character => {
      voices[character] = this.characters[character].voiceIndex;
    });
    
    return voices;
  },
  
  /**
   * Update character voice
   * @param {string} character - Character name
   * @param {number} voiceIndex - Voice index
   */
  updateCharacterVoice: function(character, voiceIndex) {
    if (this.characters[character]) {
      this.characters[character].voiceIndex = voiceIndex;
      this.saveCharacters();
    }
  },
  
  /**
   * Add a new character
   * @param {string} name - Character name
   * @param {number} voiceIndex - Voice index
   */
  addCharacter: function(name, voiceIndex = 0) {
    if (!this.characters[name]) {
      this.characters[name] = {
        name,
        appearances: 1,
        voiceIndex,
        lastSeen: new Date().toISOString()
      };
      
      this.saveCharacters();
    }
  },
  
  /**
   * Remove a character
   * @param {string} name - Character name
   */
  removeCharacter: function(name) {
    if (this.characters[name]) {
      delete this.characters[name];
      this.saveCharacters();
    }
  }
};

// Export the module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CharacterRecognition;
}
