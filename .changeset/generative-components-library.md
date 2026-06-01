---
"@assistant-ui/react-generative-ui": patch
---

feat: add `defineGenerativeComponents()` and split `JSONGenerativeUI` across builds. Author a component library with `defineGenerativeComponents({ ... })` (each entry colocates its `properties` schema with its `render`), pass it as `new JSONGenerativeUI({ library })`, and expose tools with `present()` and the new human-in-the-loop `promptUser()` inside a `defineToolkit`. The package now ships dual `JSONGenerativeUI` builds via the `react-server`/`default` export conditions (re-exported from the internal `./internal-json` subpath): the server build of `present`/`prompt_user` carries only `type`/`description`/`parameters`, and the client build adds `render`/`execute`. `present` is a frontend tool; `promptUser` is a human-in-the-loop tool.
