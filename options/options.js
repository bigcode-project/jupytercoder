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
  browser.storage.local.set({
    openAIKey: document.getElementById("apiKey").value,
    bigcodeServiceUrl: document.getElementById("bigcodeServiceUrl").value,
    huggingfaceAccessToken: document.getElementById("huggingfaceAccessToken").value,
    modelType: select.value,
    checkedMode: getSelectedRadioValue()
  }, () => {
    alert("API key saved.");
  })
});

browser.storage.local.get("openAIKey", (data) => {
  if (data.openAIKey) {
    document.getElementById("apiKey").value = data.openAIKey;
  }
});

browser.storage.local.get("huggingfaceAccessToken", (data) => {
  if (data.huggingfaceAccessToken) {
    document.getElementById("huggingfaceAccessToken").value = data.huggingfaceAccessToken;
  }
});

browser.storage.local.get("bigcodeServiceUrl", (data) => {
  if (data.bigcodeServiceUrl) {
    document.getElementById("bigcodeServiceUrl").value = data.bigcodeServiceUrl;
  } else {
    document.getElementById("bigcodeServiceUrl").value = "https://api-inference.huggingface.co/models/bigcode/starcoderbase/"
  }
});

browser.storage.local.get("modelType", (data) => {
  if (data.modelType) {
    select.value = data.modelType
  }
})

browser.storage.local.get("checkedMode", (data) => {
  if (data.checkedMode && data.checkedMode == "OpenAI") {
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
