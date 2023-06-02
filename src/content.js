(function () {

  const notebookModel = {
    name: "notebook",
    requiredClassName: {
      cell: "cell",
      verify: "code_cell",
      output: "output_subarea",
      text: "text_cell",
      textOutput: "text_cell_render"
    }
  }

  const labModel = {
    name: "lab",
    requiredClassName: {
      cell: "jp-Notebook-cell",
      verify: "jp-CodeCell",
      output: "jp-Cell-outputWrapper",
      text: "jp-MarkdownCell",
      textOutput: "jp-RenderedMarkdown"
    }
  }


  const { utility, animation, state, api, preferences } = window;


  const mainProcess = async (isAutoRequest = false) => {
    //Obtain the Textarea of the current input box
    const activeTextarea = document.activeElement;

    if (activeTextarea.tagName != "TEXTAREA"){
      return
    }

    state.activeRequestTextarea = activeTextarea

    // Obtain the current input box (cell) from the Textarea of the current input box
    const activeCell = activeTextarea.parentElement.parentElement

    const checkedMode = await preferences.getCheckedMode()

    if (!checkedMode) {
      alert("Please save your settings!")
      return
    }

    const currctJupyterModel = state.currctJupyterModel
    const requestType = state.requestType

    // Retrieve the content of the active cell 
    let [code, isLastLine] = utility.getCodeFormat(checkedMode, currctJupyterModel, requestType);
    isAutoRequest ? isLastLine = false : null

    if (!code) return;

    if (activeCell) {
      // Start Animation
      const [animationInterval, activeCellElement] = animation.startWaitingAnimation(activeCell)
      state.isRequestInProgress = true

      let suggestion;
      // Deal with a series of problems such as network
      try {

        switch (checkedMode) {
          case "OpenAI":
            // Openai does not support fixing bugs
            if (state.requestType == "fixBug") {
              clearInterval(animationInterval)
              activeCellElement.classList.remove('before-content')
              state.isRequestInProgress = false
              return
            }

            const apikey = await preferences.getOpenAIKey()
            const GPTModelType = await preferences.getGPTModelType()
            suggestion = await api.sendToOpenAI(code, apikey, GPTModelType, isLastLine)
            break;

          case "BigCode":
            const bigCodeUrl = await preferences.getBigcodeServiceUrl()
            const huggingfaceAccessToken = await preferences.getHuggingfaceApiKey()
            suggestion = await api.sendToBigcode(code, bigCodeUrl, huggingfaceAccessToken, isLastLine)
            break;
        }

      } catch {
        // cancel animation
        clearInterval(animationInterval)
        // cancel animation element
        activeCellElement.classList.remove('before-content')
        // Add error animation
        activeCellElement.classList.add('paused')
        // The request is forbidden within 5s, and the animation lasts for 5s
        const pausedTimeOut = setTimeout(() => {
          activeCellElement.classList.remove('paused')
          clearTimeout(pausedTimeOut)
          state.isRequestInProgress = false
          state.isRequestSuccessful = false
        }, 5000)
        return
      }

      if (suggestion || suggestion === "") {
        clearInterval(animationInterval)
        // cancel animation element
        activeCellElement.classList.remove('before-content')

        state.isRequestSuccessful = true
        state.isRequestInProgress = false
        state.codeToFill = suggestion

        utility.viewCodeResult(suggestion, code, requestType, activeTextarea)

      }
    }
  }


  // Adds an event listener for filling in code after the request is completed
  const fillCodeKeyListener = (event) => {
    console.log("a");
    if (event.ctrlKey && !state.isRequestInProgress && state.isRequestSuccessful) {
      event.preventDefault();

      // Get the previously existing animated text element (if any)
      // If it doesn't exist, it's assumed that the user doesn't need the code
      const animationElementList = document.querySelectorAll(".per-insert-code");
    
      // If the animated text element exists, it's assumed that the user wants to insert the code into the code block
      if (animationElementList.length === 1) {
        // delete animation element
        animationElementList[0].remove()

        // request type "normal" or "fixBug"
        if (state.requestType == "normal") {
          utility.insertSuggestion(state.codeToFill, state.activeRequestTextarea);
        } else if (state.requestType == "fixBug") {
          utility.insertSuggestionFixBug(state.codeToFill, state.activeRequestTextarea, state.currctJupyterModel)
        }

      }

      // Reset the request successful flag
      state.isRequestSuccessful = false;
    }
  };


  const undisplayedCodeDiff = () => {
    if (state.isRequestSuccessful) {
      state.isRequestSuccessful = false
      utility.clearShowcasingCode(state.activeRequestTextarea)
    }
  }

  const autoRequestCode = (eventCode) => {
    // If there is no code hint
    if (document.querySelectorAll(".per-insert-code").length == 0 || document.querySelectorAll(".displayed").length == 0) {
      state.isRequestSuccessful = false
    }
    
    // If there is code hint
    if (document.querySelectorAll(".per-insert-code").length != 0) {

      // Check that the input code matches the next character of the code prompt
      const chekcResult = utility.checkCodeEquality(eventCode, state.codeToFill)
      
      if (chekcResult) {
        state.codeToFill = state.codeToFill.slice(1)

        // Moves the current code to the bottom of the CPU time slice queue, Place the jupyer default event before this method
        const timeOut = setTimeout(() => {
          utility.isShortcutKeyChar(eventCode.key, state.activeRequestTextarea, state.recordCodeEqualPairShortcutKey)
          utility.showNormalCode(state.codeToFill, state.activeRequestTextarea)
          clearTimeout(timeOut)
        },0)
      }
      return
    }

    if (state.isRequestInProgress || state.isRequestSuccessful) {
      return
    }

    if (state.autoRequestTimeout) {
      clearTimeout(state.autoRequestTimeout);
    }

    // Set a new timeout for 0.8 seconds. After my test, the 0.8s delay is the most user-friendly
    state.autoRequestTimeout = setTimeout(async () => {
      if (state.isRequestInProgress || state.isRequestSuccessful) {
        return
      }

      state.requestType = "normal"
      await mainProcess(isAutoRequest = true)
    }, 800);
  }


  const requestCodeKeyListener = async (event) => {
    // Check if the Ctrl + Space keys were pressed
    if (event.ctrlKey && event.code === 'Space') {
      // Block default events
      event.preventDefault();

      if (state.isRequestInProgress || state.isRequestSuccessful) return

      state.requestType = "normal"
      await mainProcess()

    } else if (event.ctrlKey && event.code === 'Backquote') {
      // Block default events
      event.preventDefault();

      if (state.isRequestInProgress || state.isRequestSuccessful) return

      state.requestType = "fixBug"
      await mainProcess()
      
    } else if (!event.ctrlKey) {  // Press all buttons except ctrl, cancel if fixbug is being displayed
      undisplayedCodeDiff()
      autoRequestCode(event)
    }




  }

  const montedEventListener = () => {
    document.addEventListener('keydown', requestCodeKeyListener);
    document.addEventListener('keydown', fillCodeKeyListener);
    document.addEventListener("mousedown", undisplayedCodeDiff)
    
  }


  // Check if the current page is a Jupyter Notebook
  if (document.querySelector('body.notebook_app')) {
    montedEventListener()
    state.currctJupyterModel = notebookModel

  } else {
    // Create a new MutationObserver, This object will listen for changes in elements in the DOM and execute callback functions when changes occur
    const bodyObserver = new MutationObserver(function (mutations) {

      // In the callback function, use the forEach method to traverse the mutations array and obtain the attribute name attributeName of each mutated object's mutations. 
      // There is only one mutation in jupyterlab
      mutations.forEach(function (mutation) {

        // If the attribute name is 'data jp theme name', 
        if (mutation.attributeName === "data-jp-theme-name") {

          // use the getAttribute method to obtain the value of the data jp theme name attribute of the<body>element and store it in the dataJpThemeName variable.
          const dataJpThemeName = document.body.getAttribute("data-jp-theme-name");
          if (dataJpThemeName.indexOf("JupyterLab") != -1) {
            montedEventListener()
            state.currctJupyterModel = labModel
          }

        }

      });
    });

    // Start monitoring attribute changes of<body>elements
    bodyObserver.observe(document.body, { attributes: true });

  }


})()


