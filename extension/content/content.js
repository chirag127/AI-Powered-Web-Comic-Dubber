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
        if (typeof cv === "undefined") {
            throw new Error("OpenCV.js is not available");
        }
        try {
            this.cv = cv; // OpenCV.js instance
            // Test if OpenCV.js is working properly
            const testMat = new this.cv.Mat();
            testMat.delete(); // Clean up test matrix
            console.log("OpenCV.js initialized successfully");
        } catch (error) {
            console.error("Error initializing OpenCV.js:", error);
            if (error.name === "BindingError") {
                throw new Error("OpenCV.js binding error: " + error.message);
            }
            throw error;
        }
    }

    async detectBubbles(image) {
        try {
            if (!this.cv) {
                throw new Error("OpenCV.js is not initialized");
            }

            // Convert image to grayscale
            let src, gray, binary, contours, hierarchy;
            try {
                src = this.cv.imread(image);
                gray = new this.cv.Mat();
                this.cv.cvtColor(src, gray, this.cv.COLOR_RGBA2GRAY);

                // Apply threshold to get binary image
                binary = new this.cv.Mat();
                this.cv.threshold(
                    gray,
                    binary,
                    200,
                    255,
                    this.cv.THRESH_BINARY_INV
                );

                // Find contours
                contours = new this.cv.MatVector();
                hierarchy = new this.cv.Mat();
                this.cv.findContours(
                    binary,
                    contours,
                    hierarchy,
                    this.cv.RETR_EXTERNAL,
                    this.cv.CHAIN_APPROX_SIMPLE
                );
            } catch (error) {
                console.error("Error in OpenCV image processing:", error);
                if (error.name === "BindingError") {
                    throw new Error(
                        "OpenCV.js binding error: " + error.message
                    );
                }
                throw error;
            }

            // Filter contours to find speech bubbles
            let bubbles = [];
            try {
                for (let i = 0; i < contours.size(); ++i) {
                    let contour = contours.get(i);
                    let area = this.cv.contourArea(contour);
                    let perimeter = this.cv.arcLength(contour, true);

                    // Calculate circularity
                    let circularity =
                        (4 * Math.PI * area) / (perimeter * perimeter);

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
            } catch (error) {
                console.error("Error in contour processing:", error);
                throw error;
            } finally {
                // Clean up
                try {
                    if (src) src.delete();
                    if (gray) gray.delete();
                    if (binary) binary.delete();
                    if (contours) contours.delete();
                    if (hierarchy) hierarchy.delete();
                } catch (cleanupError) {
                    console.error("Error during cleanup:", cleanupError);
                }
            }

            return bubbles;
        } catch (error) {
            console.error("Error in detectBubbles:", error);
            throw error;
        }
    }
}

// TextExtractor class for OCR
class TextExtractor {
    constructor() {
        // Check if we're using simplified mode
        this.useSimplifiedMode =
            localStorage.getItem("comicDubber_useSimplifiedMode") === "true";

        // Only check for Tesseract if not in simplified mode
        if (!this.useSimplifiedMode && typeof Tesseract === "undefined") {
            throw new Error("Tesseract.js is not available");
        }

        // Initialize Tesseract worker if not in simplified mode
        if (!this.useSimplifiedMode) {
            this.initWorker();
        } else {
            console.log("Using simplified text extraction (no OCR)");
        }
    }

