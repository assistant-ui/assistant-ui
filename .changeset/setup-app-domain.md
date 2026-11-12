---
"assistant-ui": patch
---

`assistant-ui setup` now opens the setup at setup.assistant-ui.com and connects the agent through checkout.assistant-ui.com. The hidden `--setup-app-url` flag (`ASSISTANT_UI_SETUP_APP_URL`) points the browser at another setup app. The prompt the terminal flow hands to an agent is now `set up assistant-ui`. Setup links from earlier versions stop working once the domains move.
