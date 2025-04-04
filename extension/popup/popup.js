// Populate voice dropdown when popup is opened
document.addEventListener("DOMContentLoaded", async () => {
    // Initialize character recognition
    await initializeCharacterRecognition();
    // Get available voices
    const voices = window.speechSynthesis.getVoices();
    populateVoiceList(voices);

    // If voices aren't loaded yet, wait for them
    if (voices.length === 0) {
        window.speechSynthesis.addEventListener("voiceschanged", () => {
            populateVoiceList(window.speechSynthesis.getVoices());
        });
    }

    // Load saved settings
    loadSettings();

    // Add event listeners
    document
        .getElementById("detectButton")
        .addEventListener("click", detectSpeechBubbles);
    document.getElementById("playButton").addEventListener("click", playAudio);
    document.getElementById("stopButton").addEventListener("click", stopAudio);

    // Add event listeners for speech settings
    document.getElementById("rate").addEventListener("input", updateRateValue);
    document
        .getElementById("pitch")
        .addEventListener("input", updatePitchValue);
    document
        .getElementById("volume")
        .addEventListener("input", updateVolumeValue);

    // Save settings when changed
    document
        .getElementById("defaultVoice")
        .addEventListener("change", saveSettings);
    document.getElementById("rate").addEventListener("change", saveSettings);
    document.getElementById("pitch").addEventListener("change", saveSettings);
    document.getElementById("volume").addEventListener("change", saveSettings);
    document
        .getElementById("backendUrl")
        .addEventListener("change", saveSettings);
    document
        .getElementById("language")
        .addEventListener("change", saveSettings);

    // Add character management event listeners
    document
        .getElementById("addCharacterBtn")
        .addEventListener("click", showAddCharacterDialog);
    document
        .getElementById("manageCharactersBtn")
        .addEventListener("click", showManageCharactersDialog);

    // Load and display characters
    loadCharacters();
});

// Populate voice dropdown
function populateVoiceList(voices) {
    const defaultVoice = document.getElementById("defaultVoice");
    defaultVoice.innerHTML = "";

    voices.forEach((voice, i) => {
        const option = document.createElement("option");
        option.textContent = `${voice.name} (${voice.lang})`;
        option.setAttribute("data-lang", voice.lang);
        option.setAttribute("data-name", voice.name);
        option.value = i;
        defaultVoice.appendChild(option);
    });
}

// Load settings from storage
function loadSettings() {
    chrome.storage.local.get(
        [
            "defaultVoice",
            "rate",
            "pitch",
            "volume",
            "characterVoices",
            "backendUrl",
            "language",
        ],
        (result) => {
            if (result.defaultVoice) {
                document.getElementById("defaultVoice").value =
                    result.defaultVoice;
            }

            if (result.rate) {
                document.getElementById("rate").value = result.rate;
                document.getElementById("rateValue").textContent = result.rate;
            }

            if (result.pitch) {
                document.getElementById("pitch").value = result.pitch;
                document.getElementById("pitchValue").textContent =
                    result.pitch;
            }

            if (result.volume) {
                document.getElementById("volume").value = result.volume;
                document.getElementById("volumeValue").textContent =
                    result.volume;
            }

            if (result.backendUrl) {
                document.getElementById("backendUrl").value = result.backendUrl;
            } else {
                document.getElementById("backendUrl").value =
                    "http://localhost:3000";
            }

            if (result.language) {
                document.getElementById("language").value = result.language;
            } else {
                document.getElementById("language").value = "en";
            }

            if (result.characterVoices) {
                updateCharacterVoices(result.characterVoices);
            }
        }
    );
}

