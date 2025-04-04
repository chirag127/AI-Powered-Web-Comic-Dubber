# AI-Powered Web Comic Dubber - Browser Extension

This is the browser extension component of the AI-Powered Web Comic Dubber project. It detects speech bubbles in web comics, extracts text using OCR, and generates AI-based voiceovers for the dialogue.

## Features

- Speech bubble detection using computer vision (OpenCV.js)
- Text extraction with OCR (Tesseract.js)
- AI voice generation (ResponsiveVoice)
- Character voice customization
- Text highlighting during playback

## Directory Structure

- `manifest.json` - Extension configuration
- `popup/` - Extension popup UI
  - `popup.html` - Popup HTML
  - `popup.css` - Popup styles
  - `popup.js` - Popup functionality
  - `images/` - Icons and images
- `content/` - Content scripts for bubble detection and playback
  - `content.js` - Main content script
  - `bubble-detector.js` - Speech bubble detection
  - `ocr-processor.js` - OCR text extraction
  - `voice-player.js` - Voice playback
  - `content.css` - Content styles
- `background/` - Background scripts for API communication
  - `background.js` - Main background script
- `lib/` - Shared libraries and utilities
  - `tesseract.min.js` - Tesseract.js library
  - `opencv.js` - OpenCV.js library
  - `responsive-voice.js` - ResponsiveVoice library

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top-right corner
3. Click "Load unpacked" and select the `extension` directory

## Usage

1. Navigate to a web comic page
2. Click the extension icon to open the popup
3. Click "Detect Speech Bubbles" to analyze the page
4. Use the playback controls to listen to the dialogue
5. Customize character voices in the settings

## Development

To modify or enhance the extension:

1. Edit the relevant files in the `popup/`, `content/`, or `background/` directories
2. Reload the extension in Chrome to see your changes

## Dependencies

- [Tesseract.js](https://github.com/naptha/tesseract.js) - OCR engine
- [OpenCV.js](https://docs.opencv.org/3.4/d5/d10/tutorial_js_root.html) - Computer vision
- [ResponsiveVoice](https://responsivevoice.org/) - Text-to-speech
