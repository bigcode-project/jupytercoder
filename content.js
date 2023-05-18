async function getOpenAIKey() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "getApiKey" }, (response) => {
      resolve(response.apiKey);
    });
  });
}
async function getBigcodeServiceUrl() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "getUrl" }, (response) => {
      resolve(response.otherServiceUrl);
    });
  });
}
async function getChecked() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "getChecked" }, (response) => {
      resolve(response.checked);
    });
  });
}
async function getmodelType() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "getModelType" }, (response) => {
      resolve(response.modelType);
    });
  });
}
async function getHuggingfaceApiKey() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "getHuggingfaceApiKey" }, (response) => {
      resolve(response.huggingfaceApiKey)
    })
  })
}


function removeOpenaiOutput(suggestion) {
  let outPutIndex = suggestion.indexOf("\n\n§ Output")

  if (outPutIndex == -1){
    let outPutIndex = suggestion.indexOf("\n\n# Output")

    return outPutIndex == -1 ? suggestion:suggestion.substring(0, outPutIndex)
  }else{
    return suggestion.substring(0, outPutIndex)
  }

}

// Function to send request to OpenAI API
async function sendToOpenAI(prompt) {
  const apiKey = await getOpenAIKey();
  const modelType = await getmodelType();
  
  if (!apiKey || !modelType) {
    alert("OpenAI API key or modelType not set."); 
    return;
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
  if(!(data.choices && data.choices[0])){
    return null
  }

  let suggestion = data.choices && data.choices[0] && data.choices[0].text;
  
  // Remove invisible characters
  suggestion = suggestion.replace(/\u200B/g, '');

  return removeOpenaiOutput(suggestion)
}


function removeJupyterOutput(str) {
  const jupyterOutput = '<jupyter_output>';

  if (str.endsWith(jupyterOutput)) {
    return str.slice(0, -jupyterOutput.length);
  }

  return str;
}


async function sendToBigcode(code) {
  const url = await getBigcodeServiceUrl();
  const token = await getHuggingfaceApiKey();
  
  if (!url) {
    alert("otherServiceUrl not set.");
    return;
  }
 
  const prompt = code.replace(/\u200B/g, '')
 
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      inputs: prompt,
      stream: false,
      parameters: {
        return_full_text: false,
        stop: ["<jupyter_output>"]
      }
    })
  })
  const data = await response.json();
  
  const suggestion = data[0].generated_text;

  // remove end token <jupyter_output> if exists
  return removeJupyterOutput(suggestion)
}


async function getCodeCompletion(code) {
  const checked = await getChecked();

  // If the user has not selected openai or bigcode
  if (!checked) {
    alert("The request method is not selected.");
    return;
  }

  switch(checked){
    case "openaiApiKey": return await sendToOpenAI(code);
    case "otherService": return await sendToBigcode(code);
    default: return ""
  }

}


// Code to be filled in after request completion
let codeToFill = "";
// Flag indicating whether a request is in progress (prevents multiple requests, etc.)
let isRequestInProgress = false;
// Flag indicating whether the request was successful (prevents filling in code before the request is complete)
let isRequestSuccessful = false;
// Textarea during the request (allows writing code in other cells while the request is in progress)
let activeRequestTextarea = null;


function insertSuggestion(suggestion) {
  // Focus the textarea, otherwise, it is not possible to insert the suggestion using the Tab key from another location
  activeRequestTextarea.focus();

  // Get the current cursor position
  const cursorPosition = activeRequestTextarea.selectionStart;

  // Insert the suggestion at the cursor position
  const newValue = activeRequestTextarea.value.slice(0, cursorPosition) + suggestion + activeRequestTextarea.value.slice(cursorPosition);
  activeRequestTextarea.value = newValue;

  // Update the cursor position after inserting the suggestion
  const newCursorPosition = cursorPosition + suggestion.length;
  activeRequestTextarea.selectionStart = activeRequestTextarea.selectionEnd = cursorPosition + suggestion.length;

  // Trigger an input event on the textarea to update the CodeMirror instance
  const event = new Event('input', { bubbles: true, cancelable: true });
  activeRequestTextarea.dispatchEvent(event);

  // Trigger a keydown event with Tab key to perform auto-indentation
  const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
  activeRequestTextarea.dispatchEvent(tabEvent);
}


