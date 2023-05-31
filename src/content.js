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


  const mainProcess = async () => {
    //Obtain the Textarea of the current input box
    const activeTextarea = document.activeElement;

    state.activeRequestTextarea = activeTextarea

    // Obtain the current input box (cell) from the Textarea of the current input box
    const activeCell = activeTextarea.parentElement.parentElement

    const checkedMode = await preferences.getCheckedMode()
    const currctJupyterModel = state.currctJupyterModel

    // Retrieve the content of the active cell 
    const code = utility.getCellContentText(activeCell, checkedMode, currctJupyterModel);

    if (!code) return;

    if (activeCell) {
      // Start Animation
      const [animationInterval, animationElement, activeCellElement] = animation.startWaitingAnimation(activeCell)
      state.isRequestInProgress = true

      let suggestion;
      // Deal with a series of problems such as network
      try {

        switch (checkedMode) {
          case "openaiApiKey":
            const apikey = await preferences.getOpenAIKey()
            const GPTModelType = await preferences.getGPTModelType()
            suggestion = await api.sendToOpenAI(code, apikey, GPTModelType)
            break;

          case "otherService":
            const bigCodeUrl = await preferences.getBigcodeServiceUrl()
            const huggingfaceAccessToken = await preferences.getHuggingfaceApiKey()
            suggestion = await api.sendToBigcode(code, bigCodeUrl, huggingfaceAccessToken)
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

      if (suggestion) {
        clearInterval(animationInterval)
        // cancel animation element
        activeCellElement.classList.remove('before-content')

        state.isRequestSuccessful = true
        state.isRequestInProgress = false
        state.codeToFill = suggestion

        // Replace the content of the text animation box with code
        animationElement.innerHTML = suggestion
      }
    }
  }

  // Adds an event listener for filling in code after the request is completed
  const addFillCodeKeyListener = (event) => {
    if (event.ctrlKey && !state.isRequestInProgress && state.isRequestSuccessful) {
      event.preventDefault();

      // Get the previously existing animated text element (if any)
      // If it doesn't exist, it's assumed that the user doesn't need the code
      const animationElementList = document.querySelectorAll(".per-insert-code");

      // If the animated text element exists, it's assumed that the user wants to insert the code into the code block
      if (animationElementList.length === 1) {
        // delete animation element
        animationElementList[0].remove()

        utility.insertSuggestion(state.codeToFill, state.activeRequestTextarea);
      }

      // Reset the request successful flag
      state.isRequestSuccessful = false;
    }
  };


  const montedEventListener = () => {
    document.addEventListener('keydown', async (event) => {
      // Check if the Ctrl + Space keys were pressed
      if (event.ctrlKey && event.code === 'Space') {
        // Block default events
        event.preventDefault();

        if (state.isRequestInProgress || state.isRequestSuccessful) {
          return
        }

        await mainProcess()

      }

    });
    document.addEventListener('keydown', addFillCodeKeyListener);
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


