---
"@assistant-ui/react-ag-ui": patch
---

feat: restore multimodal user input (`image`, `audio`, `video`, `document` parts) as attachments in `fromAgUiMessages`, so persisted conversations reload attachments instead of dropping them and re-send them losslessly on the next run