const getActiveCellPointerCode = (activeCell, cellIndex) => {
  let cellContent = []

  // get cursor element
  const cursorElement = activeCell.querySelector('div.CodeMirror-cursor')

  const style = window.getComputedStyle(cursorElement);

  // 指针所在位置的偏移量
  const cursorOffsetLeft = Math.round(parseFloat(style.getPropertyValue('left')))

  // Which line
  const lineIndex = Math.round(parseFloat(style.getPropertyValue('top')) / 17)

  // Obtain element for all line
  const linesElement = activeCell.getElementsByClassName('CodeMirror-line')
  // code dom element length in active line
  const codeElementWdth = linesElement[lineIndex].querySelector("span").offsetWidth

  // Determine whether the pointer is at the end of a line, Because there is a left marring, so -4, but due to precision issues so -3
  if (cursorOffsetLeft - 3 < codeElementWdth) {
    return [null, null]
  }

  for (let i = 0; i < linesElement.length; i++) {
    if (i == lineIndex) {
      cellContent.push({
        "content": linesElement[i].textContent,
        "cellIndex": cellIndex,
        "isCursor": true,
        "type": "code",
        "lineIndex": i
      })
    } else {
      cellContent.push({
        "content": linesElement[i].textContent,
        "cellIndex": cellIndex,
        "isCursor": false,
        "type": "code",
        "lineIndex": i
      })
    }
  }
  const outputElement = activeCell.querySelector(`.${currctJupyterModel.requiredClassName.output}`);
  if (outputElement && currentCellType == "code") {
    cellContent.push({
      "content": linesElement[i].textContent,
      "cellIndex": cellIndex,
      "isCursor": false,
      "type": "output",
      "lineIndex": i
    })
  }
  return cellContent
}


async function getCellContentText(activeCell){
  const result = await getChecked()

  if(result == "openaiApiKey"){
    return getCellContentTextRequiredForOpenAI(activeCell)
  }else{
    return getCellContentTextRequiredForBigCode(activeCell)
  }
}


/*
  Obtain information about the code in the cell and return it by line

  Params:
    cellElement: cell dom element
    cellIndex: index corresponding to the cell in the context

  Return:
    Example:
      [{"content": def hello_world():,"cellIndex": 0,"isCursor": false,"type": "code","lineIndex": 0}, ...]
      - content: content of a line
      - cellIndex: index corresponding to the cell in the context
      - isCursor: is the mouse pointer in this line
      - type: code | text(markdown) | output
      - lineIndex: line number in this cell
      
*/
const getCellCode = (cellElement, cellIndex) => {
  let currentCellType = ""
  if (cellElement.classList.contains(currctJupyterModel.requiredClassName.verify)) {
    currentCellType = "code"
  } else if (cellElement.classList.contains(currctJupyterModel.requiredClassName.text)) {
    currentCellType = "text"
  } else {
    return []
  }

  const cellContent = []
  const codeLines = cellElement.querySelectorAll('.CodeMirror-line')
  for (let i = 0; i < codeLines.length; i++) {
    cellContent.push({
      "content": codeLines[i].textContent,
      "cellIndex": cellIndex,
      "isCursor": false,
      "type": currentCellType,
      "lineIndex": i
    })
  }

  const outputElement = cellElement.querySelector(`.${currctJupyterModel.requiredClassName.output}`);
  if (outputElement && currentCellType == "code") {
    cellContent.push({
      "content": outputElement.textContent,
      "cellIndex": cellIndex,
      "isCursor": false,
      "type": "output",
      "lineIndex": 0
    })
  }

  return cellContent;
}

/*
  Get Cell Context, returns a total of 5 cell, symmetrically based on the cell of the current focus

  Return:
    Example:
      [{"content": def hello_world():,"cellIndex": 0,"isCursor": false,"type": "code","lineIndex": 0}, ...]
      - content: content of a line
      - cellIndex: index corresponding to the cell in the context
      - isCursor: is the mouse pointer in this line
      - type: code | text(markdown) | output
      - lineIndex: line number in this cell
      
*/
const getActiveContext = () => {
  // Obtain the current input box (cell) from the Textarea of the current input box
  const activeCell = document.activeElement.parentElement.parentElement;

  const cellElements = Array.from(document.querySelectorAll(`.${currctJupyterModel.requiredClassName.cell}`));
  const activeCellIndex = cellElements.findIndex(cell => cell.contains(activeCell));
  let context = []
  for (let i = 0; i < cellElements.length; i++) {
    if (i == activeCellIndex) {
      const activeCellContent = getActiveCellPointerCode(activeCell, i)
      context = [...context, ...activeCellContent]
    } else if (i >= activeCellIndex - 2 || i <= activeCellIndex + 2) {
      const cellContent = getCellCode(cellElements[i], i)
      context = [...context, ...cellContent]
    }
  }

  return context
}

