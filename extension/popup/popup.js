/**
 * Popup Script
 * Handles the extension popup UI and interactions
 */

// DOM Elements
const authContainer = document.getElementById('auth-container');
const mainContainer = document.getElementById('main-container');
const settingsPanel = document.getElementById('settings-panel');
const addCharacterPanel = document.getElementById('add-character-panel');

const loginTab = document.getElementById('login-tab');
const registerTab = document.getElementById('register-tab');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const loginButton = document.getElementById('login-button');
const loginError = document.getElementById('login-error');

const registerUsername = document.getElementById('register-username');
const registerEmail = document.getElementById('register-email');
const registerPassword = document.getElementById('register-password');
const registerButton = document.getElementById('register-button');
const registerError = document.getElementById('register-error');

const usernameDisplay = document.getElementById('username-display');
const logoutButton = document.getElementById('logout-button');
const detectButton = document.getElementById('detect-button');
const settingsButton = document.getElementById('settings-button');
const statusMessage = document.getElementById('status-message');

const autoplaySetting = document.getElementById('autoplay-setting');
const highlightSetting = document.getElementById('highlight-setting');
const speedSetting = document.getElementById('speed-setting');
const speedValue = document.getElementById('speed-value');
const providerSetting = document.getElementById('provider-setting');
const defaultVoiceSetting = document.getElementById('default-voice-setting');
const characterList = document.getElementById('character-list');
const addCharacterButton = document.getElementById('add-character-button');
const saveSettingsButton = document.getElementById('save-settings-button');
const backButton = document.getElementById('back-button');

const characterName = document.getElementById('character-name');
const comicSource = document.getElementById('comic-source');
const characterProvider = document.getElementById('character-provider');
const characterVoice = document.getElementById('character-voice');
const pitchSetting = document.getElementById('pitch-setting');
const pitchValue = document.getElementById('pitch-value');
const saveCharacterButton = document.getElementById('save-character-button');
const cancelCharacterButton = document.getElementById('cancel-character-button');

// State
let currentUser = null;
let userSettings = null;
let voicePreferences = [];
let availableVoices = {};
let editingCharacter = null;

// Initialize popup
async function initializePopup() {
  // Check if user is logged in
  const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
  
  if (response && response.settings) {
    userSettings = response.settings;
    showMainContainer();
    loadSettings();
    loadVoicePreferences();
  } else {
    showAuthContainer();
  }
  
  // Set up event listeners
  setupEventListeners();
}

// Set up event listeners
function setupEventListeners() {
  // Auth tabs
  loginTab.addEventListener('click', () => {
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    loginForm.style.display = 'flex';
    registerForm.style.display = 'none';
  });
  
  registerTab.addEventListener('click', () => {
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
    registerForm.style.display = 'flex';
    loginForm.style.display = 'none';
  });
  
  // Login form
  loginButton.addEventListener('click', handleLogin);
  
  // Register form
  registerButton.addEventListener('click', handleRegister);
  
  // Main container
  logoutButton.addEventListener('click', handleLogout);
  detectButton.addEventListener('click', handleDetectBubbles);
  settingsButton.addEventListener('click', showSettingsPanel);
  
  // Settings panel
  speedSetting.addEventListener('input', () => {
    speedValue.textContent = `${speedSetting.value}x`;
  });
  
  providerSetting.addEventListener('change', () => {
    loadVoices(providerSetting.value);
  });
  
  addCharacterButton.addEventListener('click', showAddCharacterPanel);
  saveSettingsButton.addEventListener('click', saveSettings);
  backButton.addEventListener('click', showMainContainer);
  
  // Add character panel
  characterProvider.addEventListener('change', () => {
    loadVoices(characterProvider.value, characterVoice);
  });
  
  pitchSetting.addEventListener('input', () => {
    pitchValue.textContent = pitchSetting.value;
  });
  
  saveCharacterButton.addEventListener('click', saveCharacter);
  cancelCharacterButton.addEventListener('click', showSettingsPanel);
}

