---
"assistant-ui": patch
---

Run a fixed shadcn version (`shadcn@4.23.0`) and `skills@1.7.4` instead of the latest release, so a new upstream release cannot change what `create`, `init`, `add` and the skills install do. `--preset` URLs must now use https (http only on localhost) and carry no credentials; the CLI checks this before it scaffolds anything.