// prompt required by openai
function getCellContentTextRequiredForOpenAI() {
   const context = getActiveContext()
   let code = ""

   for(let index = 0; index < context.length; index++){
    const lineInformation = context[index]

    if(lineInformation.type == "code"){
      if(index == context.length - 1 || lineInformation.isCursor){
        return code + lineInformation.content
      }else{
        code += lineInformation.content += "\n"
      }
    }

  }

}

function getBigcodeFormattPrefix(typeStr){
  switch(typeStr){
    case "code": return "<jupyter_code>";
    case "text": return "<jupyter_text>";
    case "output": return "<jupyter_output>";
  }
}

// prompt required by bigcode
function getCellContentTextRequiredForBigCode() {
  const context = getActiveContext()

  let code = "<start_jupyter>"
  let cellCode = getBigcodeFormattPrefix(context[0].type)
  
  for(let index = 0; index < context.length; index++){
    const lineInformation = context[index]

    if(index == context.length - 1 || lineInformation.isCursor){
      code += cellCode + lineInformation.content
      break
    }

    const nextLineInformation = context[index + 1]

    if(lineInformation.cellIndex != nextLineInformation.cellIndex || lineInformation.type != nextLineInformation.type){
      code += cellCode + lineInformation.content
      cellCode = getBigcodeFormattPrefix(nextLineInformation.type)
    }else{
      cellCode += lineInformation.content + "\n"
    }

  }

  return code += "<jupyter_code>"
}


// left animation css
const loadCss = `
  .before-content:before {
    content: "";
    position: absolute;
    top: 5px;
    left: 10px;
    right: 0;
    bottom: 0;
    border: 3px solid rgba(0, 0, 0, 0.1);
    border-left-color: #000;
    border-radius: 50%;
    width: 15px;
    height: 15px;
    animation: spin 1s linear infinite;    
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .paused:before {
    content: "";
    position: absolute;
    top: 5px;
    left: 10px;
    right: 0;
    bottom: 0;
    border: 3px solid rgba(0, 0, 0, 0.1);
    border-radius: 50%;
    width: 15px;
    height: 15px;
    // animation: spin 1s linear infinite; 
    border-left-color: red;
  }
`;

// start request animation, The maximum animation duration is 30s
const startWaitingAnimation = (activeCell) => {
  const inputElement = activeCell.parentElement.parentElement.parentElement;

  // Create a new <style> element
  const styleElement = document.createElement('style');
  styleElement.textContent = loadCss;

  // Add a new <style> element to the <head> element
  document.head.appendChild(styleElement);

  // get cursor element
  const cursorElement = activeCell.querySelector('div.CodeMirror-cursor')
  const style = window.getComputedStyle(cursorElement);
  // Which line
  const lineIndex = Math.round(parseFloat(style.getPropertyValue('top')) / 17)
  // Obtain element for all line
  const linesElement = activeCell.getElementsByClassName('CodeMirror-line')
  // the code span elements for this active line
  const currectLineSpanList = linesElement[lineIndex].querySelectorAll('span span')

  // deprecate：Set the animated font dom element when it waits 
  // As a code hint carrier
  const animationElement = document.createElement('span');

  animationElement.classList.add("per-insert-code")
  animationElement.style.color = 'grey';

  // Insert gray code hints, If the active line has no span tag
  if (currectLineSpanList.length == 0) {
    const withAllCodeSpan = linesElement[lineIndex].querySelectorAll('span')
    // creates an element in a unique code carrier, as long as the mouse exists, the code carrier exists
    withAllCodeSpan[withAllCodeSpan.length - 1].appendChild(animationElement)
  } else {
    // Insert new hint code in the last code span
    const withAllCodeSpan = linesElement[lineIndex].childNodes
    withAllCodeSpan[withAllCodeSpan.length - 1].insertAdjacentElement('afterend', animationElement);
  }


  // Waiting steps, 0.333 seconds per step
  let timeLeft = 90;
  const animationInterval = setInterval(() => {
    // Add request animation
    inputElement.classList.add('before-content');
    // If the request exceeds 30s
    if (timeLeft-- <= 0) {
      inputElement.classList.remove('before-content');
      clearInterval(animationInterval)
    }

  }, 333)
  return [animationInterval, animationElement, inputElement]
}


