---
"@assistant-ui/tap": patch
---

fix(tap): read the React version from React's default export, so bundles that alias react to the standalone shim (the Svelte and Vue builds) no longer fail on a missing `version` export
