// Global variables
let availableVoices = [];
let characterVoices = {};
let detectedDialogues = [];
let isPlaying = false;
let currentUtterance = null;

// DOM Elements
const detectBtn = document.getElementById('detectBtn');
const playBtn = document.getElementById('playBtn');
const stopBtn = document.getElementById('stopBtn');
const statusText = document.getElementById('statusText');
const progressBar = document.querySelector('.progress');
const defaultVoiceSelect = document.getElementById('defaultVoice');
const characterVoicesContainer = document.getElementById('characterVoices');
const speechRateInput = document.getElementById('speechRate');
const speechPitchInput = document.getElementById('speechPitch');
const rateValueSpan = document.getElementById('rateValue');
const pitchValueSpan = document.getElementById('pitchValue');
const settingsBtn = document.getElementById('settingsBtn');

// Initialize the extension
document.addEventListener('DOMContentLoaded', () => {
  initVoices();
  loadSettings();
  setupEventListeners();
});

// Initialize available voices
function initVoices() {
  // Get available voices
  speechSynthesis.onvoiceschanged = () => {
    availableVoices = speechSynthesis.getVoices();
    populateVoiceSelect(defaultVoiceSelect, availableVoices);
    
    // Set default voice if available
    chrome.storage.local.get('defaultVoice', (data) => {
      if (data.defaultVoice) {
        defaultVoiceSelect.value = data.defaultVoice;
      }
    });
  };
  
  // Trigger initial load
  availableVoices = speechSynthesis.getVoices();
  if (availableVoices.length > 0) {
    populateVoiceSelect(defaultVoiceSelect, availableVoices);
  }
}

// Populate voice select dropdown
function populateVoiceSelect(selectElement, voices) {
  selectElement.innerHTML = '';
  
  voices.forEach((voice, index) => {
    const option = document.createElement('option');
    option.value = voice.name;
    option.textContent = `${voice.name} (${voice.lang})`;
    selectElement.appendChild(option);
  });
}

// Load saved settings
function loadSettings() {
  chrome.storage.local.get(['defaultVoice', 'speechRate', 'speechPitch', 'characterVoices'], (data) => {
    if (data.defaultVoice) {
      defaultVoiceSelect.value = data.defaultVoice;
    }
    
    if (data.speechRate) {
      speechRateInput.value = data.speechRate;
      rateValueSpan.textContent = data.speechRate;
    }
    
    if (data.speechPitch) {
      speechPitchInput.value = data.speechPitch;
      pitchValueSpan.textContent = data.speechPitch;
    }
    
    if (data.characterVoices) {
      characterVoices = data.characterVoices;
    }
  });
}

// Set up event listeners
function setupEventListeners() {
  // Detect button click
  detectBtn.addEventListener('click', detectSpeechBubbles);
  
  // Play button click
  playBtn.addEventListener('click', playDialogues);
  
  // Stop button click
  stopBtn.addEventListener('click', stopSpeech);
  
  // Default voice change
  defaultVoiceSelect.addEventListener('change', () => {
    chrome.storage.local.set({ defaultVoice: defaultVoiceSelect.value });
  });
  
  // Speech rate change
  speechRateInput.addEventListener('input', () => {
    const rate = speechRateInput.value;
    rateValueSpan.textContent = rate;
    chrome.storage.local.set({ speechRate: rate });
  });
  
  // Speech pitch change
  speechPitchInput.addEventListener('input', () => {
    const pitch = speechPitchInput.value;
    pitchValueSpan.textContent = pitch;
    chrome.storage.local.set({ speechPitch: pitch });
  });
  
  // Settings button click
  settingsBtn.addEventListener('click', () => {
    // TODO: Implement settings panel
  });
}

// Detect speech bubbles in the current page
function detectSpeechBubbles() {
  updateStatus('Detecting speech bubbles...', 20);
  
  // Send message to content script to detect speech bubbles
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'detectSpeechBubbles' }, (response) => {
      if (chrome.runtime.lastError) {
        // Content script might not be loaded yet, inject it
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          files: ['content/content.js']
        }, () => {
          // Retry sending the message
          setTimeout(() => {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'detectSpeechBubbles' }, handleDetectionResponse);
          }, 500);
        });
      } else {
        handleDetectionResponse(response);
      }
    });
  });
}

