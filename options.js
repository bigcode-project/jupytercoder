// 获取所有的单选框
const radioButtons = document.querySelectorAll('input[type="radio"]');
const select = document.querySelector('select');

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
    huggingfaceApiKey: document.getElementById("huggingfaceApiKey").value,
    modelType: select.value,
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

chrome.storage.sync.get("huggingfaceApiKey", (data) => {
  if (data.huggingfaceApiKey) {
    document.getElementById("huggingfaceApiKey").value = data.huggingfaceApiKey;
  }
});

chrome.storage.sync.get("otherService", (data) => {
  if (data.otherService) {
    document.getElementById("otherServiceUrl").value = data.otherService;
  } else {
    document.getElementById("otherServiceUrl").value = "https://api-inference.huggingface.co/models/bigcode/starcoder/"
  }
});

chrome.storage.sync.get("modelType", (data) => {
  if (data.modelType) {
    select.value = data.modelType
  }
})

chrome.storage.sync.get("checked", (data) => {
  if (data.checked && data.checked == "openaiApiKey") {
    document.getElementsByClassName('input-key')[0].classList.toggle("input-hidden")
    document.getElementsByClassName('input-key')[1].classList.toggle("input-hidden")
    var optionsElement = document.getElementsByName('options')
    if(optionsElement[0].checked){
      optionsElement[0].checked = false
    }else{
      optionsElement[0].checked = true
    }
    if(optionsElement[1].checked){
      optionsElement[1].checked = false
    }else{
      optionsElement[1].checked = true
    }
  }
})

// 为每个单选框添加事件监听器
radioButtons.forEach(radioButton => {
  radioButton.addEventListener('change', function (event) {
    if (event.target.checked) {
      document.getElementsByClassName('input-key')[0].classList.toggle("input-hidden")
      document.getElementsByClassName('input-key')[1].classList.toggle("input-hidden")
    }
  });
});


