---
"assistant-ui": patch
---

feat: run every `assistant-ui cloud` subcommand other than `login`, `logout` and `setup` on Assistant Cloud. The CLI sends the command line with the saved login to the cloud management server and prints its answer, so `cloud help`, `cloud whoami` and `cloud projects list` come from the server and new commands need no CLI release.
