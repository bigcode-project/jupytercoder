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
  console.log("[prompt]", JSON.stringify(prompt));
  const data = await response.json();
  if (/^\n/.test(data)) {
    data = data.replace(/^\n/, '');
  }
  // 格式处理成可以输出到notebook的字符串
  return data[0].generated_text;
}

// 请求完毕后准备填入的代码
let readyToFillCode = ""
// 是否正在请求（防止多次请求等问题）
let isRequtest = false
// 是否请求成功（防止用户在本次未请求完就按下Tab）
let isRequtestSuccess = false
// 请求时的输入框 (提供一边请求一边去别的单元格写代码的功能)
let requestingTextarea = null


async function getCodeCompletion(code) {
  const checked = await getChecked();
  // 如果没有选择则弹出框提示
  return "suggestions";
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

// Check if the current page is a Jupyter Notebook
if (document.querySelector('body.notebook_app')) {

  document.addEventListener('keydown', async (event) => {
    // Check if the Ctrl + Space keys were pressed
    if (event.ctrlKey && event.code === 'Space') {
      // 防止默认事件
      event.preventDefault();

      if (isRequtest || isRequtestSuccess) {
        return
      }

      // 获取当前输入框的Textarea
      const activeTextarea = document.activeElement;

      requestingTextarea = activeTextarea

      // 从当前输入框的Textarea获取当前输入框（单元格）
      const activeCell = activeTextarea.parentElement.parentElement

      if (activeCell) {
        // Retrieve the content of the active cell 
        const code = getCellContentText(activeCell);
        console.log("[PROMPT]", code)

        // 开始动画
        const [animationInterval, animationElement] = startWaitingAnimation(activeCell)

        isRequtest = true
        const suggestion = await getCodeCompletion(code)
        if (suggestion) {
          clearInterval(animationInterval)
          isRequtestSuccess = true
          isRequtest = false
          readyToFillCode = suggestion

          // 将文字动画框的内容替换成code
          animationElement.innerHTML = suggestion
        }


      }
    }
  });



  function getCellContentText(activeCell) {

    const cellElements = Array.from(document.querySelectorAll('.cell'));
    const activeCellIndex = cellElements.findIndex(cell => cell.contains(activeCell));
    // Check if there are at least 3 cells before the active cell

    let combinedContent = "<start_jupyter>";

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
}

function extractTextFromCell(cell) {
  const codeMirrorLines = cell.querySelectorAll('.CodeMirror-code pre');
  const content = [];

  codeMirrorLines.forEach((line) => {
    content.push(line.textContent);
  });

  return content.join('\n');
}

// 添加tab监听器，用户请求完毕后按下tab键填入代码
const addTabEvent = (event) => {
  if (event.ctrlKey && !isRequtest && isRequtestSuccess) {
    event.preventDefault();

    // 获取之前的动画文字Dom（有且只能存在一个或者不存在），如果之前的动画文字框不存在，则在逻辑中认为用户不需要这段代码
    const animationElementList = document.querySelectorAll(".per-insert-code")

    // 动画文字Dom存在，则在逻辑中认为用户想把这段代码插入到代码块中
    if(animationElementList.length == 1){
      insertSuggestion(readyToFillCode)
    }

    //关闭请求成功的状态
    isRequtestSuccess = false
  }
}


document.addEventListener('keydown', addTabEvent)

function insertSuggestion(suggestion) {
  // 获取焦点，否则无法从其他位置按下Tab插入
  requestingTextarea.focus();

  // Get the current cursor position
  const cursorPosition = requestingTextarea.selectionStart;

  // Insert the suggestion at the cursor position
  const newValue = requestingTextarea.value.slice(0, cursorPosition) + suggestion + requestingTextarea.value.slice(cursorPosition);
  requestingTextarea.value = newValue;

  // Update the cursor position after inserting the suggestion
  const newCursorPosition = cursorPosition + suggestion.length;
  requestingTextarea.selectionStart = requestingTextarea.selectionEnd = cursorPosition + suggestion.length;

  // Trigger an input event on the textarea to update the CodeMirror instance
  const event = new Event('input', { bubbles: true, cancelable: true });
  requestingTextarea.dispatchEvent(event);

  // Trigger a keydown event with Tab key to perform auto-indentation
  const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
  requestingTextarea.dispatchEvent(tabEvent);
}


// 开始等待动画，有30s等待时间，如果等待时间过了，出现“error”字体，返回两个值如下，接收："const [animationInterval, animationElement] = startWaitingAnimation(activeCall)"
// 1. animationInterval（interval, 动画计时器），可使用clearInterval(animationInterval)消除动画, 每次请求完毕必须要关掉
// 2. animationElement (dom, 动画字体节点)， animationElement.innerHTML = xxx 来赋值
const startWaitingAnimation = (activeCall) => {
  const activeCell = activeCall.querySelectorAll('.CodeMirror-scroll .CodeMirror-code');

  const lastElement = activeCell[activeCell.length - 1].querySelector('.CodeMirror-line:last-child');

  // 设置它等待时的动画字体dom元素
  const animationElement = document.createElement('span');

  animationElement.classList.add("per-insert-code")
  animationElement.style.color = 'grey';

  lastElement.appendChild(animationElement);

  // 等待步数，每步0.333s
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

    // 请求失败
    if (timeLeft <= 0) {
      animationElement.innerHTML = "error"
      clearInterval(animationInterval)
    }

  }, 333)
  return [animationInterval, animationElement]
}