// Save settings to storage
function saveSettings() {
    const defaultVoice = document.getElementById("defaultVoice").value;
    const rate = document.getElementById("rate").value;
    const pitch = document.getElementById("pitch").value;
    const volume = document.getElementById("volume").value;

    // Get character voices
    const characterVoices = {};
    const characterSelects = document.querySelectorAll(".character-voice");
    characterSelects.forEach((select) => {
        characterVoices[select.dataset.character] = select.value;
    });

    // Get advanced settings
    const backendUrl = document.getElementById("backendUrl").value;
    const language = document.getElementById("language").value;

    chrome.storage.local.set({
        defaultVoice,
        rate,
        pitch,
        volume,
        characterVoices,
        backendUrl,
        language,
    });
}

// Update character voices UI
function updateCharacterVoices(characters) {
    const characterVoicesDiv = document.getElementById("characterVoices");
    characterVoicesDiv.innerHTML = "";

    const voices = window.speechSynthesis.getVoices();

    Object.keys(characters).forEach((character) => {
        const voiceSetting = document.createElement("div");
        voiceSetting.className = "voice-setting";

        const label = document.createElement("label");
        label.textContent = `${character}:`;

        const select = document.createElement("select");
        select.className = "character-voice";
        select.dataset.character = character;

        voices.forEach((voice, i) => {
            const option = document.createElement("option");
            option.textContent = `${voice.name} (${voice.lang})`;
            option.value = i;
            select.appendChild(option);
        });

        select.value = characters[character];
        select.addEventListener("change", (e) => {
            saveSettings();

            // Update character voice in the database
            if (typeof CharacterRecognition !== "undefined") {
                CharacterRecognition.updateCharacterVoice(
                    character,
                    e.target.value
                );
            }
        });

        voiceSetting.appendChild(label);
        voiceSetting.appendChild(select);
        characterVoicesDiv.appendChild(voiceSetting);
    });
}

// Update rate value display
function updateRateValue() {
    document.getElementById("rateValue").textContent = this.value;
}

// Update pitch value display
function updatePitchValue() {
    document.getElementById("pitchValue").textContent = this.value;
}

// Update volume value display
function updateVolumeValue() {
    document.getElementById("volumeValue").textContent = this.value;
}

// Detect speech bubbles
function detectSpeechBubbles() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(
            tabs[0].id,
            { action: "detectSpeechBubbles" },
            (response) => {
                if (response && response.success) {
                    document.getElementById("playButton").disabled = false;
                    document.getElementById("stopButton").disabled = false;

                    // Update character voices if new characters are detected
                    if (response.characters) {
                        updateCharacterVoices(response.characters);
                        saveSettings();
                    }
                }
            }
        );
    });
}

// Play audio
function playAudio() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
            action: "playAudio",
            settings: {
                defaultVoice: document.getElementById("defaultVoice").value,
                rate: document.getElementById("rate").value,
                pitch: document.getElementById("pitch").value,
                volume: document.getElementById("volume").value,
                characterVoices: getCharacterVoices(),
            },
        });
    });
}

// Get character voices
function getCharacterVoices() {
    const characterVoices = {};
    const characterSelects = document.querySelectorAll(".character-voice");
    characterSelects.forEach((select) => {
        characterVoices[select.dataset.character] = select.value;
    });
    return characterVoices;
}

// Stop audio
function stopAudio() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: "stopAudio" });
    });
}

// Initialize character recognition
async function initializeCharacterRecognition() {
    // Load the character recognition script
    const script = document.createElement("script");
    script.src = "../lib/characterRecognition.js";
    document.head.appendChild(script);

    // Wait for script to load
    await new Promise((resolve) => {
        script.onload = resolve;
    });

    // Initialize the character recognition module
    if (typeof CharacterRecognition !== "undefined") {
        await CharacterRecognition.init();
    }
}

// Load and display characters
async function loadCharacters() {
    if (typeof CharacterRecognition === "undefined") {
        // Wait for character recognition to initialize
        await initializeCharacterRecognition();
    }

    const characters = CharacterRecognition.getAllCharacters();
    displayCharacters(characters);
}

