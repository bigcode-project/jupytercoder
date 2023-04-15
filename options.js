// Save the API key when the Save button is clicked
document.getElementById("save").addEventListener("click", () => {
  console.log("Saving API key...");
  const apiKey = document.getElementById("apiKey").value;
  chrome.storage.sync.set({ openaiApiKey: apiKey }, () => {
    console.log("API key saved.");
    alert("API key saved.");
  });
});

// Load the saved API key when the options page is opened
chrome.storage.sync.get("openaiApiKey", (data) => {
  if (data.openaiApiKey) {
    document.getElementById("apiKey").value = data.openaiApiKey;
  }
});
