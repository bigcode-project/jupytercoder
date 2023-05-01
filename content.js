async function getOpenAIKey() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "getApiKey" }, (response) => {
      resolve(response.apiKey);
    });
  });
}
async function getOtherServiceUrl() {
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
  // Remove invisible characters and delete all spaces before the first character
  suggestion = suggestion.replace(/\u200B/g, '');

  // This is an example of a possible return: "    print('Hello World!')\n\nhello_world()\n\n§ Output… : ['Hello World!\\n']\n\n \n§ Markdown\n\n### Exercise"
  const outPutIndex = suggestion.indexOf("\n\n§ Output")
  if(outPutIndex == -1){
    return suggestion
  }else{
    return suggestion.substring(0,outPutIndex)
  }

}

async function sendToOtherService(code) {
  const url = await getOtherServiceUrl();
  const token = await getHuggingfaceApiKey();
  
  if (!url) {
    alert("otherServiceUrl not set.");
    return;
  }
  const prompt = "<start_jupyter><jupyter_code>" + code.replace(/\u200B/g, '')
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
        return_full_text: false
      }
    })
  })
  const data = await response.json();
  
  if (/^\n/.test(data)) {
    data = data.replace(/^\n/, '');
  }
  // 格式处理成可以输出到notebook的字符串
  return data[0].generated_text;
}


