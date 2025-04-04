/**
 * Content Script for AI-Powered Web Comic Dubber
 * Handles speech bubble detection, OCR, and voice playback
 */

// Initialize components
const bubbleDetector = new BubbleDetector();
const ocrProcessor = new OCRProcessor();
const voicePlayer = new VoicePlayer();

// State variables
let detectedBubbles = [];
let isOverlayVisible = false;
let overlayElement = null;

// Listen for messages from popup or background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle different message actions
  switch (message.action) {
    case 'detectBubbles':
      detectSpeechBubbles().then(bubbles => {
        sendResponse({ success: true, bubbles });
      }).catch(error => {
        console.error('Error detecting bubbles:', error);
        sendResponse({ success: false, error: error.toString() });
      });
      return true; // Indicates async response
      
    case 'playAudio':
      playAudio(message.bubbles, message.voiceSettings, message.volume).then(success => {
        sendResponse({ success });
      }).catch(error => {
        console.error('Error playing audio:', error);
        sendResponse({ success: false, error: error.toString() });
      });
      return true; // Indicates async response
      
    case 'pauseAudio':
      const pauseSuccess = pauseAudio();
      sendResponse({ success: pauseSuccess });
      break;
      
    case 'stopAudio':
      const stopSuccess = stopAudio();
      sendResponse({ success: stopSuccess });
      break;
      
    case 'updateVolume':
      updateVolume(message.volume);
      sendResponse({ success: true });
      break;
  }
});

/**
 * Detect speech bubbles in the current page
 * @returns {Promise<Array>} Array of detected bubbles with text
 */
async function detectSpeechBubbles() {
  try {
    // Show loading overlay
    showOverlay('Detecting speech bubbles...');
    
    // Initialize bubble detector if needed
    await bubbleDetector.initialize();
    
    // Detect bubbles
    const bubbles = await bubbleDetector.detectBubbles();
    
    if (bubbles.length === 0) {
      updateOverlay('No speech bubbles detected');
      return [];
    }
    
    updateOverlay(`Detected ${bubbles.length} bubbles. Extracting text...`);
    
    // Initialize OCR processor if needed
    await ocrProcessor.initialize();
    
    // Extract text from bubbles
    const bubblesWithText = await ocrProcessor.extractText(bubbles);
    
    // Filter out bubbles with no text
    detectedBubbles = bubblesWithText.filter(bubble => bubble.text && bubble.text.trim() !== '');
    
    if (detectedBubbles.length === 0) {
      updateOverlay('No text detected in bubbles');
      return [];
    }
    
    updateOverlay(`Extracted text from ${detectedBubbles.length} bubbles`);
    
    // Return detected bubbles with text
    return detectedBubbles;
  } catch (error) {
    console.error('Error in detectSpeechBubbles:', error);
    updateOverlay('Error detecting speech bubbles');
    throw error;
  }
}

/**
 * Play audio for the detected bubbles
 * @param {Array} bubbles - Array of bubbles with text
 * @param {Object} voiceSettings - Voice settings for characters
 * @param {number} volume - Volume level (0-1)
 * @returns {Promise<boolean>} Success status
 */
async function playAudio(bubbles, voiceSettings, volume) {
  try {
    // Show playback overlay
    showOverlay('Playing audio...');
    
    // Initialize voice player if needed
    await voicePlayer.initialize();
    
    // Play audio
    const success = await voicePlayer.play(bubbles, voiceSettings, volume);
    
    return success;
  } catch (error) {
    console.error('Error in playAudio:', error);
    updateOverlay('Error playing audio');
    throw error;
  }
}

/**
 * Pause the current audio playback
 * @returns {boolean} Success status
 */
function pauseAudio() {
  try {
    const success = voicePlayer.pause();
    
    if (success) {
      updateOverlay(voicePlayer.paused ? 'Paused' : 'Resumed');
    }
    
    return success;
  } catch (error) {
    console.error('Error in pauseAudio:', error);
    return false;
  }
}

/**
 * Stop the current audio playback
 * @returns {boolean} Success status
 */
function stopAudio() {
  try {
    const success = voicePlayer.stop();
    
    if (success) {
      updateOverlay('Stopped');
      
      // Hide overlay after a delay
      setTimeout(() => {
        hideOverlay();
      }, 2000);
    }
    
    return success;
  } catch (error) {
    console.error('Error in stopAudio:', error);
    return false;
  }
}

/**
 * Update the volume level
 * @param {number} volume - Volume level (0-1)
 */
function updateVolume(volume) {
  voicePlayer.updateVolume(volume);
}

/**
 * Show the overlay with a message
 * @param {string} message - Message to display
 */
