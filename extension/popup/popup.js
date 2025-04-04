/**
 * AI-Powered Web Comic Dubber - Popup Script
 * 
 * This script handles the popup UI functionality, including:
 * - Speech bubble detection
 * - Playback controls
 * - Voice settings
 * - Text correction
 */

// DOM elements
const enableToggle = document.getElementById('enableToggle');
const detectButton = document.getElementById('detectButton');
const detectionStatus = document.getElementById('detectionStatus');
const bubbleCount = document.getElementById('bubbleCount');
const playButton = document.getElementById('playButton');
const pauseButton = document.getElementById('pauseButton');
const stopButton = document.getElementById('stopButton');
const volumeSlider = document.getElementById('volumeSlider');
const rateSlider = document.getElementById('rateSlider');
const defaultVoiceSelect = document.getElementById('defaultVoice');
const characterVoicesList = document.getElementById('characterVoicesList');
const addCharacterButton = document.getElementById('addCharacterButton');
const textCorrectionList = document.getElementById('textCorrectionList');
const saveSettingsButton = document.getElementById('saveSettingsButton');

// Global variables
let detectedBubbles = [];
let availableVoices = [];
let settings = {
  enabled: true,
  defaultVoice: 'default',
  characterVoices: {},
  highlightBubbles: true,
  autoDetect: false,
  volume: 1.0,
  rate: 1.0,
  pitch: 1.0
};

// Initialize when the popup loads
document.addEventListener('DOMContentLoaded', initialize);

function initialize() {
  console.log('Popup initialized');
  
  // Load settings
  loadSettings();
  
  // Load available voices
  loadVoices();
  
  // Set up event listeners
  setupEventListeners();
}

/**
 * Load user settings from storage
 */
function loadSettings() {
  chrome.storage.sync.get(null, (storedSettings) => {
    if (storedSettings) {
      settings = { ...settings, ...storedSettings };
      
      // Update UI with loaded settings
      enableToggle.checked = settings.enabled;
      volumeSlider.value = settings.volume;
      rateSlider.value = settings.rate;
      
      console.log('Settings loaded:', settings);
    }
  });
}

/**
 * Load available voices for speech synthesis
 */
function loadVoices() {
  // Get available voices
  const synth = window.speechSynthesis;
  
  // Some browsers need a slight delay to load voices
  setTimeout(() => {
    availableVoices = synth.getVoices();
    
    // Populate voice selects
    populateVoiceSelects();
    
    // Set default voice if available
    if (settings.defaultVoice && defaultVoiceSelect.querySelector(`option[value="${settings.defaultVoice}"]`)) {
      defaultVoiceSelect.value = settings.defaultVoice;
    }
    
    console.log('Voices loaded:', availableVoices);
  }, 100);
}

/**
 * Populate voice selection dropdowns
 */
function populateVoiceSelects() {
  // Clear existing options
  defaultVoiceSelect.innerHTML = '';
  
  // Add default option
  const defaultOption = document.createElement('option');
  defaultOption.value = 'default';
  defaultOption.textContent = 'Browser Default';
  defaultVoiceSelect.appendChild(defaultOption);
  
  // Add available voices
  availableVoices.forEach(voice => {
    const option = document.createElement('option');
    option.value = voice.name;
    option.textContent = `${voice.name} (${voice.lang})`;
    defaultVoiceSelect.appendChild(option);
  });
  
  // Update character voice selects
  const characterVoiceSelects = document.querySelectorAll('.character-voice');
  characterVoiceSelects.forEach(select => {
    const currentValue = select.value;
    
    // Clear existing options
    select.innerHTML = '';
    
    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = 'default';
    defaultOption.textContent = 'Use Default Voice';
    select.appendChild(defaultOption);
    
    // Add available voices
    availableVoices.forEach(voice => {
      const option = document.createElement('option');
      option.value = voice.name;
      option.textContent = `${voice.name} (${voice.lang})`;
      select.appendChild(option);
    });
    
    // Restore selected value if it exists
    if (currentValue && select.querySelector(`option[value="${currentValue}"]`)) {
      select.value = currentValue;
    }
  });
}

/**
 * Set up event listeners for UI elements
 */
function setupEventListeners() {
  // Enable/disable toggle
  enableToggle.addEventListener('change', () => {
    settings.enabled = enableToggle.checked;
    saveSettings();
  });
  
  // Detect speech bubbles button
  detectButton.addEventListener('click', detectSpeechBubbles);
  
  // Playback controls
  playButton.addEventListener('click', playVoiceover);
  pauseButton.addEventListener('click', pauseVoiceover);
  stopButton.addEventListener('click', stopVoiceover);
  
  // Volume and rate sliders
  volumeSlider.addEventListener('input', () => {
    settings.volume = parseFloat(volumeSlider.value);
  });
  
  rateSlider.addEventListener('input', () => {
    settings.rate = parseFloat(rateSlider.value);
  });
  
  // Default voice selection
  defaultVoiceSelect.addEventListener('change', () => {
    settings.defaultVoice = defaultVoiceSelect.value;
  });
  
  // Add character button
  addCharacterButton.addEventListener('click', addCharacterVoice);
  
  // Save settings button
  saveSettingsButton.addEventListener('click', saveSettings);
  
  // Initialize character voices from settings
  if (settings.characterVoices) {
    // Clear default character voice item
    characterVoicesList.innerHTML = '';
    
    // Add saved character voices
    for (const [character, voice] of Object.entries(settings.characterVoices)) {
      addCharacterVoice(character, voice);
    }
  }
}

