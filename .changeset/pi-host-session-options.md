---
"@assistant-ui/react-pi": patch
---

Add `modelRuntime` and `configureSession` to the Node supervisor options, so a host can share its own Pi model runtime and set each session's SDK options such as tools, a resource loader, and settings. `setModel` now resolves the model from the live session's own runtime, so a model that session can use is selectable.
