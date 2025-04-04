// Main content script that integrates all components and creates a draggable UI

// Global variables
let bubbleDetector = null;
let textExtractor = null;
let audioPlayer = null;
let comicImages = [];
let currentImageIndex = 0;
let bubbles = [];
let texts = [];
let highlightElements = [];
let uiContainer = null;

// BubbleDetector class for speech bubble detection
class BubbleDetector {
    constructor() {
        this.cv = window.cv; // OpenCV.js instance
    }

    async detectBubbles(image) {
        // Convert image to grayscale
        let src = this.cv.imread(image);
        let gray = new this.cv.Mat();
        this.cv.cvtColor(src, gray, this.cv.COLOR_RGBA2GRAY);

        // Apply threshold to get binary image
        let binary = new this.cv.Mat();
        this.cv.threshold(gray, binary, 200, 255, this.cv.THRESH_BINARY_INV);

        // Find contours
        let contours = new this.cv.MatVector();
        let hierarchy = new this.cv.Mat();
        this.cv.findContours(
            binary,
            contours,
            hierarchy,
            this.cv.RETR_EXTERNAL,
            this.cv.CHAIN_APPROX_SIMPLE
        );

        // Filter contours to find speech bubbles
        let bubbles = [];
        for (let i = 0; i < contours.size(); ++i) {
            let contour = contours.get(i);
            let area = this.cv.contourArea(contour);
            let perimeter = this.cv.arcLength(contour, true);

            // Calculate circularity
            let circularity = (4 * Math.PI * area) / (perimeter * perimeter);

            // Filter based on area and circularity
            if (area > 1000 && circularity > 0.2) {
                let rect = this.cv.boundingRect(contour);
                bubbles.push({
                    x: rect.x,
                    y: rect.y,
                    width: rect.width,
                    height: rect.height,
                    contour: contour,
                });
            }
        }

        // Clean up
        src.delete();
        gray.delete();
        binary.delete();
        contours.delete();
        hierarchy.delete();

        return bubbles;
    }
}

// TextExtractor class for OCR
class TextExtractor {
    constructor() {
        // Initialize Tesseract worker
        this.initWorker();
    }

    async initWorker() {
        try {
            if (window.Tesseract) {
                // For Tesseract.js v4.x
                if (window.Tesseract.createWorker) {
                    this.worker = await window.Tesseract.createWorker();
                    await this.worker.loadLanguage("eng");
                    await this.worker.initialize("eng");
                    console.log("Tesseract worker initialized successfully");
                } else {
                    // For older versions of Tesseract.js
                    this.tesseract = window.Tesseract;
                    console.log("Using legacy Tesseract.js API");
                }
            } else {
                console.error("Tesseract.js not found");
            }
        } catch (error) {
            console.error("Failed to initialize Tesseract worker:", error);
        }
    }

    async extractText(image, bubble) {
        try {
            // Create a canvas to crop the bubble area
            let canvas = document.createElement("canvas");
            let ctx = canvas.getContext("2d");
            canvas.width = bubble.width;
            canvas.height = bubble.height;

            // Draw the cropped image
            ctx.drawImage(
                image,
                bubble.x,
                bubble.y,
                bubble.width,
                bubble.height,
                0,
                0,
                bubble.width,
                bubble.height
            );

            // Extract text using Tesseract.js
            let text = "";

            if (this.worker) {
                // For Tesseract.js v4.x
                const { data } = await this.worker.recognize(canvas);
                text = data.text.trim();
            } else if (this.tesseract) {
                // For older versions of Tesseract.js
                const result = await this.tesseract.recognize(canvas, {
                    lang: "eng",
                });
                text = result.data.text.trim();
            } else {
                throw new Error("Tesseract not initialized");
            }

            return text;
        } catch (error) {
            console.error("Text extraction failed:", error);
            return "Text extraction failed";
        }
    }
}

// AudioPlayer class for text-to-speech
class AudioPlayer {
    constructor() {
        this.synth = window.speechSynthesis;
        this.voices = [];
        this.currentUtterance = null;

        // Load available voices
        this.loadVoices();

        // Handle voice changes
        speechSynthesis.onvoiceschanged = () => {
            this.loadVoices();
        };
    }

    loadVoices() {
        this.voices = this.synth.getVoices();
    }