function showOverlay(message) {
  if (!overlayElement) {
    // Create overlay element
    overlayElement = document.createElement('div');
    overlayElement.className = 'comic-dubber-overlay';
    
    // Create overlay content
    overlayElement.innerHTML = `
      <div class="comic-dubber-header">
        <div class="comic-dubber-title">Web Comic Dubber</div>
        <div class="comic-dubber-controls">
          <button class="comic-dubber-btn comic-dubber-close-btn">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
      <div class="comic-dubber-content">
        <div class="comic-dubber-text">${message}</div>
        <div class="comic-dubber-playback">
          <button class="comic-dubber-playback-btn comic-dubber-play-btn">Play</button>
          <button class="comic-dubber-playback-btn comic-dubber-pause-btn">Pause</button>
          <button class="comic-dubber-playback-btn comic-dubber-stop-btn">Stop</button>
        </div>
        <div class="comic-dubber-volume">
          <input type="range" class="comic-dubber-volume-slider" min="0" max="1" step="0.1" value="0.7">
        </div>
      </div>
    `;
    
    // Add event listeners
    overlayElement.querySelector('.comic-dubber-close-btn').addEventListener('click', hideOverlay);
    overlayElement.querySelector('.comic-dubber-play-btn').addEventListener('click', () => {
      playAudio(detectedBubbles, {}, 0.7);
    });
    overlayElement.querySelector('.comic-dubber-pause-btn').addEventListener('click', pauseAudio);
    overlayElement.querySelector('.comic-dubber-stop-btn').addEventListener('click', stopAudio);
    overlayElement.querySelector('.comic-dubber-volume-slider').addEventListener('input', (e) => {
      updateVolume(parseFloat(e.target.value));
    });
    
    // Add to page
    document.body.appendChild(overlayElement);
  } else {
    // Update message
    overlayElement.querySelector('.comic-dubber-text').textContent = message;
    
    // Show if hidden
    overlayElement.style.display = 'block';
  }
  
  isOverlayVisible = true;
}

/**
 * Update the overlay message
 * @param {string} message - Message to display
 */
function updateOverlay(message) {
  if (overlayElement) {
    overlayElement.querySelector('.comic-dubber-text').textContent = message;
  } else {
    showOverlay(message);
  }
}

/**
 * Hide the overlay
 */
function hideOverlay() {
  if (overlayElement) {
    overlayElement.style.display = 'none';
  }
  
  isOverlayVisible = false;
}

// Initialize when the page is fully loaded
window.addEventListener('load', async () => {
  // Load CSS
  const style = document.createElement('style');
  style.textContent = `
    .comic-dubber-overlay {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
      background-color: rgba(255, 255, 255, 0.9);
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      padding: 10px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      max-width: 300px;
      transition: all 0.3s ease;
    }
    
    .comic-dubber-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    
    .comic-dubber-title {
      font-weight: bold;
      font-size: 14px;
      color: #2c3e50;
    }
    
    .comic-dubber-controls {
      display: flex;
      gap: 5px;
    }
    
    .comic-dubber-btn {
      background: none;
      border: none;
      cursor: pointer;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: background-color 0.2s;
    }
    
    .comic-dubber-btn:hover {
      background-color: rgba(0, 0, 0, 0.1);
    }
    
    .comic-dubber-btn svg {
      width: 16px;
      height: 16px;
    }
    
    .comic-dubber-content {
      margin-bottom: 10px;
    }
    
    .comic-dubber-text {
      font-size: 14px;
      line-height: 1.4;
      color: #333;
      margin-bottom: 10px;
      max-height: 100px;
      overflow-y: auto;
      padding: 5px;
      background-color: #f8f9fa;
      border-radius: 4px;
    }
    
    .comic-dubber-playback {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    
    .comic-dubber-playback-btn {
      background-color: #3498db;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 5px 10px;
      cursor: pointer;
      font-size: 12px;
      transition: background-color 0.2s;
    }
    
    .comic-dubber-playback-btn:hover {
      background-color: #2980b9;
    }
    
    .comic-dubber-volume {
      display: flex;
      align-items: center;
      margin-top: 10px;
    }
    
    .comic-dubber-volume-slider {
      width: 100%;
      height: 4px;
    }
    
    .comic-dubber-bubble-highlight {
      position: absolute;
      border: 2px solid #3498db;
      background-color: rgba(52, 152, 219, 0.1);
      pointer-events: none;
      z-index: 9998;
      transition: all 0.3s ease;
    }
    
    .comic-dubber-bubble-highlight.active {
      background-color: rgba(52, 152, 219, 0.3);
      border-color: #2980b9;
    }
  `;
  
  document.head.appendChild(style);
});