// Display characters in the UI
function displayCharacters(characters) {
    const characterList = document.getElementById("characterList");
    const noCharactersMsg = characterList.querySelector(".no-characters");

    // Clear existing characters
    if (noCharactersMsg) {
        if (Object.keys(characters).length > 0) {
            noCharactersMsg.style.display = "none";
        } else {
            noCharactersMsg.style.display = "block";
            return;
        }
    }

    // Get available voices
    const voices = window.speechSynthesis.getVoices();

    // Add character items
    Object.keys(characters).forEach((name) => {
        const character = characters[name];

        // Skip if already in the list
        if (characterList.querySelector(`[data-character="${name}"]`)) {
            return;
        }

        const characterItem = document.createElement("div");
        characterItem.className = "character-item";
        characterItem.dataset.character = name;

        const characterInfo = document.createElement("div");
        characterInfo.className = "character-info";

        const characterName = document.createElement("div");
        characterName.className = "character-name";
        characterName.textContent = name;

        const characterVoice = document.createElement("div");
        characterVoice.className = "character-voice";

        // Get voice name
        const voiceIndex = character.voiceIndex || 0;
        const voice = voices[voiceIndex] || { name: "Default" };
        characterVoice.textContent = voice.name;

        characterInfo.appendChild(characterName);
        characterInfo.appendChild(characterVoice);

        const characterControls = document.createElement("div");
        characterControls.className = "character-controls";

        const editButton = document.createElement("button");
        editButton.textContent = "Edit";
        editButton.addEventListener("click", () => {
            showEditCharacterDialog(name, character);
        });

        characterControls.appendChild(editButton);

        characterItem.appendChild(characterInfo);
        characterItem.appendChild(characterControls);

        characterList.appendChild(characterItem);
    });
}

// Show add character dialog
function showAddCharacterDialog() {
    const dialog = createCharacterDialog("Add Character");

    const form = dialog.querySelector(".dialog-form");

    // Name input
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.placeholder = "Character Name";
    nameInput.required = true;

    // Voice select
    const voiceSelect = document.createElement("select");
    const voices = window.speechSynthesis.getVoices();

    voices.forEach((voice, i) => {
        const option = document.createElement("option");
        option.textContent = `${voice.name} (${voice.lang})`;
        option.value = i;
        voiceSelect.appendChild(option);
    });

    // Add inputs to form
    form.appendChild(createFormGroup("Name:", nameInput));
    form.appendChild(createFormGroup("Voice:", voiceSelect));

    // Add save button
    const saveButton = dialog.querySelector(".save-btn");
    saveButton.addEventListener("click", () => {
        const name = nameInput.value.trim();
        const voiceIndex = voiceSelect.value;

        if (name) {
            // Add character
            CharacterRecognition.addCharacter(name, voiceIndex);

            // Update UI
            loadCharacters();

            // Close dialog
            document.body.removeChild(dialog);
        }
    });

    // Add cancel button
    const cancelButton = dialog.querySelector(".cancel-btn");
    cancelButton.addEventListener("click", () => {
        document.body.removeChild(dialog);
    });

    // Add dialog to body
    document.body.appendChild(dialog);
}

// Show edit character dialog
function showEditCharacterDialog(name, character) {
    const dialog = createCharacterDialog("Edit Character");

    const form = dialog.querySelector(".dialog-form");

    // Name input
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = name;
    nameInput.disabled = true;

    // Voice select
    const voiceSelect = document.createElement("select");
    const voices = window.speechSynthesis.getVoices();

    voices.forEach((voice, i) => {
        const option = document.createElement("option");
        option.textContent = `${voice.name} (${voice.lang})`;
        option.value = i;
        voiceSelect.appendChild(option);
    });

    voiceSelect.value = character.voiceIndex || 0;

    // Add inputs to form
    form.appendChild(createFormGroup("Name:", nameInput));
    form.appendChild(createFormGroup("Voice:", voiceSelect));

    // Add delete button
    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete Character";
    deleteButton.className = "delete-btn";
    deleteButton.addEventListener("click", () => {
        if (confirm(`Are you sure you want to delete ${name}?`)) {
            // Remove character
            CharacterRecognition.removeCharacter(name);

            // Update UI
            loadCharacters();

            // Close dialog
            document.body.removeChild(dialog);
        }
    });

    form.appendChild(deleteButton);

    // Add save button
    const saveButton = dialog.querySelector(".save-btn");
    saveButton.addEventListener("click", () => {
        const voiceIndex = voiceSelect.value;

        // Update character voice
        CharacterRecognition.updateCharacterVoice(name, voiceIndex);

        // Update UI
        loadCharacters();

        // Close dialog
        document.body.removeChild(dialog);
    });

    // Add cancel button
    const cancelButton = dialog.querySelector(".cancel-btn");
    cancelButton.addEventListener("click", () => {
        document.body.removeChild(dialog);
    });

    // Add dialog to body
    document.body.appendChild(dialog);
}

