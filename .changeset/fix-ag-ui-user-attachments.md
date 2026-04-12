---
"@assistant-ui/react-ag-ui": patch
---

fix(react-ag-ui): preserve user message attachments when converting to AG-UI format

- `toAgUiMessages()` previously called `extractText()` for user messages, silently dropping image and file attachments
- User messages with attachments now emit AG-UI `InputContent[]`: images map to the `image` variant with a `data` or `url` source, files map to the `binary` variant preserving `filename`
- Falls back to plain string `content` when no binary parts are present, preserving backward compatibility
