// Background script for handling extension icon click

// Listen for extension icon click
chrome.action.onClicked.addListener((tab) => {
    // Send message to content script to toggle UI
    chrome.tabs.sendMessage(tab.id, { action: "toggleUI" }, (response) => {
        if (chrome.runtime.lastError) {
            console.error("Error sending message:", chrome.runtime.lastError);
            // Content script might not be loaded yet, inject it
            chrome.scripting
                .executeScript({
                    target: { tabId: tab.id },
                    files: ["content/content.js"],
                })
                .then(() => {
                    // Try sending the message again after injecting the content script
                    setTimeout(() => {
                        chrome.tabs.sendMessage(tab.id, { action: "toggleUI" });
                    }, 500);
                })
                .catch((err) => {
                    console.error("Error injecting content script:", err);
                });
        } else if (response && !response.success) {
            console.error("Error in content script:", response.error);
        }
    });
});

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension installed");
    // Initialize default settings
    chrome.storage.sync.set(
        {
            voiceSettings: {},
        },
        () => {
            if (chrome.runtime.lastError) {
                console.error(
                    "Error setting storage:",
                    chrome.runtime.lastError
                );
            } else {
                console.log("Default settings initialized");
            }
        }
    );
});