// Show manage characters dialog
function showManageCharactersDialog() {
    const dialog = createCharacterDialog("Manage Characters");

    const form = dialog.querySelector(".dialog-form");

    // Get all characters
    const characters = CharacterRecognition.getAllCharacters();

    if (Object.keys(characters).length === 0) {
        const noCharacters = document.createElement("div");
        noCharacters.textContent = "No characters found";
        noCharacters.style.textAlign = "center";
        noCharacters.style.padding = "10px";
        form.appendChild(noCharacters);
    } else {
        // Create character list
        const characterList = document.createElement("div");
        characterList.className = "manage-character-list";

        Object.keys(characters).forEach((name) => {
            const character = characters[name];

            const characterItem = document.createElement("div");
            characterItem.className = "manage-character-item";

            const characterName = document.createElement("div");
            characterName.className = "manage-character-name";
            characterName.textContent = name;

            const editButton = document.createElement("button");
            editButton.textContent = "Edit";
            editButton.addEventListener("click", () => {
                document.body.removeChild(dialog);
                showEditCharacterDialog(name, character);
            });

            characterItem.appendChild(characterName);
            characterItem.appendChild(editButton);

            characterList.appendChild(characterItem);
        });

        form.appendChild(characterList);
    }

    // Add close button
    const closeButton = dialog.querySelector(".save-btn");
    closeButton.textContent = "Close";
    closeButton.addEventListener("click", () => {
        document.body.removeChild(dialog);
    });

    // Hide cancel button
    const cancelButton = dialog.querySelector(".cancel-btn");
    cancelButton.style.display = "none";

    // Add dialog to body
    document.body.appendChild(dialog);
}

// Create a character dialog
function createCharacterDialog(title) {
    const dialog = document.createElement("div");
    dialog.className = "character-dialog";

    const content = document.createElement("div");
    content.className = "dialog-content";

    const dialogTitle = document.createElement("div");
    dialogTitle.className = "dialog-title";
    dialogTitle.textContent = title;

    const form = document.createElement("div");
    form.className = "dialog-form";

    const actions = document.createElement("div");
    actions.className = "dialog-actions";

    const saveButton = document.createElement("button");
    saveButton.textContent = "Save";
    saveButton.className = "save-btn";

    const cancelButton = document.createElement("button");
    cancelButton.textContent = "Cancel";
    cancelButton.className = "cancel-btn";

    actions.appendChild(cancelButton);
    actions.appendChild(saveButton);

    content.appendChild(dialogTitle);
    content.appendChild(form);
    content.appendChild(actions);

    dialog.appendChild(content);

    return dialog;
}

// Create a form group
function createFormGroup(label, input) {
    const group = document.createElement("div");
    group.className = "form-group";

    const labelElement = document.createElement("label");
    labelElement.textContent = label;

    group.appendChild(labelElement);
    group.appendChild(input);

    return group;
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
    if (message.action === "updateCharacters") {
        updateCharacterVoices(message.characters);
        saveSettings();

        // Enable play button
        document.getElementById("playButton").disabled = false;
        document.getElementById("stopButton").disabled = false;

        // Update character list
        loadCharacters();
    }
});
