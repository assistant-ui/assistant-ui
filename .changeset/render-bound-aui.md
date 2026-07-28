---
"@assistant-ui/store": patch
"@assistant-ui/core": patch
"@assistant-ui/react-langgraph": patch
---

feat: render-bound immutable aui instances — derived scopes resolve to client instances during render and are frozen into the returned client; structural swaps produce a new client through React while value updates never change client identity. Removes the PartByIndexProvider lastPartRef guards and the useClientLookup stale-index clamp.
