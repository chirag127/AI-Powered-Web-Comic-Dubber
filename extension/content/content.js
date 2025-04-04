console.log("AI Comic Dubber: Content script loaded.");

// TODO: Implement image detection and overlay button logic.
// TODO: Send image data to backend for OCR.
// TODO: Receive OCR results and manage playback timeline.
let comicTimeline = []; // Stores the sequence of { speaker, dialogue } objects
let currentSpeechIndex = 0;
let isPlaying = false;
let isPaused = false;
let availableVoices = [];
let voiceMap = {}; // Stores speaker -> voiceName mapping from popup

// Pre-load voices (important, as getVoices might be async and initially empty)
function loadVoices() {
  availableVoices = window.speechSynthesis.getVoices();
  if (availableVoices.length === 0) {
    window.speechSynthesis.onvoiceschanged = () => {
      availableVoices = window.speechSynthesis.getVoices();
      console.log("Voices loaded:", availableVoices);
    };
  } else {
    console.log("Voices already available:", availableVoices);
  }
}
loadVoices(); // Load voices when script loads

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
  button.innerText = 'Dub Panel'; // Shorter text might fit better
  button.classList.add('ai-comic-dubber-overlay-button'); // Apply styles from CSS

  // Position the button relative to the image
  const rect = img.getBoundingClientRect();
  button.style.top = `${window.scrollY + rect.top + 5}px`; // Keep positioning logic
  button.style.left = `${window.scrollX + rect.left + 5}px`; // Keep positioning logic
  // zIndex is now handled by the CSS class
  button.dataset.comicIndex = index; // Store index if needed

  button.onclick = (event) => {
    event.stopPropagation(); // Prevent clicking underlying elements
    console.log(`Dub button clicked for image ${index}: ${img.src}`);
    // TODO: Trigger OCR process for this image (send message to background)
    // For now, let's simulate receiving OCR data and storing it
    simulateReceiveOcrData([
        { speaker: "Alice", dialogue: "This is the first line." },
        { speaker: "Bob", dialogue: "And this is the second." },
        { speaker: "Alice", dialogue: "Followed by the third." },
        { speaker: "Narrator", dialogue: "The end." }
    ]);
    alert(`OCR requested for image: ${img.src}. Placeholder data loaded.`);
    // Actual implementation:
    // const imageData = await getImageBase64(img); // Need function to get base64
    // chrome.runtime.sendMessage({ type: "OCR_REQUEST", imageBase64: imageData }, (response) => {
    //   if (response && response.status === 'success') {
    //      console.log("Received OCR data:", response.data);
    //      comicTimeline = response.data;
    //      // Maybe inform popup that data is ready?
    //   } else {
    //      console.error("OCR Request failed:", response);
    //      alert("Failed to get OCR data.");
    //   }
    // });
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
    // TODO: Initiate the full dubbing process for the detected comic (maybe trigger OCR for all images?)
    sendResponse({ status: "Dubbing process initiated. Click individual panels for now." });
  } else if (request.type === "PLAY_TIMELINE") {
    console.log("Received PLAY_TIMELINE request", request.mapping);
    if (comicTimeline.length > 0) {
      voiceMap = request.mapping || {};
      playTimeline();
      sendResponse({ status: "Playing started." });
    } else {
      sendResponse({ status: "Error: No comic data loaded." });
    }
  } else if (request.type === "PAUSE_TIMELINE") {
    console.log("Received PAUSE_TIMELINE request");
    pauseSpeech();
    sendResponse({ status: "Playback paused." });
  } else if (request.type === "STOP_TIMELINE") {
    console.log("Received STOP_TIMELINE request");
    stopSpeech();
    sendResponse({ status: "Playback stopped." });
  } else if (request.type === "RESUME_TIMELINE") { // Added resume functionality
     console.log("Received RESUME_TIMELINE request");
     resumeSpeech();
     sendResponse({ status: "Playback resumed." });
  }
  return true; // Indicates async response possible
});

// --- TTS Playback Logic ---

