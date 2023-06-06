// Call Link: getCodeFormat -> getCellContentText -> getCellContentTextRequiredForBigCode/getCellContentTextRequiredForOpenAI -> getActiveContext -> getActiveCellPointerCode/getCellCode

const utility = {
    /*
       Get Context Code text

        Params:
            checkedMode: openai or bigcode
            currctJupyterModel: lab or notebook
            requestType: normal or fixBug


        Returns: str
            Returns the corresponding formatting code based on the request mode selected by the current user
    */
    getCodeFormat(checkedMode, currctJupyterModel, requestType) {},
    /*
        Insert the code after the request

        Params:
            suggestion: code after the request
            activeRequestTextarea: The textarea dom that the user is operating on
    */
    insertSuggestion(suggestion, activeRequestTextarea) { },
    insertSuggestionFixBug(suggestion, activeRequestTextarea, currctJupyterModel) { },

    // Hide the code of the current cell user
    enableCellCode(activeRequestTextarea) {},
    // Clear displayed code
    clearShowcasingCode(activeRequestTextarea) {},

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
    const linesElement = activeCell.querySelectorAll('.CodeMirror-line:not(.displayed)')

    // code dom element length in active line
    const codeElementWdth = linesElement[lineIndex].querySelector("span").offsetWidth

    let cursorAtEndInLine = true
    // Determine whether the pointer is at the end of a line, Because there is a left marring, so -4, but due to precision issues so -3
    if (cursorOffsetLeft - 3 < codeElementWdth) {
        cursorAtEndInLine = false

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

    return [cellContent, cursorAtEndInLine]

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
            const [activeCellContent, cursorAtEndInLine] = getActiveCellPointerCode(activeCell, i, currctJupyterModel)
            if (!cursorAtEndInLine) return []

            context = [...context, ...activeCellContent]
        } else if (i < activeCellIndex) {
            const cellContent = getCellCode(cellElements[i], i, currctJupyterModel)
            context = [...context, ...cellContent]
        }
    }

    return context
}



const judgeIsTheLastLine = (context, currrntIndex) => {
    if (currrntIndex == context.length - 1) {
        return true
    }

    currrntIndex++

    for (currrntIndex; currrntIndex < context.length; currrntIndex++) {

        const lineInformation = context[currrntIndex]

        if (lineInformation.type == "output"){
            return true
        }

        // replace '$ZeroWidthSpace;'
        if (lineInformation.content.replace("​", '').length != 0) {
            return false
        }

    }

    return true
}
 


const getCellContentTextRequiredForOpenAI = (currctJupyterModel) => {
    const context = getActiveContext(currctJupyterModel)

    if(context.length == 0){
        return [null, null]
    }


    let prompt = ""
    let isLastLine = true

    for (let index = 0; index < context.length; index++) {
        const lineInformation = context[index]

        if (lineInformation.isCursor) {
            prompt += lineInformation.content
            isLastLine = isLastLine = judgeIsTheLastLine(context, index)
            break
        }

        if (index == context.length - 1) {
            prompt += lineInformation.content
            break
        }

        if (lineInformation.type == "code") {
            prompt += lineInformation.content + "\n"
        }
    }

    return [prompt, isLastLine]
}