// Handle detection response
function handleDetectionResponse(response) {
  if (!response) {
    updateStatus('Error: Could not detect speech bubbles', 0);
    return;
  }
  
  if (response.error) {
    updateStatus(`Error: ${response.error}`, 0);
    return;
  }
  
  detectedDialogues = response.dialogues || [];
  
  if (detectedDialogues.length === 0) {
    updateStatus('No speech bubbles detected', 0);
    return;
  }
  
  updateStatus(`Detected ${detectedDialogues.length} speech bubbles`, 100);
  updateCharacterVoices(detectedDialogues);
  
  // Enable play button
  playBtn.disabled = false;
}

// Update character voices UI
function updateCharacterVoices(dialogues) {
  // Clear existing character voices
  characterVoicesContainer.innerHTML = '';
  
  // Get unique speakers
  const speakers = [...new Set(dialogues.map(d => d.speaker))];
  
  // Create voice selection for each speaker
  speakers.forEach(speaker => {
    const speakerDiv = document.createElement('div');
    speakerDiv.className = 'character-voice';
    
    const speakerName = document.createElement('span');
    speakerName.className = 'character-name';
    speakerName.textContent = speaker || 'Unknown';
    
    const voiceSelect = document.createElement('select');
    voiceSelect.className = 'character-voice-select';
    voiceSelect.dataset.character = speaker || 'Unknown';
    
    // Populate voice options
    populateVoiceSelect(voiceSelect, availableVoices);
    
    // Set saved voice if available
    if (characterVoices[speaker]) {
      voiceSelect.value = characterVoices[speaker];
    }
    
    // Add change event listener
    voiceSelect.addEventListener('change', () => {
      characterVoices[speaker] = voiceSelect.value;
      chrome.storage.local.set({ characterVoices });
    });
    
    speakerDiv.appendChild(speakerName);
    speakerDiv.appendChild(voiceSelect);
    characterVoicesContainer.appendChild(speakerDiv);
  });
}

// Play detected dialogues
function playDialogues() {
  if (detectedDialogues.length === 0) {
    updateStatus('No dialogues to play', 0);
    return;
  }
  
  if (isPlaying) {
    stopSpeech();
  }
  
  isPlaying = true;
  playBtn.disabled = true;
  stopBtn.disabled = false;
  
  // Get speech settings
  const rate = parseFloat(speechRateInput.value);
  const pitch = parseFloat(speechPitchInput.value);
  
  // Play each dialogue in sequence
  let currentIndex = 0;
  
  function speakNext() {
    if (currentIndex >= detectedDialogues.length || !isPlaying) {
      stopSpeech();
      return;
    }
    
    const dialogue = detectedDialogues[currentIndex];
    const text = dialogue.dialogue;
    const speaker = dialogue.speaker || 'Unknown';
    
    // Create utterance
    currentUtterance = new SpeechSynthesisUtterance(text);
    
    // Set voice
    const voiceName = characterVoices[speaker] || defaultVoiceSelect.value;
    const voice = availableVoices.find(v => v.name === voiceName);
    if (voice) {
      currentUtterance.voice = voice;
    }
    
    // Set other properties
    currentUtterance.rate = rate;
    currentUtterance.pitch = pitch;
    
    // Set event handlers
    currentUtterance.onend = () => {
      currentIndex++;
      speakNext();
    };
    
    currentUtterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      currentIndex++;
      speakNext();
    };
    
    // Update status
    updateStatus(`Speaking: ${speaker} (${currentIndex + 1}/${detectedDialogues.length})`, 
      ((currentIndex + 1) / detectedDialogues.length) * 100);
    
    // Speak
    speechSynthesis.speak(currentUtterance);
  }
  
  speakNext();
}

// Stop speech
function stopSpeech() {
  speechSynthesis.cancel();
  isPlaying = false;
  currentUtterance = null;
  playBtn.disabled = false;
  stopBtn.disabled = true;
  updateStatus('Stopped', 0);
}

// Update status text and progress bar
function updateStatus(message, progress) {
  statusText.textContent = message;
  progressBar.style.width = `${progress}%`;
}
