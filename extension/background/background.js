// Global variables
let currentTabId = null;
let isProcessing = false;
let cachedResults = {};

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'processImage') {
    processImage(message.imageData)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ error: error.message }));
    return true; // Indicates async response
  }
  
  if (message.action === 'playDialogues') {
    playDialogues(message.dialogues);
    sendResponse({ success: true });
  }
});

// Process an image to detect speech bubbles and extract text
async function processImage(imageData) {
  if (isProcessing) {
    return { error: 'Already processing an image' };
  }
  
  isProcessing = true;
  
  try {
    // Check cache first
    const cacheKey = hashString(imageData);
    if (cachedResults[cacheKey]) {
      isProcessing = false;
      return cachedResults[cacheKey];
    }
    
    // Use OCR to extract text from the image
    const dialogues = await performOCR(imageData);
    
    // Cache the result
    const result = { dialogues };
    cachedResults[cacheKey] = result;
    
    // Limit cache size to last 5 images
    const cacheKeys = Object.keys(cachedResults);
    if (cacheKeys.length > 5) {
      delete cachedResults[cacheKeys[0]];
    }
    
    isProcessing = false;
    return result;
  } catch (error) {
    isProcessing = false;
    throw error;
  }
}

// Perform OCR on an image using Google Gemini 2.0 Flash via OpenRouter
async function performOCR(imageData) {
  // For the MVP, we'll simulate OCR results
  // In a real implementation, this would call an API
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Generate some sample dialogues based on the image hash
  // This is just for demonstration purposes
  const hash = hashString(imageData);
  const sampleDialogues = [
    [
      { speaker: 'Character 1', dialogue: 'Hello there! How are you today?' },
      { speaker: 'Character 2', dialogue: 'I\'m doing great, thanks for asking!' }
    ],
    [
      { speaker: 'Hero', dialogue: 'We need to save the city!' },
      { speaker: 'Sidekick', dialogue: 'But how? The villain is too powerful!' },
      { speaker: 'Hero', dialogue: 'We\'ll find a way. We always do.' }
    ],
    [
      { speaker: 'Narrator', dialogue: 'Meanwhile, in another part of town...' },
      { speaker: 'Villain', dialogue: 'My evil plan is coming together perfectly!' },
      { speaker: 'Henchman', dialogue: 'Yes, boss. Everything is ready.' }
    ],
    [
      { speaker: 'Student', dialogue: 'I don\'t understand this math problem.' },
      { speaker: 'Teacher', dialogue: 'Let me show you a different approach.' },
      { speaker: 'Student', dialogue: 'Oh, I see it now! Thanks!' }
    ]
  ];
  
  // Select a sample based on the hash
  const sampleIndex = Math.abs(hash) % sampleDialogues.length;
  return sampleDialogues[sampleIndex];
  
  /* 
  // Real implementation would look something like this:
  const apiKey = 'your-openrouter-api-key';
  const endpoint = 'https://openrouter.ai/api/v1/chat/completions';
  
  const prompt = `
    You are an OCR AI. Given this web comic panel, detect the speech bubble dialogue in reading order. 
    If you can guess the speaker, associate their name. Output as a JSON list like:
    [
      { "speaker": "Alice", "dialogue": "Hi Bob!" },
      { "speaker": "Bob", "dialogue": "Hey Alice!" }
    ]
  `;
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: [{ type: 'image_url', image_url: { url: imageData } }] }
      ]
    })
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error?.message || 'Failed to perform OCR');
  }
  
  try {
    const content = data.choices[0].message.content;
    return JSON.parse(content);
  } catch (error) {
    throw new Error('Failed to parse OCR results');
  }
  */
}

// Play dialogues using the Web Speech API
function playDialogues(dialogues) {
  if (!dialogues || dialogues.length === 0) {
    return;
  }
  
  // Stop any ongoing speech
  speechSynthesis.cancel();
  
  // Get speech settings
  chrome.storage.local.get(['defaultVoice', 'speechRate', 'speechPitch', 'characterVoices'], (data) => {
    const defaultVoice = data.defaultVoice;
    const speechRate = parseFloat(data.speechRate || 1);
    const speechPitch = parseFloat(data.speechPitch || 1);
    const characterVoices = data.characterVoices || {};
    
    // Get available voices
    const voices = speechSynthesis.getVoices();
    
    // Play each dialogue in sequence
    let currentIndex = 0;
    
    function speakNext() {
      if (currentIndex >= dialogues.length) {
        return;
      }
      
      const dialogue = dialogues[currentIndex];
      const text = dialogue.dialogue;
      const speaker = dialogue.speaker || 'Unknown';
      
      // Create utterance
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set voice
      const voiceName = characterVoices[speaker] || defaultVoice;
      const voice = voices.find(v => v.name === voiceName);
      if (voice) {
        utterance.voice = voice;
      }
      
      // Set other properties
      utterance.rate = speechRate;
      utterance.pitch = speechPitch;
      
      // Set event handlers
      utterance.onend = () => {
        currentIndex++;
        speakNext();
      };
      
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        currentIndex++;
        speakNext();
      };
      
      // Highlight the current speech bubble
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'highlightBubble',
            index: currentIndex
          });
        }
      });
      
      // Speak
      speechSynthesis.speak(utterance);
    }
    
    // Start speaking
    speakNext();
  });
}

// Simple hash function for strings
function hashString(str) {
  let hash = 0;
  if (str.length === 0) return hash;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return hash;
}

// Initialize voices when the extension is loaded
function initVoices() {
  if (typeof speechSynthesis !== 'undefined') {
    speechSynthesis.onvoiceschanged = () => {
      const voices = speechSynthesis.getVoices();
      
      // Set default voice if not already set
      chrome.storage.local.get('defaultVoice', (data) => {
        if (!data.defaultVoice && voices.length > 0) {
          // Prefer English voices
          const englishVoices = voices.filter(voice => voice.lang.includes('en'));
          const defaultVoice = englishVoices.length > 0 ? englishVoices[0].name : voices[0].name;
          
          chrome.storage.local.set({ defaultVoice });
        }
      });
    };
    
    // Trigger initial load
    speechSynthesis.getVoices();
  }
}

// Initialize the extension
initVoices();
