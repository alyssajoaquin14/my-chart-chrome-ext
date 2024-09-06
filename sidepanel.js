// Add event listener to the button in the side panel
document.getElementById('chatButton').addEventListener('click', () => {
  // Show the loading message in the side panel
  document.getElementById('loadingMessage').style.display = 'block';

  // Get the current active tab where the side panel is interacting
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      const desiredUrl = 'https://secure.mypennmedicine.org/MyPennMedicine/app/test-results';

      // Check if the current URL is the desired test results page
      if (activeTab.url !== desiredUrl) {
          // Navigate to the test results page
          chrome.tabs.update(activeTab.id, { url: desiredUrl });

          // Listen for the tab update to complete
          chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
              // Ensure that the update is for the correct tab and the status is complete
              if (tabId === activeTab.id && changeInfo.status === 'complete') {
                  // Remove the listener to avoid multiple triggers
                  chrome.tabs.onUpdated.removeListener(listener);

                  // Execute the function to find and click the most recent test result
                  executeFindAndClickTestResult(activeTab.id);
              }
          });
      } else {
          // If already on the correct page, directly execute the script
          executeFindAndClickTestResult(activeTab.id);
      }
  });
});

// Function to execute the script to find and click the most recent test result
function executeFindAndClickTestResult(tabId) {
  chrome.scripting.executeScript({
      target: { tabId: tabId }, // Target the active tab
      func: findAndClickMostRecentTestResult, // Function to execute
  });
}

// Function to be executed in the main page context to click the most recent test result
function findAndClickMostRecentTestResult() {
  // Polling function to check if the desired content is available
  function waitForContent(selector, maxRetries = 10, interval = 1000) {
      return new Promise((resolve, reject) => {
          let attempts = 0;
          const check = () => {
              attempts++;
              const element = document.querySelector(selector);
              if (element) {
                  resolve(element);
              } else if (attempts >= maxRetries) {
                  reject('No test results found after waiting.');
              } else {
                  setTimeout(check, interval);
              }
          };
          check();
      });
  }

  // Use the polling function to wait for the first test result link to appear
  waitForContent('ul._List.listContainer ._ListElement a.ResultDetailsLink')
      .then((firstResultLink) => {
          // Click the link to navigate to the test result details page
          firstResultLink.click();

          // After clicking, wait a bit for the navigation to complete and capture the content
          setTimeout(() => {
              // Extract the relevant text content from the new page
              const resultContainer = document.querySelector('div._LayoutGrid.grid._layout.fullWidthPrint.mainSectionGrid');
              let resultText = resultContainer ? resultContainer.innerText : '';

              // Append a prompt for ChatGPT
              resultText += "\nPlease help me understand the above test results. Act as a medical professional chatbot.";

              // Send the extracted text back to the background script to open ChatGPT
              chrome.runtime.sendMessage({ action: 'openChatGPT', data: resultText });
          }, 3000); // Adjust delay based on page load time
      })
      .catch((error) => {
          // Display the error message in the side panel
          document.getElementById('loadingMessage').textContent = error;
      });
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'removeLoadingMessage') {
      // Hide the loading message once the process is complete
      document.getElementById('loadingMessage').style.display = 'none';
  }
});