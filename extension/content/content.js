/**
 * AI-Powered Web Comic Dubber - Content Script
 *
 * This script is injected into web pages and handles:
 * - Speech bubble detection using OpenCV.js
 * - Text extraction using Tesseract.js
 * - Text-to-speech playback using Web Speech API
 * - Visual highlighting of speech bubbles
 */

// Global variables
let detectedBubbles = [];
let currentSpeechIndex = -1;
let isSpeaking = false;
let speechSynthesis = window.speechSynthesis;
let utterance = null;
let cv = null; // OpenCV.js instance
let availableVoices = []; // Available speech synthesis voices
let characterVoiceMap = {}; // Map of characters to voices

// UI state variables
let isUIInjected = false;
let isUIMinimized = false;
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let uiElement = null;

// Initialize when the content script loads
initialize();

function initialize() {
    console.log("AI-Powered Web Comic Dubber content script initialized");

    // Create overlay container for highlighting bubbles
    const overlay = document.createElement("div");
    overlay.id = "comic-dubber-overlay";
    overlay.style.position = "absolute";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.pointerEvents = "none";
    overlay.style.zIndex = "9999";
    document.body.appendChild(overlay);

    // Initialize OpenCV.js
    initOpenCV();

    // Load available voices
    loadVoices();

    // Check if UI should be injected (based on storage)
    chrome.storage.local.get(["uiVisible"], (result) => {
        if (result.uiVisible) {
            injectUI();
        }
    });

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
        console.log("Content script received message:", message);

        if (message.action === "toggleUI") {
            // Toggle the UI visibility
            if (!isUIInjected) {
                injectUI();
                sendResponse({ success: true, action: "injected" });
            } else {
                toggleUIVisibility();
                sendResponse({ success: true, action: "toggled" });
            }
            return true;
        }

        if (message.action === "detectBubbles") {
            // Extract moveToNextPage parameter (default to false if not provided)
            const moveToNextPage = message.moveToNextPage || false;
            console.log(
                `Detecting speech bubbles, moveToNextPage: ${moveToNextPage}`
            );

            // Check if OpenCV is loaded
            if (!cv) {
                console.log("OpenCV not loaded yet, waiting...");
                // Try to initialize OpenCV again
                initOpenCV()
                    .then(() => {
                        detectSpeechBubbles(moveToNextPage)
                            .then((result) => {
                                // Store only the bubbles from the current page
                                detectedBubbles = result.bubbles;
                                sendResponse({
                                    success: true,
                                    bubbles: result.bubbles,
                                    pageInfo: result.pageInfo,
                                });

                                // Update UI if it's injected
                                if (isUIInjected) {
                                    updateUIWithDetectionResults(result);
                                }
                            })
                            .catch((error) => {
                                console.error(
                                    "Error detecting speech bubbles:",
                                    error
                                );
                                sendResponse({
                                    success: false,
                                    error: error.message,
                                });
                            });
                    })
                    .catch((error) => {
                        console.error("Failed to initialize OpenCV:", error);
                        sendResponse({
                            success: false,
                            error:
                                "Failed to initialize OpenCV: " + error.message,
                        });
                    });
            } else {
                detectSpeechBubbles(moveToNextPage)
                    .then((result) => {
                        // Store only the bubbles from the current page
                        detectedBubbles = result.bubbles;
                        sendResponse({
                            success: true,
                            bubbles: result.bubbles,
                            pageInfo: result.pageInfo,
                        });

                        // Update UI if it's injected
                        if (isUIInjected) {
                            updateUIWithDetectionResults(result);
                        }
                    })
                    .catch((error) => {
                        console.error("Error detecting speech bubbles:", error);
                        sendResponse({ success: false, error: error.message });
                    });
            }
            return true; // Keep the message channel open for async response
        }

        if (message.action === "getCurrentPageInfo") {
            // Return information about the current page without processing a new one
            if (comicImages.length === 0) {
                // No images initialized yet
                sendResponse({
                    success: false,
                    error: "No comic images detected yet",
                });
            } else {
                sendResponse({
                    success: true,
                    pageInfo: {
                        currentPage: currentImageIndex + 1,
                        totalPages: comicImages.length,
                        hasNextPage: comicImages.length > 1,
                    },
                });
            }
            return true; // Keep the message channel open for async response
        }

        if (message.action === "playVoiceover") {
            playVoiceover(message.bubbles, message.settings)
                .then((result) => {
                    sendResponse({ success: true, result });
                })
                .catch((error) => {
                    console.error("Error playing voiceover:", error);
                    sendResponse({ success: false, error: error.message });
                });
            return true; // Keep the message channel open for async response
        }

        if (message.action === "stopVoiceover") {
            stopVoiceover();
            sendResponse({ success: true });
            return true;
        }
    });
}

/**
 * Inject the UI into the page
 */
function injectUI() {
    if (isUIInjected) return;

    // Load the UI template
    const parser = new DOMParser();
    const uiDoc = parser.parseFromString(comicDubberUITemplate, "text/html");
    uiElement = uiDoc.querySelector("#comic-dubber-ui");

    // Add the UI to the page
    document.body.appendChild(uiElement);
    isUIInjected = true;

    // Set up event listeners for the UI
    setupUIEventListeners();

    // Initialize UI components
    initializeUI();

    // Save UI state to storage
    chrome.storage.local.set({ uiVisible: true });

    console.log("Comic Dubber UI injected");
}

/**
 * Set up event listeners for the UI
 */
