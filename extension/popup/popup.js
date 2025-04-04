document.addEventListener('DOMContentLoaded', function() {
  // DOM elements
  const detectBubblesBtn = document.getElementById('detect-bubbles');
  const playAudioBtn = document.getElementById('play-audio');
  const pauseAudioBtn = document.getElementById('pause-audio');
  const stopAudioBtn = document.getElementById('stop-audio');
  const volumeSlider = document.getElementById('volume');
  const characterVoicesContainer = document.getElementById('character-voices');
  const detectedTextContainer = document.getElementById('detected-text');
  const settingsBtn = document.getElementById('settings-btn');
  const helpBtn = document.getElementById('help-btn');
  
  // State variables
  let isPlaying = false;
  let detectedBubbles = [];
  let characterVoices = {};
  
  // Available voices
  const availableVoices = [
    { id: 'UK English Female', name: 'UK English Female' },
    { id: 'UK English Male', name: 'UK English Male' },
    { id: 'US English Female', name: 'US English Female' },
    { id: 'US English Male', name: 'US English Male' },
    { id: 'Australian Female', name: 'Australian Female' },
    { id: 'Australian Male', name: 'Australian Male' },
    { id: 'Japanese Female', name: 'Japanese Female' },
    { id: 'Japanese Male', name: 'Japanese Male' },
    { id: 'Korean Female', name: 'Korean Female' },
    { id: 'Korean Male', name: 'Korean Male' }
  ];
  
  // Event listeners
  detectBubblesBtn.addEventListener('click', detectSpeechBubbles);
  playAudioBtn.addEventListener('click', playAudio);
  pauseAudioBtn.addEventListener('click', pauseAudio);
  stopAudioBtn.addEventListener('click', stopAudio);
  volumeSlider.addEventListener('input', updateVolume);
  settingsBtn.addEventListener('click', openSettings);
  helpBtn.addEventListener('click', openHelp);
  
  // Check if there are any active tabs
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (tabs.length === 0) {
      disableControls();
      showMessage('No active tab detected');
      return;
    }
    
    // Load saved settings
    loadSettings();
  });
  
  // Functions
  function detectSpeechBubbles() {
    showMessage('Detecting speech bubbles...');
    
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      const activeTab = tabs[0];
      
      chrome.tabs.sendMessage(activeTab.id, { action: 'detectBubbles' }, function(response) {
        if (chrome.runtime.lastError) {
          showMessage('Error: ' + chrome.runtime.lastError.message);
          return;
        }
        
        if (!response || !response.success) {
          showMessage('Failed to detect speech bubbles');
          return;
        }
        
        detectedBubbles = response.bubbles;
        
        if (detectedBubbles.length === 0) {
          showMessage('No speech bubbles detected');
          return;
        }
        
        // Enable playback controls
        enableControls();
        
        // Display detected text
        displayDetectedText(detectedBubbles);
        
        // Update character voices
        updateCharacterVoices(detectedBubbles);
        
        showMessage(`Detected ${detectedBubbles.length} speech bubbles`);
      });
    });
  }
  
  function playAudio() {
    if (detectedBubbles.length === 0) {
      showMessage('No speech bubbles to play');
      return;
    }
    
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      const activeTab = tabs[0];
      
      // Get corrected text from UI
      const correctedBubbles = getCorrectedText();
      
      // Get character voice settings
      const voiceSettings = getVoiceSettings();
      
      chrome.tabs.sendMessage(activeTab.id, { 
        action: 'playAudio',
        bubbles: correctedBubbles,
        voiceSettings: voiceSettings,
        volume: volumeSlider.value
      }, function(response) {
        if (chrome.runtime.lastError) {
          showMessage('Error: ' + chrome.runtime.lastError.message);
          return;
        }
        
        if (!response || !response.success) {
          showMessage('Failed to play audio');
          return;
        }
        
        isPlaying = true;
        updatePlaybackControls();
        showMessage('Playing audio...');
      });
    });
  }
  
  function pauseAudio() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      const activeTab = tabs[0];
      
      chrome.tabs.sendMessage(activeTab.id, { action: 'pauseAudio' }, function(response) {
        if (chrome.runtime.lastError) {
          showMessage('Error: ' + chrome.runtime.lastError.message);
          return;
        }
        
        if (!response || !response.success) {
          showMessage('Failed to pause audio');
          return;
        }
        
        isPlaying = false;
        updatePlaybackControls();
        showMessage('Audio paused');
      });
    });
  }
  
  function stopAudio() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      const activeTab = tabs[0];
      
      chrome.tabs.sendMessage(activeTab.id, { action: 'stopAudio' }, function(response) {
        if (chrome.runtime.lastError) {
          showMessage('Error: ' + chrome.runtime.lastError.message);
          return;
        }
        
        if (!response || !response.success) {
          showMessage('Failed to stop audio');
          return;
        }
        
        isPlaying = false;
        updatePlaybackControls();
        showMessage('Audio stopped');
      });
    });
  }
  
  function updateVolume() {
    const volume = volumeSlider.value;
    
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      const activeTab = tabs[0];
      
      chrome.tabs.sendMessage(activeTab.id, { 
        action: 'updateVolume',
        volume: volume
      });
    });
    
    // Save volume setting
    chrome.storage.local.set({ volume: volume });
  }
  
  function displayDetectedText(bubbles) {
    detectedTextContainer.innerHTML = '';
    
    if (bubbles.length === 0) {
      detectedTextContainer.innerHTML = '<div class="no-text">No text detected yet</div>';
      return;
    }
    
    bubbles.forEach((bubble, index) => {
      const bubbleDiv = document.createElement('div');
      bubbleDiv.className = 'text-bubble';
      
      const textarea = document.createElement('textarea');
      textarea.value = bubble.text;
      textarea.dataset.bubbleId = index;
      textarea.rows = 2;
      
      bubbleDiv.appendChild(textarea);
      detectedTextContainer.appendChild(bubbleDiv);
    });
  }
  
  function updateCharacterVoices(bubbles) {
    characterVoicesContainer.innerHTML = '';
    
    if (bubbles.length === 0) {
      characterVoicesContainer.innerHTML = '<div class="no-characters">No characters detected yet</div>';
      return;
    }
    
    // Extract potential character names from the text
    const characters = extractCharacters(bubbles);
    
    characters.forEach(character => {
      const characterDiv = document.createElement('div');
      characterDiv.className = 'character-item';
      
      const nameSpan = document.createElement('span');
      nameSpan.className = 'character-name';
      nameSpan.textContent = character;
      
      const voiceSelect = document.createElement('select');
      voiceSelect.className = 'voice-select';
      voiceSelect.dataset.character = character;
      
      // Add voice options
      availableVoices.forEach(voice => {
        const option = document.createElement('option');
        option.value = voice.id;
        option.textContent = voice.name;
        
        // Select saved voice if available
        if (characterVoices[character] && characterVoices[character] === voice.id) {
          option.selected = true;
        }
        
        voiceSelect.appendChild(option);
      });
      
      // Save voice selection
      voiceSelect.addEventListener('change', function() {
        characterVoices[character] = this.value;
        saveCharacterVoices();
      });
      
      characterDiv.appendChild(nameSpan);
      characterDiv.appendChild(voiceSelect);
      characterVoicesContainer.appendChild(characterDiv);
    });
  }
  
  function extractCharacters(bubbles) {
    const characters = new Set();
    
    // Simple character extraction based on text patterns
    // This is a basic implementation and can be improved
    bubbles.forEach(bubble => {
      const text = bubble.text;
      
      // Look for patterns like "Character: Text" or "CHARACTER: Text"
      const match = text.match(/^([A-Z][a-z]*|[A-Z]+):/);
      if (match) {
        characters.add(match[1]);
      }
    });
    
    // If no characters detected, create default ones
    if (characters.size === 0) {
      characters.add('Character 1');
      if (bubbles.length > 1) {
        characters.add('Character 2');
      }
    }
    
    return Array.from(characters);
  }
  
  function getCorrectedText() {
    const correctedBubbles = [];
    
    const textareas = detectedTextContainer.querySelectorAll('textarea');
    textareas.forEach(textarea => {
      const bubbleId = parseInt(textarea.dataset.bubbleId);
      const correctedText = textarea.value;
      
      if (detectedBubbles[bubbleId]) {
        const bubble = { ...detectedBubbles[bubbleId] };
        bubble.text = correctedText;
        correctedBubbles.push(bubble);
      }
    });
    
    return correctedBubbles;
  }
  
  function getVoiceSettings() {
    const voiceSettings = {};
    
    const selects = characterVoicesContainer.querySelectorAll('select');
    selects.forEach(select => {
      const character = select.dataset.character;
      const voice = select.value;
      
      voiceSettings[character] = voice;
    });
    
    return voiceSettings;
  }
  
  function loadSettings() {
    chrome.storage.local.get(['characterVoices', 'volume'], function(result) {
      if (result.characterVoices) {
        characterVoices = result.characterVoices;
      }
      
      if (result.volume) {
        volumeSlider.value = result.volume;
      }
    });
  }
  
  function saveCharacterVoices() {
    chrome.storage.local.set({ characterVoices: characterVoices });
  }
  
  function enableControls() {
    playAudioBtn.disabled = false;
    pauseAudioBtn.disabled = false;
    stopAudioBtn.disabled = false;
  }
  
  function disableControls() {
    playAudioBtn.disabled = true;
    pauseAudioBtn.disabled = true;
    stopAudioBtn.disabled = true;
  }
  
  function updatePlaybackControls() {
    if (isPlaying) {
      playAudioBtn.disabled = true;
      pauseAudioBtn.disabled = false;
      stopAudioBtn.disabled = false;
    } else {
      playAudioBtn.disabled = false;
      pauseAudioBtn.disabled = true;
      stopAudioBtn.disabled = true;
    }
  }
  
  function openSettings() {
    // Open settings page or modal
    alert('Settings functionality will be implemented in a future version');
  }
  
  function openHelp() {
    // Open help page or modal
    alert('Help functionality will be implemented in a future version');
  }
  
  function showMessage(message) {
    console.log(message);
    // You can implement a UI toast/notification here
  }
});
