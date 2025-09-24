// DevTools initialization script
// Creates the assistant-ui panel when DevTools are opened

console.log("[assistant-ui DevTools] DevTools script loaded");

chrome.devtools.panels.create(
  "assistant-ui",
  "icon32.png",
  "devtools-panel.html",
  () => {
    console.log("[assistant-ui DevTools] Panel created");
  },
);
