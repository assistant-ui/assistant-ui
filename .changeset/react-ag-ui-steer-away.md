---
"@assistant-ui/react-ag-ui": patch
---

feat(react-ag-ui): add `useAgUiSteerAway` to send a new user message while an AG-UI interrupt is pending; it cancels every open interrupt as `{status:"cancelled"}` on the wire (honoring the AG-UI interrupts spec) and resumes the run with the new message, instead of throwing
