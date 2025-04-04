// Background script for handling extension icon click

// Listen for extension icon click
chrome.action.onClicked.addListener((tab) => {
  // Send message to content script to toggle UI
  chrome.tabs.sendMessage(tab.id, { action: 'toggleUI' });
});

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  // Initialize default settings
  chrome.storage.sync.set({
    voiceSettings: {}
  });
});
