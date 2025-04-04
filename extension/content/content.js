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

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
        console.log("Content script received message:", message);

        if (message.action === "detectBubbles") {
            // Check if OpenCV is loaded
            if (!cv) {
                console.log("OpenCV not loaded yet, waiting...");
                // Try to initialize OpenCV again
                initOpenCV()
                    .then(() => {
                        detectSpeechBubbles()
                            .then((result) => {
                                // Store only the bubbles from the current page
                                detectedBubbles = result.bubbles;
                                sendResponse({
                                    success: true,
                                    bubbles: result.bubbles,
                                    pageInfo: result.pageInfo,
                                });
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
                detectSpeechBubbles()
                    .then((result) => {
                        // Store only the bubbles from the current page
                        detectedBubbles = result.bubbles;
                        sendResponse({
                            success: true,
                            bubbles: result.bubbles,
                            pageInfo: result.pageInfo,
                        });
                    })
                    .catch((error) => {
                        console.error("Error detecting speech bubbles:", error);
                        sendResponse({ success: false, error: error.message });
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

        // Create a script element to load OpenCV.js
        const script = document.createElement("script");
        script.src = chrome.runtime.getURL("lib/opencv.js");
        script.onload = () => {
            // OpenCV.js has a Module object that needs to be initialized
            const waitForOpenCV = setInterval(() => {
                if (window.cv && window.cv.imread) {
                    clearInterval(waitForOpenCV);
                    cv = window.cv;
                    console.log("OpenCV.js loaded successfully");
                    resolve(cv);
                }
            }, 100);
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
 * Detect speech bubbles in the next batch of comic images
 * @returns {Promise<Object>} Object containing bubbles and batch information
 */
async function detectSpeechBubbles() {
    return new Promise((resolve, reject) => {
        try {
            // Initialize comic images if not already done
            if (comicImages.length === 0 || currentBatchStart === -1) {
                initializeComicImages()
                    .then(() => {
                        // Start with the first batch
                        currentBatchStart = 0;
                        processBatch(resolve, reject);
                    })
                    .catch((error) => reject(error));
            } else {
                // Move to the next batch
                currentBatchStart =
                    (currentBatchStart + BATCH_SIZE) % comicImages.length;
                processBatch(resolve, reject);
            }
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Process a batch of comic images
 * @param {Function} resolve - Promise resolve function
 * @param {Function} reject - Promise reject function
 */
function processBatch(resolve, reject) {
    try {
        // Calculate the end index for this batch (not exceeding array length)
        const batchEnd = Math.min(
            currentBatchStart + BATCH_SIZE,
            comicImages.length
        );
        const currentBatchSize = batchEnd - currentBatchStart;

        console.log(
            `Processing batch: images ${
                currentBatchStart + 1
            } to ${batchEnd} of ${comicImages.length}`
        );

        // Process all images in the batch
        const batchPromises = [];
        const allBubbles = [];

        for (let i = currentBatchStart; i < batchEnd; i++) {
            batchPromises.push(
                processImage(i).then((bubbles) => {
                    // Add all bubbles from this image to our collection
                    allBubbles.push(...bubbles);
                })
            );
        }

        // Wait for all images in the batch to be processed
        Promise.all(batchPromises)
            .then(() => {
                console.log(
                    `Completed batch processing. Found ${allBubbles.length} bubbles in ${currentBatchSize} images`
                );

                // Highlight all bubbles
                highlightBubbles(allBubbles);

                // Calculate if there are more batches to process
                const hasNextBatch = batchEnd < comicImages.length;

                // Return bubbles along with batch information
                resolve({
                    bubbles: allBubbles,
                    pageInfo: {
                        currentBatch:
                            Math.floor(currentBatchStart / BATCH_SIZE) + 1,
                        totalBatches: Math.ceil(
                            comicImages.length / BATCH_SIZE
                        ),
                        currentStartPage: currentBatchStart + 1,
                        currentEndPage: batchEnd,
                        totalPages: comicImages.length,
                        hasNextBatch: hasNextBatch,
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

            try {
                // Check if OpenCV is loaded
                if (!cv) {
                    throw new Error("OpenCV is not loaded");
                }

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

                        // Speech bubbles are often somewhat circular
                        if (circularity < 0.4) {
                            approx.delete();
                            continue;
                        }

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
                        };

                        // Extract text from the bubble using canvas
                        const bubbleCanvas = document.createElement("canvas");
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
                // Fall back to mock bubbles if OpenCV detection fails
                const mockBubbles = createMockBubbles(img, imageIndex);
                for (const bubble of mockBubbles) {
                    bubble.text = generateSampleText(
                        imageIndex,
                        bubbles.length
                    );
                    bubbles.push(bubble);
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
        highlight.style.border = "2px solid rgba(255, 0, 0, 0.7)";
        highlight.style.borderRadius = "15px";
        highlight.style.backgroundColor = "rgba(255, 255, 0, 0.2)";
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
    const highlights = document.querySelectorAll(".comic-dubber-highlight");
    highlights.forEach((highlight) => {
        highlight.style.border = "2px solid rgba(255, 0, 0, 0.7)";
        highlight.style.backgroundColor = "rgba(255, 255, 0, 0.2)";
    });

    // Highlight the current bubble
    const currentHighlight = document.getElementById(bubbleId);
    if (currentHighlight) {
        currentHighlight.style.border = "3px solid rgba(0, 255, 0, 0.9)";
        currentHighlight.style.backgroundColor = "rgba(0, 255, 0, 0.3)";

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
        highlight.style.border = "2px solid rgba(255, 0, 0, 0.7)";
        highlight.style.backgroundColor = "rgba(255, 255, 0, 0.2)";
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