// Show auth container
function showAuthContainer() {
  authContainer.style.display = 'block';
  mainContainer.style.display = 'none';
  settingsPanel.style.display = 'none';
  addCharacterPanel.style.display = 'none';
}

// Show main container
function showMainContainer() {
  authContainer.style.display = 'none';
  mainContainer.style.display = 'block';
  settingsPanel.style.display = 'none';
  addCharacterPanel.style.display = 'none';
}

// Show settings panel
function showSettingsPanel() {
  authContainer.style.display = 'none';
  mainContainer.style.display = 'none';
  settingsPanel.style.display = 'block';
  addCharacterPanel.style.display = 'none';
  
  // Load voices for default provider
  loadVoices(providerSetting.value);
  
  // Render character list
  renderCharacterList();
}

// Show add character panel
function showAddCharacterPanel() {
  authContainer.style.display = 'none';
  mainContainer.style.display = 'none';
  settingsPanel.style.display = 'none';
  addCharacterPanel.style.display = 'block';
  
  // Reset form
  characterName.value = '';
  comicSource.value = '';
  characterProvider.value = providerSetting.value;
  pitchSetting.value = 0;
  pitchValue.textContent = '0';
  editingCharacter = null;
  
  // Load voices for selected provider
  loadVoices(characterProvider.value, characterVoice);
}

// Handle login
async function handleLogin() {
  const email = loginEmail.value.trim();
  const password = loginPassword.value;
  
  if (!email || !password) {
    loginError.textContent = 'Please enter both email and password';
    return;
  }
  
  loginButton.disabled = true;
  loginButton.textContent = 'Logging in...';
  loginError.textContent = '';
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'login',
      email,
      password
    });
    
    if (response.success) {
      // Get user settings
      const settingsResponse = await chrome.runtime.sendMessage({ action: 'getSettings' });
      userSettings = settingsResponse.settings;
      
      showMainContainer();
      loadSettings();
      loadVoicePreferences();
    } else {
      loginError.textContent = response.error || 'Login failed';
    }
  } catch (error) {
    loginError.textContent = 'An error occurred during login';
    console.error('Login error:', error);
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = 'Login';
  }
}

// Handle register
async function handleRegister() {
  const username = registerUsername.value.trim();
  const email = registerEmail.value.trim();
  const password = registerPassword.value;
  
  if (!username || !email || !password) {
    registerError.textContent = 'Please fill in all fields';
    return;
  }
  
  registerButton.disabled = true;
  registerButton.textContent = 'Registering...';
  registerError.textContent = '';
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'register',
      username,
      email,
      password
    });
    
    if (response.success) {
      // Get user settings
      const settingsResponse = await chrome.runtime.sendMessage({ action: 'getSettings' });
      userSettings = settingsResponse.settings;
      
      showMainContainer();
      loadSettings();
    } else {
      registerError.textContent = response.error || 'Registration failed';
    }
  } catch (error) {
    registerError.textContent = 'An error occurred during registration';
    console.error('Registration error:', error);
  } finally {
    registerButton.disabled = false;
    registerButton.textContent = 'Register';
  }
}

// Handle logout
async function handleLogout() {
  await chrome.runtime.sendMessage({ action: 'logout' });
  showAuthContainer();
}

// Handle detect bubbles
async function handleDetectBubbles() {
  statusMessage.textContent = 'Detecting speech bubbles...';
  
  try {
    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Send message to content script
    chrome.tabs.sendMessage(tab.id, { action: 'detectBubbles' }, (response) => {
      if (chrome.runtime.lastError) {
        statusMessage.textContent = 'Error: Content script not loaded. Try refreshing the page.';
        return;
      }
      
      if (response && response.success) {
        statusMessage.textContent = `Detected ${response.count} speech bubbles`;
      } else {
        statusMessage.textContent = response?.error || 'Failed to detect speech bubbles';
      }
    });
  } catch (error) {
    statusMessage.textContent = 'An error occurred';
    console.error('Error detecting bubbles:', error);
  }
}

