# AI-Powered Web Comic Dubber

A browser extension that detects speech bubbles in web comics and generates AI-based voiceovers for the dialogue.

## Features

- Speech bubble detection using computer vision (OpenCV.js)
- Text extraction with OCR (Tesseract.js)
- AI voice generation for detected dialogue using Web Speech API
- Draggable UI with text correction capabilities
- Page-by-page processing

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the `extension` directory

## Usage

1. Navigate to a web comic page (e.g., [XKCD](https://xkcd.com/), [Penny Arcade](https://www.penny-arcade.com/), etc.)
2. Click the extension icon to open the draggable UI
3. Click "Detect Speech Bubbles" to analyze the current page/panel
4. The extension will highlight detected speech bubbles and extract text
5. You can manually correct any OCR errors in the text correction section
6. Click "Play Audio" to listen to the dialogue
7. Click "Next Page" to process additional pages/panels

## Troubleshooting

If the extension doesn't work as expected:

1. Check the browser console for error messages (F12 > Console)
2. Make sure you're on a page with comic images
3. Try refreshing the page and clicking the extension icon again
4. If speech bubbles aren't detected, try on a different comic with clearer speech bubbles

## Known Limitations

- Speech bubble detection may not work perfectly on all comics due to varying art styles
- OCR accuracy depends on the font and clarity of the text
- Web Speech API has limited voice options

## License

This project is licensed under the MIT License.