    async initWorker() {
        try {
            if (typeof Tesseract === "undefined") {
                console.log(
                    "Tesseract.js not available, using simplified text extraction"
                );
                this.useSimplifiedMode = true;
                localStorage.setItem("comicDubber_useSimplifiedMode", "true");
                return;
            }

            // For Tesseract.js v4.x
            if (Tesseract.createWorker) {
                console.log("Using Tesseract.js v4.x API");
                this.worker = await Tesseract.createWorker();
                await this.worker.loadLanguage("eng");
                await this.worker.initialize("eng");
                console.log("Tesseract worker initialized successfully");
            } else {
                // For older versions of Tesseract.js
                console.log("Using legacy Tesseract.js API");
                this.tesseract = Tesseract;
            }
        } catch (error) {
            console.error("Failed to initialize Tesseract worker:", error);
            console.log("Falling back to simplified text extraction");
            this.useSimplifiedMode = true;
            localStorage.setItem("comicDubber_useSimplifiedMode", "true");
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

            // If in simplified mode, return a placeholder text
            if (this.useSimplifiedMode) {
                return "[Text detected in bubble - OCR disabled in simplified mode]";
            }

            // Check if Tesseract is initialized
            if (!this.worker && !this.tesseract) {
                console.warn(
                    "Tesseract not initialized, using placeholder text"
                );
                return "[Text detected in bubble - OCR not available]";
            }

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
                return "[Text detected in bubble - OCR not available]";
            }

            return text || "No text detected";
        } catch (error) {
            console.error("Text extraction failed:", error);
            return `[Text extraction failed: ${error.message}]`;
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
    try {
        if (window.cv && window.Tesseract) {
            console.log("Initializing components...");

            if (!bubbleDetector) {
                bubbleDetector = new BubbleDetector();
                console.log("BubbleDetector initialized");
            }

            if (!textExtractor) {
                textExtractor = new TextExtractor();
                console.log("TextExtractor initialized");
            }

            if (!audioPlayer) {
                audioPlayer = new AudioPlayer();
                console.log("AudioPlayer initialized");
            }

            // Find all images on the page that could be comic panels
            comicImages = Array.from(document.querySelectorAll("img")).filter(
                (img) => {
                    // Filter images that are likely to be comic panels (based on size, etc.)
                    return img.width > 200 && img.height > 200;
                }
            );

            console.log(`Found ${comicImages.length} potential comic images`);
            return true;
        } else {
            console.warn(
                "Libraries not loaded yet, cannot initialize components"
            );
            return false;
        }
    } catch (error) {
        console.error("Error initializing components:", error);
        return false;
    }
}

// Check if components are loaded
function checkComponentsLoaded() {
    try {
        if (window.cv && window.Tesseract) {
            const result = initComponents();
            return result;
        }
        return false;
    } catch (error) {
        console.error("Error checking if components are loaded:", error);
        return false;
    }
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

    // Add status message area
    const statusArea = document.createElement("div");
    statusArea.id = "comic-dubber-status";
    statusArea.style.marginTop = "16px";
    statusArea.style.padding = "8px";
    statusArea.style.backgroundColor = "#f8f9fa";
    statusArea.style.borderRadius = "4px";
    statusArea.style.border = "1px solid #ddd";
    statusArea.style.fontSize = "14px";
    statusArea.style.lineHeight = "1.4";

    // Check if we're on Webtoons or other sites with strict CSP
    const isWebtoons = window.location.hostname.includes("webtoons.com");
    const hasStrictCSP =
        isWebtoons ||
        document.querySelector('meta[http-equiv="Content-Security-Policy"]');

    // Check if simplified mode is active
    const useSimplifiedMode =
        localStorage.getItem("comicDubber_useSimplifiedMode") === "true";

    // Check if Tesseract.js is available
    const tesseractAvailable = typeof Tesseract !== "undefined";

    // Show initial status message
    if (useSimplifiedMode) {
        let statusMessage = "Running in simplified mode";
        if (!tesseractAvailable) {
            statusMessage +=
                " (OCR disabled). Speech bubbles will be detected but text won't be extracted.";
        } else {
            statusMessage +=
                " (without OpenCV). Detection may be less accurate but more compatible with this site.";
        }

        statusArea.textContent = statusMessage;
        statusArea.style.display = "block";
        statusArea.style.backgroundColor = "#e8f5e9";
        statusArea.style.color = "#2e7d32";
        statusArea.style.border = "1px solid #a5d6a7";

        // Add a reset button
        const resetButton = document.createElement("button");
        resetButton.textContent = "Switch to Advanced Mode";
        resetButton.style.marginTop = "8px";
        resetButton.style.padding = "4px 8px";
        resetButton.style.fontSize = "12px";
        resetButton.addEventListener("click", () => {
            localStorage.removeItem("comicDubber_useSimplifiedMode");
            statusArea.textContent =
                "Switched to advanced mode. Please try detecting bubbles again.";
        });
        statusArea.appendChild(document.createElement("br"));
        statusArea.appendChild(resetButton);
    } else if (hasStrictCSP) {
        statusArea.textContent =
            "Warning: This website has security restrictions that may prevent the extension from working properly. Consider trying on XKCD.com or GoComics.com instead.";
        statusArea.style.display = "block";
        statusArea.style.backgroundColor = "#fff8e1";
        statusArea.style.color = "#f57f17";
        statusArea.style.border = "1px solid #ffe082";

        // Add a simplified mode button
        const simplifiedButton = document.createElement("button");
        simplifiedButton.textContent = "Try Simplified Mode";
        simplifiedButton.style.marginTop = "8px";
        simplifiedButton.style.padding = "4px 8px";
        simplifiedButton.style.fontSize = "12px";
        simplifiedButton.addEventListener("click", () => {
            localStorage.setItem("comicDubber_useSimplifiedMode", "true");
            statusArea.textContent =
                "Switched to simplified mode. Please try detecting bubbles again.";
            statusArea.style.backgroundColor = "#e8f5e9";
            statusArea.style.color = "#2e7d32";
            statusArea.style.border = "1px solid #a5d6a7";
        });
        statusArea.appendChild(document.createElement("br"));
        statusArea.appendChild(simplifiedButton);
    } else {
        statusArea.textContent =
            "Ready to detect speech bubbles. Click 'Detect Speech Bubbles' to start.";
        statusArea.style.display = "block";
        statusArea.style.color = "#333";
    }

    container.appendChild(statusArea);

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

    // Function to show status messages
    function showStatus(message, isError = false, isWarning = false) {
        const statusArea = document.getElementById("comic-dubber-status");
        if (statusArea) {
            statusArea.textContent = message;
            statusArea.style.display = "block";

            if (isError) {
                statusArea.style.backgroundColor = "#ffebee";
                statusArea.style.color = "#c62828";
                statusArea.style.border = "1px solid #ef9a9a";
            } else if (isWarning) {
                statusArea.style.backgroundColor = "#fff8e1";
                statusArea.style.color = "#f57f17";
                statusArea.style.border = "1px solid #ffe082";
            } else {
                statusArea.style.backgroundColor = "#f1f8e9";
                statusArea.style.color = "#33691e";
                statusArea.style.border = "1px solid #c5e1a5";
            }

            // Scroll the status area into view
            statusArea.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    }

    // Add event listeners for buttons
    detectButton.addEventListener("click", () => {
        showStatus("Loading libraries and detecting speech bubbles...");
        detectButton.disabled = true;
        detectButton.style.opacity = "0.7";

        // First check if libraries are loaded
        const librariesLoaded =
            typeof cv !== "undefined" && typeof Tesseract !== "undefined";
        if (!librariesLoaded) {
            showStatus("Loading required libraries...", false, true);
        }

        detectBubbles()
            .then((response) => {
                detectButton.disabled = false;
                detectButton.style.opacity = "1";

                if (response && response.success) {
                    // Check if we're in simplified mode without OCR
                    const useSimplifiedMode =
                        localStorage.getItem(
                            "comicDubber_useSimplifiedMode"
                        ) === "true";
                    const tesseractAvailable = typeof Tesseract !== "undefined";
                    const ocrDisabled =
                        useSimplifiedMode && !tesseractAvailable;

                    if (ocrDisabled) {
                        showStatus(
                            `Success! Found ${response.bubbles.length} speech bubbles. OCR is disabled in simplified mode, so placeholder text will be used.`
                        );
                    } else {
                        showStatus(
                            `Success! Found ${response.bubbles.length} speech bubbles with text. You can now play the audio or correct the text below.`
                        );
                    }
                    updateTextCorrectionUI(response.texts);
                } else {
                    // Check if it's a Webtoons or CSP error
                    if (
                        response.error &&
                        response.error.includes("security restrictions")
                    ) {
                        showStatus(
                            `${response.error} Try using the extension on sites like XKCD.com or GoComics.com.`,
                            true
                        );
                    }
                    // Check if it's an OpenCV conflict error
                    else if (
                        response.error &&
                        response.error.includes("already includes OpenCV.js")
                    ) {
                        showStatus(
                            `${response.error} This happens when the website already uses OpenCV.js, causing a conflict.`,
                            true
                        );
                    }
                    // Check if it's a library loading error
                    else if (
                        response.error &&
                        (response.error.includes("libraries") ||
                            response.error.includes("BindingError"))
                    ) {
                        showStatus(
                            `Failed to load required libraries. This may be due to conflicts with the website's JavaScript. Please try on a different comic site like XKCD.com.`,
                            true
                        );
                    } else {
                        showStatus(
                            response.error || "Unknown error occurred",
                            true
                        );
                    }
                }
            })
            .catch((error) => {
                detectButton.disabled = false;
                detectButton.style.opacity = "1";
                showStatus(
                    `Error: ${error.message}. Please refresh the page and try again.`,
                    true
                );
            });
    });

    let isPlaying = false;
    playButton.addEventListener("click", () => {
        if (isPlaying) {
            playAudio({ command: "pause" })
                .then(() => {
                    playButton.textContent = "Play Audio";
                    isPlaying = false;
                    showStatus("Audio playback paused");
                })
                .catch((error) => {
                    showStatus(`Error pausing audio: ${error.message}`, true);
                });
        } else {
            if (texts.length === 0) {
                showStatus(
                    "No text to play. Please detect speech bubbles first.",
                    true
                );
                return;
            }

            showStatus("Playing audio...");
            playAudio({
                command: "play",
                texts: texts,
                voiceSettings: {}, // TODO: Implement voice settings
            })
                .then(() => {
                    playButton.textContent = "Pause Audio";
                    isPlaying = true;
                })
                .catch((error) => {
                    showStatus(`Error playing audio: ${error.message}`, true);
                });
        }
    });

    nextButton.addEventListener("click", () => {
        if (comicImages.length <= 1) {
            showStatus("No more images to navigate to.", true);
            return;
        }

        const result = nextPage();
        if (result.success) {
            isPlaying = false;
            playButton.textContent = "Play Audio";
            clearTextCorrectionUI();
            showStatus(
                `Navigated to image ${currentImageIndex + 1}/${
                    comicImages.length
                }`
            );
        } else {
            showStatus(result.error || "Failed to navigate to next page", true);
        }
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
        // Check if we should use simplified mode (no OpenCV)
        const useSimplifiedMode =
            localStorage.getItem("comicDubber_useSimplifiedMode") === "true";

        // Check if libraries are available
        if (
            !useSimplifiedMode &&
            (typeof cv === "undefined" || typeof Tesseract === "undefined")
        ) {
            console.log("Libraries not available, trying to load them...");
            // Try to load the libraries directly
            try {
                await loadLibraries();
                console.log("Libraries loaded successfully");
                // Wait a moment for libraries to initialize
                await new Promise((resolve) => setTimeout(resolve, 1000));
            } catch (error) {
                console.error("Failed to load libraries:", error);

                // Ask user if they want to try simplified mode
                if (
                    confirm(
                        "The extension couldn't load required libraries for advanced bubble detection. Would you like to try simplified mode instead? (This will use basic image processing but may be less accurate)"
                    )
                ) {
                    localStorage.setItem(
                        "comicDubber_useSimplifiedMode",
                        "true"
                    );
                    return detectBubbles(); // Retry with simplified mode
                } else {
                    return {
                        success: false,
                        error: "Failed to load required libraries. Please refresh the page and try again.",
                    };
                }
            }

            // Verify libraries are available after loading
            if (typeof cv === "undefined" || typeof Tesseract === "undefined") {
                console.error("Libraries still not available after loading");

                // Ask user if they want to try simplified mode
                if (
                    confirm(
                        "The extension couldn't initialize required libraries. Would you like to try simplified mode instead? (This will use basic image processing but may be less accurate)"
                    )
                ) {
                    localStorage.setItem(
                        "comicDubber_useSimplifiedMode",
                        "true"
                    );
                    return detectBubbles(); // Retry with simplified mode
                } else {
                    return {
                        success: false,
                        error: "Failed to initialize libraries. Please try on a different page or refresh and try again.",
                    };
                }
            }
        }

        // We already have the simplified mode value from above, no need to get it again

        // Initialize components if not already initialized
        if (
            !textExtractor ||
            !audioPlayer ||
            (!bubbleDetector && !useSimplifiedMode)
        ) {
            console.log("Components not initialized, initializing now...");
            try {
                // Create components
                if (!useSimplifiedMode && !bubbleDetector) {
                    try {
                        bubbleDetector = new BubbleDetector();
                    } catch (error) {
                        console.error(
                            "Failed to initialize BubbleDetector:",
                            error
                        );
                        if (
                            confirm(
                                "Advanced bubble detection failed. Would you like to try simplified mode instead?"
                            )
                        ) {
                            localStorage.setItem(
                                "comicDubber_useSimplifiedMode",
                                "true"
                            );
                            useSimplifiedMode = true;
                            // Continue with simplified mode
                        } else {
                            return {
                                success: false,
                                error: `Failed to initialize bubble detector: ${error.message}. Please try on a different page.`,
                            };
                        }
                    }
                }

                // Initialize text extractor with error handling
                if (!textExtractor) {
                    try {
                        textExtractor = new TextExtractor();
                    } catch (error) {
                        console.error(
                            "Failed to initialize TextExtractor:",
                            error
                        );
                        if (
                            error.message.includes(
                                "Tesseract.js is not available"
                            )
                        ) {
                            if (
                                confirm(
                                    "Text recognition (OCR) is not available. Would you like to continue in simplified mode without OCR?"
                                )
                            ) {
                                localStorage.setItem(
                                    "comicDubber_useSimplifiedMode",
                                    "true"
                                );
                                useSimplifiedMode = true;
                                // Try again with simplified mode
                                textExtractor = new TextExtractor();
                            } else {
                                return {
                                    success: false,
                                    error: `Failed to initialize text extractor: ${error.message}. Please try on a different page.`,
                                };
                            }
                        } else {
                            return {
                                success: false,
                                error: `Failed to initialize text extractor: ${error.message}. Please refresh the page and try again.`,
                            };
                        }
                    }
                }

                // Initialize audio player
                if (!audioPlayer) audioPlayer = new AudioPlayer();

                console.log("Components initialized successfully");
            } catch (error) {
                console.error("Failed to initialize components:", error);
                return {
                    success: false,
                    error: `Failed to initialize components: ${error.message}. Please refresh the page and try again.`,
                };
            }
        }

        // Check if we're on a comic page
        if (comicImages.length === 0) {
            // Try to find images again
            console.log("Searching for comic images on the page...");

            // Get all images on the page
            const allImages = Array.from(document.querySelectorAll("img"));
            console.log(`Found ${allImages.length} total images on the page`);

            // Filter for potential comic images
            comicImages = allImages.filter((img) => {
                return (
                    img.width > 200 &&
                    img.height > 200 &&
                    img.complete &&
                    img.naturalWidth > 0
                );
            });

            if (comicImages.length === 0) {
                console.error("No comic images found on the page");

                // Check if there are any images at all
                if (allImages.length === 0) {
                    return {
                        success: false,
                        error: "No images found on this page. Please try on a page with comic images.",
                    };
                }

                // Check if images are still loading
                const incompleteImages = allImages.filter(
                    (img) => !img.complete || img.naturalWidth === 0
                );
                if (incompleteImages.length > 0) {
                    return {
                        success: false,
                        error: "Images are still loading. Please wait a moment and try again.",
                    };
                }

                return {
                    success: false,
                    error: "No suitable comic images found on this page. Try on a page with larger comic images.",
                };
            }
            console.log(`Found ${comicImages.length} potential comic images`);
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

        if (useSimplifiedMode) {
            // Use simplified bubble detection (without OpenCV)
            bubbles = await detectBubblesSimplified(image);
        } else {
            // Use advanced bubble detection with OpenCV
            bubbles = await bubbleDetector.detectBubbles(image);
        }

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

// Simplified bubble detection without OpenCV
async function detectBubblesSimplified(image) {
    try {
        console.log("Using simplified bubble detection");

        // Create a canvas to analyze the image
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = image.width;
        canvas.height = image.height;
        ctx.drawImage(image, 0, 0, image.width, image.height);

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Simple approach: look for white areas that might be speech bubbles
        // This is a very basic approach and won't work well for all comics
        const bubbles = [];
        const gridSize = 20; // Divide the image into a grid
        const threshold = 240; // Brightness threshold for white areas

        // Scan the image in a grid pattern
        for (let y = 0; y < canvas.height; y += gridSize) {
            for (let x = 0; x < canvas.width; x += gridSize) {
                // Check if this grid cell is mostly white
                let whitePixels = 0;
                let totalPixels = 0;

                // Sample pixels in this grid cell
                for (
                    let dy = 0;
                    dy < gridSize && y + dy < canvas.height;
                    dy++
                ) {
                    for (
                        let dx = 0;
                        dx < gridSize && x + dx < canvas.width;
                        dx++
                    ) {
                        const pixelIndex =
                            ((y + dy) * canvas.width + (x + dx)) * 4;
                        const r = data[pixelIndex];
                        const g = data[pixelIndex + 1];
                        const b = data[pixelIndex + 2];

                        // Calculate brightness
                        const brightness = (r + g + b) / 3;

                        if (brightness > threshold) {
                            whitePixels++;
                        }
                        totalPixels++;
                    }
                }

                // If this cell is mostly white, consider it part of a bubble
                if (whitePixels / totalPixels > 0.8) {
                    // Check if this cell can be merged with an existing bubble
                    let merged = false;
                    for (const bubble of bubbles) {
                        // If this cell is adjacent to an existing bubble, merge them
                        if (
                            Math.abs(x - (bubble.x + bubble.width)) <
                                gridSize * 2 &&
                            Math.abs(y - (bubble.y + bubble.height)) <
                                gridSize * 2
                        ) {
                            // Expand the bubble to include this cell
                            const newRight = Math.max(
                                bubble.x + bubble.width,
                                x + gridSize
                            );
                            const newBottom = Math.max(
                                bubble.y + bubble.height,
                                y + gridSize
                            );
                            bubble.width = newRight - bubble.x;
                            bubble.height = newBottom - bubble.y;
                            merged = true;
                            break;
                        }
                    }

                    // If not merged, create a new bubble
                    if (!merged) {
                        bubbles.push({
                            x: x,
                            y: y,
                            width: gridSize,
                            height: gridSize,
                        });
                    }
                }
            }
        }

        // Filter out bubbles that are too small
        const filteredBubbles = bubbles.filter(
            (bubble) =>
                bubble.width > gridSize * 2 && bubble.height > gridSize * 2
        );

        console.log(
            `Simplified detection found ${filteredBubbles.length} potential bubbles`
        );
        return filteredBubbles;
    } catch (error) {
        console.error("Error in simplified bubble detection:", error);
        return [];
    }
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

// Load libraries dynamically
function loadLibraries() {
    return new Promise((resolve, reject) => {
        // First, check if libraries are already loaded
        if (typeof cv !== "undefined" && typeof Tesseract !== "undefined") {
            console.log("Libraries already loaded");
            resolve(true);
            return;
        }

        // Check if we're on Webtoons or other sites with strict CSP
        const isWebtoons = window.location.hostname.includes("webtoons.com");
        const hasStrictCSP =
            isWebtoons ||
            document.querySelector(
                'meta[http-equiv="Content-Security-Policy"]'
            );

        if (hasStrictCSP) {
            console.log("Detected site with strict Content Security Policy");
            // For sites with strict CSP, we need to use a different approach
            // Notify the user about the limitation
            reject(
                new Error(
                    "This website has security restrictions that prevent loading required libraries. Please try on a different comic site."
                )
            );
            return;
        }

        // Check if OpenCV.js is already being loaded by the page
        const existingOpenCVScript = document.querySelector(
            'script[src*="opencv.js"]'
        );
        if (existingOpenCVScript) {
            console.log("OpenCV.js is already being loaded by the page");
            reject(
                new Error(
                    "This page already includes OpenCV.js which conflicts with the extension. Please try on a different comic site."
                )
            );
            return;
        }

        // Create a unique ID for our OpenCV instance to avoid conflicts
        window.opencvjs_unique_id =
            "comic_dubber_opencv_" +
            Math.random().toString(36).substring(2, 15);

        // Load Tesseract.js first since it's smaller and less likely to conflict
        const tesseractScript = document.createElement("script");
        tesseractScript.src = chrome.runtime.getURL("lib/tesseract.min.js");
        tesseractScript.type = "text/javascript";
        tesseractScript.onload = function () {
            console.log("Tesseract.js loaded successfully");

            // After Tesseract.js is loaded, load OpenCV.js with error handling
            try {
                const opencvScript = document.createElement("script");
                opencvScript.src = chrome.runtime.getURL("lib/opencv.js");
                opencvScript.type = "text/javascript";
                opencvScript.onerror = function (error) {
                    console.error("Failed to load OpenCV.js:", error);
                    reject(new Error("Failed to load OpenCV.js"));
                };

                // Handle OpenCV.js load completion
                opencvScript.onload = function () {
                    console.log(
                        "OpenCV.js script loaded, waiting for initialization"
                    );

                    // OpenCV.js will call the cv callback when ready
                    window.Module = window.Module || {};
                    window.Module.onRuntimeInitialized = function () {
                        console.log("OpenCV.js runtime initialized");

                        // Wait a moment for everything to stabilize
                        setTimeout(() => {
                            if (
                                typeof cv !== "undefined" &&
                                typeof Tesseract !== "undefined"
                            ) {
                                console.log(
                                    "Libraries initialized successfully"
                                );
                                resolve(true);
                            } else {
                                console.error("Libraries failed to initialize");
                                reject(
                                    new Error("Libraries failed to initialize")
                                );
                            }
                        }, 1000);
                    };
                };

                document.head.appendChild(opencvScript);
            } catch (error) {
                console.error("Error during OpenCV.js loading:", error);
                reject(
                    new Error(
                        "Error during OpenCV.js loading: " + error.message
                    )
                );
            }
        };

        tesseractScript.onerror = function (error) {
            console.error("Failed to load Tesseract.js:", error);
            reject(new Error("Failed to load Tesseract.js"));
        };

        document.head.appendChild(tesseractScript);
    });
}

// Check if libraries are available
function checkLibraries() {
    return new Promise((resolve, reject) => {
        // Check if OpenCV.js is loaded
        if (typeof cv !== "undefined") {
            console.log("OpenCV.js is available");

            // Check if Tesseract.js is loaded
            if (typeof Tesseract !== "undefined") {
                console.log("Tesseract.js is available");
                resolve(true);
            } else {
                console.error("Tesseract.js is not available");
                reject(new Error("Tesseract.js is not available"));
            }
        } else {
            console.error("OpenCV.js is not available");
            reject(new Error("OpenCV.js is not available"));
        }
    });
}

// Initialize the extension
async function initializeExtension() {
    try {
        // First, try to load the libraries
        await loadLibraries();
        console.log("Libraries loaded, initializing components...");

        // Wait a moment for libraries to initialize
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Verify libraries are available
        await checkLibraries();
        console.log("Libraries verified, initializing components...");

        // Initialize components
        const result = initComponents();

        if (result) {
            console.log("Extension initialized successfully");
            return true;
        } else {
            console.error("Failed to initialize components");
            return false;
        }
    } catch (error) {
        console.error("Failed to initialize extension:", error);
        return false;
    }
}

// Try to initialize components when the page loads
if (document.readyState === "loading") {
    window.addEventListener("load", initializeExtension);
} else {
    // Page already loaded
    initializeExtension();
}
