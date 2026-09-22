---
"@assistant-ui/react-streamdown": patch
---

fix: recognize a fence or `$$` block that opens on a list marker line (`- ~~~`, ``1. ```bash``, `- $$`), so `~` inside it is no longer escaped and its closing marker no longer opens a fence that leaves the rest of the message without streaming repair or escapes