/**
 * Detect speech bubbles in the current tab
 */
function detectSpeechBubbles() {
  detectionStatus.textContent = 'Detecting speech bubbles...';
  bubbleCount.textContent = '';
  
  // Disable detect button during detection
  detectButton.disabled = true;
  
  // Send message to background script to detect bubbles
  chrome.runtime.sendMessage({ action: 'detectBubbles' }, (response) => {
    // Re-enable detect button
    detectButton.disabled = false;
    
    if (response && response.success) {
      detectedBubbles = response.bubbles;
      
      detectionStatus.textContent = 'Speech bubbles detected!';
      bubbleCount.textContent = `Found ${detectedBubbles.length} speech bubbles`;
      
      // Enable playback controls
      playButton.disabled = false;
      stopButton.disabled = false;
      
      // Populate text correction list
      populateTextCorrectionList(detectedBubbles);
    } else {
      detectionStatus.textContent = 'Error detecting speech bubbles';
      bubbleCount.textContent = response?.error || 'Unknown error';
      
      // Disable playback controls
      playButton.disabled = true;
      pauseButton.disabled = true;
      stopButton.disabled = true;
    }
  });
}

/**
 * Populate text correction list with detected bubbles
 */
function populateTextCorrectionList(bubbles) {
  // Clear existing items
  textCorrectionList.innerHTML = '';
  
  // Add text correction items for each bubble
  bubbles.forEach((bubble, index) => {
    const item = document.createElement('div');
    item.className = 'text-correction-item';
    
    const label = document.createElement('p');
    label.textContent = `Bubble ${index + 1}:`;
    
    const textarea = document.createElement('textarea');
    textarea.value = bubble.text;
    textarea.dataset.bubbleId = bubble.id;
    
    // Update bubble text when textarea changes
    textarea.addEventListener('input', () => {
      bubble.text = textarea.value;
    });
    
    item.appendChild(label);
    item.appendChild(textarea);
    textCorrectionList.appendChild(item);
  });
}

/**
 * Add a character voice item to the list
 */
function addCharacterVoice(character = '', voice = 'default') {
  const item = document.createElement('div');
  item.className = 'character-voice-item';
  
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'character-name';
  nameInput.placeholder = 'Character Name';
  nameInput.value = character;
  
  const voiceSelect = document.createElement('select');
  voiceSelect.className = 'character-voice';
  
  const removeButton = document.createElement('button');
  removeButton.className = 'remove-character';
  removeButton.textContent = '✕';
  removeButton.addEventListener('click', () => {
    item.remove();
    updateCharacterVoices();
  });
  
  item.appendChild(nameInput);
  item.appendChild(voiceSelect);
  item.appendChild(removeButton);
  
  characterVoicesList.appendChild(item);
  
  // Populate voice options
  populateVoiceSelects();
  
  // Set selected voice if provided
  if (voice && voiceSelect.querySelector(`option[value="${voice}"]`)) {
    voiceSelect.value = voice;
  }
  
  // Update character voices when inputs change
  nameInput.addEventListener('input', updateCharacterVoices);
  voiceSelect.addEventListener('change', updateCharacterVoices);
}

/**
 * Update character voices in settings
 */
function updateCharacterVoices() {
  const characterVoices = {};
  
  // Get all character voice items
  const items = characterVoicesList.querySelectorAll('.character-voice-item');
  
  items.forEach(item => {
    const name = item.querySelector('.character-name').value.trim();
    const voice = item.querySelector('.character-voice').value;
    
    if (name) {
      characterVoices[name] = voice;
    }
  });
  
  settings.characterVoices = characterVoices;
}

/**
 * Play voiceover for detected bubbles
 */
function playVoiceover() {
  if (detectedBubbles.length === 0) {
    detectionStatus.textContent = 'No speech bubbles detected';
    return;
  }
  
  // Update character voices
  updateCharacterVoices();
  
  // Send message to background script to play voiceover
  chrome.runtime.sendMessage({
    action: 'playVoiceover',
    bubbles: detectedBubbles,
    settings: settings
  }, (response) => {
    if (response && response.success) {
      playButton.disabled = true;
      pauseButton.disabled = false;
      stopButton.disabled = false;
    } else {
      detectionStatus.textContent = 'Error playing voiceover';
    }
  });
}

/**
 * Pause voiceover playback
 */
function pauseVoiceover() {
  // Send message to background script to pause voiceover
  chrome.runtime.sendMessage({ action: 'pauseVoiceover' }, (response) => {
    if (response && response.success) {
      playButton.disabled = false;
      pauseButton.disabled = true;
    }
  });
}

/**
 * Stop voiceover playback
 */
function stopVoiceover() {
  // Send message to background script to stop voiceover
  chrome.runtime.sendMessage({ action: 'stopVoiceover' }, (response) => {
    if (response && response.success) {
      playButton.disabled = false;
      pauseButton.disabled = true;
      stopButton.disabled = true;
    }
  });
}

/**
 * Save settings to storage
 */
function saveSettings() {
  // Update character voices
  updateCharacterVoices();
  
  // Save settings to storage
  chrome.storage.sync.set(settings, () => {
    console.log('Settings saved:', settings);
    
    // Show save confirmation
    const saveButton = document.getElementById('saveSettingsButton');
    const originalText = saveButton.textContent;
    
    saveButton.textContent = 'Settings Saved!';
    saveButton.disabled = true;
    
    setTimeout(() => {
      saveButton.textContent = originalText;
      saveButton.disabled = false;
    }, 1500);
  });
}
