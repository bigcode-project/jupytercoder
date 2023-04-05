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
          console.log(cellContent);
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
  