function playTimeline() {
  if (isPlaying && !isPaused) return; // Already playing
  if (isPaused) {
      resumeSpeech();
      return;
  }

  stopSpeech(); // Ensure any previous speech is stopped
  currentSpeechIndex = 0;
  isPlaying = true;
  isPaused = false;
  speakNext();
}

function speakNext() {
  if (!isPlaying || isPaused || currentSpeechIndex >= comicTimeline.length) {
    if (currentSpeechIndex >= comicTimeline.length && isPlaying) { // Check isPlaying to avoid calling stopSpeech multiple times
        console.log("Finished speaking timeline.");
        stopSpeech(); // Clean up state
        // Optionally notify popup that playback finished
        // chrome.runtime.sendMessage({ type: "PLAYBACK_FINISHED" });
    }
    return; // Stop if not playing, paused, or finished
  }

  const item = comicTimeline[currentSpeechIndex];
  const utterance = new SpeechSynthesisUtterance(item.dialogue);

  // Find the selected voice
  const selectedVoiceName = voiceMap[item.speaker];
  const voice = availableVoices.find(v => v.voiceName === selectedVoiceName);

  if (voice) {
    utterance.voice = voice;
    console.log(`Speaking as ${item.speaker} (${item.dialogue}) using voice: ${voice.name}`);
  } else {
    console.log(`Speaking as ${item.speaker} (${item.dialogue}) using default voice (Selected: ${selectedVoiceName})`);
    // Optional: Use a default voice if mapping not found or voice unavailable
    // const defaultVoice = availableVoices.find(v => v.lang.startsWith('en') && v.default);
    // if (defaultVoice) utterance.voice = defaultVoice;
  }

  // Set other properties if needed (rate, pitch, volume)
  // utterance.rate = 1.0;
  // utterance.pitch = 1.0;
  // utterance.volume = 1.0;

  utterance.onend = () => {
    // Check if still playing before proceeding, as stopSpeech might have been called
    if (isPlaying) {
        currentSpeechIndex++;
        speakNext(); // Speak the next line automatically
    }
  };

  utterance.onerror = (event) => {
    console.error("SpeechSynthesisUtterance error:", event.error);
    stopSpeech(); // Stop playback on error
    // Optionally notify popup about the error
    // chrome.runtime.sendMessage({ type: "PLAYBACK_ERROR", error: event.error });
  };

  window.speechSynthesis.speak(utterance);
}

function pauseSpeech() {
  if (isPlaying && !isPaused) {
    window.speechSynthesis.pause();
    isPaused = true;
    console.log("Speech paused.");
  }
}

function resumeSpeech() {
  if (isPlaying && isPaused) {
    window.speechSynthesis.resume();
    isPaused = false;
    console.log("Speech resumed.");
    // If resume is called when the queue is empty but paused,
    // we might need to trigger speakNext if the intention is to continue the sequence.
    // However, typically resume() continues the paused utterance.
    // Let's assume standard behavior for now. If issues arise, revisit this.
  } else if (isPlaying && !isPaused) {
      // If play was clicked while already playing (but not paused), do nothing or restart?
      console.log("Already playing.");
  } else {
      // If play was clicked when stopped, start from beginning
      playTimeline();
  }
}

function stopSpeech() {
  if (window.speechSynthesis.speaking || window.speechSynthesis.pending || isPaused) {
     window.speechSynthesis.cancel(); // Clear the queue and stop current speech
  }
  isPlaying = false;
  isPaused = false;
  currentSpeechIndex = 0; // Reset index
  console.log("Speech stopped and queue cleared.");
  // Optionally notify popup that playback stopped
  // chrome.runtime.sendMessage({ type: "PLAYBACK_STOPPED" });
}

// --- Utility / Placeholder Functions ---

// Placeholder to simulate receiving data after OCR
function simulateReceiveOcrData(data) {
    console.log("Simulating received OCR data:", data);
    comicTimeline = data;
    // In a real scenario, you might want to inform the popup
    // that data is ready so it can update the speaker list.
    // chrome.runtime.sendMessage({ type: "OCR_DATA_READY", speakers: [...new Set(data.map(item => item.speaker))] });
}

// TODO: Implement function to get base64 from image element if needed
// async function getImageBase64(imgElement) { ... }
