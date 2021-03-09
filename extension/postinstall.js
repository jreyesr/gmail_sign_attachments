chrome.runtime.onInstalled.addListener(function({ reason }) {
  if (reason == "install") {
    chrome.runtime.openOptionsPage();
  }
});
