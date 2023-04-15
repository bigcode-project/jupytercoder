chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "getApiKey") {
      chrome.storage.sync.get("openaiApiKey", (data) => {
        sendResponse({ apiKey: data.openaiApiKey });
      });
      return true; // Required to use sendResponse asynchronously
    }
  });
  