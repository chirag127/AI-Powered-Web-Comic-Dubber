/**
 * Background Script
 * Handles communication with the backend API and manages user authentication and settings
 */

// API base URL
const API_BASE_URL = 'http://localhost:5000/api';

// Store user data
let userData = {
  token: null,
  settings: null,
  voicePreferences: []
};

// Initialize extension
async function initialize() {
  // Load saved data from storage
  chrome.storage.local.get(['token', 'settings', 'voicePreferences'], (data) => {
    if (data.token) {
      userData.token = data.token;
      verifyToken(data.token);
    }
    
    if (data.settings) {
      userData.settings = data.settings;
    }
    
    if (data.voicePreferences) {
      userData.voicePreferences = data.voicePreferences;
    }
  });
  
  console.log('Comic Dubber background script initialized');
}

// Verify token is still valid
async function verifyToken(token) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/verify`, {
      method: 'GET',
      headers: {
        'x-auth-token': token
      }
    });
    
    if (!response.ok) {
      // Token is invalid, clear it
      userData.token = null;
      chrome.storage.local.remove('token');
    }
  } catch (error) {
    console.error('Error verifying token:', error);
  }
}

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle different message actions
  switch (message.action) {
    case 'login':
      handleLogin(message.email, message.password)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Indicates async response
      
    case 'register':
      handleRegister(message.username, message.email, message.password)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'logout':
      handleLogout();
      sendResponse({ success: true });
      return false;
      
    case 'getSettings':
      sendResponse({ success: true, settings: userData.settings });
      return false;
      
    case 'updateSettings':
      handleUpdateSettings(message.settings)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'getVoicePreferences':
      handleGetVoicePreferences(message.comicSource)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'saveVoicePreference':
      handleSaveVoicePreference(message.preference)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'getAvailableVoices':
      handleGetAvailableVoices(message.provider)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'generateSpeech':
      handleGenerateSpeech(message.text, message.voiceId, message.provider, message.settings)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    default:
      sendResponse({ success: false, error: 'Unknown action' });
      return false;
  }
});

// Handle user login
async function handleLogin(email, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }
    
    // Save token
    userData.token = data.token;
    chrome.storage.local.set({ token: data.token });
    
    // Load user settings
    await loadUserSettings();
    
    return { success: true };
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

// Handle user registration
async function handleRegister(username, email, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, email, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Registration failed');
    }
    
    // Save token
    userData.token = data.token;
    chrome.storage.local.set({ token: data.token });
    
    // Initialize default settings
    const defaultSettings = {
      autoplay: true,
      highlightBubbles: true,
      playbackSpeed: 1.0,
      defaultVoiceProvider: 'elevenlabs'
    };
    
    userData.settings = defaultSettings;
    chrome.storage.local.set({ settings: defaultSettings });
    
    return { success: true };
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}

// Handle user logout
function handleLogout() {
  userData.token = null;
  userData.settings = null;
  userData.voicePreferences = [];
  
  chrome.storage.local.remove(['token', 'settings', 'voicePreferences']);
}

// Load user settings from backend
async function loadUserSettings() {
  if (!userData.token) return;
  
  try {
    const response = await fetch(`${API_BASE_URL}/user/settings`, {
      method: 'GET',
      headers: {
        'x-auth-token': userData.token
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load settings');
    }
    
    const settings = await response.json();
    userData.settings = settings;
    chrome.storage.local.set({ settings });
    
    // Also load voice preferences
    await loadVoicePreferences();
  } catch (error) {
    console.error('Error loading user settings:', error);
  }
}

// Load voice preferences from backend
async function loadVoicePreferences() {
  if (!userData.token) return;
  
  try {
    const response = await fetch(`${API_BASE_URL}/voice/preferences`, {
      method: 'GET',
      headers: {
        'x-auth-token': userData.token
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load voice preferences');
    }
    
    const preferences = await response.json();
    userData.voicePreferences = preferences;
    chrome.storage.local.set({ voicePreferences: preferences });
  } catch (error) {
    console.error('Error loading voice preferences:', error);
  }
}

// Handle updating user settings
async function handleUpdateSettings(settings) {
  try {
    // Update local settings
    userData.settings = { ...userData.settings, ...settings };
    chrome.storage.local.set({ settings: userData.settings });
    
    // Update settings on backend if logged in
    if (userData.token) {
      const response = await fetch(`${API_BASE_URL}/user/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': userData.token
        },
        body: JSON.stringify(settings)
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update settings');
      }
    }
    
    // Notify active tabs about settings update
    chrome.tabs.query({ active: true }, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'updateSettings',
          settings: userData.settings
        });
      });
    });
    
    return { success: true, settings: userData.settings };
  } catch (error) {
    console.error('Error updating settings:', error);
    throw error;
  }
}

