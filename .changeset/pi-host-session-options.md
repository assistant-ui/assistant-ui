---
"@assistant-ui/react-pi": patch
---

Add `modelRuntime` and `configureSession` to the Node supervisor options, so a host can share its own Pi model runtime and set each session's SDK options such as tools, a resource loader, and settings. Sessions now use the supervisor's model runtime, so a model the picker lists can be selected on a live session.