    speak(text, voiceIndex = 0, rate = 1, pitch = 1) {
        // Cancel any ongoing speech
        this.stop();

        // Create a new utterance
        const utterance = new SpeechSynthesisUtterance(text);

        // Set voice and parameters
        utterance.voice = this.voices[voiceIndex];
        utterance.rate = rate;
        utterance.pitch = pitch;

        // Store current utterance
        this.currentUtterance = utterance;

        // Speak
        this.synth.speak(utterance);

        return new Promise((resolve) => {
            utterance.onend = resolve;
        });
    }

    stop() {
        this.synth.cancel();
        this.currentUtterance = null;
    }

    pause() {
        this.synth.pause();
    }

    resume() {
        this.synth.resume();
    }

    getVoices() {
        return this.voices;
    }
}

// Initialize when OpenCV and Tesseract are loaded
function initComponents() {
    if (window.cv && window.Tesseract && !bubbleDetector) {
        bubbleDetector = new BubbleDetector();
        textExtractor = new TextExtractor();
        audioPlayer = new AudioPlayer();

        // Find all images on the page that could be comic panels
        comicImages = Array.from(document.querySelectorAll("img")).filter(
            (img) => {
                // Filter images that are likely to be comic panels (based on size, etc.)
                return img.width > 200 && img.height > 200;
            }
        );
    }
}

// Check if components are loaded
function checkComponentsLoaded() {
    if (window.cv && window.Tesseract) {
        initComponents();
        return true;
    }
    return false;
}

// Create a draggable UI element for the extension
function createDraggableUI() {
    // Create the main container
    const container = document.createElement("div");
    container.id = "comic-dubber-container";
    container.style.position = "fixed";
    container.style.top = "20px";
    container.style.right = "20px";
    container.style.width = "300px";
    container.style.backgroundColor = "white";
    container.style.border = "1px solid #ccc";
    container.style.borderRadius = "4px";
    container.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.2)";
    container.style.zIndex = "10000";
    container.style.padding = "16px";
    container.style.resize = "both";
    container.style.overflow = "auto";
    container.style.minWidth = "200px";
    container.style.minHeight = "200px";
    container.style.maxWidth = "500px";
    container.style.maxHeight = "80vh";

    // Add header with title and close button
    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.alignItems = "center";
    header.style.marginBottom = "16px";
    header.style.cursor = "move";

    const title = document.createElement("h2");
    title.textContent = "Web Comic Dubber";
    title.style.margin = "0";

    const closeButton = document.createElement("button");
    closeButton.textContent = "✕";
    closeButton.style.background = "none";
    closeButton.style.border = "none";
    closeButton.style.cursor = "pointer";
    closeButton.style.fontSize = "16px";
    closeButton.addEventListener("click", () => {
        document.body.removeChild(container);
        uiContainer = null;
    });

    header.appendChild(title);
    header.appendChild(closeButton);
    container.appendChild(header);

    // Add controls
    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.gap = "8px";
    controls.style.marginBottom = "16px";

    const detectButton = document.createElement("button");
    detectButton.textContent = "Detect Bubbles";
    detectButton.style.padding = "8px 16px";
    detectButton.style.backgroundColor = "#4285f4";
    detectButton.style.color = "white";
    detectButton.style.border = "none";
    detectButton.style.borderRadius = "4px";
    detectButton.style.cursor = "pointer";

    const playButton = document.createElement("button");
    playButton.textContent = "Play Audio";
    playButton.style.padding = "8px 16px";
    playButton.style.backgroundColor = "#4285f4";
    playButton.style.color = "white";
    playButton.style.border = "none";
    playButton.style.borderRadius = "4px";
    playButton.style.cursor = "pointer";

    const nextButton = document.createElement("button");
    nextButton.textContent = "Next Page";
    nextButton.style.padding = "8px 16px";
    nextButton.style.backgroundColor = "#4285f4";
    nextButton.style.color = "white";
    nextButton.style.border = "none";
    nextButton.style.borderRadius = "4px";
    nextButton.style.cursor = "pointer";

    controls.appendChild(detectButton);
    controls.appendChild(playButton);
    controls.appendChild(nextButton);
    container.appendChild(controls);

    // Add text correction area
    const textCorrection = document.createElement("div");
    textCorrection.id = "comic-dubber-text-correction";
    textCorrection.style.marginTop = "16px";

    const textCorrectionTitle = document.createElement("h3");
    textCorrectionTitle.textContent = "Text Correction";
    textCorrectionTitle.style.margin = "0 0 8px 0";

    textCorrection.appendChild(textCorrectionTitle);
    container.appendChild(textCorrection);

    // Make the container draggable
    let isDragging = false;
    let offsetX, offsetY;

    header.addEventListener("mousedown", (e) => {
        isDragging = true;
        offsetX = e.clientX - container.getBoundingClientRect().left;
        offsetY = e.clientY - container.getBoundingClientRect().top;
    });

    document.addEventListener("mousemove", (e) => {
        if (isDragging) {
            container.style.left = e.clientX - offsetX + "px";
            container.style.top = e.clientY - offsetY + "px";
            container.style.right = "auto";
        }
    });

    document.addEventListener("mouseup", () => {
        isDragging = false;
    });

    // Add event listeners for buttons
    detectButton.addEventListener("click", () => {
        detectBubbles().then((response) => {
            if (response && response.success) {
                updateTextCorrectionUI(response.texts);
            }
        });
    });

    let isPlaying = false;
    playButton.addEventListener("click", () => {
        if (isPlaying) {
            playAudio({ command: "pause" });
            playButton.textContent = "Play Audio";
            isPlaying = false;
        } else {
            playAudio({
                command: "play",
                texts: texts,
                voiceSettings: {}, // TODO: Implement voice settings
            });
            playButton.textContent = "Pause Audio";
            isPlaying = true;
        }
    });

    nextButton.addEventListener("click", () => {
        nextPage();
        isPlaying = false;
        playButton.textContent = "Play Audio";
        clearTextCorrectionUI();
    });

    // Add to the page
    document.body.appendChild(container);
    uiContainer = container;

    return container;
}

