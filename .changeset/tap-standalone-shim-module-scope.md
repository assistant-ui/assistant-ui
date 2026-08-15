---
"@assistant-ui/tap": patch
---

feat: the standalone shim gains `jsx-runtime` and `jsx-dev-runtime` entries plus module-scope `forwardRef` and `memo`, so react-coupled module graphs stay loadable under the react-less alias; rendering their JSX without real React still throws.
