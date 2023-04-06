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
        const cellContent = getCellContent(activeCell);

        // Log the cell content to the console
        console.log(activeCell);

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