// Update the text correction UI with detected texts
function updateTextCorrectionUI(detectedTexts) {
    if (!uiContainer) return;

    const textCorrectionDiv = document.getElementById(
        "comic-dubber-text-correction"
    );
    textCorrectionDiv.innerHTML = "<h3>Text Correction</h3>";

    detectedTexts.forEach((text, index) => {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.dataset.index = index;
        textArea.style.width = "100%";
        textArea.style.marginBottom = "8px";
        textArea.style.padding = "8px";
        textArea.style.border = "1px solid #ccc";
        textArea.style.borderRadius = "4px";
        textArea.addEventListener("change", (e) => {
            texts[index] = e.target.value;
        });

        textCorrectionDiv.appendChild(textArea);
    });
}

// Clear the text correction UI
function clearTextCorrectionUI() {
    if (!uiContainer) return;

    const textCorrectionDiv = document.getElementById(
        "comic-dubber-text-correction"
    );
    textCorrectionDiv.innerHTML = "<h3>Text Correction</h3>";
}

// Detect speech bubbles in the current image
async function detectBubbles() {
    try {
        if (!window.cv || !window.Tesseract) {
            console.log("Libraries not loaded yet, initializing extension...");
            await initializeExtension();
        }

        if (!bubbleDetector || !textExtractor) {
            console.error("Components not initialized");
            return {
                success: false,
                error: "Components not initialized. Please try again.",
            };
        }

        if (comicImages.length === 0) {
            // Try to find images again
            comicImages = Array.from(document.querySelectorAll("img")).filter(
                (img) => {
                    return img.width > 200 && img.height > 200;
                }
            );

            if (comicImages.length === 0) {
                console.error("No comic images found on the page");
                return {
                    success: false,
                    error: "No comic images found on the page. Try on a page with comic images.",
                };
            }
        }

        // Get the current image
        const image = comicImages[currentImageIndex];
        console.log(
            `Processing image ${currentImageIndex + 1}/${comicImages.length}:`,
            image
        );

        // Clear previous highlights
        clearHighlights();

        // Detect bubbles
        console.log("Detecting speech bubbles...");
        bubbles = await bubbleDetector.detectBubbles(image);
        console.log(`Found ${bubbles.length} potential speech bubbles`);

        if (bubbles.length === 0) {
            return {
                success: false,
                error: "No speech bubbles detected. Try adjusting the image or try another comic.",
            };
        }

        // Extract text from each bubble
        console.log("Extracting text from bubbles...");
        texts = [];
        for (const bubble of bubbles) {
            const text = await textExtractor.extractText(image, bubble);
            texts.push(text);

            // Highlight the bubble
            highlightBubble(image, bubble);
        }

        console.log("Text extraction complete:", texts);
        return { success: true, bubbles, texts };
    } catch (error) {
        console.error("Error detecting bubbles:", error);
        return {
            success: false,
            error: `Error: ${error.message}. Please try again.`,
        };
    }
}

