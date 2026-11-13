---
"@assistant-ui/react-devtools": patch
---

fix: hide `DevToolsModal` in production builds from Vite and other bundlers that leave no `process` global in the browser
