// Call Link: getCellContentText -> getCellContentTextRequiredForBigCode/getCellContentTextRequiredForOpenAI -> getActiveContext -> getActiveCellPointerCode/getCellCode

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




const bigcodeFormattPrefixMap = {
    "code": "<jupyter_code>",
    "text": "<jupyter_text>",
    "output": "<jupyter_output>"
}


const getCellCode = (cellElement, cellIndex, currctJupyterModel) => {
    const cellContent = []

    if (cellElement.classList.contains(currctJupyterModel.requiredClassName.verify)) {
        const codeLines = cellElement.querySelectorAll('.CodeMirror-line')

        for (let i = 0; i < codeLines.length; i++) {
            cellContent.push({
                "content": codeLines[i].textContent,
                "cellIndex": cellIndex,
                "isCursor": false,
                "type": "code",
                "lineIndex": i
            })
        }

        const outputElement = cellElement.querySelector(`.${currctJupyterModel.requiredClassName.output}`);

        if (outputElement && outputElement.textContent) {
            cellContent.push({
                "content": outputElement.textContent,
                "cellIndex": cellIndex,
                "isCursor": false,
                "type": "output",
                "lineIndex": 0
            })
        }

    } else if (cellElement.classList.contains(currctJupyterModel.requiredClassName.text)) {
        const textLines = cellElement.querySelectorAll(`.${currctJupyterModel.requiredClassName.textOutput} p`)

        for (let i = 0; i < textLines.length; i++) {
            cellContent.push({
                "content": textLines[i].textContent,
                "cellIndex": cellIndex,
                "isCursor": false,
                "type": "text",
                "lineIndex": i
            })
        }
    } else {
        return []
    }

    return cellContent;
}


const getActiveCellPointerCode = (activeCell, cellIndex, currctJupyterModel) => {
    let cellContent = []

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
        if (i == lineIndex) {
            cellContent.push({
                "content": linesElement[i].textContent,
                "cellIndex": cellIndex,
                "isCursor": true,
                "type": "code",
                "lineIndex": i
            })
        } else {
            cellContent.push({
                "content": linesElement[i].textContent,
                "cellIndex": cellIndex,
                "isCursor": false,
                "type": "code",
                "lineIndex": i
            })
        }
    }

    // Get complete cells
    const fullCell = activeCell.parentElement.parentElement.parentElement.parentElement

    const outputElement = fullCell.querySelectorAll(`.${currctJupyterModel.requiredClassName.output}`);

    if (outputElement) {
        outputElement.forEach(element => {
            cellContent.push({
                "content": element.textContent,
                "cellIndex": cellIndex,
                "isCursor": false,
                "type": "output",
                "lineIndex": 0
            })
        });
    }
    return cellContent
}


/*
    Get Active Cell Context

    Params:
        currctJupyterModel: refer to content.js

    Returns:
        Example: [
            {cellIndex: 0, content: "# load Digits Dataset from sklearn", isCursor : false, lineIndex: 0, type: "code"}
            {cellIndex: 0, content: "from sklearn.datasets import load_digits", isCursor : false, lineIndex: 1, type: "code"}
            {cellIndex: 0, content: "", isCursor : false, lineIndex: 2, type: "code"}
            {cellIndex: 1, content: "Print to show there are 1797 images (8 by 8 images for a dimensionality of 64)", isCursor : false, lineIndex: 0, type: "text"}
            {cellIndex: 1, content: "Print to show there are 1797 labels (integers from 0–9)", isCursor : false, lineIndex: 1, type: "text"}
            {cellIndex: 2, content: "# print the shape of the images and labels", isCursor : false, lineIndex: 0, type: "code"}
            {cellIndex: 2, content: "", isCursor : true, lineIndex: 1, type: "code"}
        ]

*/
const getActiveContext = (currctJupyterModel) => {
    // Obtain the current input box (cell) from the Textarea of the current input box
    const activeCell = document.activeElement.parentElement.parentElement;

    const cellElements = Array.from(document.querySelectorAll(`.${currctJupyterModel.requiredClassName.cell}`));
    const activeCellIndex = cellElements.findIndex(cell => cell.contains(activeCell));
    let context = []

    for (let i = 0; i < cellElements.length; i++) {
        if (i == activeCellIndex) {
            const activeCellContent = getActiveCellPointerCode(activeCell, i, currctJupyterModel)
            context = [...context, ...activeCellContent]
        } else if (i < activeCellIndex) {
            const cellContent = getCellCode(cellElements[i], i, currctJupyterModel)
            context = [...context, ...cellContent]
        }
    }

    return context
}




const getCellContentTextRequiredForOpenAI = (currctJupyterModel) => {
    const context = getActiveContext(currctJupyterModel)

    let prompt = ""

    for (let index = 0; index < context.length; index++) {
        const lineInformation = context[index]

        if (index == context.length - 1 || lineInformation.isCursor) {
            prompt += lineInformation.content
            break
        }

        if (lineInformation.type == "code") {
            prompt += lineInformation.content + "\n"
        }
    }

    return prompt
}


function getCellContentTextRequiredForBigCode(currctJupyterModel) {
    const context = getActiveContext(currctJupyterModel)

    let prompt = "<start_jupyter>"
    let cellCodeText = ""

    for (let index = 0; index < context.length; index++) {
        const lineInformation = context[index]

        // If output is required, comment out this line
        if (lineInformation.type == "output") continue

        if (index == context.length - 1 || lineInformation.isCursor) {
            prompt += bigcodeFormattPrefixMap[lineInformation.type] + cellCodeText + lineInformation.content
            break
        }

        const nextLineInformation = context[index + 1]

        if (lineInformation.cellIndex != nextLineInformation.cellIndex || lineInformation.type != nextLineInformation.type) {
            prompt += bigcodeFormattPrefixMap[lineInformation.type] + cellCodeText + lineInformation.content
            cellCodeText = ""
        } else {
            cellCodeText += lineInformation.content + "\n"
        }

    }

    return prompt
}


utility.getCellContentText = (checkedMode, currctJupyterModel) => {
    switch (checkedMode) {
        case "OpenAI": return getCellContentTextRequiredForOpenAI(currctJupyterModel);
        case "BigCode": return getCellContentTextRequiredForBigCode(currctJupyterModel)
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