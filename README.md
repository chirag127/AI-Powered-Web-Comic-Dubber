# AI-Powered Web Comic Dubber

A browser extension that detects speech bubbles in web comics and generates AI-based voiceovers for the dialogue. Users can customize voices for different characters, providing an immersive and dynamic comic-reading experience.

## Features

-   Speech bubble detection using computer vision
-   Text extraction with OCR
-   AI voice generation for detected dialogue
-   Character voice customization
-   Seamless browser extension experience

## Project Structure

-   `extension/` - Browser extension code
    -   `manifest.json` - Extension configuration
    -   `popup/` - Extension popup UI
    -   `content/` - Content scripts for bubble detection and playback
    -   `background/` - Background scripts for API communication
    -   `lib/` - Shared libraries and utilities
-   `backend/` - Backend services
    -   `server.js` - Main server file
    -   `routes/` - API routes
    -   `controllers/` - Business logic
    -   `models/` - Database models
    -   `services/` - External service integrations (OCR, TTS)
    -   `config/` - Configuration files
    -   `utils/` - Utility functions

## Setup and Installation

### Backend Setup

1. Navigate to the backend directory:

    ```
    cd backend
    ```

2. Install dependencies:

    ```
    npm install
    ```

3. Create a `.env` file based on `.env.example` and add your API keys.

4. Start the server:
    ```
    npm start
    ```

### Extension Setup

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top-right corner
3. Click "Load unpacked" and select the `extension` directory

## Usage

1. Navigate to a web comic page
2. Click the extension icon to open the popup
3. Click "Detect Speech Bubbles" to analyze the page
4. Use the playback controls to listen to the dialogue
5. Customize character voices in the settings

## Technologies Used

-   Frontend: JavaScript, HTML, CSS
-   Backend: Node.js, Express.js
-   Database: MongoDB
-   AI Services: ElevenLabs, Google Cloud, Amazon Polly
-   Computer Vision: OCR for text extraction

## License

This project is licensed under the MIT License - see the LICENSE file for details.
