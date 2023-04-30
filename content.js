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

// Use a regular expression to match the content between triple backticks
const codeBlockRegex = /```([\s\S]*)```/;
const codeHalfBlockRegex = /```([\s\S]*)/;

// Function to send request to OpenAI API
async function sendToOpenAI(prompt) {
  const apiKey = await getOpenAIKey();
  const modelType = await getmodelType();
  if (!apiKey) {
    // 总是忘记填写。。所以等了半天总是以为网络错误，改成了alert
    alert("OpenAI API key not set.");
    return;
  } else if (!modelType) {
    alert("modelType not set.");
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
      temperature: 0.1,
      max_tokens: 40,
    }),
    // 添加一个最大请求时间，目前没做相关于超时的处理，但如果超时了，就会在请求的单元格展示error
    timeout: 30000
  });

  const data = await response.json();
  const suggestion = data.choices && data.choices[0] && data.choices[0].text;


  // don't know how many "```" exists, It is related to the token and also related to the model
  let count = (suggestion.match(/```/g) || []).length;
  let code = ""
  switch (count) {
    case 1:
      var match = suggestion.match(codeHalfBlockRegex)
      code = match && match[1] ? match[1].replace(/^\n\s*/, '').replace(/\n.*$/, '').replace(/\u200B/g, '') : ""
      break;
    case 2:
      var match = suggestion.match(codeBlockRegex)
      code = match && match[1] ? match[1].replace(/^\n\s*/, '').replace(/\n.*$/, '').replace(/\u200B/g, '') : ""
      break;
    default: code = suggestion;
  }

  return code
}

async function sendToOtherService(code) {
  const url = await getOtherServiceUrl();
  const token = await getHuggingfaceApiKey();
  if (!url) {
    // 总是忘记填写。。所以等了半天总是以为网络错误，改成了alert
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
  // 如果没有选择则弹出框提示
  if (!checked) {
    alert("The request method is not selected.");
    return;
  }
  if (checked == "openaiApiKey") {
    return await getOpenAiWrapper(code)
  } else if (checked == "otherService") {
    return await getOtherServiceUrlWrapper(code)
  }
}

async function getOpenAiWrapper(code) {
  const prompt = `
  I have the following code:
  
  \`\`\`
  ${code}
  \`\`\`
  
  Please provide the missing code to complete the task. (do not include code that is already present in the prompt)
  `;

  return await sendToOpenAI(prompt);
}

async function getOtherServiceUrlWrapper(code) {
  return await sendToOtherService(code)
}

// Code to be filled in after request completion
let codeToFill = "";
// Flag indicating whether a request is in progress (prevents multiple requests, etc.)
let isRequestInProgress = false;
// Flag indicating whether the request was successful (prevents filling in code before the request is complete)
let isRequestSuccessful = false;
// Textarea during the request (allows writing code in other cells while the request is in progress)
let activeRequestTextarea = null;

let activeAnimationElement = null;

let userInputIndex = 0

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
  codeToFill = ""
  userInputIndex = 0
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
  if (cursorOffsetLeft - 3 < codeElementWdth) {
    return [null, null]
  }

  for (let i = 0; i < linesElement.length; i++) {
    if (i <= lineIndex) {
      leftContext += linesElement[i].textContent + "\n"
    } else {
      rightContext += linesElement[i].textContent + "\n"
    }
  }

  return [leftContext, rightContext]
}



