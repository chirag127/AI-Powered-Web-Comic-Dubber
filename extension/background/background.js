/**
 * Background Script for AI-Powered Web Comic Dubber
 * Handles communication between popup and content scripts
 */

// Listen for extension installation or update
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // First-time installation
    console.log('AI-Powered Web Comic Dubber installed');
    
    // Initialize default settings
    chrome.storage.local.set({
      volume: 0.7,
      characterVoices: {},
      autoDetect: false,
      showOverlay: true
    });
    
    // Open welcome page
    chrome.tabs.create({
      url: 'https://github.com/chirag127/AI-Powered-Web-Comic-Dubber'
    });
  } else if (details.reason === 'update') {
    // Extension updated
    console.log('AI-Powered Web Comic Dubber updated');
  }
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle different message actions
  switch (message.action) {
    case 'getSettings':
      // Retrieve settings from storage
      chrome.storage.local.get(['volume', 'characterVoices', 'autoDetect', 'showOverlay'], (result) => {
        sendResponse({
          success: true,
          settings: result
        });
      });
      return true; // Indicates async response
      
    case 'saveSettings':
      // Save settings to storage
      chrome.storage.local.set(message.settings, () => {
        sendResponse({
          success: true
        });
      });
      return true; // Indicates async response
      
    case 'detectBubblesInTab':
      // Forward the detect bubbles request to the content script
      if (sender.tab) {
        chrome.tabs.sendMessage(sender.tab.id, { action: 'detectBubbles' }, (response) => {
          sendResponse(response);
        });
        return true; // Indicates async response
      }
      break;
  }
});

// Optional: Add context menu items
chrome.contextMenus?.create({
  id: 'detectBubbles',
  title: 'Detect Speech Bubbles',
  contexts: ['page', 'image']
});

chrome.contextMenus?.create({
  id: 'readComic',
  title: 'Read Comic Aloud',
  contexts: ['page', 'image']
});

// Optional: Handle context menu clicks
chrome.contextMenus?.onClicked.addListener((info, tab) => {
  if (!tab || !tab.id) return;
  
  if (info.menuItemId === 'detectBubbles') {
    chrome.tabs.sendMessage(tab.id, { action: 'detectBubbles' });
  } else if (info.menuItemId === 'readComic') {
    chrome.tabs.sendMessage(tab.id, { action: 'detectBubbles' }, (response) => {
      if (response && response.success && response.bubbles.length > 0) {
        // Get settings
        chrome.storage.local.get(['volume', 'characterVoices'], (result) => {
          // Play audio with detected bubbles
          chrome.tabs.sendMessage(tab.id, {
            action: 'playAudio',
            bubbles: response.bubbles,
            voiceSettings: result.characterVoices || {},
            volume: result.volume || 0.7
          });
        });
      }
    });
  }
});
