// Store the ID of the ChatGPT tab if it's already open
let chatGPTTabId = null;

// Listener for messages from sidepanel.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'openChatGPT') {
        // Check if ChatGPT tab is already open
        if (chatGPTTabId !== null) {
            // Focus the existing ChatGPT tab
            chrome.tabs.update(chatGPTTabId, { active: true });
        } else {
            // Create a new ChatGPT tab if not already open
            chrome.tabs.create({ url: 'https://chat.openai.com/' }, (tab) => {
                chatGPTTabId = tab.id; // Store the newly opened tab's ID

                // Wait a bit for the page to load, then inject the script to paste the text
                setTimeout(() => {
                    chrome.scripting.executeScript({
                        target: { tabId: chatGPTTabId },
                        func: pasteTextIntoChatGPT,
                        args: [message.data] // Pass the extracted result text
                    });
                }, 3000); // Adjust delay as needed
            });
        }
    }
});

// Function to paste text into ChatGPT's input field
function pasteTextIntoChatGPT(text) {
    const inputBox = document.querySelector('textarea');
    if (inputBox) {
        inputBox.value = text; // Set the value
        inputBox.dispatchEvent(new Event('input', { bubbles: true })); // Trigger input event

        setTimeout(() => {
            inputBox.dispatchEvent(new KeyboardEvent('keydown', {
                bubbles: true,
                cancelable: true,
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
            }));

            chrome.runtime.sendMessage({ action: 'removeLoadingMessage' });
        }, 500);
    }
}

// Listener for tab removal to reset ChatGPT tab ID
chrome.tabs.onRemoved.addListener((tabId) => {
    if (tabId === chatGPTTabId) {
        chatGPTTabId = null; // Reset the stored ID when the ChatGPT tab is closed
    }
});