function getCellContentText(activeCell) {
  const cellElements = Array.from(document.querySelectorAll('.cell'));
  const activeCellIndex = cellElements.findIndex(cell => cell.contains(activeCell));
  // Check if there are at least 3 cells before the active cell

  let combinedContent = "<start_jupyter>";

  // LeftContext refers to the left side of the pointer, and vice versa, If both are null, it is determined that the pointer is not at the far right
  const [leftContext, rightContext] = getActiveCellPointerCode(activeCell)

  if (!leftContext && !rightContext) {
    return null
  }

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

function extractTextFromCell(cell) {
  const codeMirrorLines = cell.querySelectorAll('.CodeMirror-code pre');
  const content = [];

  codeMirrorLines.forEach((line) => {
    content.push(line.textContent);
  });

  return content.join('\n');
}


// Mount code hints elements
function mountAnimationElement(code) {
  const activeTextarea = document.activeElement;
  // Obtain the current input box (cell) from the Textarea of the current input box
  const activeCell = activeTextarea.parentElement.parentElement
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
  animationElement.innerHTML = code;
  animationElement.classList.add("per-insert-code");
  animationElement.style.color = 'grey';

  // If it is a blank line
  if (currectLineSpanList.length == 0) {
    const withAllCodeSpan = linesElement[lineIndex].querySelectorAll('span')
    withAllCodeSpan[withAllCodeSpan.length - 1].appendChild(animationElement)
  } else {
    currectLineSpanList[currectLineSpanList.length - 1].insertAdjacentElement('afterend', animationElement);
  }

}

// 开始等待动画，有30s等待时间，如果等待时间过了，出现“error”字体，返回两个值如下，接收："const [animationInterval, animationElement] = startWaitingAnimation(activeCall)"
// 1. animationInterval（interval, 动画计时器），可使用clearInterval(animationInterval)消除动画, 每次请求完毕必须要关掉
// 2. animationElement (dom, 动画字体节点)， animationElement.innerHTML = xxx 来赋值
const startWaitingAnimation = (activeCell) => {
  const inputElement = activeCell.parentElement.parentElement.parentElement;
  // left animation css
  var loadCss = `
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
      width: 20px;
      height: 20px;
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
      width: 20px;
      height: 20px;
      // animation: spin 1s linear infinite; 
      border-left-color: red;
    }
  `;
  // 创建新的<style>元素并将CSS样式添加到其中
  var styleElement = document.createElement('style');
  styleElement.textContent = loadCss;

  // 将新的<style>元素添加到<head>元素中
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
    event.stopPropagation();

    // Get the previously existing animated text element (if any)
    // If it doesn't exist, it's assumed that the user doesn't need the code
    const animationElementList = document.querySelectorAll(".per-insert-code");

    // If the animated text element exists, it's assumed that the user wants to insert the code into the code block
    if (animationElementList.length === 1) {

      // delete animation element
      animationElementList[0].remove()

      // Set a new timeout for 2 seconds
      insertSuggestion(codeToFill);

    }

    // Reset the request successful flag
    isRequestSuccessful = false;
  }
};

async function process() {
  if (isRequestInProgress || isRequestSuccessful) {
    isRequestInProgress = false
    return
  }
  //Obtain the Textarea of the current input box
  const activeTextarea = document.activeElement;

  activeRequestTextarea = activeTextarea
  // Obtain the current input box (cell) from the Textarea of the current input box
  const activeCell = activeTextarea.parentElement.parentElement
  // Retrieve the content of the active cell 
  const code = getCellContentText(activeCell);

  if (!code) return;

  if (activeCell) {
    // Start Animation
    const [animationInterval, animationElement, inputElement] = startWaitingAnimation(activeCell)
    activeAnimationElement = animationElement
    isRequestInProgress = true
    let suggestion;

    // catch network errors
    try {
      suggestion = await getCodeCompletion(code)
    } catch {
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
      // cancel animation
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


// Check if the current page is a Jupyter Notebook
if (document.querySelector('body.notebook_app')) {

  document.addEventListener('keydown', async (event) => {
    // Check if the Ctrl + Space keys were pressed
    if (event.ctrlKey && event.code === 'Space') {

      if (document.querySelectorAll(".per-insert-code").length == 0) {
        isRequestSuccessful = false
      }

      // Block default events
      event.preventDefault();

      // If the request is being made or the request is successful
      if (isRequestInProgress || isRequestSuccessful) {
        return
      }

      await process()
    }


  });
  document.addEventListener('keydown', addFillCodeKeyListener);

}

