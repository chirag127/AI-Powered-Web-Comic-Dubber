// Background script for handling extension icon click

// Function to inject the content script
async function injectContentScript(tabId) {
    try {
        console.log("Injecting content script into tab", tabId);

        // Inject the content script
        await chrome.scripting.executeScript({
            target: { tabId },
            files: ["content/content.js"],
        });
        console.log("Content script injected successfully");

        return true;
    } catch (error) {
        console.error("Error injecting content script:", error);
        return false;
    }
}

// Listen for extension icon click
chrome.action.onClicked.addListener(async (tab) => {
    try {
        // Send message to content script to toggle UI
        chrome.tabs.sendMessage(
            tab.id,
            { action: "toggleUI" },
            async (response) => {
                if (chrome.runtime.lastError) {
                    console.log(
                        "Content script not loaded, injecting content script..."
                    );

                    // Inject content script
                    const injected = await injectContentScript(tab.id);

                    if (injected) {
                        // Wait a moment for the content script to initialize and load libraries
                        setTimeout(() => {
                            chrome.tabs.sendMessage(
                                tab.id,
                                { action: "toggleUI" },
                                (response) => {
                                    if (chrome.runtime.lastError) {
                                        console.error(
                                            "Error after content script injection:",
                                            chrome.runtime.lastError
                                        );
                                        // Show an error notification
                                        chrome.notifications.create({
                                            type: "basic",
                                            iconUrl: "popup/images/icon128.png",
                                            title: "Web Comic Dubber Error",
                                            message:
                                                "Failed to initialize extension. Please refresh the page and try again.",
                                        });
                                    } else if (response && !response.success) {
                                        console.error(
                                            "Error in content script:",
                                            response.error
                                        );
                                    }
                                }
                            );
                        }, 2000); // Increased timeout to allow more time for library loading
                    } else {
                        console.error("Failed to inject content script");
                        // Show an error notification
                        chrome.notifications.create({
                            type: "basic",
                            iconUrl: "popup/images/icon128.png",
                            title: "Web Comic Dubber Error",
                            message:
                                "Failed to load content script. Please try on a different page or refresh and try again.",
                        });
                    }
                } else if (response && !response.success) {
                    console.error("Error in content script:", response.error);
                }
            }
        );
    } catch (error) {
        console.error("Error handling extension click:", error);
    }
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
