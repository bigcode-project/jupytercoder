const api = {
    sendToOpenAI(prompt, apiKey, modelType) { },
    sendToBigcode(code, url, token) { }
};


const cleanUpBigcodeOutput = (suggestion, isLastLine) => {
    suggestion = suggestion.replace("# -*- coding: utf-8 -*-\n\n", "")
    let outPutIndex = suggestion.indexOf('<jupyter_output>')

    if (outPutIndex != -1){
        suggestion = suggestion.slice(0, outPutIndex)
    }

    const unnecessaryTag = '<|endoftext|>'
    const unnecessaryTagIndex = suggestion.indexOf(unnecessaryTag)


    suggestion = unnecessaryTagIndex == -1 ? suggestion : suggestion.slice(0, unnecessaryTagIndex)

    return isLastLine ? suggestion : suggestion.replace("\n","")
}


const cleanUpOpenaiOutput = (suggestion, isLastLine) => {
    if (!isLastLine){
        return suggestion.split("\n").length ==  1 ? suggestion : suggestion.split("\n")[0]
    }

    suggestion = suggestion.replace(/\u200B/g, '')
    let outPutIndex = suggestion.indexOf("\n\n§ Output")
    

    if (outPutIndex == -1) {
        let outPutIndex = suggestion.indexOf("\n\n# Output")

        return outPutIndex == -1 ? suggestion : suggestion.substring(0, outPutIndex)
    } else {
        return suggestion.substring(0, outPutIndex)
    }

}

// Function to send request to OpenAI API
api.sendToOpenAI = async (prompt, apiKey, modelType, isLastLine) => {
    if (!apiKey || !modelType) {
        alert("OpenAI API key or modelType not set.");
        return "";
    }

    const response = await fetch("https://api.openai.com/v1/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: modelType,
            prompt,
            temperature: 0,
            max_tokens: 40,
        }),
        timeout: 30000
    });

    const data = await response.json();

    return data.choices && data.choices[0] ? cleanUpOpenaiOutput(data.choices[0].text, isLastLine) : ""
}


api.sendToBigcode = async (code, url, token, isLastLine) => {
    if (!url || !token) {
        alert("BigCode service URL or Huggingface Access Token not set.");
        return "";
    }

    const prompt = code.replace(/\u200B/g, '')
    

    const bodyData = {
        inputs: prompt,
        stream: false,
        parameters: {
            return_full_text: false,
            stop: ["<jupyter_output>"]
        }
    }

    if (!isLastLine){
        bodyData.parameters.stop.push("\n")
    }

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(bodyData)
    })

    const data = await response.json();

    return data[0] ? cleanUpBigcodeOutput(data[0].generated_text, isLastLine) : ""
}



window.api = api