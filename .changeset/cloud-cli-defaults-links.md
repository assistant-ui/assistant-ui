---
"assistant-ui": patch
---

feat(cli): `assistant-ui cloud` remote commands use the org and project from `.assistant-ui/cloud.json` when no `--org` or `--project` is given, print (and in a terminal, open) dashboard links the server hands back, and `cloud help <login|logout|setup>` lists their flags
