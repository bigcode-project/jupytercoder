const OPENAI_API_KEY = "your_api_key";

// Function to send request to OpenAI API
async function sendToOpenAI(prompt) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await response.json();
  return data.choices && data.choices[0] && data.choices[0].message.text;
}

async function getCodeCompletion(code) {
  const prompt = `
I have the following code:

\`\`\`
${code}
\`\`\`

Please provide the missing code to complete the task.
`;

  return await sendToOpenAI(prompt);
}

// Check if the current page is a Jupyter Notebook
if (document.querySelector('body.notebook_app')) {
  document.addEventListener('keydown', (event) => {
    // Check if the Ctrl + Space keys were pressed
    if (event.ctrlKey && event.code === 'Space') {
      event.preventDefault();

      // Find the active cell in the Jupyter Notebook
      const activeCell = document.querySelector('.cell.selected .input_area .CodeMirror');
      if (activeCell) {
        // Retrieve the content of the active cell
        const allCells = document.querySelectorAll('.cell .input_area .CodeMirror');
        const cellContent = getCellContent(activeCell);
        const contextContent = getPreviousCellsContent(activeCell, allCells);
        const code = contextContent + '\n' + cellContent;
        // Log the cell content to the console
        // console.log(code);

        // Suggestion handling
        // cannot handle async function like this
        getCodeCompletion(code).then((suggestion) => {
          console.log(suggestion);
          insertSuggestion(activeCell, suggestion);
        }
        );
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

function insertSuggestion(cell, suggestion) {
  // Get the textarea inside the div
  const textarea = cell.querySelector('textarea');

  if (textarea) {
    // Get the current cursor position
    const cursorPosition = textarea.selectionStart;

    // Insert the suggestion at the cursor position
    const newValue = textarea.value.slice(0, cursorPosition) + suggestion + textarea.value.slice(cursorPosition);
    textarea.value = newValue;

    // Update the cursor position after inserting the suggestion
    textarea.selectionStart = textarea.selectionEnd = cursorPosition + suggestion.length;

    // Trigger a change event on the textarea to update the CodeMirror instance
    const event = new Event('input', { bubbles: true, cancelable: true });
    textarea.dispatchEvent(event);
  }
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
