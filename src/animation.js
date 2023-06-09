const animation = {
  /*
   Start requested animation

   Params:
    activeTextarea: Textarea in active cell 

   Returns: list, len == 3 
    0. animationInterval: Animation interval, can be cleared using the 'clearInterval' function
    1. animationElement: Animation dom element
    2. activeCellElement: The parent dom of the current cell

  */
  startWaitingAnimation(activeTextarea) { },
}



// left animation css
const loadCss = `
  .before-content:before {
    content: "";
    position: absolute;
    top: 5px;
    left: 10px;
    right: 0;
    bottom: 0;
    border: 3px solid rgba(0, 0, 0, 0.1);
    border-left-color: #000;
    border-radius: 50%;
    width: 15px;
    height: 15px;
    animation: spin 1s linear infinite;    
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .paused:before {
    content: "";
    position: absolute;
    top: 5px;
    left: 10px;
    right: 0;
    bottom: 0;
    border: 3px solid rgba(0, 0, 0, 0.1);
    border-radius: 50%;
    width: 15px;
    height: 15px;
    // animation: spin 1s linear infinite; 
    border-left-color: red;
  }
`;



animation.startWaitingAnimation = (activeTextarea) => {
  const activeCellParentElement = activeTextarea.parentElement.parentElement.parentElement;

  // Create a new <style> element
  const styleElement = document.createElement('style');
  styleElement.textContent = loadCss;

  // Add a new <style> element to the <head> element
  document.head.appendChild(styleElement);

  // get cursor element
  const cursorElement = activeTextarea.querySelector('div.CodeMirror-cursor')
  const style = window.getComputedStyle(cursorElement);
  // Which line
  const lineIndex = Math.round(parseFloat(style.getPropertyValue('top')) / 17)
  // Obtain element for all line
  const linesElement = activeTextarea.getElementsByClassName('CodeMirror-line')
  // the code span elements for this active line
  const currectLineSpanList = linesElement[lineIndex].querySelectorAll('span span')

  // deprecate：Set the animated font dom element when it waits 
  // As a code hint carrier
  const animationElement = document.createElement('span');

  animationElement.classList.add("per-insert-code")
  animationElement.style.color = 'grey';

  // Insert gray code hints, If the active line has no span tag
  if (currectLineSpanList.length == 0) {
    const withAllCodeSpan = linesElement[lineIndex].querySelectorAll('span')
    // creates an element in a unique code carrier, as long as the mouse exists, the code carrier exists
    withAllCodeSpan[withAllCodeSpan.length - 1].appendChild(animationElement)
  } else {
    // Insert new hint code in the last code span
    const withAllCodeSpan = linesElement[lineIndex].childNodes
    withAllCodeSpan[withAllCodeSpan.length - 1].insertAdjacentElement('afterend', animationElement);
  }


  // Waiting steps, 0.333 seconds per step
  let timeLeft = 90;
  const animationInterval = setInterval(() => {
    // Add request animation
    activeCellParentElement.classList.add('before-content');
    // If the request exceeds 30s
    if (timeLeft-- <= 0) {
      activeCellParentElement.classList.remove('before-content');
      clearInterval(animationInterval)
    }

  }, 333)
  return [animationInterval, animationElement, activeCellParentElement]
}



window.animation = animation