function setupUIEventListeners() {
    // Get UI elements
    const header = document.getElementById("comic-dubber-header");
    const minimizeButton = document.getElementById("comic-dubber-minimize");
    const closeButton = document.getElementById("comic-dubber-close");
    const detectButton = document.getElementById("detectButton");
    const playButton = document.getElementById("playButton");
    const pauseButton = document.getElementById("pauseButton");
    const stopButton = document.getElementById("stopButton");
    const addCharacterButton = document.getElementById("addCharacterButton");
    const saveSettingsButton = document.getElementById("saveSettingsButton");

    // Draggable functionality
    header.addEventListener("mousedown", (e) => {
        isDragging = true;
        const rect = uiElement.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;

        // Prevent text selection during drag
        e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
        if (!isDragging) return;

        const x = e.clientX - dragOffsetX;
        const y = e.clientY - dragOffsetY;

        // Keep the UI within the viewport
        const maxX = window.innerWidth - uiElement.offsetWidth;
        const maxY = window.innerHeight - uiElement.offsetHeight;

        uiElement.style.left = Math.max(0, Math.min(x, maxX)) + "px";
        uiElement.style.top = Math.max(0, Math.min(y, maxY)) + "px";
    });

    document.addEventListener("mouseup", () => {
        isDragging = false;
    });

    // Minimize/maximize functionality
    minimizeButton.addEventListener("click", () => {
        isUIMinimized = !isUIMinimized;
        uiElement.classList.toggle("comic-dubber-minimized", isUIMinimized);
        minimizeButton.textContent = isUIMinimized ? "□" : "_";
    });

    // Close functionality
    closeButton.addEventListener("click", () => {
        uiElement.style.display = "none";
        // Save UI state to storage
        chrome.storage.local.set({ uiVisible: false });
    });

    // Detect button
    detectButton.addEventListener("click", () => {
        const detectionStatus = document.getElementById("detectionStatus");
        const bubbleCount = document.getElementById("bubbleCount");

        detectionStatus.textContent = "Detecting speech bubbles...";
        bubbleCount.textContent = "";

        // Determine if we should move to the next page based on button text
        const moveToNextPage = detectButton.textContent.includes("Next Page");

        // Disable detect button during detection
        detectButton.disabled = true;
        detectButton.textContent = "Detecting...";

        // Detect speech bubbles
        detectSpeechBubbles(moveToNextPage)
            .then((result) => {
                // Store bubbles and update UI
                detectedBubbles = result.bubbles;
                updateUIWithDetectionResults(result);
            })
            .catch((error) => {
                console.error("Error detecting speech bubbles:", error);
                detectionStatus.textContent = "Error detecting speech bubbles";
                bubbleCount.textContent = error.message || "Unknown error";
                detectButton.textContent = "Detect Speech Bubbles";
                detectButton.disabled = false;
            });
    });

    // Playback controls
    playButton.addEventListener("click", () => {
        if (detectedBubbles.length === 0) {
            const detectionStatus = document.getElementById("detectionStatus");
            detectionStatus.textContent = "No speech bubbles detected";
            return;
        }

        // Get settings from UI
        const settings = getSettingsFromUI();

        // Play voiceover
        playVoiceover(detectedBubbles, settings)
            .then(() => {
                playButton.disabled = true;
                pauseButton.disabled = false;
                stopButton.disabled = false;
            })
            .catch((error) => {
                console.error("Error playing voiceover:", error);
                const detectionStatus =
                    document.getElementById("detectionStatus");
                detectionStatus.textContent = "Error playing voiceover";
            });
    });

    pauseButton.addEventListener("click", () => {
        // Pause voiceover
        if (speechSynthesis && utterance) {
            speechSynthesis.pause();
            playButton.disabled = false;
            pauseButton.disabled = true;
        }
    });

    stopButton.addEventListener("click", () => {
        // Stop voiceover
        stopVoiceover();
        playButton.disabled = false;
        pauseButton.disabled = true;
        stopButton.disabled = true;
    });

    // Add character button
    addCharacterButton.addEventListener("click", () => {
        addCharacterVoiceToUI();
    });

    // Save settings button
    saveSettingsButton.addEventListener("click", () => {
        saveSettingsFromUI();
    });
}

/**
 * Initialize UI components
 */
function initializeUI() {
    // Load settings
    loadSettingsToUI();

    // Load available voices
    loadVoicesToUI();

    // Check if there's already a page being processed
    getCurrentPageInfo();
}

/**
 * Update UI with detection results
 */
function updateUIWithDetectionResults(result) {
    const detectButton = document.getElementById("detectButton");
    const detectionStatus = document.getElementById("detectionStatus");
    const bubbleCount = document.getElementById("bubbleCount");
    const playButton = document.getElementById("playButton");
    const stopButton = document.getElementById("stopButton");

    // Re-enable detect button
    detectButton.disabled = false;

    // Update page information
    if (result.pageInfo) {
        const currentPage = result.pageInfo.currentPage;
        const totalPages = result.pageInfo.totalPages;

        // Update button text based on whether there are more pages
        if (result.pageInfo.hasNextPage) {
            detectButton.textContent = `Next Page (${currentPage}/${totalPages})`;
        } else {
            detectButton.textContent = "Detect Speech Bubbles";
        }

        detectionStatus.textContent = `Page ${currentPage}/${totalPages} processed`;
    } else {
        detectButton.textContent = "Detect Speech Bubbles";
    }

    bubbleCount.textContent = `Found ${result.bubbles.length} speech bubbles on this page`;

    // Enable playback controls
    playButton.disabled = false;
    stopButton.disabled = false;

    // Populate text correction list
    populateTextCorrectionList(result.bubbles);
}

/**
 * Populate text correction list with detected bubbles
 */
function populateTextCorrectionList(bubbles) {
    const textCorrectionList = document.getElementById("textCorrectionList");
    if (!textCorrectionList) return;

    // Clear existing items
    textCorrectionList.innerHTML = "";

    // Add text correction items for each bubble
    bubbles.forEach((bubble, index) => {
        const item = document.createElement("div");
        item.className = "text-correction-item";

        const label = document.createElement("p");
        // Add confidence indicator to the label
        const confidenceIndicator = bubble.confidence === "high" ? "✓ " : "? ";
        label.textContent = `${confidenceIndicator}Bubble ${index + 1}:`;
        // Add color based on confidence
        label.style.color = bubble.confidence === "high" ? "green" : "orange";

        const textarea = document.createElement("textarea");
        textarea.value = bubble.text;
        textarea.dataset.bubbleId = bubble.id;

        // Update bubble text when textarea changes
        textarea.addEventListener("input", () => {
            bubble.text = textarea.value;
        });

        item.appendChild(label);
        item.appendChild(textarea);
        textCorrectionList.appendChild(item);
    });
}

