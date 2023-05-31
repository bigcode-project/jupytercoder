const state = {
    // Textarea during the request (allows writing code in other cells while the request is in progress)
    activeRequestTextarea: null,
    // Is the current user page a lab or a notebook (is Model in the content.js)
    currctJupyterModel: {},
    // Flag indicating whether a request is in progress (prevents multiple requests, etc.)
    isRequestInProgress: false,
    // Flag indicating whether the request was successful (prevents filling in code before the request is complete)
    isRequestSuccessful: false,
    // Code to be filled in after request completion
    codeToFill: "",
    requestType: "",
}

window.state = state