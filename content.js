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
        console.log(activeCell.CodeMirror);

        // Suggestion handling
        const suggestion = 'your_suggestion_here'; // Replace with your actual suggestion
        handleSuggestion(activeCell.CodeMirror, suggestion);
      }
    }

    // Check if the ArrowRight key was pressed
    if (event.code === 'ArrowRight') {
      const activeCell = document.querySelector('.cell.selected .input_area .CodeMirror');
      if (activeCell) {
        validateSuggestion(activeCell.CodeMirror);
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

function handleSuggestion(cm, suggestion) {
  const cursor = cm.getCursor();
  cm.replaceRange(suggestion, cursor, null, '+suggest');
  const endPos = cm.getCursor();
  cm.markText(cursor, endPos, {
    className: 'greyed-suggestion',
    atomic: true,
    inclusiveRight: true,
  });
}

function validateSuggestion(cm) {
  const marks = cm.getAllMarks();
  if (marks.length) {
    const mark = marks[0];
    mark.clear();
    cm.setCursor(cm.getCursor());
  }
}
