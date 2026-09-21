---
"@assistant-ui/store": patch
---

fix(store): populate the client ref during a server render

`useAssistantClientRef().current` stayed `null` for an entire server render, so a client method that resolves a sibling scope through the ref threw when a component called it during render. The React hosts published the ref only from `useInsertionEffect`, which never runs when nothing commits; they now seed it during render behind the same `current === null` guard the imperative `createAssistantClient` host already used, so a committed binding is never replaced.