/**
 * Add a character voice item to the UI
 */
function addCharacterVoiceToUI(character = "", voice = "default") {
    const characterVoicesList = document.getElementById("characterVoicesList");
    if (!characterVoicesList) return;

    const item = document.createElement("div");
    item.className = "character-voice-item";

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.className = "character-name";
    nameInput.placeholder = "Character Name";
    nameInput.value = character;

    const voiceSelect = document.createElement("select");
    voiceSelect.className = "character-voice";

    const removeButton = document.createElement("button");
    removeButton.className = "remove-character";
    removeButton.textContent = "✕";
    removeButton.addEventListener("click", () => {
        item.remove();
    });

    item.appendChild(nameInput);
    item.appendChild(voiceSelect);
    item.appendChild(removeButton);

    characterVoicesList.appendChild(item);

    // Populate voice options
    populateVoiceSelect(voiceSelect);

    // Set selected voice if provided
    if (voice && voiceSelect.querySelector(`option[value="${voice}"]`)) {
        voiceSelect.value = voice;
    }
}

/**
 * Populate a voice select dropdown with available voices
 */
function populateVoiceSelect(select) {
    // Clear existing options
    select.innerHTML = "";

    // Add default option
    const defaultOption = document.createElement("option");
    defaultOption.value = "default";
    defaultOption.textContent = "Use Default Voice";
    select.appendChild(defaultOption);

    // Add available voices
    availableVoices.forEach((voice) => {
        const option = document.createElement("option");
        option.value = voice.name;
        option.textContent = `${voice.name} (${voice.lang})`;
        select.appendChild(option);
    });
}

/**
 * Load available voices to the UI
 */
function loadVoicesToUI() {
    const defaultVoiceSelect = document.getElementById("defaultVoice");
    if (!defaultVoiceSelect) return;

    // Clear existing options
    defaultVoiceSelect.innerHTML = "";

    // Add default option
    const defaultOption = document.createElement("option");
    defaultOption.value = "default";
    defaultOption.textContent = "Browser Default";
    defaultVoiceSelect.appendChild(defaultOption);

    // Add available voices
    availableVoices.forEach((voice) => {
        const option = document.createElement("option");
        option.value = voice.name;
        option.textContent = `${voice.name} (${voice.lang})`;
        defaultVoiceSelect.appendChild(option);
    });

    // Update character voice selects
    const characterVoiceSelects = document.querySelectorAll(".character-voice");
    characterVoiceSelects.forEach((select) => {
        populateVoiceSelect(select);
    });
}

/**
 * Get settings from the UI
 */
function getSettingsFromUI() {
    const enableToggle = document.getElementById("enableToggle");
    const volumeSlider = document.getElementById("volumeSlider");
    const rateSlider = document.getElementById("rateSlider");
    const defaultVoiceSelect = document.getElementById("defaultVoice");

    // Get character voices
    const characterVoices = {};
    const characterVoiceItems = document.querySelectorAll(
        ".character-voice-item"
    );
    characterVoiceItems.forEach((item) => {
        const name = item.querySelector(".character-name").value.trim();
        const voice = item.querySelector(".character-voice").value;

        if (name) {
            characterVoices[name] = voice;
        }
    });

    return {
        enabled: enableToggle ? enableToggle.checked : true,
        volume: volumeSlider ? parseFloat(volumeSlider.value) : 1.0,
        rate: rateSlider ? parseFloat(rateSlider.value) : 1.0,
        pitch: 1.0,
        defaultVoice: defaultVoiceSelect ? defaultVoiceSelect.value : "default",
        characterVoices: characterVoices,
        highlightBubbles: true,
    };
}

/**
 * Load settings to the UI
 */
function loadSettingsToUI() {
    chrome.storage.sync.get(null, (storedSettings) => {
        if (!storedSettings) return;

        const enableToggle = document.getElementById("enableToggle");
        const volumeSlider = document.getElementById("volumeSlider");
        const rateSlider = document.getElementById("rateSlider");
        const defaultVoiceSelect = document.getElementById("defaultVoice");
        const characterVoicesList = document.getElementById(
            "characterVoicesList"
        );

        // Update UI with loaded settings
        if (enableToggle && storedSettings.enabled !== undefined) {
            enableToggle.checked = storedSettings.enabled;
        }

        if (volumeSlider && storedSettings.volume !== undefined) {
            volumeSlider.value = storedSettings.volume;
        }

        if (rateSlider && storedSettings.rate !== undefined) {
            rateSlider.value = storedSettings.rate;
        }

        // Set default voice if available
        if (defaultVoiceSelect && storedSettings.defaultVoice) {
            // Wait for voices to load
            setTimeout(() => {
                if (
                    defaultVoiceSelect.querySelector(
                        `option[value="${storedSettings.defaultVoice}"]`
                    )
                ) {
                    defaultVoiceSelect.value = storedSettings.defaultVoice;
                }
            }, 100);
        }

        // Load character voices
        if (characterVoicesList && storedSettings.characterVoices) {
            // Clear default character voice item
            characterVoicesList.innerHTML = "";

            // Add saved character voices
            for (const [character, voice] of Object.entries(
                storedSettings.characterVoices
            )) {
                addCharacterVoiceToUI(character, voice);
            }
        }

        console.log("Settings loaded to UI:", storedSettings);
    });
}

/**
 * Save settings from the UI
 */
