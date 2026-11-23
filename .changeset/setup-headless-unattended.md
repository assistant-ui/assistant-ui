---
"assistant-ui": patch
"setup-agent": patch
---

`setup` run by a coding agent now opens with what it is, which way to go (give the user the setup page link, or rerun with `--unattended` when nobody will answer), and how to stop it (`setup <url> cancel`). `--unattended` has the agent decide each choice and finish on its own. Over SSH without a forwarded display, in CI, or on a Linux or BSD machine with no display, setup opens no browser unless `BROWSER` or `SETUP_AGENT_BROWSER` names one.
