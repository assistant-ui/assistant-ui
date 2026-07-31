---
"@assistant-ui/react-ag-ui": patch
---

fix(react-ag-ui): convert file parts placed in message content instead of dropping them

`buildUserContent` no longer filters `file` parts out of `message.content`, so a `file` part placed in content (for example via `append()`) now converts to an AG-UI `image`/`audio`/`video`/`document` input part through the same path attachments already use. This restores parity with `react-ai-sdk` and `react-a2a`, which already send content-placed file parts, and stops the `Unstable_AudioMessagePart` → `{ type: "file", mimeType: "audio/*" }` migration from silently losing audio on this adapter. The composer path is unchanged because it puts binary in `attachments`, never content.