chrome.action.onClicked.addListener((tab) => {
  if (tab.id == null) return;
  chrome.sidePanel.open({ tabId: tab.id });
});