// Highlight a speech bubble on the page
function highlightBubble(image, bubble) {
    const highlight = document.createElement("div");
    highlight.style.position = "absolute";
    highlight.style.left = image.offsetLeft + bubble.x + "px";
    highlight.style.top = image.offsetTop + bubble.y + "px";
    highlight.style.width = bubble.width + "px";
    highlight.style.height = bubble.height + "px";
    highlight.style.border = "2px solid red";
    highlight.style.backgroundColor = "rgba(255, 0, 0, 0.1)";
    highlight.style.zIndex = "9999";

    document.body.appendChild(highlight);
    highlightElements.push(highlight);
}

// Clear all bubble highlights
function clearHighlights() {
    for (const highlight of highlightElements) {
        document.body.removeChild(highlight);
    }
    highlightElements = [];
}

// Play audio for the detected text
async function playAudio(data) {
    if (!audioPlayer) {
        return { success: false, error: "Audio player not initialized" };
    }

    if (data.command === "play") {
        // Play each text in sequence
        for (let i = 0; i < data.texts.length; i++) {
            // Highlight the current bubble
            clearHighlights();
            highlightBubble(comicImages[currentImageIndex], bubbles[i]);

            // Get voice settings for this text
            const voiceSettings = data.voiceSettings[i] || {};

            // Speak the text
            await audioPlayer.speak(
                data.texts[i],
                voiceSettings.voiceIndex || 0,
                voiceSettings.rate || 1,
                voiceSettings.pitch || 1
            );
        }

        return { success: true };
    } else if (data.command === "pause") {
        audioPlayer.pause();
        return { success: true };
    } else if (data.command === "resume") {
        audioPlayer.resume();
        return { success: true };
    } else if (data.command === "stop") {
        audioPlayer.stop();
        clearHighlights();
        return { success: true };
    }

    return { success: false, error: "Unknown command" };
}

// Navigate to the next page/panel
function nextPage() {
    // Stop any ongoing audio
    if (audioPlayer) {
        audioPlayer.stop();
    }

    // Clear highlights
    clearHighlights();

    // Move to the next image
    currentImageIndex = (currentImageIndex + 1) % comicImages.length;

    return { success: true };
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === "toggleUI") {
        try {
            if (uiContainer) {
                document.body.removeChild(uiContainer);
                uiContainer = null;
            } else {
                createDraggableUI();
            }
            sendResponse({ success: true });
        } catch (error) {
            console.error("Error handling toggleUI message:", error);
            sendResponse({ success: false, error: error.message });
        }
    }
    return true; // Indicates we'll respond asynchronously
});

// Load required libraries
function loadLibraries() {
    return new Promise((resolve, reject) => {
        // Load OpenCV.js
        const opencvScript = document.createElement("script");
        opencvScript.src = chrome.runtime.getURL("lib/opencv.js");
        opencvScript.onload = () => {
            console.log("OpenCV.js loaded successfully");
            // Load Tesseract.js after OpenCV.js is loaded
            const tesseractScript = document.createElement("script");
            tesseractScript.src = chrome.runtime.getURL("lib/tesseract.min.js");
            tesseractScript.onload = () => {
                console.log("Tesseract.js loaded successfully");
                resolve();
            };
            tesseractScript.onerror = (error) => {
                console.error("Failed to load Tesseract.js:", error);
                reject(error);
            };
            document.head.appendChild(tesseractScript);
        };
        opencvScript.onerror = (error) => {
            console.error("Failed to load OpenCV.js:", error);
            reject(error);
        };
        document.head.appendChild(opencvScript);
    });
}

// Initialize the extension
async function initializeExtension() {
    try {
        // Load libraries
        await loadLibraries();
        console.log("Libraries loaded, initializing components...");

        // Wait a moment for libraries to initialize
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Initialize components
        initComponents();

        console.log("Extension initialized successfully");
    } catch (error) {
        console.error("Failed to initialize extension:", error);
    }
}

// Try to initialize components when the page loads
if (document.readyState === "loading") {
    window.addEventListener("load", initializeExtension);
} else {
    // Page already loaded
    initializeExtension();
}
