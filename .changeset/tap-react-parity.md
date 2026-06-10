---
"@assistant-ui/tap": patch
---

fix: React parity for useReducer and StrictMode. User reducers now compute during render instead of eagerly at dispatch (matching React, which reserves eager computation for useState), so dev-mode reducer invocation counts and kept results match React; a same-state dispatch now renders once like React instead of bailing out at dispatch. The React bridge keeps one host fiber across both StrictMode render passes (hosted identities match across passes like React's own hook state) and lets React's strict replay drive the effect cycle (mount, unmount, mount).
