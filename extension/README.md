# AI-Powered Web Comic Dubber - Browser Extension

This browser extension detects speech bubbles in web comics, extracts text using OCR, and generates AI-based voiceovers for the dialogue. Users can customize voices for different characters, providing an immersive and dynamic comic-reading experience.

## Features

-   Speech bubble detection using computer vision
-   Text extraction with OCR
-   AI voice generation for detected dialogue using Web Speech API
-   Character voice customization with preferences saved using Chrome Storage API
-   Seamless browser extension experience

## Installation

### Manual Installation

1. Download the required libraries:

    - Download [Tesseract.js](https://github.com/naptha/tesseract.js/tree/master/dist) and save as `lib/tesseract.min.js`
    - Download [OpenCV.js](https://docs.opencv.org/3.4.0/opencv.js) and save as `lib/opencv.js`

2. Create icon files in `popup/images/` (icon16.png, icon48.png, icon128.png)

    - You can use the included `generate_icons.html` file to create these icons

3. Open Chrome and navigate to `chrome://extensions/`

4. Enable "Developer mode" in the top-right corner

5. Click "Load unpacked" and select this directory

## Usage

1. Navigate to a web comic page (e.g., [XKCD](https://xkcd.com/), [Penny Arcade](https://www.penny-arcade.com/), etc.)
2. Click the extension icon to open the popup
3. Click "Detect Speech Bubbles" to analyze the first batch of pages/panels (10 at a time)
4. The extension will highlight detected speech bubbles and extract text
5. Click "Next Batch" to process additional batches of pages/panels
6. Use the playback controls to listen to the dialogue from the current batch
7. Customize character voices in the settings panel
8. You can manually correct any OCR errors in the text correction section

## Structure

-   `manifest.json` - Extension configuration
-   `popup/` - Extension popup UI
-   `content/` - Content scripts for bubble detection and playback
-   `background/` - Background scripts for managing extension state
-   `lib/` - Shared libraries and utilities

## Development

To modify or enhance the extension:

1. Edit the relevant files in the appropriate directories
2. Reload the extension in Chrome by clicking the refresh icon on the extension card
3. Test your changes on web comic pages

## License

MIT
