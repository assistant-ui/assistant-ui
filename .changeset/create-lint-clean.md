---
"assistant-ui": patch
---

fix(cli): `create` projects now pass `npm run lint` out of the box. Templates ship an `.oxfmtrc.json`, and `create` runs the project's `format:fix` script after components are added.
