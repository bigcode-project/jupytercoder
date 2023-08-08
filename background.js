browser.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.type === "getOpenAIKey") {
        return await browser.storage.local.get("openAIKey");
    }
    else if (request.type === "getBigcodeServiceUrl") {
        return await browser.storage.local.get("bigcodeServiceUrl");
    }
    else if (request.type === "getCheckedMode") {
        return await browser.storage.local.get("checkedMode");
    }
    else if (request.type === "getGPTModelType") {
        return await browser.storage.local.get("modelType");
    }
    else if (request.type === "getHuggingfaceAccessToken") {
        return await browser.storage.local.get("huggingfaceAccessToken");
    }

    return true; // Required to use sendResponse asynchronously
});
