/**
 * AI-Powered Web Comic Dubber - Background Script
 *
 * This script handles background processes for the extension, including:
 * - Communication with content scripts
 * - Storage of user preferences
 * - API calls to backend (if implemented)
 */

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
    console.log("AI-Powered Web Comic Dubber installed");

    // Initialize default settings
    chrome.storage.sync.set({
        enabled: true,
        defaultVoice: "default",
        characterVoices: {},
        highlightBubbles: true,
        autoDetect: false,
        volume: 1.0,
        rate: 1.0,
        pitch: 1.0,
    });
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Background script received message:", message);

    if (message.action === "detectBubbles") {
        // Forward the message to the active tab's content script
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                chrome.tabs.sendMessage(
                    tabs[0].id,
                    {
                        action: "detectBubbles",
                        moveToNextPage: message.moveToNextPage || false,
                    },
                    (response) => {
                        sendResponse(response);
                    }
                );
            }
        });
        return true; // Keep the message channel open for async response
    }

    if (message.action === "playVoiceover") {
        // Forward the message to the active tab's content script
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                chrome.tabs.sendMessage(
                    tabs[0].id,
                    {
                        action: "playVoiceover",
                        bubbles: message.bubbles,
                        settings: message.settings,
                    },
                    (response) => {
                        sendResponse(response);
                    }
                );
            }
        });
        return true; // Keep the message channel open for async response
    }

    if (message.action === "stopVoiceover") {
        // Forward the message to the active tab's content script
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                chrome.tabs.sendMessage(
                    tabs[0].id,
                    { action: "stopVoiceover" },
                    (response) => {
                        sendResponse(response);
                    }
                );
            }
        });
        return true; // Keep the message channel open for async response
    }

    if (message.action === "getCurrentPageInfo") {
        // Forward the message to the active tab's content script
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                chrome.tabs.sendMessage(
                    tabs[0].id,
                    { action: "getCurrentPageInfo" },
                    (response) => {
                        sendResponse(response);
                    }
                );
            }
        });
        return true; // Keep the message channel open for async response
    }

    if (message.action === "getSettings") {
        // Retrieve settings from storage
        chrome.storage.sync.get(null, (settings) => {
            sendResponse({ settings });
        });
        return true; // Keep the message channel open for async response
    }

    if (message.action === "saveSettings") {
        // Save settings to storage
        chrome.storage.sync.set(message.settings, () => {
            sendResponse({ success: true });
        });
        return true; // Keep the message channel open for async response
    }
});