// Load settings
function loadSettings() {
  if (!userSettings) return;
  
  autoplaySetting.checked = userSettings.autoplay !== false;
  highlightSetting.checked = userSettings.highlightBubbles !== false;
  speedSetting.value = userSettings.playbackSpeed || 1.0;
  speedValue.textContent = `${speedSetting.value}x`;
  providerSetting.value = userSettings.defaultVoiceProvider || 'elevenlabs';
  
  // Set username if available
  if (userSettings.username) {
    usernameDisplay.textContent = userSettings.username;
  }
}

// Load voice preferences
async function loadVoicePreferences() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getVoicePreferences' });
    
    if (response && response.success) {
      voicePreferences = response.preferences || [];
    }
  } catch (error) {
    console.error('Error loading voice preferences:', error);
  }
}

// Load available voices
async function loadVoices(provider, selectElement = defaultVoiceSetting) {
  selectElement.innerHTML = '<option value="">Loading voices...</option>';
  
  try {
    // Check if we already have these voices cached
    if (availableVoices[provider]) {
      renderVoiceOptions(availableVoices[provider], selectElement);
      return;
    }
    
    const response = await chrome.runtime.sendMessage({
      action: 'getAvailableVoices',
      provider
    });
    
    if (response && response.success) {
      availableVoices[provider] = response.voices || [];
      renderVoiceOptions(availableVoices[provider], selectElement);
    } else {
      selectElement.innerHTML = '<option value="">Failed to load voices</option>';
    }
  } catch (error) {
    console.error('Error loading voices:', error);
    selectElement.innerHTML = '<option value="">Error loading voices</option>';
  }
}

// Render voice options
function renderVoiceOptions(voices, selectElement) {
  selectElement.innerHTML = '';
  
  if (voices.length === 0) {
    selectElement.innerHTML = '<option value="">No voices available</option>';
    return;
  }
  
  // Add default empty option
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Select a voice';
  selectElement.appendChild(defaultOption);
  
  // Add voice options
  voices.forEach(voice => {
    const option = document.createElement('option');
    option.value = voice.id;
    option.textContent = voice.name;
    selectElement.appendChild(option);
  });
  
  // Set selected value if available
  if (selectElement === defaultVoiceSetting && userSettings && userSettings.defaultVoiceId) {
    selectElement.value = userSettings.defaultVoiceId;
  }
}

// Render character list
function renderCharacterList() {
  characterList.innerHTML = '';
  
  if (voicePreferences.length === 0) {
    characterList.innerHTML = '<div class="empty-state">No character voices configured yet</div>';
    return;
  }
  
  voicePreferences.forEach(pref => {
    const item = document.createElement('div');
    item.className = 'character-item';
    
    const info = document.createElement('div');
    info.className = 'character-info';
    
    const name = document.createElement('div');
    name.className = 'character-name';
    name.textContent = pref.characterName;
    
    const source = document.createElement('div');
    source.className = 'character-voice';
    source.textContent = pref.comicSource ? `From: ${pref.comicSource}` : 'General';
    
    info.appendChild(name);
    info.appendChild(source);
    
    const actions = document.createElement('div');
    actions.className = 'character-actions';
    
    const editButton = document.createElement('button');
    editButton.className = 'edit-character';
    editButton.innerHTML = '✏️';
    editButton.title = 'Edit';
    editButton.addEventListener('click', () => editCharacter(pref));
    
    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-character';
    deleteButton.innerHTML = '🗑️';
    deleteButton.title = 'Delete';
    deleteButton.addEventListener('click', () => deleteCharacter(pref));
    
    actions.appendChild(editButton);
    actions.appendChild(deleteButton);
    
    item.appendChild(info);
    item.appendChild(actions);
    
    characterList.appendChild(item);
  });
}

