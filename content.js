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
        // Log the cell content to the console
        console.log(contextContent);

        // Suggestion handling
        const suggestion = 'your_suggestion_here'; // Replace with your actual suggestion
        insertSuggestion(activeCell, suggestion);
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
