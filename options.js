// 获取所有的单选框
const radioButtons = document.querySelectorAll('input[type="radio"]');

// 获取当前被选中的单选框的值
function getSelectedRadioValue() {
  let selectedValue = null;

  radioButtons.forEach(radioButton => {
    if (radioButton.checked) {
      selectedValue = radioButton.id;
    }
  });

  return selectedValue;
}


// Save the API key when the Save button is clicked
document.getElementById("save").addEventListener("click", () => {
  chrome.storage.sync.set({
    openaiApiKey: document.getElementById("apiKey").value,
    otherService: document.getElementById("otherServiceUrl").value,
    checked: getSelectedRadioValue()
  }, () => {
    alert("API key saved.");
  })
});

chrome.storage.sync.get("openaiApiKey", (data) => {
  if (data.openaiApiKey) {
    document.getElementById("apiKey").value = data.openaiApiKey;
  }
});

chrome.storage.sync.get("otherService", (data) => {
  if (data.otherService) {
    document.getElementById("otherServiceUrl").value = data.otherService;
  }
});

// 为每个单选框添加事件监听器
radioButtons.forEach(radioButton => {
  radioButton.addEventListener('change', function (event) {
    if (event.target.checked) {
      document.getElementsByClassName('input-key')[0].classList.toggle("input-hidden")
      document.getElementsByClassName('input-key')[1].classList.toggle("input-hidden")
    }
  });
});
