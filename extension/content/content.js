console.log("AI Comic Dubber: Content script loaded.");

// TODO: Implement image detection and overlay button logic.
// TODO: Send image data to backend for OCR.
// TODO: Receive OCR results and manage playback timeline.

function findImagesAndAddButtons() {
  console.log("Scanning for images...");
  const images = document.querySelectorAll('img');
  images.forEach((img, index) => {
    // Basic filtering (e.g., minimum size) might be needed
    if (img.width > 100 && img.height > 100) { // Example filter
      console.log(`Found potential comic image: ${img.src}`);
      createOverlayButton(img, index);
    }
  });
}

function createOverlayButton(img, index) {
  const button = document.createElement('button');
  button.innerText = 'Dub This Comic Panel';
  button.style.position = 'absolute';
  // Position the button relative to the image
  const rect = img.getBoundingClientRect();
  button.style.top = `${window.scrollY + rect.top + 5}px`; // Add scrollY for absolute positioning
  button.style.left = `${window.scrollX + rect.left + 5}px`; // Add scrollX
  button.style.zIndex = '10000'; // Ensure it's on top
  button.style.padding = '5px';
  button.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  button.style.color = 'white';
  button.style.border = '1px solid white';
  button.style.cursor = 'pointer';
  button.dataset.comicIndex = index; // Store index if needed

  button.onclick = (event) => {
    event.stopPropagation(); // Prevent clicking underlying elements
    console.log(`Dub button clicked for image ${index}: ${img.src}`);
    // TODO: Trigger OCR process for this image
    alert(`OCR requested for image: ${img.src}`); // Placeholder
    // Send message to background or directly handle OCR request
    // chrome.runtime.sendMessage({ type: "OCR_REQUEST", imageUrl: img.src });
  };

  // Need a container to position the button relative to the image
  // This part is tricky and might require wrapping the image or careful positioning
  document.body.appendChild(button); // Simple append for now, needs refinement
}

// Run on load or potentially use MutationObserver for dynamic content
if (document.readyState === 'complete') {
  findImagesAndAddButtons();
} else {
  window.addEventListener('load', findImagesAndAddButtons);
}

// Listen for messages (e.g., from popup or background)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "START_DUBBING") {
    console.log("Received start dubbing request from popup.");
    // TODO: Initiate the full dubbing process for the detected comic
    sendResponse({ status: "Dubbing process initiated." });
  }
  return true; // Indicates async response possible
});