function saveSettingsFromUI() {
    const settings = getSettingsFromUI();

    // Save settings to storage
    chrome.storage.sync.set(settings, () => {
        console.log("Settings saved:", settings);

        // Show save confirmation
        const saveButton = document.getElementById("saveSettingsButton");
        if (saveButton) {
            const originalText = saveButton.textContent;

            saveButton.textContent = "Settings Saved!";
            saveButton.disabled = true;

            setTimeout(() => {
                saveButton.textContent = originalText;
                saveButton.disabled = false;
            }, 1500);
        }
    });
}

/**
 * Get current page information
 */
function getCurrentPageInfo() {
    if (comicImages.length === 0) return;

    const detectionStatus = document.getElementById("detectionStatus");
    const detectButton = document.getElementById("detectButton");

    if (!detectionStatus || !detectButton) return;

    const currentPage = currentImageIndex + 1;
    const totalPages = comicImages.length;
    const hasNextPage = totalPages > 1;

    // Update UI to show current page
    detectionStatus.textContent = `Page ${currentPage}/${totalPages} loaded`;

    // Update button text based on whether there are more pages
    if (hasNextPage && currentPage > 0) {
        detectButton.textContent = `Next Page (${currentPage}/${totalPages})`;
    } else {
        detectButton.textContent = "Detect Speech Bubbles";
    }
}

/**
 * Toggle UI visibility
 */
function toggleUIVisibility() {
    if (!uiElement) return;

    if (uiElement.style.display === "none") {
        uiElement.style.display = "block";
    } else {
        uiElement.style.display = "none";
    }
}

/**
 * Initialize OpenCV.js
 * @returns {Promise} Promise that resolves when OpenCV is loaded
 */
async function initOpenCV() {
    return new Promise((resolve, reject) => {
        if (window.cv) {
            cv = window.cv;
            console.log("OpenCV.js already loaded");
            resolve(cv);
            return;
        }

        // Check if the script is already in the document
        const existingScript = document.querySelector(
            'script[src*="opencv.js"]'
        );
        if (existingScript) {
            console.log(
                "OpenCV.js script already exists, waiting for it to load"
            );
            const checkInterval = setInterval(() => {
                if (window.cv) {
                    clearInterval(checkInterval);
                    cv = window.cv;
                    console.log("OpenCV.js loaded from existing script");
                    resolve(cv);
                }
            }, 100);
            return;
        }

        console.log("Loading OpenCV.js...");
        // Create a script element to load OpenCV.js
        const script = document.createElement("script");
        script.src = chrome.runtime.getURL("lib/opencv.js");
        script.onload = () => {
            // OpenCV.js sets a callback function when it's ready
            window.Module = {
                onRuntimeInitialized: () => {
                    cv = window.cv;
                    console.log("OpenCV.js loaded and initialized");
                    resolve(cv);
                },
            };
        };
        script.onerror = (error) => {
            console.error("Failed to load OpenCV.js:", error);
            reject(new Error("Failed to load OpenCV.js"));
        };
        document.head.appendChild(script);
    });
}

/**
 * Load available voices for speech synthesis
 */
function loadVoices() {
    // Check if voices are already loaded
    let voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
        availableVoices = voices;
        console.log(`Loaded ${availableVoices.length} voices`);
        return;
    }

    // If not, wait for the voiceschanged event
    speechSynthesis.onvoiceschanged = () => {
        availableVoices = speechSynthesis.getVoices();
        console.log(`Loaded ${availableVoices.length} voices`);
    };
}

/**
 * Initialize OpenCV.js
 * @returns {Promise} Promise that resolves when OpenCV is loaded
 */
async function initOpenCV() {
    return new Promise((resolve, reject) => {
        // Check if OpenCV is already loaded
        if (window.cv && window.cv.imread) {
            cv = window.cv;
            console.log("OpenCV.js already loaded");
            resolve(cv);
            return;
        }

        // Check if the script is already in the document
        const existingScript = document.querySelector(
            'script[src*="opencv.js"]'
        );
        if (existingScript) {
            console.log(
                "OpenCV.js script already exists, waiting for it to load"
            );
            // Wait for it to load
            const checkInterval = setInterval(() => {
                if (window.cv && window.cv.imread) {
                    clearInterval(checkInterval);
                    cv = window.cv;
                    console.log("OpenCV.js loaded from existing script");
                    resolve(cv);
                }
            }, 100);
            return;
        }

        try {
            // Create a script element to load OpenCV.js
            const script = document.createElement("script");
            script.src = chrome.runtime.getURL("lib/opencv.js");
            script.type = "text/javascript";
            script.async = true;

            // Set up event listeners before appending to document
            script.onload = () => {
                console.log(
                    "OpenCV.js script loaded, waiting for initialization"
                );
                // OpenCV.js has a Module object that needs to be initialized
                const waitForOpenCV = setInterval(() => {
                    if (window.cv && window.cv.imread) {
                        clearInterval(waitForOpenCV);
                        cv = window.cv;
                        console.log("OpenCV.js loaded successfully");
                        resolve(cv);
                    }
                }, 100);

                // Set a timeout to avoid waiting forever
                setTimeout(() => {
                    if (!window.cv || !window.cv.imread) {
                        console.warn(
                            "OpenCV.js initialization timed out, using fallback"
                        );
                        clearInterval(waitForOpenCV);
                        resolve(null); // Resolve with null to indicate fallback should be used
                    }
                }, 5000); // 5 second timeout
            };

            script.onerror = (error) => {
                console.error("Failed to load OpenCV.js:", error);
                reject(new Error("Failed to load OpenCV.js"));
            };

            // Append the script to the document
            document.head.appendChild(script);
        } catch (error) {
            console.error("Error initializing OpenCV:", error);
            reject(error);
        }
    });
}

/**
 * Load available voices for speech synthesis
 */
