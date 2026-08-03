---
"assistant-cloud": patch
---

fix: validate successful anonymous authentication responses before use

Malformed successful responses now throw a `CloudResponseError` instead of persisting invalid refresh-token data or failing during JWT parsing.
