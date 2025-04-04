# AI-Powered Web Comic Dubber

A browser extension that detects speech bubbles in web comics and generates AI-based voiceovers for the dialogue. Users can customize voices for different characters, providing an immersive and dynamic comic-reading experience.

## Features

-   Speech bubble detection using computer vision
-   Text extraction with OCR
-   AI voice generation for detected dialogue using Web Speech API
-   Character voice customization
-   Seamless browser extension experience

## Project Structure

-   `extension/` - Browser extension code
    -   `manifest.json` - Extension configuration
    -   `popup/` - Extension popup UI
    -   `content/` - Content scripts for bubble detection and playback
    -   `background/` - Background scripts for API communication
    -   `lib/` - Shared libraries and utilities

## Setup and Installation

### Extension Setup

1. Download the required libraries:

    - Download [Tesseract.js](https://github.com/naptha/tesseract.js/tree/master/dist) and save as `extension/lib/tesseract.min.js`
    - Download [OpenCV.js](https://docs.opencv.org/3.4.0/opencv.js) and save as `extension/lib/opencv.js`

2. Create icon files in `extension/popup/images/` (icon16.png, icon48.png, icon128.png)

    - You can use the included `extension/generate_icons.html` file to create these icons

3. Open Chrome and navigate to `chrome://extensions/`

4. Enable "Developer mode" in the top-right corner

5. Click "Load unpacked" and select the `extension` directory

## Usage

1. Navigate to a web comic page (e.g., [XKCD](https://xkcd.com/), [Penny Arcade](https://www.penny-arcade.com/), etc.)
2. Click the extension icon to open the popup
3. Click "Detect Speech Bubbles" to analyze the page
4. The extension will highlight detected speech bubbles and extract text
5. Use the playback controls to listen to the dialogue
6. Customize character voices in the settings panel
7. You can manually correct any OCR errors in the text correction section

## Technologies Used

-   JavaScript, HTML, CSS
-   Computer Vision: OpenCV.js for bubble detection
-   OCR: Tesseract.js for text extraction
-   Voice Synthesis: Web Speech API for text-to-speech
-   Chrome Storage API for saving preferences

## How It Works

1. **Speech Bubble Detection**: The extension uses OpenCV.js to analyze the images on the page and detect potential speech bubbles based on their shape, size, and other characteristics.

2. **Text Extraction**: Once speech bubbles are detected, Tesseract.js is used to perform OCR on each bubble to extract the text.

3. **Character Recognition**: The extension attempts to identify different characters based on text patterns (e.g., "Character: Text") and assigns voices accordingly.

4. **Voice Synthesis**: Web Speech API is used to convert the extracted text to speech with different voices for different characters.

5. **Playback**: The extension plays the generated audio while highlighting the corresponding speech bubbles on the page.

## Limitations

-   Speech bubble detection may not work perfectly on all comics due to varying art styles
-   OCR accuracy depends on the font and clarity of the text
-   Character detection is basic and may require manual assignment
-   Web Speech API has limited voice options compared to premium services

## Future Enhancements

-   Improved speech bubble detection using machine learning
-   Better character recognition and voice assignment
-   Support for more languages
-   Offline mode with locally cached voices
-   Mobile app version

## License

This project is licensed under the MIT License - see the LICENSE file for details.
