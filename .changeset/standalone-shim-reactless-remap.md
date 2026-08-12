---
"@assistant-ui/x-buildutils": patch
---

fix: remap a package's own bare react imports to the react-free standalone-shim when it depends on tap without a react peer, so a reactless bridge's build output no longer imports React directly
