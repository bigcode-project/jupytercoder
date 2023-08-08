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
        browser.runtime.sendMessage({ type: "getOpenAIKey" }).then((response) => {
            resolve(response.openAIKey);
        });
    });
}

preferences.getGPTModelType = async () => {
    return new Promise((resolve) => {
        browser.runtime.sendMessage({ type: "getGPTModelType" }).then((response) => {
            resolve(response.modelType);
        });
    });
}

preferences.getBigcodeServiceUrl = async () => {
    return new Promise((resolve) => {
        browser.runtime.sendMessage({ type: "getBigcodeServiceUrl" }).then((response) => {
            resolve(response.bigcodeServiceUrl);
        });
    });
}

preferences.getCheckedMode = async () => {
    return new Promise((resolve) => {
        browser.runtime.sendMessage({ type: "getCheckedMode" }).then((response) => {
            resolve(response.checkedMode);
        });
    });
}

preferences.getHuggingfaceApiKey = async () => {
    return new Promise((resolve) => {
        browser.runtime.sendMessage({ type: "getHuggingfaceAccessToken" }).then((response) => {
            resolve(response.huggingfaceAccessToken);
        });
    });
}

window.preferences = preferences;
