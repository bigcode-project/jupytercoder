const preferences = {
    // get the OpenAI key filled out by the user
    async getOpenAIKey() { },
    // get the Huggingface Access Token filled out by the user
    async getHuggingfaceApiKey() { },
    // get the Bigcode service url filled out by the user
    async getBigcodeServiceUrl() { },
    // get user selection whether it is Bigcode or OpenAI
    async getCheckedMode() { },
    // get the GPT model selected by the user
    async getGPTModelType() { },
    
}

preferences.getOpenAIKey = async () => {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "getApiKey" }, (response) => {
            resolve(response.apiKey);
        });
    });
}

preferences.getGPTModelType = async () => {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "getGPTModelType" }, (response) => {
            resolve(response.modelType);
        });
    });
}

preferences.getBigcodeServiceUrl = async () => {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "getBigcodeServiceUrl" }, (response) => {
            resolve(response.otherServiceUrl);
        });
    });
}

preferences.getCheckedMode = async () => {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "getCheckedMode" }, (response) => {
            resolve(response.checked);
        });
    });
}


preferences.getHuggingfaceApiKey = async () => {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "getHuggingfaceApiKey" }, (response) => {
            resolve(response.huggingfaceApiKey)
        })
    })
}


window.preferences = preferences