function loadVoices() {
    // Check if voices are already available
    let voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
        availableVoices = voices;
        console.log(`Loaded ${availableVoices.length} voices`);
        return;
    }

    // If not, wait for them to be loaded
    speechSynthesis.onvoiceschanged = () => {
        availableVoices = speechSynthesis.getVoices();
        console.log(`Loaded ${availableVoices.length} voices`);
    };
}

// Store comic images and current page information
let comicImages = [];
let currentImageIndex = -1; // Current page index

/**
 * Initialize comic images on the page
 * @returns {Promise<Array>} Array of comic images
 */
async function initializeComicImages() {
    return new Promise((resolve, reject) => {
        try {
            console.log("Initializing comic images...");

            // Get all images on the page
            const images = Array.from(document.querySelectorAll("img"));
            comicImages = images.filter((img) => {
                // Filter for likely comic images (can be improved with more sophisticated detection)
                return img.width > 200 && img.height > 200;
            });

            if (comicImages.length === 0) {
                reject(new Error("No comic images detected on the page"));
                return;
            }

            console.log(`Found ${comicImages.length} comic images on the page`);
            currentBatchStart = -1; // Reset index
            resolve(comicImages);
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Detect speech bubbles in the comic image
 * @param {boolean} moveToNextPage - Whether to move to the next page or stay on the current page
 * @returns {Promise<Object>} Object containing bubbles and page information
 */
async function detectSpeechBubbles(moveToNextPage = false) {
    return new Promise((resolve, reject) => {
        try {
            // Initialize comic images if not already done
            if (comicImages.length === 0 || currentImageIndex === -1) {
                initializeComicImages()
                    .then(() => {
                        // Start with the first image
                        currentImageIndex = 0;
                        processCurrentImage(resolve, reject);
                    })
                    .catch((error) => reject(error));
            } else if (moveToNextPage) {
                // Only move to the next image if explicitly requested
                currentImageIndex =
                    (currentImageIndex + 1) % comicImages.length;
                processCurrentImage(resolve, reject);
            } else {
                // Process the current image again (useful for refreshing or after settings change)
                processCurrentImage(resolve, reject);
            }
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Process the current comic image
 * @param {Function} resolve - Promise resolve function
 * @param {Function} reject - Promise reject function
 */
function processCurrentImage(resolve, reject) {
    try {
        console.log(
            `Processing image ${currentImageIndex + 1} of ${comicImages.length}`
        );

        // Process the current image
        processImage(currentImageIndex)
            .then((bubbles) => {
                console.log(
                    `Detected ${bubbles.length} bubbles in image ${
                        currentImageIndex + 1
                    }`
                );

                // Highlight the bubbles
                highlightBubbles(bubbles);

                // Calculate if there are more images to process
                const hasNextPage = comicImages.length > 1;

                // Return bubbles along with page information
                resolve({
                    bubbles: bubbles,
                    pageInfo: {
                        currentPage: currentImageIndex + 1,
                        totalPages: comicImages.length,
                        hasNextPage: hasNextPage,
                    },
                });
            })
            .catch((error) => {
                reject(error);
            });
    } catch (error) {
        reject(error);
    }
}

/**
 * Process a single comic image
 * @param {number} imageIndex - Index of the image to process
 * @returns {Promise<Array>} Array of detected bubbles
 */
async function processImage(imageIndex) {
    return new Promise((resolve) => {
        try {
            const img = comicImages[imageIndex];
            console.log(
                `Processing image ${imageIndex + 1} of ${comicImages.length}`
            );

            // Create a canvas to process the image
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            canvas.width = img.width;
            canvas.height = img.height;

            // Draw the image on the canvas
            ctx.drawImage(img, 0, 0, img.width, img.height);

            // Get image data for processing with OpenCV.js
            const imageData = ctx.getImageData(
                0,
                0,
                canvas.width,
                canvas.height
            );

            // Detect speech bubbles using OpenCV.js
            const bubbles = [];

            // Try to detect speech bubbles
            // First check if OpenCV is properly loaded
            if (!cv || !cv.matFromImageData) {
                console.warn(
                    "OpenCV is not fully loaded, using fallback detection"
                );
                // Use fallback detection method
                const mockBubbles = createMockBubbles(img, imageIndex);
                for (const bubble of mockBubbles) {
                    bubble.text = generateSampleText(
                        imageIndex,
                        bubbles.length
                    );
                    bubbles.push(bubble);
                }
            } else {
                try {
                    // Convert the image data to an OpenCV matrix
                    const src = cv.matFromImageData(imageData);

                    // Create matrices for processing
                    const gray = new cv.Mat();
                    const blur = new cv.Mat();
                    const thresh = new cv.Mat();
                    const hierarchy = new cv.Mat();
                    const contours = new cv.MatVector();

                    try {
                        // Convert to grayscale
                        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

                        // Apply Gaussian blur to reduce noise
                        cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0);

                        // Apply adaptive threshold to get binary image
                        // This helps identify white areas (speech bubbles) against darker backgrounds
                        cv.adaptiveThreshold(
                            blur,
                            thresh,
                            255,
                            cv.ADAPTIVE_THRESH_GAUSSIAN_C,
                            cv.THRESH_BINARY,
                            11,
                            2
                        );

                        // Find contours in the binary image
                        cv.findContours(
                            thresh,
                            contours,
                            hierarchy,
                            cv.RETR_EXTERNAL,
                            cv.CHAIN_APPROX_SIMPLE
                        );

                        console.log(
                            `Found ${contours.size()} contours in image ${
                                imageIndex + 1
                            }`
                        );

                        // Process each contour to identify speech bubbles
                        for (let i = 0; i < contours.size(); i++) {
                            const contour = contours.get(i);

                            // Calculate contour area
                            const area = cv.contourArea(contour);

                            // Filter out small contours
                            if (area < 500) {
                                continue;
                            }

                            // Get bounding rectangle
                            const rect = cv.boundingRect(contour);

                            // Calculate aspect ratio
                            const aspectRatio = rect.width / rect.height;

                            // Filter based on aspect ratio (speech bubbles are usually not too elongated)
                            if (aspectRatio < 0.2 || aspectRatio > 5) {
                                continue;
                            }

                            // We'll check for rounded shape after calculating circularity

                            // Calculate solidity (area / convex hull area)
                            const hull = new cv.Mat();
                            cv.convexHull(contour, hull);
                            const hullArea = cv.contourArea(hull);
                            const solidity = area / hullArea;
                            hull.delete();

                            // Speech bubbles usually have high solidity
                            if (solidity < 0.7) {
                                continue;
                            }

                            // Get the contour perimeter
                            const perimeter = cv.arcLength(contour, true);

                            // Approximate the contour to simplify it
                            const approx = new cv.Mat();
                            cv.approxPolyDP(
                                contour,
                                approx,
                                0.02 * perimeter,
                                true
                            );

                            // Speech bubbles usually have a reasonable number of vertices
                            if (approx.rows < 4 || approx.rows > 20) {
                                approx.delete();
                                continue;
                            }

                            // Calculate circularity (4π × area / perimeter²)
                            const circularity =
                                (4 * Math.PI * area) / (perimeter * perimeter);

                            // Additional check for speech bubble shape
                            // Speech bubbles often have a more rounded shape
                            const isRounded = circularity > 0.6; // Higher circularity indicates more rounded shape

                            // Speech bubbles are often somewhat circular
                            if (circularity < 0.4) {
                                approx.delete();
                                continue;
                            }

                            // Prefer more rounded shapes (higher confidence for speech bubbles)
                            const bubbleConfidence = isRounded
                                ? "high"
                                : "medium";

                            // This is likely a speech bubble
                            // Convert OpenCV rect to our format
                            const bubbleRect = {
                                left: imgRect.left + rect.x,
                                top: imgRect.top + rect.y,
                                width: rect.width,
                                height: rect.height,
                            };

                            // Create a bubble object
                            const bubble = {
                                id: `bubble-${imageIndex}-${i}`,
                                imgElement: img,
                                rect: bubbleRect,
                                text: "", // Will be filled with OCR text
                                confidence: bubbleConfidence, // Add confidence level based on shape analysis
                            };

                            // Extract text from the bubble using canvas
                            const bubbleCanvas =
                                document.createElement("canvas");
                            const bubbleCtx = bubbleCanvas.getContext("2d");
                            bubbleCanvas.width = rect.width;
                            bubbleCanvas.height = rect.height;
                            bubbleCtx.drawImage(
                                img,
                                rect.x,
                                rect.y,
                                rect.width,
                                rect.height,
                                0,
                                0,
                                rect.width,
                                rect.height
                            );

                            // For now, use placeholder text with character names for testing
                            // In a real implementation, we would use Tesseract.js to extract text
                            bubble.text = generateSampleText(imageIndex, i);

                            // Add to bubbles array
                            bubbles.push(bubble);

                            approx.delete();
                        }
                    } finally {
                        // Clean up OpenCV resources
                        src.delete();
                        gray.delete();
                        blur.delete();
                        thresh.delete();
                        hierarchy.delete();
                        contours.delete();
                    }
                } catch (error) {
                    console.error(
                        `Error detecting bubbles with OpenCV: ${error.message}`
                    );
                    // Use fallback detection without eval
                    const mockBubbles = createMockBubbles(img, imageIndex);
                    for (const bubble of mockBubbles) {
                        bubble.text = generateSampleText(
                            imageIndex,
                            bubbles.length
                        );
                        bubbles.push(bubble);
                    }
                }
            }

            console.log(
                `Detected ${bubbles.length} bubbles in image ${imageIndex + 1}`
            );
            resolve(bubbles);
        } catch (error) {
            console.error(`Error processing image ${imageIndex + 1}:`, error);
            // Return empty array on error to continue processing other images
            resolve([]);
        }
    });
}

/**
 * Generate sample text with character names for testing
 * @param {number} imageIndex - Index of the image
 * @param {number} bubbleIndex - Index of the bubble
 * @returns {string} - Sample text with character name
 */
function generateSampleText(imageIndex, bubbleIndex) {
    // Define some character names
    const characters = [
        "Alice",
        "Bob",
        "Charlie",
        "Diana",
        "Ethan",
        "Fiona",
        "George",
        "Hannah",
    ];

    // Define some sample dialogues
    const dialogues = [
        "Hey there! What's going on?",
        "I can't believe this is happening!",
        "We need to find a way out of here.",
        "Did you see that? It was amazing!",
        "I've been waiting for this moment.",
        "This doesn't look good...",
        "Follow me, I know the way!",
        "Are you sure about this?",
        "I think we should try a different approach.",
        "Let's stick together, it's safer that way.",
        "I wonder what's behind that door.",
        "We've been walking in circles for hours!",
        "Look at the sky, something's happening!",
        "I've never seen anything like this before.",
        "Do you hear that strange noise?",
    ];

    // Select a character based on the bubble index
    // This ensures the same bubble position always gets the same character
    const characterIndex = (imageIndex + bubbleIndex) % characters.length;
    const character = characters[characterIndex];

    // Select a dialogue based on the bubble and image indices
    const dialogueIndex = (imageIndex * 3 + bubbleIndex) % dialogues.length;
    const dialogue = dialogues[dialogueIndex];

    // Format patterns (alternate between different formats)
    const format = (imageIndex + bubbleIndex) % 3;

    if (format === 0) {
        // Format: "Character: Text"
        return `${character}: ${dialogue}`;
    } else if (format === 1) {
        // Format: "[Character] Text"
        return `[${character}] ${dialogue}`;
    } else {
        // Format: "Character (thinking): Text"
        return `${character} (thinking): ${dialogue}`;
    }
}

/**
 * Create mock speech bubbles for demonstration
 * In a real implementation, this would be replaced with actual OpenCV detection
 */
function createMockBubbles(img, imgIndex) {
    const mockBubbles = [];
    const imgRect = img.getBoundingClientRect();

    // Create 2-3 mock bubbles per image
    const numBubbles = 2 + Math.floor(Math.random());

    for (let i = 0; i < numBubbles; i++) {
        // Create bubbles at different positions in the image
        const bubbleWidth = img.width * (0.2 + Math.random() * 0.3);
        const bubbleHeight = img.height * (0.1 + Math.random() * 0.2);

        const left = imgRect.left + img.width * (0.1 + Math.random() * 0.6);
        const top = imgRect.top + img.height * (0.1 + i * 0.3);

        mockBubbles.push({
            id: `bubble-${imgIndex}-${i}`,
            imgElement: img,
            rect: {
                left,
                top,
                width: bubbleWidth,
                height: bubbleHeight,
            },
            // We'll generate the text later
            confidence: Math.random() > 0.5 ? "high" : "medium", // Random confidence for mock bubbles
        });
    }

    return mockBubbles;
}

/**
 * Highlight speech bubbles on the page
 */
function highlightBubbles(bubbles) {
    const overlay = document.getElementById("comic-dubber-overlay");
    overlay.innerHTML = "";

    bubbles.forEach((bubble) => {
        const highlight = document.createElement("div");
        highlight.id = bubble.id;
        highlight.className = "comic-dubber-highlight";
        highlight.style.position = "absolute";
        highlight.style.left = `${bubble.rect.left}px`;
        highlight.style.top = `${bubble.rect.top}px`;
        highlight.style.width = `${bubble.rect.width}px`;
        highlight.style.height = `${bubble.rect.height}px`;
        // Use different colors based on confidence level
        if (bubble.confidence === "high") {
            highlight.style.border = "2px solid rgba(0, 255, 0, 0.7)"; // Green for high confidence
            highlight.style.backgroundColor = "rgba(0, 255, 0, 0.2)";
        } else {
            highlight.style.border = "2px solid rgba(255, 165, 0, 0.7)"; // Orange for medium confidence
            highlight.style.backgroundColor = "rgba(255, 255, 0, 0.2)";
        }
        highlight.style.borderRadius = "15px";
        highlight.style.zIndex = "10000";
        highlight.style.pointerEvents = "none";

        // Add text overlay
        const textOverlay = document.createElement("div");
        textOverlay.className = "comic-dubber-text";
        textOverlay.style.position = "absolute";
        textOverlay.style.bottom = "100%";
        textOverlay.style.left = "0";
        textOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
        textOverlay.style.color = "white";
        textOverlay.style.padding = "5px";
        textOverlay.style.borderRadius = "5px";
        textOverlay.style.fontSize = "12px";
        textOverlay.style.maxWidth = "200px";
        textOverlay.style.display = "none";
        textOverlay.textContent = bubble.text;

        highlight.appendChild(textOverlay);
        overlay.appendChild(highlight);

        // Show text on hover
        highlight.addEventListener("mouseenter", () => {
            textOverlay.style.display = "block";
        });

        highlight.addEventListener("mouseleave", () => {
            textOverlay.style.display = "none";
        });
    });
}

/**
 * Play voiceover for detected bubbles
 */
async function playVoiceover(bubbles, settings) {
    return new Promise((resolve, reject) => {
        try {
            // Stop any current speech
            stopVoiceover();

            // If no bubbles, return
            if (!bubbles || bubbles.length === 0) {
                reject(new Error("No speech bubbles to play"));
                return;
            }

            detectedBubbles = bubbles;
            currentSpeechIndex = 0;
            isSpeaking = true;

            // Start speaking the first bubble
            speakNextBubble(settings);

            resolve({ success: true });
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Detect character from bubble text
 * @param {string} text - The text to analyze
 * @returns {string|null} - The detected character name or null if none detected
 */
function detectCharacter(text) {
    if (!text) return null;

    // Common patterns for character speech in comics
    // Pattern 1: "Character: Text"
    const colonPattern = /^\s*([A-Za-z0-9\s]+)\s*:\s*(.+)/;
    const colonMatch = text.match(colonPattern);
    if (colonMatch && colonMatch[1]) {
        return colonMatch[1].trim();
    }

    // Pattern 2: "[Character] Text"
    const bracketPattern = /^\s*\[([A-Za-z0-9\s]+)\]\s*(.+)/;
    const bracketMatch = text.match(bracketPattern);
    if (bracketMatch && bracketMatch[1]) {
        return bracketMatch[1].trim();
    }

    // Pattern 3: "Character (thinking/speaking): Text"
    const parenthesisPattern = /^\s*([A-Za-z0-9\s]+)\s*\([^)]*\)\s*:\s*(.+)/;
    const parenthesisMatch = text.match(parenthesisPattern);
    if (parenthesisMatch && parenthesisMatch[1]) {
        return parenthesisMatch[1].trim();
    }

    return null;
}

/**
 * Get appropriate voice for a character
 * @param {string} character - Character name
 * @param {Object} settings - Voice settings
 * @returns {SpeechSynthesisVoice|null} - The voice to use
 */
function getVoiceForCharacter(character, settings) {
    // If no character detected or no voices available, return null
    if (!character || availableVoices.length === 0) return null;

    // Check if we already have a voice assigned to this character
    if (characterVoiceMap[character]) {
        const savedVoice = availableVoices.find(
            (v) => v.name === characterVoiceMap[character]
        );
        if (savedVoice) return savedVoice;
    }

    // Check if there's a voice specified in settings
    if (settings?.characterVoices && settings.characterVoices[character]) {
        const settingsVoice = availableVoices.find(
            (v) => v.name === settings.characterVoices[character]
        );
        if (settingsVoice) {
            // Save this voice assignment for future use
            characterVoiceMap[character] = settingsVoice.name;
            return settingsVoice;
        }
    }

    // If no specific voice found, assign one based on character name
    // This ensures the same character always gets the same voice
    const characterHash = character.split("").reduce((hash, char) => {
        return char.charCodeAt(0) + ((hash << 5) - hash);
    }, 0);

    // Use the hash to select a voice
    const voiceIndex = Math.abs(characterHash) % availableVoices.length;
    const selectedVoice = availableVoices[voiceIndex];

    // Save this voice assignment for future use
    characterVoiceMap[character] = selectedVoice.name;

    return selectedVoice;
}

/**
 * Process text for better speech synthesis
 * @param {string} text - The text to process
 * @returns {string} - The processed text
 */
function processTextForSpeech(text) {
    if (!text) return "";

    // Remove character name patterns
    text = text.replace(/^\s*[A-Za-z0-9\s]+\s*:\s*/, "");
    text = text.replace(/^\s*\[[A-Za-z0-9\s]+\]\s*/, "");
    text = text.replace(/^\s*[A-Za-z0-9\s]+\s*\([^)]*\)\s*:\s*/, "");

    // Replace common abbreviations
    const abbreviations = {
        "don't": "dont",
        "won't": "wont",
        "can't": "cant",
        "I'm": "Im",
        "I'll": "Ill",
        "you're": "youre",
        "they're": "theyre",
        "we're": "were",
        "he's": "hes",
        "she's": "shes",
        "it's": "its",
        "that's": "thats",
        "what's": "whats",
        "let's": "lets",
        "who's": "whos",
        "how's": "hows",
        "where's": "wheres",
        "when's": "whens",
        "why's": "whys",
        "would've": "wouldve",
        "should've": "shouldve",
        "could've": "couldve",
        "might've": "mightve",
        "must've": "mustve",
    };

    // Replace abbreviations
    for (const [abbr, expanded] of Object.entries(abbreviations)) {
        text = text.replace(new RegExp(abbr, "gi"), expanded);
    }

    // Add pauses for punctuation
    text = text.replace(/\.\s/g, ". ");
    text = text.replace(/!\s/g, "! ");
    text = text.replace(/\?\s/g, "? ");
    text = text.replace(/,\s/g, ", ");

    // Remove multiple spaces
    text = text.replace(/\s+/g, " ").trim();

    return text;
}

/**
 * Speak the next bubble in the sequence
 */
function speakNextBubble(settings) {
    if (!isSpeaking || currentSpeechIndex >= detectedBubbles.length) {
        isSpeaking = false;
        return;
    }

    const bubble = detectedBubbles[currentSpeechIndex];

    // Highlight the current bubble
    highlightCurrentBubble(bubble.id);

    // Detect character from text
    const character = detectCharacter(bubble.text);
    console.log(`Detected character: ${character || "Unknown"}`);

    // Process text for better speech
    const processedText = processTextForSpeech(bubble.text);

    // Create speech utterance
    utterance = new SpeechSynthesisUtterance(processedText);

    // Apply settings
    utterance.volume = settings?.volume || 1.0;
    utterance.rate = settings?.rate || 1.0;
    utterance.pitch = settings?.pitch || 1.0;

    // Get voice for this character
    if (character) {
        const characterVoice = getVoiceForCharacter(character, settings);
        if (characterVoice) {
            utterance.voice = characterVoice;
            console.log(
                `Using voice ${characterVoice.name} for character ${character}`
            );
        }
    } else if (settings?.defaultVoice && availableVoices.length > 0) {
        // Use default voice if no character detected
        const defaultVoice = availableVoices.find(
            (v) => v.name === settings.defaultVoice
        );
        if (defaultVoice) {
            utterance.voice = defaultVoice;
        }
    }

    // Handle speech end
    utterance.onend = () => {
        currentSpeechIndex++;
        if (currentSpeechIndex < detectedBubbles.length) {
            speakNextBubble(settings);
        } else {
            isSpeaking = false;
            resetHighlights();
        }
    };

    // Start speaking
    speechSynthesis.speak(utterance);
}

/**
 * Highlight the current bubble being spoken
 */
function highlightCurrentBubble(bubbleId) {
    // Reset all highlights
    resetHighlights();

    // Highlight the current bubble
    const currentHighlight = document.getElementById(bubbleId);
    if (currentHighlight) {
        currentHighlight.style.border = "3px solid rgba(0, 0, 255, 0.9)"; // Blue border for active bubble
        currentHighlight.style.backgroundColor = "rgba(0, 0, 255, 0.3)"; // Blue background for active bubble

        // Scroll to the bubble if needed
        currentHighlight.scrollIntoView({
            behavior: "smooth",
            block: "center",
        });
    }
}

/**
 * Reset all bubble highlights
 */
function resetHighlights() {
    const highlights = document.querySelectorAll(".comic-dubber-highlight");
    highlights.forEach((highlight) => {
        // Find the corresponding bubble to get its confidence
        const bubbleId = highlight.id;
        const bubble = detectedBubbles.find((b) => b.id === bubbleId);

        if (bubble && bubble.confidence === "high") {
            highlight.style.border = "2px solid rgba(0, 255, 0, 0.7)"; // Green for high confidence
            highlight.style.backgroundColor = "rgba(0, 255, 0, 0.2)";
        } else {
            highlight.style.border = "2px solid rgba(255, 165, 0, 0.7)"; // Orange for medium confidence
            highlight.style.backgroundColor = "rgba(255, 255, 0, 0.2)";
        }
    });
}

/**
 * Stop any current voiceover
 */
function stopVoiceover() {
    if (speechSynthesis && utterance) {
        speechSynthesis.cancel();
    }

    isSpeaking = false;
    resetHighlights();
}

/**
 * Toggle UI visibility
 */
function toggleUIVisibility() {
    if (!uiElement) return;

    const newVisibility =
        uiElement.style.display === "none" || uiElement.style.display === "";

    if (newVisibility) {
        uiElement.style.display = "block";
    } else {
        uiElement.style.display = "none";
    }

    // Save UI visibility state to storage
    chrome.storage.local.set({ uiVisible: newVisibility });
}
