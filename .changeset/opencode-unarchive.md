---
"@assistant-ui/react-opencode": patch
"@assistant-ui/core": patch
"@assistant-ui/react-ink": patch
"@assistant-ui/react-google-adk": patch
---

adapters may omit unarchive; archived threads then open without unarchiving and explicit unarchive rejects. the OpenCode adapter omits it because OpenCode cannot unarchive a session.
