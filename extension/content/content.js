// Global variables
let comicImages = [];
let speechBubbles = [];
let dialogues = [];
let isProcessing = false;

// Initialize when the content script is loaded
initialize();

// Set up message listener for communication with popup and background scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'detectSpeechBubbles') {
    detectSpeechBubbles()
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ error: error.message }));
    return true; // Indicates async response
  }
  
  if (message.action === 'highlightBubble') {
    highlightSpeechBubble(message.index);
    sendResponse({ success: true });
  }
});

// Initialize the content script
function initialize() {
  // Add CSS to the page
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.type = 'text/css';
  style.href = chrome.runtime.getURL('content/content.css');
  document.head.appendChild(style);
  
  // Scan for comic images when the page is fully loaded
  if (document.readyState === 'complete') {
    scanForComicImages();
  } else {
    window.addEventListener('load', scanForComicImages);
  }
}

// Scan the page for potential comic images
function scanForComicImages() {
  // Get all images on the page
  const images = Array.from(document.querySelectorAll('img'));
  
  // Filter for likely comic images (larger than 200x200 pixels)
  comicImages = images.filter(img => {
    const rect = img.getBoundingClientRect();
    return rect.width >= 200 && rect.height >= 200;
  });
  
  // Add overlay buttons to comic images
  comicImages.forEach((img, index) => {
    addOverlayButton(img, index);
  });
}

// Add an overlay button to a comic image
function addOverlayButton(img, index) {
  const rect = img.getBoundingClientRect();
  const overlay = document.createElement('div');
  overlay.className = 'comic-dubber-overlay';
  overlay.textContent = 'Dub This Comic';
  overlay.style.top = `${window.scrollY + rect.top + 10}px`;
  overlay.style.left = `${window.scrollX + rect.left + 10}px`;
  
  overlay.addEventListener('click', () => {
    processSingleImage(img)
      .then(result => {
        if (result.dialogues && result.dialogues.length > 0) {
          showDialog('Detected Dialogues', result.dialogues);
        } else {
          showDialog('No Dialogues Found', [{ speaker: 'System', dialogue: 'No speech bubbles were detected in this image.' }]);
        }
      })
      .catch(error => {
        showDialog('Error', [{ speaker: 'System', dialogue: `Error: ${error.message}` }]);
      });
  });
  
  document.body.appendChild(overlay);
}

// Process a single comic image
async function processSingleImage(img) {
  showLoading('Processing image...');
  
  try {
    // Convert image to base64
    const imageData = await getImageData(img);
    
    // Send to background script for OCR
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'processImage',
        imageData: imageData
      }, response => {
        hideLoading();
        
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  } catch (error) {
    hideLoading();
    throw error;
  }
}

// Detect speech bubbles in all comic images on the page
async function detectSpeechBubbles() {
  if (isProcessing) {
    return { error: 'Already processing images' };
  }
  
  if (comicImages.length === 0) {
    return { error: 'No comic images found on this page' };
  }
  
  isProcessing = true;
  showLoading('Detecting speech bubbles...');
  
  try {
    // Process each comic image
    const results = await Promise.all(comicImages.map(async (img) => {
      try {
        const result = await processSingleImage(img);
        return result.dialogues || [];
      } catch (error) {
        console.error('Error processing image:', error);
        return [];
      }
    }));
    
    // Combine all dialogues
    dialogues = results.flat();
    
    hideLoading();
    isProcessing = false;
    
    return { dialogues };
  } catch (error) {
    hideLoading();
    isProcessing = false;
    return { error: error.message };
  }
}

// Highlight a specific speech bubble
function highlightSpeechBubble(index) {
  // Remove existing highlights
  document.querySelectorAll('.speech-bubble-highlight').forEach(el => {
    el.classList.remove('active');
  });
  
  // Add active class to the specified bubble
  const bubble = document.querySelector(`.speech-bubble-highlight[data-index="${index}"]`);
  if (bubble) {
    bubble.classList.add('active');
    bubble.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// Get image data as base64
function getImageData(img) {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set canvas dimensions to match image
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      
      // Handle cross-origin images
      img.crossOrigin = 'Anonymous';
      
      // Draw image to canvas
      ctx.drawImage(img, 0, 0);
      
      // Get base64 data
      try {
        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl);
      } catch (e) {
        // If toDataURL fails due to CORS, send image URL instead
        resolve(img.src);
      }
    } catch (error) {
      reject(error);
    }
  });
}

