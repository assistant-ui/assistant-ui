---
"@assistant-ui/react-devtools": patch
---

render devtools inline instead of in a hosted iframe. the devtools UI now ships inside the package and renders in an isolated shadow root, so it no longer loads the deployed `devtools-frame` web app. `DevToolsModal` is unchanged at the call site and gains an extensible tab registry via the `plugins` prop (`createDevToolsPlugin`, `DevToolsPanel`).

removes the iframe/extension transport exports that are no longer used: `DevToolsFrame`, `FrameHost`, `FrameClient`, `ExtensionHost`, `DevToolsHost`, `sanitizeForMessage`, the stale `TabType`/`ViewMode` types, and the `*_FRAME_URL` constants.