// Edit character
function editCharacter(preference) {
  editingCharacter = preference;
  
  // Fill form with character data
  characterName.value = preference.characterName;
  comicSource.value = preference.comicSource || '';
  characterProvider.value = preference.provider || 'elevenlabs';
  
  // Set pitch if available
  if (preference.settings && preference.settings.pitch !== undefined) {
    pitchSetting.value = preference.settings.pitch;
    pitchValue.textContent = preference.settings.pitch;
  } else {
    pitchSetting.value = 0;
    pitchValue.textContent = '0';
  }
  
  // Load voices for the provider
  loadVoices(preference.provider, characterVoice).then(() => {
    // Set selected voice
    characterVoice.value = preference.voiceId;
  });
  
  showAddCharacterPanel();
}

// Delete character
async function deleteCharacter(preference) {
  if (!confirm(`Are you sure you want to delete the voice for "${preference.characterName}"?`)) {
    return;
  }
  
  try {
    // Remove from local array
    voicePreferences = voicePreferences.filter(p => 
      p.characterName !== preference.characterName || 
      p.comicSource !== preference.comicSource
    );
    
    // Update backend
    await chrome.runtime.sendMessage({
      action: 'deleteVoicePreference',
      id: preference.id
    });
    
    // Re-render list
    renderCharacterList();
  } catch (error) {
    console.error('Error deleting character:', error);
    alert('Failed to delete character voice');
  }
}

// Save settings
async function saveSettings() {
  const settings = {
    autoplay: autoplaySetting.checked,
    highlightBubbles: highlightSetting.checked,
    playbackSpeed: parseFloat(speedSetting.value),
    defaultVoiceProvider: providerSetting.value,
    defaultVoiceId: defaultVoiceSetting.value
  };
  
  saveSettingsButton.disabled = true;
  saveSettingsButton.textContent = 'Saving...';
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'updateSettings',
      settings
    });
    
    if (response && response.success) {
      userSettings = response.settings;
      showMainContainer();
      statusMessage.textContent = 'Settings saved successfully';
    } else {
      alert('Failed to save settings');
    }
  } catch (error) {
    console.error('Error saving settings:', error);
    alert('An error occurred while saving settings');
  } finally {
    saveSettingsButton.disabled = false;
    saveSettingsButton.textContent = 'Save Settings';
  }
}

// Save character
async function saveCharacter() {
  const name = characterName.value.trim();
  const source = comicSource.value.trim();
  const provider = characterProvider.value;
  const voiceId = characterVoice.value;
  const pitch = parseInt(pitchSetting.value);
  
  if (!name) {
    alert('Please enter a character name');
    return;
  }
  
  if (!voiceId) {
    alert('Please select a voice');
    return;
  }
  
  saveCharacterButton.disabled = true;
  saveCharacterButton.textContent = 'Saving...';
  
  try {
    const preference = {
      characterName: name,
      comicSource: source || 'general',
      voiceId,
      provider,
      settings: {
        pitch
      }
    };
    
    // If editing, include the ID
    if (editingCharacter) {
      preference.id = editingCharacter.id;
    }
    
    const response = await chrome.runtime.sendMessage({
      action: 'saveVoicePreference',
      preference
    });
    
    if (response && response.success) {
      // Update local preferences
      const index = voicePreferences.findIndex(p => 
        p.characterName === name && p.comicSource === (source || 'general')
      );
      
      if (index >= 0) {
        voicePreferences[index] = response.preference;
      } else {
        voicePreferences.push(response.preference);
      }
      
      showSettingsPanel();
    } else {
      alert('Failed to save character voice');
    }
  } catch (error) {
    console.error('Error saving character:', error);
    alert('An error occurred while saving character voice');
  } finally {
    saveCharacterButton.disabled = false;
    saveCharacterButton.textContent = 'Save Character';
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', initializePopup);