// Handle getting voice preferences
async function handleGetVoicePreferences(comicSource) {
  try {
    // If logged in, fetch from backend
    if (userData.token) {
      let url = `${API_BASE_URL}/voice/preferences`;
      if (comicSource) {
        url += `?comicSource=${encodeURIComponent(comicSource)}`;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-auth-token': userData.token
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to get voice preferences');
      }
      
      const preferences = await response.json();
      userData.voicePreferences = preferences;
      chrome.storage.local.set({ voicePreferences: preferences });
      
      return { success: true, preferences };
    } else {
      // Return cached preferences if not logged in
      let preferences = userData.voicePreferences;
      
      if (comicSource) {
        preferences = preferences.filter(pref => pref.comicSource === comicSource);
      }
      
      return { success: true, preferences };
    }
  } catch (error) {
    console.error('Error getting voice preferences:', error);
    throw error;
  }
}

// Handle saving voice preference
async function handleSaveVoicePreference(preference) {
  try {
    // If logged in, save to backend
    if (userData.token) {
      const response = await fetch(`${API_BASE_URL}/voice/preferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': userData.token
        },
        body: JSON.stringify(preference)
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to save voice preference');
      }
      
      const savedPreference = await response.json();
      
      // Update local cache
      const index = userData.voicePreferences.findIndex(
        p => p.characterName === preference.characterName && p.comicSource === preference.comicSource
      );
      
      if (index >= 0) {
        userData.voicePreferences[index] = savedPreference;
      } else {
        userData.voicePreferences.push(savedPreference);
      }
      
      chrome.storage.local.set({ voicePreferences: userData.voicePreferences });
      
      return { success: true, preference: savedPreference };
    } else {
      // Save locally if not logged in
      const newPreference = {
        ...preference,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Update local cache
      const index = userData.voicePreferences.findIndex(
        p => p.characterName === preference.characterName && p.comicSource === preference.comicSource
      );
      
      if (index >= 0) {
        userData.voicePreferences[index] = newPreference;
      } else {
        userData.voicePreferences.push(newPreference);
      }
      
      chrome.storage.local.set({ voicePreferences: userData.voicePreferences });
      
      return { success: true, preference: newPreference };
    }
  } catch (error) {
    console.error('Error saving voice preference:', error);
    throw error;
  }
}

// Handle getting available voices
async function handleGetAvailableVoices(provider = 'elevenlabs') {
  try {
    const response = await fetch(`${API_BASE_URL}/voice/available?provider=${provider}`, {
      method: 'GET',
      headers: userData.token ? { 'x-auth-token': userData.token } : {}
    });
    
    if (!response.ok) {
      throw new Error('Failed to get available voices');
    }
    
    const voices = await response.json();
    return { success: true, voices };
  } catch (error) {
    console.error('Error getting available voices:', error);
    throw error;
  }
}

// Handle generating speech
async function handleGenerateSpeech(text, voiceId, provider, settings) {
  try {
    const response = await fetch(`${API_BASE_URL}/voice/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(userData.token ? { 'x-auth-token': userData.token } : {})
      },
      body: JSON.stringify({
        text,
        voiceId,
        provider,
        settings
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate speech');
    }
    
    const data = await response.json();
    return { success: true, audioData: data.audioData };
  } catch (error) {
    console.error('Error generating speech:', error);
    throw error;
  }
}

// Initialize when extension is loaded
initialize();
