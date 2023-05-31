chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "getOpenAIKey") {
      chrome.storage.sync.get("openAIKey", (data) => {
        sendResponse({ openAIKey: data.openAIKey });
      });
      return true; // Required to use sendResponse asynchronously
    }
    else if (request.type === "getBigcodeServiceUrl"){
      chrome.storage.sync.get("bigcodeServiceUrl", (data) => {
        sendResponse({ bigcodeServiceUrl: data.bigcodeServiceUrl });
      });
      return true; // Required to use sendResponse asynchronously
    }
    else if(request.type === "getCheckedMode"){
      chrome.storage.sync.get("checkedMode", (data) => {
        sendResponse({ checkedMode: data.checkedMode });
      });
      return true; // Required to use sendResponse asynchronously
    }
    else if(request.type === "getGPTModelType"){
      chrome.storage.sync.get("modelType", (data) => {
        sendResponse({ modelType: data.modelType });
      });
      return true; // Required to use sendResponse asynchronously
    }
    else if(request.type === "getHuggingfaceAccessToken"){
      chrome.storage.sync.get("huggingfaceAccessToken", (data) => {
        sendResponse({ huggingfaceAccessToken : data.huggingfaceAccessToken});
      })
      return true;
    }
  });
  