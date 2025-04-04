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

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
        console.log("Content script received message:", message);

        if (message.action === "detectBubbles") {
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

// Store comic images and current batch information
let comicImages = [];
let currentBatchStart = -1;
const BATCH_SIZE = 10; // Process 10 pages at a time

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

            // Get image data for processing (would be used with OpenCV.js in a real implementation)
            // const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            // For demonstration, we'll create mock bubbles
            // In a real implementation, we would use OpenCV.js to detect actual bubbles
            const mockBubbles = createMockBubbles(img, imageIndex);

            const bubbles = [];

            // Extract text from each bubble using Tesseract.js
            for (const bubble of mockBubbles) {
                try {
                    // In a real implementation, we would crop the bubble area and use Tesseract
                    // For now, we'll use mock text
                    bubble.text =
                        bubble.mockText || "Sample text in speech bubble";
                    bubbles.push(bubble);
                } catch (error) {
                    console.error("Error extracting text from bubble:", error);
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

        // Mock text for demonstration
        const mockTexts = [
            "Hey there! What's going on?",
            "I can't believe this is happening!",
            "We need to find a way out of here.",
            "Did you see that? It was amazing!",
            "I've been waiting for this moment.",
            "This doesn't look good...",
            "Follow me, I know the way!",
        ];

        mockBubbles.push({
            id: `bubble-${imgIndex}-${i}`,
            imgElement: img,
            rect: {
                left,
                top,
                width: bubbleWidth,
                height: bubbleHeight,
            },
            mockText: mockTexts[Math.floor(Math.random() * mockTexts.length)],
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

    // Create speech utterance
    utterance = new SpeechSynthesisUtterance(bubble.text);

    // Apply settings
    utterance.volume = settings?.volume || 1.0;
    utterance.rate = settings?.rate || 1.0;
    utterance.pitch = settings?.pitch || 1.0;

    // Get available voices
    const voices = speechSynthesis.getVoices();

    // Try to find a character-specific voice
    let characterVoice = null;
    if (settings?.characterVoices) {
        // In a real implementation, we would detect characters based on text patterns
        // For now, we'll use a random voice for demonstration
        const voiceKeys = Object.keys(settings.characterVoices);
        if (voiceKeys.length > 0) {
            const randomVoiceKey =
                voiceKeys[currentSpeechIndex % voiceKeys.length];
            characterVoice = settings.characterVoices[randomVoiceKey];
        }
    }

    // Set the voice
    if (characterVoice && voices.length > 0) {
        const voice = voices.find((v) => v.name === characterVoice);
        if (voice) {
            utterance.voice = voice;
        }
    } else if (settings?.defaultVoice && voices.length > 0) {
        const voice = voices.find((v) => v.name === settings.defaultVoice);
        if (voice) {
            utterance.voice = voice;
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
