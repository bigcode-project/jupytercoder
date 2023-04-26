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

// Function to send request to OpenAI API
async function sendToOpenAI(prompt) {
  const apiKey = await getOpenAIKey();
  if (!apiKey) {
    // 总是忘记填写。。所以等了半天总是以为网络错误，改成了alert
    alert("OpenAI API key not set."); 
    return;
  }
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
    }),
    // 添加一个最大请求时间，目前没做相关于超时的处理，但如果超时了，就会在请求的单元格展示error
    timeout: 30000

  });
  const data = await response.json();
  const suggestion = data.choices && data.choices[0] && data.choices[0].message.content;
  // Use a regular expression to match the content between triple backticks
  const codeBlockRegex = /```([\s\S]*?)```/g;
  const match = codeBlockRegex.exec(suggestion);
  return match && match[1] ? match[1].replace(/\u200B/g, '') : '';
}

async function sendToOtherService(code) {
  const url = await getOtherServiceUrl();
  if (!url) {
    // 总是忘记填写。。所以等了半天总是以为网络错误，改成了alert
    alert("otherServiceUrl not set.");
    return;
  }
  const prompt = "<start_jupyter><jupyter_code>" + code.replace(/\u200B/g, '')
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      inputs: prompt,
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

    // Offset to the left of the pointer position
    const cursorOffsetLeft = parseFloat(style.getPropertyValue('left'))
    // Which line
    const lineIndex = parseFloat(style.getPropertyValue('top')) / 17
    // Obtain element for all line
    const linesElement = activeCell.getElementsByClassName('CodeMirror-line')
    // Code to obtain pointer position
    const spanElement = linesElement[lineIndex].querySelector('span span');
    // Get the offset to the left of the span element => equal to 4, +7 is the length of a font
    let charOffsetLeft = spanElement.offsetLeft + 7;

    for (let i = 0; i < linesElement.length; i++) {
      // If i equals the current number of rows, it indicates that the current row needs to be split
      if (i == lineIndex) {
        // Obtain text information for the current line
        let textContent = linesElement[i].textContent
        for (let j = 0; j < textContent.length; j++) {
          var char = textContent.charAt(j); // 获取当前字符
          if (charOffsetLeft < cursorOffsetLeft) {
            leftContext += char
          }else {
            rightContext += char
          }
          charOffsetLeft += 7; // Each character is separated by 7 pixels, and the offset is updated
        }
      }
      else if(i < lineIndex) {
        leftContext += linesElement[i].textContent + "\n"
      }else {
        rightContext += linesElement[i].textContent  + "\n"
      }
    }

    console.log("leftContext:", leftContext)
    console.log("rightContext:", rightContext)
    return [leftContext, rightContext]
}



function getCellContentText(activeCell) {
  const cellElements = Array.from(document.querySelectorAll('.cell'));
  const activeCellIndex = cellElements.findIndex(cell => cell.contains(activeCell));
  // Check if there are at least 3 cells before the active cell

  let combinedContent = "<start_jupyter>";
  
  // LeftContext refers to the left side of the pointer, and vice versa
  const [leftContext, rightContext] = getActiveCellPointerCode(activeCell)

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

  console.log("combinedContent",combinedContent);
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

// 开始等待动画，有30s等待时间，如果等待时间过了，出现“error”字体，返回两个值如下，接收："const [animationInterval, animationElement] = startWaitingAnimation(activeCall)"
// 1. animationInterval（interval, 动画计时器），可使用clearInterval(animationInterval)消除动画, 每次请求完毕必须要关掉
// 2. animationElement (dom, 动画字体节点)， animationElement.innerHTML = xxx 来赋值
const startWaitingAnimation = (activeCall) => {
  const activeCell = activeCall.querySelectorAll('.CodeMirror-scroll .CodeMirror-code');

  const lastElement = activeCell[activeCell.length - 1].querySelector('.CodeMirror-line:last-child');

  // Set the animated font dom element when it waits
  const animationElement = document.createElement('span');

  animationElement.classList.add("per-insert-code")
  animationElement.style.color = 'grey';

  lastElement.appendChild(animationElement);

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
      
      if (activeCell) {
        // Retrieve the content of the active cell 
        const code = getCellContentText(activeCell);

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
