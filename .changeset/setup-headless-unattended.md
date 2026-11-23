---
"assistant-ui": patch
"setup-agent": patch
---

`setup` run by a coding agent now opens with which way to go (give the user the setup page link, or rerun with `--unattended` when nobody will answer), its default model provider (the project's, else the coding agent's vendor), and how to stop it (`setup <url> cancel`). `--unattended` has the agent decide each choice and finish on its own. Over SSH, in CI or on a machine with no display, setup opens no browser, and a setup nobody has opened 3 minutes into a question offers to go on unattended.