// Show loading indicator
function showLoading(message) {
  const loading = document.createElement('div');
  loading.className = 'comic-dubber-loading';
  loading.innerHTML = `
    <div class="spinner"></div>
    <div>${message || 'Loading...'}</div>
  `;
  document.body.appendChild(loading);
}

// Hide loading indicator
function hideLoading() {
  const loading = document.querySelector('.comic-dubber-loading');
  if (loading) {
    loading.remove();
  }
}

// Show dialog with detected dialogues
function showDialog(title, dialogues) {
  // Remove existing dialog if any
  const existingDialog = document.querySelector('.comic-dubber-dialog');
  if (existingDialog) {
    existingDialog.remove();
  }
  
  // Create dialog
  const dialog = document.createElement('div');
  dialog.className = 'comic-dubber-dialog';
  
  // Create header
  const header = document.createElement('div');
  header.className = 'comic-dubber-dialog-header';
  
  const titleEl = document.createElement('div');
  titleEl.className = 'comic-dubber-dialog-title';
  titleEl.textContent = title;
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'comic-dubber-dialog-close';
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', () => dialog.remove());
  
  header.appendChild(titleEl);
  header.appendChild(closeBtn);
  
  // Create content
  const content = document.createElement('div');
  content.className = 'comic-dubber-dialog-content';
  
  dialogues.forEach((item, index) => {
    const dialogueEl = document.createElement('div');
    dialogueEl.style.marginBottom = '10px';
    
    const speaker = document.createElement('div');
    speaker.style.fontWeight = 'bold';
    speaker.textContent = item.speaker || 'Unknown';
    
    const text = document.createElement('div');
    text.textContent = item.dialogue;
    
    dialogueEl.appendChild(speaker);
    dialogueEl.appendChild(text);
    content.appendChild(dialogueEl);
  });
  
  // Create footer
  const footer = document.createElement('div');
  footer.className = 'comic-dubber-dialog-footer';
  
  const playBtn = document.createElement('button');
  playBtn.className = 'comic-dubber-dialog-button primary';
  playBtn.textContent = 'Play Audio';
  playBtn.addEventListener('click', () => {
    // Send message to background script to play audio
    chrome.runtime.sendMessage({
      action: 'playDialogues',
      dialogues: dialogues
    });
  });
  
  const closeBtn2 = document.createElement('button');
  closeBtn2.className = 'comic-dubber-dialog-button secondary';
  closeBtn2.textContent = 'Close';
  closeBtn2.addEventListener('click', () => dialog.remove());
  
  footer.appendChild(closeBtn2);
  footer.appendChild(playBtn);
  
  // Assemble dialog
  dialog.appendChild(header);
  dialog.appendChild(content);
  dialog.appendChild(footer);
  
  // Add to page
  document.body.appendChild(dialog);
  
  // Make dialog draggable
  makeDraggable(dialog, header);
}

// Make an element draggable
function makeDraggable(element, handle) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  
  handle.style.cursor = 'move';
  handle.onmousedown = dragMouseDown;
  
  function dragMouseDown(e) {
    e.preventDefault();
    // Get the mouse cursor position at startup
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // Call a function whenever the cursor moves
    document.onmousemove = elementDrag;
  }
  
  function elementDrag(e) {
    e.preventDefault();
    // Calculate the new cursor position
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // Set the element's new position
    element.style.top = (element.offsetTop - pos2) + "px";
    element.style.left = (element.offsetLeft - pos1) + "px";
  }
  
  function closeDragElement() {
    // Stop moving when mouse button is released
    document.onmouseup = null;
    document.onmousemove = null;
  }
}
