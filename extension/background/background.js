console.log("AI Comic Dubber: Background service worker started.");

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Background received message:", request);

  if (request.type === "OCR_REQUEST") {
    console.log(`Received OCR request for image: ${request.imageUrl}`);
    // TODO: Implement logic to call the backend OCR service
    // This might involve fetching the image data if it's a URL,
    // or handling base64 data sent from the content script.

    // Placeholder response
    // In a real scenario, you'd make a fetch call to your backend here.
    // Example: callOcrService(request.imageUrl).then(result => sendResponse(result));
    setTimeout(() => { // Simulate async call
      const mockOcrResult = [
        { speaker: "Character A", dialogue: "This is a test bubble." },
        { speaker: "Character B", dialogue: "Indeed it is!" }
      ];
      console.log("Simulating OCR response:", mockOcrResult);
      sendResponse({ status: "success", data: mockOcrResult });
    }, 1000);

    return true; // Indicates that the response is sent asynchronously
  } else if (request.type === "GET_VOICES") {
    // Provide available TTS voices to the popup
    chrome.tts.getVoices(voices => {
      const voiceInfo = voices.map(v => ({ name: v.voiceName, lang: v.lang }));
      sendResponse({ status: "success", voices: voiceInfo });
    });
    return true; // Async response
  } else if (request.type === "SAVE_VOICE_MAPPING") {
    // Save voice preferences from the popup
    chrome.storage.local.set({ voiceMapping: request.mapping }, () => {
      console.log("Voice mapping saved:", request.mapping);
      sendResponse({ status: "success" });
    });
    return true; // Async response
  } else if (request.type === "LOAD_VOICE_MAPPING") {
    // Load voice preferences for the popup
    chrome.storage.local.get("voiceMapping", (result) => {
      console.log("Voice mapping loaded:", result.voiceMapping);
      sendResponse({ status: "success", mapping: result.voiceMapping || {} });
    });
    return true; // Async response
  }

  // Handle other message types if needed

  // Default response if not handled or synchronous
  // sendResponse({ status: "unknown_request" });
});

// Optional: Add listeners for extension installation or updates
chrome.runtime.onInstalled.addListener(details => {
  console.log("Extension installed or updated:", details.reason);
  // Perform setup tasks if needed
});

// Function to call the backend (placeholder)
async function callOcrService(imageUrl) {
  // const BACKEND_URL = 'http://localhost:3000/api/ocr'; // Or your deployed URL
  // try {
  //   const response = await fetch(BACKEND_URL, {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ imageUrl: imageUrl }) // Or send base64 data
  //   });
  //   if (!response.ok) {
  //     throw new Error(`HTTP error! status: ${response.status}`);
  //   }
  //   const data = await response.json();
  //   return { status: "success", data: data };
  // } catch (error) {
  //   console.error("Error calling OCR service:", error);
  //   return { status: "error", message: error.message };
  // }
  console.warn("callOcrService is not implemented yet.");
  return { status: "error", message: "OCR service call not implemented." };
}
