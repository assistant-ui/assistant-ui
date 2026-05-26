---
"@assistant-ui/react-artifact-runtime": patch
---

fix: report `aui:artifact:status { ok: false }` for React artifacts that throw during render.
The runtime previously declared success via a `requestAnimationFrame` fired right after
`root.render()`, but React 18 renders concurrently, so a render-time throw surfaced *after* that
frame and the failure was suppressed by the one-shot status guard — the model never learned the
artifact was broken. The component is now wrapped in an error boundary that reports failures via
`componentDidCatch`, and success is reported from a mount effect that only commits on a clean
render. This restores the model's auto-fix loop for failing artifacts.
