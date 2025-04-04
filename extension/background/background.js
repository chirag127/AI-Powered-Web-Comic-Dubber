// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'detectionComplete') {
    // Forward message to popup if it's open
    chrome.runtime.sendMessage({
      action: 'updateCharacters',
      characters: message.characters
    });
  }
});

// Handle installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('AI-Powered Web Comic Dubber installed');
  
  // Initialize default settings
  chrome.storage.local.get(['defaultVoice', 'rate', 'pitch', 'volume'], (result) => {
    if (!result.defaultVoice) {
      chrome.storage.local.set({ defaultVoice: 0 });
    }
    
    if (!result.rate) {
      chrome.storage.local.set({ rate: 1 });
    }
    
    if (!result.pitch) {
      chrome.storage.local.set({ pitch: 1 });
    }
    
    if (!result.volume) {
      chrome.storage.local.set({ volume: 1 });
    }
  });
});
