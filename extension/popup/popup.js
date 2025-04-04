document.addEventListener('DOMContentLoaded', () => {
  const dubButton = document.getElementById('dubButton');
  const playButton = document.getElementById('playButton');
  const pauseButton = document.getElementById('pauseButton');
  const stopButton = document.getElementById('stopButton');
  const saveVoicesButton = document.getElementById('saveVoicesButton');
  const statusDiv = document.getElementById('status');
  const speakerVoiceMapDiv = document.getElementById('speakerVoiceMap');

  let availableVoices = [];
  let currentSpeakers = []; // Speakers detected from the last OCR
  let voiceMapping = {}; // Loaded/saved voice preferences
  let isPaused = false; // Track paused state in popup

  // --- Initialization ---

  // Fetch available TTS voices from background
  chrome.runtime.sendMessage({ type: "GET_VOICES" }, (response) => {
    if (response && response.status === "success" && response.voices) {
      availableVoices = response.voices;
      console.log("Available voices:", availableVoices);
      // Load saved voice mapping after getting voices
      loadVoiceMapping();
    } else {
      console.error("Failed to get voices:", response);
      updateStatus("Error: Could not load TTS voices.");
    }
  });

  // --- Event Listeners ---

  dubButton.addEventListener('click', () => {
    updateStatus("Requesting OCR from content script...");
    // Send message to content script to find images and trigger OCR via background
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        // Option 1: Tell content script to start the process
         chrome.tabs.sendMessage(tabs[0].id, { type: "START_DUBBING" }, (response) => {
           if (chrome.runtime.lastError) {
             console.error("Error sending START_DUBBING:", chrome.runtime.lastError.message);
             updateStatus(`Error: ${chrome.runtime.lastError.message}. Try reloading the page.`);
           } else if (response) {
             updateStatus(response.status || "OCR process initiated...");
             // TODO: Need a way for the content/background script to send back the OCR results
             // For now, we'll rely on a placeholder or manual update
             // A more robust solution involves background sending results back to popup
             // or storing results and popup polling/listening.
             // Let's simulate receiving speakers for UI update:
             simulateOcrResults(["Narrator", "Alice", "Bob"]);
           } else {
             updateStatus("No response from content script. Is it loaded?");
           }
         });
        // Option 2: Directly ask background (if background handles image finding - less common)
        // chrome.runtime.sendMessage({ type: "INITIATE_OCR_ON_PAGE" }, ...)
      } else {
        updateStatus("Error: Could not find active tab.");
      }
    });
  });

  playButton.addEventListener('click', () => {
    const action = isPaused ? "RESUME_TIMELINE" : "PLAY_TIMELINE";
    const statusUpdate = isPaused ? "Resuming..." : "Playing...";
    updateStatus(statusUpdate);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: action, mapping: voiceMapping }, (response) => {
          if (chrome.runtime.lastError) {
            console.error(`Error sending ${action}:`, chrome.runtime.lastError.message);
            updateStatus(`Error: ${chrome.runtime.lastError.message}`);
            // Reset buttons on error? Maybe just log it.
          } else if (response) {
            console.log(`${action} response:`, response);
            // Update button states based on successful message sending
            playButton.disabled = true;
            playButton.textContent = 'Play'; // Reset text in case it was "Resume"
            pauseButton.disabled = false;
            stopButton.disabled = false;
            isPaused = false; // Ensure paused state is reset
          } else {
             updateStatus("No response from content script.");
             // Keep buttons as they were? Or disable them?
          }
        });
      } else {
         updateStatus("Error: Could not find active tab.");
      }
    });
  });

  pauseButton.addEventListener('click', () => {
    updateStatus("Pausing...");
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
       if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "PAUSE_TIMELINE" }, (response) => {
           if (chrome.runtime.lastError) {
             console.error("Error sending PAUSE_TIMELINE:", chrome.runtime.lastError.message);
             updateStatus(`Error: ${chrome.runtime.lastError.message}`);
           } else if (response) {
             console.log("PAUSE_TIMELINE response:", response);
             updateStatus("Paused.");
             playButton.disabled = false;
             playButton.textContent = 'Resume'; // Change text to Resume
             pauseButton.disabled = true;
             isPaused = true;
           } else {
              updateStatus("No response from content script.");
           }
        });
       } else {
          updateStatus("Error: Could not find active tab.");
       }
    });
  });

  stopButton.addEventListener('click', () => {
    updateStatus("Stopping...");
     chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
       if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "STOP_TIMELINE" }, (response) => {
           if (chrome.runtime.lastError) {
             console.error("Error sending STOP_TIMELINE:", chrome.runtime.lastError.message);
             updateStatus(`Error: ${chrome.runtime.lastError.message}`);
           } else if (response) {
             console.log("STOP_TIMELINE response:", response);
             updateStatus("Stopped.");
             playButton.disabled = false; // Enable play
             playButton.textContent = 'Play'; // Reset text
             pauseButton.disabled = true;
             stopButton.disabled = true;
             isPaused = false; // Reset paused state
           } else {
              updateStatus("No response from content script.");
           }
        });
       } else {
          updateStatus("Error: Could not find active tab.");
       }
    });
  });

  saveVoicesButton.addEventListener('click', () => {
    saveCurrentVoiceMapping();
  });

  // --- Helper Functions ---

  function updateStatus(message) {
    statusDiv.textContent = message;
    console.log("Status:", message);
  }

  function loadVoiceMapping() {
    chrome.runtime.sendMessage({ type: "LOAD_VOICE_MAPPING" }, (response) => {
      if (response && response.status === "success" && response.mapping) {
        voiceMapping = response.mapping;
        console.log("Loaded voice mapping:", voiceMapping);
        // Update UI if speakers are already known (e.g., from a previous session)
        if (currentSpeakers.length > 0) {
          populateVoiceSelectors();
        }
      } else {
        console.error("Failed to load voice mapping:", response);
      }
    });
  }

  function saveCurrentVoiceMapping() {
    const selects = speakerVoiceMapDiv.querySelectorAll('select');
    const currentMapping = {};
    selects.forEach(select => {
      const speaker = select.dataset.speaker;
      if (speaker) {
        currentMapping[speaker] = select.value;
      }
    });
    voiceMapping = currentMapping; // Update local cache
    chrome.runtime.sendMessage({ type: "SAVE_VOICE_MAPPING", mapping: voiceMapping }, (response) => {
      if (response && response.status === "success") {
        updateStatus("Voice preferences saved.");
      } else {
        updateStatus("Error: Could not save voice preferences.");
        console.error("Failed to save voice mapping:", response);
      }
    });
  }

  function populateVoiceSelectors() {
    speakerVoiceMapDiv.innerHTML = ''; // Clear existing options

    if (currentSpeakers.length === 0) {
        speakerVoiceMapDiv.innerHTML = '<p>No speakers detected yet. Click "Dub Current Comic".</p>';
        return;
    }

    currentSpeakers.forEach(speaker => {
      const row = document.createElement('div');
      row.className = 'speaker-row';

      const label = document.createElement('label');
      label.htmlFor = `voice-${speaker}`;
      label.textContent = `${speaker}:`;

      const select = document.createElement('select');
      select.id = `voice-${speaker}`;
      select.dataset.speaker = speaker;

      // Add a default option
      const defaultOption = document.createElement('option');
      defaultOption.value = "default"; // Or perhaps the first available voice?
      defaultOption.textContent = "Default";
      select.appendChild(defaultOption);

      // Add available voices
      availableVoices.forEach(voice => {
        const option = document.createElement('option');
        option.value = voice.name; // Use the unique voice name
        option.textContent = `${voice.name} (${voice.lang})`;
        select.appendChild(option);
      });

      // Set selected value based on loaded/saved mapping
      if (voiceMapping[speaker]) {
        select.value = voiceMapping[speaker];
      } else {
         select.value = "default"; // Fallback to default
      }

      row.appendChild(label);
      row.appendChild(select);
      speakerVoiceMapDiv.appendChild(row);
    });
     saveVoicesButton.style.display = currentSpeakers.length > 0 ? 'inline-block' : 'none';
  }

  // --- Simulation/Placeholder ---
  function simulateOcrResults(speakers) {
      console.log("Simulating OCR results with speakers:", speakers);
      currentSpeakers = [...new Set(speakers)]; // Get unique speakers
      populateVoiceSelectors();
      // Enable playback controls conceptually (actual enabling depends on timeline generation)
      // Only enable play if speakers are detected. Pause/Stop remain disabled initially.
      playButton.disabled = !(currentSpeakers && currentSpeakers.length > 0);
      pauseButton.disabled = true;
      stopButton.disabled = true;
      updateStatus("Speakers detected. Assign voices and press Play.");
  }

  // Initial state
  // Initial state setup
  function setInitialState() {
      updateStatus("Ready. Click 'Dub Current Comic' on a page with comics.");
      saveVoicesButton.style.display = 'none'; // Hide save until speakers are loaded
      playButton.disabled = true; // Disabled until speakers/timeline loaded
      pauseButton.disabled = true;
      stopButton.disabled = true;
      isPaused = false;
      playButton.textContent = 'Play';
  }
  setInitialState(); // Call on load

});
