/**
 * UI Template for the draggable comic dubber interface
 */

const comicDubberUITemplate = `
<div id="comic-dubber-ui" class="comic-dubber-ui">
  <div id="comic-dubber-header" class="comic-dubber-header">
    <h1>Web Comic Dubber</h1>
    <div class="comic-dubber-controls">
      <button id="comic-dubber-minimize" class="comic-dubber-button">_</button>
      <button id="comic-dubber-close" class="comic-dubber-button">×</button>
    </div>
  </div>
  
  <div id="comic-dubber-content" class="comic-dubber-content">
    <div class="comic-dubber-container">
      <div class="toggle-container">
        <label class="switch">
          <input type="checkbox" id="enableToggle" checked>
          <span class="slider round"></span>
        </label>
        <span>Enabled</span>
      </div>

      <div class="main-content">
        <div class="detection-section">
          <h2>Speech Bubble Detection</h2>
          <button id="detectButton" class="primary-button">Detect Speech Bubbles</button>
          <div id="detectionStatus" class="status"></div>
          <div id="bubbleCount" class="bubble-count"></div>
          <div class="detection-info">
            <p class="detection-tip">The extension now detects speech bubbles one page at a time for better accuracy.</p>
            <p class="detection-tip">Click "Next Page" after processing each page to continue.</p>
            <p class="detection-tip">Speech bubbles are detected using computer vision and text is extracted using OCR.</p>
            <p class="detection-tip">Characters are automatically detected from text patterns and assigned consistent voices.</p>
          </div>
        </div>

        <div class="playback-section">
          <h2>Playback Controls</h2>
          <div class="playback-buttons">
            <button id="playButton" class="control-button" disabled>
              <span class="icon">▶</span> Play
            </button>
            <button id="pauseButton" class="control-button" disabled>
              <span class="icon">⏸</span> Pause
            </button>
            <button id="stopButton" class="control-button" disabled>
              <span class="icon">⏹</span> Stop
            </button>
          </div>

          <div class="volume-control">
            <label for="volumeSlider">Volume:</label>
            <input type="range" id="volumeSlider" min="0" max="1" step="0.1" value="1">
          </div>

          <div class="rate-control">
            <label for="rateSlider">Speed:</label>
            <input type="range" id="rateSlider" min="0.5" max="2" step="0.1" value="1">
          </div>
        </div>

        <div class="voice-section">
          <h2>Voice Settings</h2>
          <div class="voice-selection">
            <label for="defaultVoice">Default Voice:</label>
            <select id="defaultVoice"></select>
          </div>

          <div class="character-voices">
            <h3>Character Voices</h3>
            <div id="characterVoicesList">
              <!-- Character voice assignments will be added here dynamically -->
              <div class="character-voice-item">
                <input type="text" placeholder="Character Name" class="character-name">
                <select class="character-voice"></select>
                <button class="remove-character">✕</button>
              </div>
            </div>
            <button id="addCharacterButton" class="secondary-button">Add Character</button>
          </div>
        </div>

        <div class="text-correction-section">
          <h2>Text Correction</h2>
          <div id="textCorrectionList">
            <!-- Text correction items will be added here dynamically -->
          </div>
        </div>
      </div>

      <footer>
        <button id="saveSettingsButton" class="primary-button">Save Settings</button>
      </footer>
    </div>
  </div>
</div>
`;
