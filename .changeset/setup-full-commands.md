---
"assistant-ui": patch
---

`assistant-ui setup` now tells the coding agent to write out each setup command in full and not keep it in a shell variable, which zsh (the default shell on macOS) runs as a single word and fails
