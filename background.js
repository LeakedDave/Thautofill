let contentScriptLoaded = false;

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.status === "content_script_loaded") {
        contentScriptLoaded = true;
    }
});

chrome.commands.onCommand.addListener(async function (command) {
    if (command === "toggle-thautofill") {
        if (contentScriptLoaded) {
            try {
                const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
                const port = chrome.tabs.connect(activeTab.id);
                port.postMessage({ action: "toggle_thautofill" });
            } catch (error) {
                console.error("Error toggling Thautofill:", error);
            }
        } else {
            console.error("Content script not loaded; cannot establish connection.");
        }
    }
});
