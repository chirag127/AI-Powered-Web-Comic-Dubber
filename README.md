# AI-Powered Web Comic Dubber

A browser extension that detects speech bubbles in web comics and generates AI-based voiceovers for the dialogue. Users can customize voices for different characters, providing an immersive and dynamic comic-reading experience.

## Features

-   Speech bubble detection using computer vision
-   Text extraction with OCR
-   AI voice generation for detected dialogue using Web Speech API
-   Character voice customization
-   Seamless browser extension experience
-   Simplified mode for compatibility with more websites

## Project Structure

-   `extension/` - Browser extension code
    -   `manifest.json` - Extension configuration
    -   `popup/` - Extension popup UI
    -   `content/` - Content scripts for bubble detection and playback
    -   `background/` - Background scripts for API communication
    -   `lib/` - Shared libraries and utilities

## Setup and Installation

### Extension Setup

1. Clone this repository or download the source code

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" in the top-right corner

4. Click "Load unpacked" and select the `extension` directory from this repository

## Usage

1. Navigate to a web comic page (e.g., [XKCD](https://xkcd.com/), [GoComics](https://www.gocomics.com/), [Penny Arcade](https://www.penny-arcade.com/), etc.)
2. Click the extension icon to open the draggable UI
3. Click "Detect Speech Bubbles" to analyze the current page/panel
4. The extension will highlight detected speech bubbles and extract text
5. You can manually correct any OCR errors in the text correction section
6. Click "Play Audio" to listen to the dialogue
7. Click "Next Page" to process additional pages/panels

## Compatible Websites

The extension works best on comic websites with less restrictive security policies. Recommended sites include:

-   [XKCD](https://xkcd.com/)
-   [GoComics](https://www.gocomics.com/)
-   [Penny Arcade](https://www.penny-arcade.com/)
-   [Dilbert](https://dilbert.com/)

**Note**: Some websites like Webtoons.com have strict security policies that prevent the extension from loading required libraries. This is a technical limitation and not a bug in the extension.

## Troubleshooting

If you encounter issues with the extension, please refer to the [Troubleshooting Guide](extension/TROUBLESHOOTING.md) for solutions to common problems.

### Common Issues

-   **"Failed to load required libraries"**: This may occur due to browser security settings or slow internet connections. Try refreshing the page or using the extension on a different website.
-   **"No comic images found"**: Make sure you're on a page with comic images and that they're fully loaded.
-   **"No speech bubbles detected"**: Try on a comic with clearer, more defined speech bubbles.

## Technologies Used

-   JavaScript, HTML, CSS
-   OCR: Google Gemini 2.0 Flash API (simulated in the current version)
-   Voice Synthesis: Web Speech API for text-to-speech
-   Chrome Storage API for saving preferences

## How It Works

1. **Comic Image Detection**: The extension scans the page for potential comic images based on their size.

2. **Speech Bubble Detection**: When you click "Detect Speech Bubbles" or the "Dub This Comic" overlay button, the extension analyzes the images.

3. **Text Extraction**: The extension extracts text from the speech bubbles using OCR technology.

4. **Character Recognition**: The extension attempts to identify different characters based on the dialogue context and assigns voices accordingly.

5. **Voice Synthesis**: Web Speech API is used to convert the extracted text to speech with different voices for different characters.

6. **Playback**: The extension plays the generated audio while highlighting the corresponding speech bubbles on the page.

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
