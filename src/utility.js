const utility = {
    /*
       Get Context Code text

        Params:
            activeCell: The cell dom that the user is operating on
            checkedMode: openai or bigcode
            currctJupyterModel: lab or notebook

        Returns: str
            Returns the corresponding formatting code based on the request mode selected by the current user
    */
   
    getCellContentText(activeCell, checkedMode, currctJupyterModel) { },

    /*
        Insert the code after the request

        Params:
            suggestion: code after the request
            activeRequestTextarea: The textarea dom that the user is operating on
    */
    insertSuggestion(suggestion, activeRequestTextarea) { },
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

        if (i < lineIndex) {
            leftContext += linesElement[i].textContent + "\n"
        } else if (i == lineIndex) {
            leftContext += linesElement[i].textContent
        } else {
            if (i == linesElement.length - 1) {
                rightContext += linesElement[i].textContent
            } else {
                rightContext += linesElement[i].textContent + "\n"
            }
        }

    }

    return [leftContext, rightContext]
}

function extractTextFromCodeCell(cell) {
    const codeMirrorLines = cell.querySelectorAll('.CodeMirror-code pre');

    const content = [];

    codeMirrorLines.forEach((line) => {
        content.push(line.textContent);
    });
    const content_str = content.join('\n');

    return content_str;
}

function extractTextFromTextCell(cell, currctJupyterModel) {
    const codeMirrorLines = cell.querySelectorAll(`.${currctJupyterModel.requiredClassName.textOutput} p`);

    const content = [];

    codeMirrorLines.forEach((line) => {
        content.push(line.textContent);
    });
    const content_str = content.join('\n');

    return content_str;
}


function getCellContentTextRequiredForOpenAI(activeCell, currctJupyterModel) {
    const cellElements = Array.from(document.querySelectorAll(`.${currctJupyterModel.requiredClassName.cell}`));
    const activeCellIndex = cellElements.findIndex(cell => cell.contains(activeCell));
    // Check if there are at least 3 cells before the active cell
    let codeContent = "";

    // LeftContext refers to the left side of the pointer, and vice versa, If both are null, it is determined that the pointer is not at the far right
    const [leftContext, rightContext] = getActiveCellPointerCode(activeCell)

    if (!leftContext) {
        return null
    }

    // Iterate through the last 3 cells before the active cell
    const startIndex = 0;
    for (let i = startIndex; i <= activeCellIndex; i++) {
        if (i == activeCellIndex) {
            codeContent += leftContext
            break
        } else {
            const cellElement = cellElements[i];
            if (cellElement.classList.contains(currctJupyterModel.requiredClassName.verify)) {
                codeContent += extractTextFromTextCell(cellElement, currctJupyterModel);
            }
        }
        codeContent += "\n"
    }

    return codeContent;
}


function getCellContentTextRequiredForBigCode(activeCell, currctJupyterModel) {
    const cellElements = Array.from(document.querySelectorAll(`.${currctJupyterModel.requiredClassName.cell}`));
    const activeCellIndex = cellElements.findIndex(cell => cell.contains(activeCell));
    // Check if there are at least 3 cells before the active cell
    let combinedContent = "<start_jupyter>";

    // in active cell, LeftContext refers to the left side of the pointer, and vice versa, If both are null, it is determined that the pointer is not at the far right
    const [leftContext, rightContext] = getActiveCellPointerCode(activeCell)

    if (!leftContext && !rightContext) {
        return null
    }


    TODO: "The following code needs to add 'leftContext' and 'rightContext'"
    // Iterate through the last 3 cells before the active cell
    const startIndex = activeCellIndex - 3 < 0 ? 0 : activeCellIndex - 3;

    for (let i = startIndex; i <= activeCellIndex; i++) {
        const cellElement = cellElements[i];

        if (cellElement.classList.contains(currctJupyterModel.requiredClassName.verify)) {
            const code = extractTextFromCodeCell(cellElement);

            combinedContent += `<jupyter_code>${code}`;
            const outputElement = cellElement.querySelector(`.${currctJupyterModel.requiredClassName.output}`);
            if (outputElement) {
                if (i !== activeCellIndex) {
                    combinedContent += `<jupyter_output>`;
                    combinedContent += outputElement.textContent;
                }
            }
        } else if (cellElement.classList.contains(currctJupyterModel.requiredClassName.text)) {
            const text = extractTextFromTextCell(cellElement, currctJupyterModel);
            combinedContent += `<jupyter_text>${text}`;
        }
    }

    return combinedContent;
}


utility.getCellContentText = (activeCell, checkedMode, currctJupyterModel) => {
    switch (checkedMode) {
        case "openaiApiKey": return getCellContentTextRequiredForOpenAI(activeCell, currctJupyterModel);
        case "otherService": return getCellContentTextRequiredForBigCode(activeCell, currctJupyterModel)
    }
}



utility.insertSuggestion = (suggestion, activeRequestTextarea) => {
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


window.utility = utility