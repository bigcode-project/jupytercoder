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

    getCodeFormat(checkedMode, currctJupyterModel, requestType) { },

    /*
        Insert the code after the request

        Params:
            suggestion: code after the request
            activeRequestTextarea: The textarea dom that the user is operating on
    */
    insertSuggestion(suggestion, activeRequestTextarea) { },
    generateCompareCodes(oldcode, newcode) { },
    
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


const getCellContentText = (checkedMode, currctJupyterModel) => {
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


// Levenshtein distance, Obtain similarity based on distance
const levenshteinDistanceDP = (str1, str2) => {
    const m = str1.length;
    const n = str2.length;
    const dp = Array(n + 1).fill(0);

    for (let j = 1; j <= n; j++) {
        dp[j] = j;
    }

    for (let i = 1; i <= m; i++) {
        let prev = dp[0];
        dp[0] = i;
        for (let j = 1; j <= n; j++) {
            let temp = dp[j];
            if (str1[i - 1] === str2[j - 1]) {
                // Characters are equal and no action is required
                dp[j] = prev;
            } else {
                // Characters are not equal, take the minimum value of adjacent position operands and add 1
                dp[j] = Math.min(dp[j - 1], dp[j], prev) + 1;
            }
            prev = temp;
        }
    }

    return dp[n];
}

const compareCodeLines = (codeLine1, codeLine2) => {
    codeLine1 = codeLine1.toLowerCase();
    codeLine2 = codeLine2.toLowerCase();

    const distance = levenshteinDistanceDP(codeLine1, codeLine2);

    const similarityScore = 1 - distance / Math.max(codeLine1.length, codeLine2.length);

    return similarityScore >= 0.8;
}



// Due to the presence of a large number of invisible characters, replace them
let invisibleCodeReg = /[\u200B-\u200D\uFEFF]/g
utility.generateCompareCodes = (oldCode, newCode) => {

    oldCode = oldCode.replace(invisibleCodeReg, "")
    newCode = newCode.replace(invisibleCodeReg, "")

    // Split the strings into lines and store them in separate arrays
    const oldCodeLine = oldCode.split('\n');
    const newCodeLine = newCode.split('\n');


    // Create an empty array to store the generated HTML
    let html = [];
    let newCodeIndex = 0

    // Iterate over the lines and compare them
    for (let i = 0; i < oldCodeLine.length; i++) {

        if (newCodeIndex == newCodeLine.length) {
            for (i; i < oldCodeLine.length; i++) {
                html.push(`<span style="color: red;">- ${oldCodeLine[i]}</span>`)
            }
            break;
        }

        const oldLine = oldCodeLine[i];
        const newLine = newCodeLine[newCodeIndex];

        // If the lines are the same, generate a gray span
        if (oldLine === newLine) {
            html.push(`<span style="color: #787878">= ${oldLine}</span>`);
            newCodeIndex++;
        } else if (compareCodeLines(oldLine, newLine)) {// Determine the similarity here. If it is similar, it will be considered a code error. The old one will be highlighted in red and added below (green)
            html.push(`<span style="color: red;">- ${oldLine}</span>`)
            html.push(`<span style="color: green;">+ ${newLine}</span>`)
            newCodeIndex++
        } else {
            // If it is completely different, it will be considered as a new code snippet and added directly above (green)

            let newCodeAssistIndex = newCodeIndex
            // Prepare to insert code with HTML
            const perInsertCode = []

            let isAddedOldCode = false
            // Check which line of the new code is similar to the old one
            for (newCodeAssistIndex; newCodeAssistIndex < newCodeLine.length; newCodeAssistIndex++) {
                if (oldLine == newCodeLine[newCodeAssistIndex] || compareCodeLines(oldLine, newCodeLine[newCodeIndex])) {
                    for (newCodeIndex; newCodeIndex < newCodeAssistIndex; newCodeIndex++) {
                        perInsertCode.push(`<span style="color: green;">+ ${newCodeLine[newCodeIndex]}</span>`)
                    }
                } else {
                    if (i < oldCodeLine.length) {
                        perInsertCode.push(`<span style="color: red;">- ${oldCodeLine[i++]}</span>`)
                        isAddedOldCode = true
                    }
                    perInsertCode.push(`<span style="color: green;">+ ${newCodeLine[newCodeIndex++]}</span>`)
                }
            }
            if (isAddedOldCode) i--
            html = [...html, ...perInsertCode]
        }
    }

    // Join the generated HTML and return it
    return html.join('\n');
}

function parseErrorFullmessage(message) {
    const meassgeLines = message.split("\n").filter((line) => {
        return line != "" && line != " "
    })
    return meassgeLines[meassgeLines.length - 1]
}


const formatCodeAndBugIllustrate = (currctJupyterModel) => {
    const activeCell = document.activeElement.parentElement.parentElement;
    const codeLineInformation = getActiveCellPointerCode(activeCell, 0, currctJupyterModel)

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


    return `${code}<commit_msg>fix bug, ${parseErrorFullmessage(codeLineInformation[errorMessageIndex].content)}<commit_after>`
}



utility.getCodeFormat = (checkedMode, currctJupyterModel, requestType) => {
    switch (requestType) {
        case "normal": return getCellContentText(checkedMode, currctJupyterModel);
        case "fixBug": return formatCodeAndBugIllustrate(currctJupyterModel);
        default: return ""
    }
}

window.utility = utility