function getCellContentTextRequiredForBigCode(currctJupyterModel) {
    const context = getActiveContext(currctJupyterModel)

    if(context.length == 0){
        return [null, null]
    }


    let prompt = "<start_jupyter>"
    let cellCodeText = ""
    let isLastLine = true

    for (let index = 0; index < context.length; index++) {
        const lineInformation = context[index]

        if (lineInformation.isCursor) {
            prompt += bigcodeFormattPrefixMap[lineInformation.type] + cellCodeText + lineInformation.content
            isLastLine = judgeIsTheLastLine(context, index)
            break
        }

        if (index == context.length - 1) {
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

    return [prompt, isLastLine]
}



const getCellContentText = (checkedMode, currctJupyterModel) => {
    switch (checkedMode) {
        case "OpenAI": return getCellContentTextRequiredForOpenAI(currctJupyterModel);
        case "BigCode": return getCellContentTextRequiredForBigCode(currctJupyterModel);
        default: return [null, null]
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


function parseErrorFullmessage(message) {
    const meassgeLines = message.split("\n").filter((line) => {
        return line != "" && line != " "
    })
    return meassgeLines[meassgeLines.length - 1]
}


const formatCodeAndBugIllustrate = (currctJupyterModel) => {
    const activeCell = document.activeElement.parentElement.parentElement;
    const [codeLineInformation, cursorAtEndInLine] = getActiveCellPointerCode(activeCell, 0, currctJupyterModel)

    let code = "<commit_before>"
    let errorMessageIndex = -1
    for (let index = 0; index < codeLineInformation.length; index++) {
        const lineInformation = codeLineInformation[index]

        if (lineInformation.type == "output") {
            // Determine if the next one is also an output, there can only be two consecutive outputs at most
            if (index < codeLineInformation.length - 1 && codeLineInformation[index + 1].type == "output") {
                errorMessageIndex = index + 1
            } else {
                errorMessageIndex = index
            }
            break
        }

        if (index == codeLineInformation.length - 1) {
            code += lineInformation.content
            break
        } else if (codeLineInformation[index + 1].type != "output") {
            code += lineInformation.content + "\n"
        } else {
            code += lineInformation.content
        }

    }

    if (errorMessageIndex == -1) {
        return ""
    }

    // Unified return of results with method 'getCellContentText', reduce code logic
    return [`${code}<commit_msg>fix bug, ${parseErrorFullmessage(codeLineInformation[errorMessageIndex].content)}<commit_after>`, true]
}



utility.getCodeFormat = (checkedMode, currctJupyterModel, requestType) => {
    switch (requestType) {
        case "normal": return getCellContentText(checkedMode, currctJupyterModel);
        case "fixBug": return formatCodeAndBugIllustrate(currctJupyterModel);
        default: return ""
    }
}

const viewDiffCode = (html, activeRequestTextarea) => {
    disableCellCode(activeRequestTextarea)
    const activeCell = activeRequestTextarea.parentElement.parentElement;
  
    // Due to the need to hide user code, the previous preview logic cannot be used
    const codeMirrorCode = activeCell.querySelector(".CodeMirror-code")
    const codeMirrorCodeLine = document.createElement('pre');
    codeMirrorCodeLine.classList.add("CodeMirror-line", "displayed", "per-insert-code")

    codeMirrorCodeLine.innerHTML = html
    codeMirrorCode.appendChild(codeMirrorCodeLine)
}



const generateCompareCodesText = (codeFormat, suggestion) =>{
    const { Diff } = window;
    const preCodeMesageSplit = codeFormat.split("<commit_msg>")
    const preCode = preCodeMesageSplit[0].slice(15)
    
    let html = []
    const diff = Diff.diffChars(preCode, suggestion)
 
    diff.forEach((part) => {
        let blockContent = part.value
       
        if (part.added){
            html.push(`<span style="color: green;">${blockContent}</span>`)
        }else if(part.removed){
            html.push(`<span style="color: red;">${blockContent}</span>`)
        }else{
            html.push(`<span style="color: grey;">${blockContent}</span>`)
        }

    });

    return html.join('')
}

utility.viewCodeResult = (suggestion, animationElement, codeFormat, requestType, activeRequestTextarea) => {
    switch (requestType) {
        case "normal": animationElement.innerHTML = suggestion; break;
        case "fixBug": viewDiffCode(generateCompareCodesText(codeFormat, suggestion), activeRequestTextarea); break;
    }
}

const simulateUserPressingBackspace = (activeRequestTextarea) => {
    if (activeRequestTextarea) {
        let event = new KeyboardEvent("keydown", { key: "Backspace", keyCode: 8, which: 8, code: "Backspace" });
        activeRequestTextarea.dispatchEvent(event);
    }
}

const simulateUserPressingMoveMouseRight = (activeRequestTextarea) => {
    if (activeRequestTextarea) {
        let event = new KeyboardEvent("keydown", { key: "ArrowRight", keyCode: 39, which: 39, code: "ArrowRight" });
        activeRequestTextarea.dispatchEvent(event);
    }
}


// Hide all code for the active cell
const disableCellCode = (textarea) => {
    const activeCell = textarea.parentElement.parentElement
    const codeMirrorLines = activeCell.querySelectorAll('.CodeMirror-code pre');
    for (let i = 0; i < codeMirrorLines.length; i++) {
        codeMirrorLines[i].style.display = "none"
    }
}

// Restore all code that hides the current cell
utility.enableCellCode = (textarea) => {
    const activeCell = textarea.parentElement.parentElement
    const codeMirrorLines = activeCell.querySelectorAll('.CodeMirror-code pre');
    for (let i = 0; i < codeMirrorLines.length; i++) {
        codeMirrorLines[i].style.display = "block"
    }
}

utility.insertSuggestionFixBug = (suggestion, activeRequestTextarea, currctJupyterModel) => {
    // Focus the textarea, otherwise, it is not possible to insert the suggestion using the Tab key from another location
    activeRequestTextarea.focus();
    const [cellContent, cursorAtEndInLine] = getActiveCellPointerCode(activeRequestTextarea.parentElement.parentElement, 0, currctJupyterModel)

    for (let index = 0; index < cellContent.length; index++) {
        if (cellContent[index].type == "output"){
            continue
        }
        
        for (let j = 0; j <= cellContent[index].content.length; j++) {
            simulateUserPressingMoveMouseRight(activeRequestTextarea)
            simulateUserPressingBackspace(activeRequestTextarea)
        }
    }

    utility.enableCellCode(activeRequestTextarea)

    activeRequestTextarea.value = suggestion;

    // Trigger an input event on the textarea to update the CodeMirror instance
    const event = new Event('input', { bubbles: true, cancelable: true });
    activeRequestTextarea.dispatchEvent(event);
}


utility.clearShowcasingCode = (activeRequestTextarea) => {
    utility.enableCellCode(activeRequestTextarea)
    const activeCell = activeRequestTextarea.parentElement.parentElement;
  
    // Due to the need to hide user code, the previous preview logic cannot be used
    const displayedCodeElement = activeCell.querySelector(".displayed")
    if(displayedCodeElement) displayedCodeElement.remove();
}

window.utility = utility