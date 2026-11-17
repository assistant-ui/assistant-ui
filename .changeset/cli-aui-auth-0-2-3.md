---
"assistant-ui": patch
---

Upgrade `aui-auth` to 0.2.3 for `assistant-ui cloud` sign-in. The CLI keeps its credentials file and device login, now names the login with the machine's host name on the accounts Sessions page, and reads organizations from the accounts organization API itself, since aui-auth no longer ships that client.
