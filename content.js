async function getOpenAIKey() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "getApiKey" }, (response) => {
      resolve(response.apiKey);
    });
  });
}

// Function to send request to OpenAI API
async function sendToOpenAI(prompt) {
  const apiKey = await getOpenAIKey();
  console.log('API Key: ' + apiKey)
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
  return data.choices && data.choices[0] && data.choices[0].message.content;
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
  const prompt = `
I have the following code:

\`\`\`
${code}
\`\`\`

Please provide the missing code to complete the task. (do not include code that is already present in the prompt)
`;

  return await sendToOpenAI(prompt);
}

// Check if the current page is a Jupyter Notebook
if (document.querySelector('body.notebook_app')) {

  document.addEventListener('keydown', async (event) => {
    // Check if the Ctrl + Space keys were pressed
    if (event.ctrlKey && event.code === 'Space') {
      // 防止默认事件
      event.preventDefault();

      // 获取当前输入框的Textarea
      const activeTextarea = document.activeElement;

      requestingTextarea = activeTextarea

      // 从当前输入框的Textarea获取当前输入框（单元格）
      const activeCell = activeTextarea.parentElement.parentElement

      if (activeCell) {
        // Retrieve the content of the active cell
        const allCells = document.querySelectorAll('.cell .input_area .CodeMirror');
        const cellContent = getCellContent(activeCell);
        const contextContent = getPreviousCellsContent(activeCell, allCells);
        const code = contextContent + '\n' + cellContent;

        // 开始动画
        const [animationInterval, animationElement] = startWaitingAnimation(activeCell)

        isRequtest = true
        const suggestion = await getCodeCompletion(code)
        if(suggestion){
          // Use a regular expression to match the content between triple backticks
          const codeBlockRegex = /```([\s\S]*?)```/g;
          const match = codeBlockRegex.exec(suggestion);
          const extractedCode = match && match[1] ? match[1].trim() : '';

          clearInterval(animationInterval)
          isRequtestSuccess = true
          isRequtest = false
          readyToFillCode = extractedCode
          animationElement.innerHTML = extractedCode
          
        }
        
        
      }
    }
  });

  function getCellContent(cell) {
    const codeMirrorLines = cell.querySelectorAll('.CodeMirror-code pre');
    const content = [];

    codeMirrorLines.forEach((line) => {
      content.push(line.textContent);
    });

    return content.join('\n');
  }
}


// 添加tab监听器，用户请求完毕后按下tab键填入代码
const addTabEvent = (event) => {
  if (event.key === "Tab" && !isRequtest && isRequtestSuccess) {
    event.preventDefault();
    insertSuggestion(readyToFillCode)

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
  requestingTextarea.value = "\n" + newValue;

  // Update the cursor position after inserting the suggestion
  requestingTextarea.selectionStart = requestingTextarea.selectionEnd = cursorPosition + suggestion.length;

  // Trigger a change event on the textarea to update the CodeMirror instance
  const event = new Event('input', { bubbles: true, cancelable: true });
  requestingTextarea.dispatchEvent(event);

}



function getPreviousCellsContent(activeCell, allCells) {
  const previousCellsContent = [];
  let codeCellCount = 0;

  for (const cell of allCells) {
    // Stop when the active cell is reached or when three code cells have been processed
    if (cell === activeCell) break;

    // Check if the cell is a code cell
    const isCodeCell = cell.closest('.cell').classList.contains('code_cell');
    if (isCodeCell) {
      const cellContent = getCellContent(cell);
      previousCellsContent.push(cellContent); // Add the content to the end of the array
      codeCellCount++;
    }
  }

  // Reverse the array to have the content in the correct order
  const lastThreeCellsContent = previousCellsContent.slice(-3);

  return lastThreeCellsContent.join('\n');
}




// 开始等待动画，有30s等待时间，如果等待时间过了，出现“error”字体，返回两个值如下，接收："const [animationInterval, animationElement] = startWaitingAnimation(activeCall)"
// 1. animationInterval（interval, 动画计时器），可使用clearInterval(animationInterval)消除动画, 每次请求完毕必须要关掉
// 2. animationElement (dom, 动画字体节点)， animationElement.innerHTML = xxx 来赋值
const startWaitingAnimation = (activeCall) => {
  const activeCell = activeCall.querySelectorAll('.CodeMirror-scroll .CodeMirror-code');

  // 创建于notebook的代码格式相同的dom元素
  const animationParentElement = document.createElement('pre');
  animationParentElement.classList.add('CodeMirror-line');

  // 设置它等待的动画字体颜色
  animationParentElement.style.color = 'grey';

  // 设置它等待时的动画字体dom元素
  const animationElement = document.createElement('span');

  animationParentElement.appendChild(animationElement);

  // 只可能有一个dom元素，所以直接使用[0]
  activeCell[0].appendChild(animationParentElement);
  
  // 等待步数，每步0.333s
  let timeLeft = 90;
  const animationInterval = setInterval(()=>{
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

    animationElement.innerHTML = animatedText + " time left: " + Math.floor(timeLeft-- / 3) + "s"

    // 请求失败
    if(timeLeft <= 0){
      animationElement.innerHTML = "error"
      clearInterval(animationInterval)
    }

  }, 333)

  return [animationInterval,animationElement]
} 