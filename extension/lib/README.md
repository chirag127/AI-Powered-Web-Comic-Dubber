# Libraries

This directory contains third-party libraries used by the extension.

## Required Libraries

You need to download and place the following libraries in this directory:

1. **Tesseract.js** - OCR engine
   - Download from: https://github.com/naptha/tesseract.js/tree/master/dist
   - File needed: `tesseract.min.js`

2. **OpenCV.js** - Computer vision
   - Download from: https://docs.opencv.org/3.4.0/opencv.js
   - File needed: `opencv.js`

3. **ResponsiveVoice** - Text-to-speech
   - This is loaded dynamically from CDN with API key
   - No file needed in this directory

## Usage

These libraries are referenced in the `manifest.json` file and loaded automatically when the extension runs.