// Adds an event listener for filling in code after the request is completed
const addFillCodeKeyListener = (event) => {
  if (event.ctrlKey && !isRequestInProgress && isRequestSuccessful) {
    event.preventDefault();

    // Get the previously existing animated text element (if any)
    // If it doesn't exist, it's assumed that the user doesn't need the code
    const animationElementList = document.querySelectorAll(".per-insert-code");

    // If the animated text element exists, it's assumed that the user wants to insert the code into the code block
    if (animationElementList.length === 1) {
      // delete animation element
      animationElementList[0].remove()

      insertSuggestion(codeToFill);
    }

    // Reset the request successful flag
    isRequestSuccessful = false;
  }
};


const mainProcess = async () => {
  //Obtain the Textarea of the current input box
  const activeTextarea = document.activeElement;
      
  activeRequestTextarea = activeTextarea

  // Obtain the current input box (cell) from the Textarea of the current input box
  const activeCell = activeTextarea.parentElement.parentElement
  
  // Retrieve the content of the active cell 
  const code = await getCellContentText(activeCell);

  console.log("code",JSON.stringify(code));

  if (!code) return;

  if (activeCell) {
    // Start Animation
    const [animationInterval, animationElement, inputElement] = startWaitingAnimation(activeCell)
    isRequestInProgress = true

    let suggestion;

    // Deal with a series of problems such as network
    try{
      suggestion = await getCodeCompletion(code)
    }catch(err){
      // cancel animation
      clearInterval(animationInterval)
      // cancel animation element
      inputElement.classList.remove('before-content')
      // Add error animation
      inputElement.classList.add('paused')
      // The request is forbidden within 5s, and the animation lasts for 5s
      const pausedTimeOut = setTimeout(() => {
        inputElement.classList.remove('paused')
        clearTimeout(pausedTimeOut)
        isRequestInProgress = false
        isRequestSuccessful = false
      }, 5000)
      return
    }
    
    
    if (suggestion) {
      clearInterval(animationInterval)
       // cancel animation element
      inputElement.classList.remove('before-content')

      isRequestSuccessful = true
      isRequestInProgress = false
      codeToFill = suggestion

      // Replace the content of the text animation box with code
      animationElement.innerHTML = suggestion
    }
  }
}


const montedEventListener = () => {
  document.addEventListener('keydown', async (event) => {
    // Check if the Ctrl + Space keys were pressed
    if (event.ctrlKey && event.code === 'Space') {
      // Block default events
      event.preventDefault();
      
      if (isRequestInProgress || isRequestSuccessful) {
        return
      }

      await mainProcess()

    }

  });
  document.addEventListener('keydown', addFillCodeKeyListener);
}

// Two options 'lab' and 'notebook'
let currctJupyterModel = {}

const notebookModel = {
  name: "notebook",
  requiredClassName:{
    cell:"cell",
    verify: "code_cell",
    output: "output_subarea",
    text: "text_cell",
    textOutput: "text_cell_render"
  }
}

const labModel = {
  name: "lab",
  requiredClassName:{
    cell:"jp-Notebook-cell",
    verify: "jp-CodeCell",
    output: "jp-Cell-outputWrapper",
    text: "jp-MarkdownCell", 
    textOutput: "jp-RenderedMarkdown"
  }
}



// Check if the current page is a Jupyter Notebook
if (document.querySelector('body.notebook_app')) {
  montedEventListener()
  currctJupyterModel = notebookModel
}

// Create a new MutationObserver, This object will listen for changes in elements in the DOM and execute callback functions when changes occur
const bodyObserver = new MutationObserver(function(mutations) {

  // In the callback function, use the forEach method to traverse the mutations array and obtain the attribute name attributeName of each mutated object's mutations. 
  // There is only one mutation in jupyterlab
  mutations.forEach(function(mutation) {

    // If the attribute name is 'data jp theme name', 
    if (mutation.attributeName === "data-jp-theme-name") {
  
       // use the getAttribute method to obtain the value of the data jp theme name attribute of the<body>element and store it in the dataJpThemeName variable.
      const dataJpThemeName = document.body.getAttribute("data-jp-theme-name");
      if(dataJpThemeName.indexOf("JupyterLab") != -1){
        montedEventListener()
        currctJupyterModel = labModel
      }

    }

  });
});

// Start monitoring attribute changes of<body>elements
bodyObserver.observe(document.body, { attributes: true });