async function getCodeCompletion(code) {
  const checked = await getChecked();
  // If the user has not selected openai or bigcode
  if (!checked) {
    alert("The request method is not selected.");
    return;
  }

  if (checked == "openaiApiKey") {
    return await sendToOpenAI(code)
  } else if (checked == "otherService") {
    return await sendToOtherService(code)
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



const getActiveCellPointerCode = (activeCell) => {
    let leftContext = ""
    let rightContext = ""

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
    if(cursorOffsetLeft - 3 < codeElementWdth){
        return [null, null]
    }

    for (let i = 0; i < linesElement.length; i++) {
      if(i < lineIndex) {
        leftContext += linesElement[i].textContent + "\n"
      }else if(i == lineIndex){
        leftContext += linesElement[i].textContent
      }else{
        rightContext += linesElement[i].textContent  + "\n"
      }
    }

    return [leftContext, rightContext]
}


function getCellContentTextRequiredForOpenAI(activeCell) {
  const cellElements = Array.from(document.querySelectorAll('.cell'));
  const activeCellIndex = cellElements.findIndex(cell => cell.contains(activeCell));
  // Check if there are at least 3 cells before the active cell
  let codeContent = "";

  // LeftContext refers to the left side of the pointer, and vice versa, If both are null, it is determined that the pointer is not at the far right
  const [leftContext, rightContext] = getActiveCellPointerCode(activeCell)
  
  if(!leftContext){
    return null
  }

  // Iterate through the last 3 cells before the active cell
  const startIndex = activeCellIndex - 3 < 0 ? 0 : activeCellIndex - 3;
  for (let i = startIndex; i <= activeCellIndex; i++) {
    if(i == activeCellIndex){
      codeContent += leftContext
      break
    }else{
      const cellElement = cellElements[i];
      if (cellElement.classList.contains('code_cell')) {
        codeContent += extractTextFromCell(cellElement);
      }
    }
    codeContent += "\n"
  }

  return codeContent;
}


function getCellContentTextRequiredForBigCode(activeCell) {
  const cellElements = Array.from(document.querySelectorAll('.cell'));
  const activeCellIndex = cellElements.findIndex(cell => cell.contains(activeCell));
  // Check if there are at least 3 cells before the active cell
  let combinedContent = "<start_jupyter>";

  // in active cell, LeftContext refers to the left side of the pointer, and vice versa, If both are null, it is determined that the pointer is not at the far right
  const [leftContext, rightContext] = getActiveCellPointerCode(activeCell)

  if(!leftContext && !rightContext){
    return null
  }

  TODO: "The following code needs to add 'leftContext' and 'rightContext'"
  // Iterate through the last 3 cells before the active cell
  const startIndex = activeCellIndex - 3 < 0 ? 0 : activeCellIndex - 3;
  for (let i = startIndex; i <= activeCellIndex; i++) {
    const cellElement = cellElements[i];

    if (cellElement.classList.contains('code_cell')) {
      const code = extractTextFromCell(cellElement);
      combinedContent += `<jupyter_code>${code}`;
      const outputElement = cellElement.querySelector('.output_subarea');
      if (outputElement) {
        if (i !== activeCellIndex) {
          combinedContent += `<jupyter_output>`;
          combinedContent += outputElement.textContent;
        }
      }
    } else if (cellElement.classList.contains('text_cell')) {
      const text = extractTextFromCell(cellElement);
      combinedContent += `<jupyter_text>${text}`;
    }

  }
  return combinedContent;
}


async function getCellContentText(activeCell){
  const result = await getChecked()
  if(result == "openaiApiKey"){
    return getCellContentTextRequiredForOpenAI(activeCell)
  }else{
    return getCellContentTextRequiredForBigCode(activeCell)
  }
}



function extractTextFromCell(cell) {
  const codeMirrorLines = cell.querySelectorAll('.CodeMirror-code pre');
  const content = [];

  codeMirrorLines.forEach((line) => {
    content.push(line.textContent);
  });

  return content.join('\n');
}



// 开始等待动画，有30s等待时间，如果等待时间过了，出现“error”字体，返回两个值如下，接收："const [animationInterval, animationElement] = startWaitingAnimation(activeCall)"
// 1. animationInterval（interval, 动画计时器），可使用clearInterval(animationInterval)消除动画, 每次请求完毕必须要关掉
// 2. animationElement (dom, 动画字体节点)， animationElement.innerHTML = xxx 来赋值
const startWaitingAnimation = (activeCell) => {

  // get cursor element
  const cursorElement = activeCell.querySelector('div.CodeMirror-cursor')
  const style = window.getComputedStyle(cursorElement);
  // Which line
  const lineIndex = Math.round(parseFloat(style.getPropertyValue('top')) / 17)
  // Obtain element for all line
  const linesElement = activeCell.getElementsByClassName('CodeMirror-line')
  const currectLineSpanList = linesElement[lineIndex].querySelectorAll('span span')

  // Set the animated font dom element when it waits
  const animationElement = document.createElement('span');

  animationElement.classList.add("per-insert-code")
  animationElement.style.color = 'grey';

  // If it is a blank line
  if(currectLineSpanList.length == 0){
    const withAllCodeSpan = linesElement[lineIndex].querySelectorAll('span')
    withAllCodeSpan[withAllCodeSpan.length-1].appendChild(animationElement)
  }else{
    // Insert new hint code in the last code span
    const withAllCodeSpan = linesElement[lineIndex].childNodes
    withAllCodeSpan[withAllCodeSpan.length - 1].insertAdjacentElement('afterend', animationElement);
  }
  

  // Waiting steps, 0.333 seconds per step
  let timeLeft = 90;
  const animationInterval = setInterval(() => {
    let animatedText = ''

    let remainder = timeLeft % 3;
    switch (remainder) {
      case 2:
        animatedText = '.    ';
        break;
      case 1:
        animatedText = '..   ';
        break;
      default:
        animatedText = '...  ';
        break;
    }

    animationElement.innerHTML = ' ' + animatedText + " time left: " + Math.floor(timeLeft-- / 3) + "s"

    // request timeout
    if (timeLeft <= 0) {
      animationElement.innerHTML = "error"
      clearInterval(animationInterval)
    }

  }, 333)
  return [animationInterval, animationElement]
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


// Check if the current page is a Jupyter Notebook
if (document.querySelector('body.notebook_app')) {
  
  document.addEventListener('keydown', async (event) => {
    // Check if the Ctrl + Space keys were pressed
    if (event.ctrlKey && event.code === 'Space') {
      // Block default events
      event.preventDefault();

      if (isRequestInProgress || isRequestSuccessful) {
        return
      }

      //Obtain the Textarea of the current input box
      const activeTextarea = document.activeElement;

      activeRequestTextarea = activeTextarea

      // Obtain the current input box (cell) from the Textarea of the current input box
      const activeCell = activeTextarea.parentElement.parentElement

      // Retrieve the content of the active cell 
      const code = await getCellContentText(activeCell);
      
      if (!code) return;

      if (activeCell) {
        // Start Animation
        const [animationInterval, animationElement] = startWaitingAnimation(activeCell)
        isRequestInProgress = true

        const suggestion = await getCodeCompletion(code)

        if (suggestion) {
          clearInterval(animationInterval)
          isRequestSuccessful = true
          isRequestInProgress = false
          codeToFill = suggestion

          // Replace the content of the text animation box with code
          animationElement.innerHTML = suggestion
        }

      }
    }
  });
  document.addEventListener('keydown', addFillCodeKeyListener);
}