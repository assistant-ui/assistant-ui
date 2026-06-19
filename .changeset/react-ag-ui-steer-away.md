---
"@assistant-ui/react-ag-ui": patch
---

feat(react-ag-ui): add `useAgUiSteerAway` to send a new message while an AG-UI interrupt is pending; it accepts a string or partial message (the parent defaults to the head), cancels every open interrupt as `{status:"cancelled"}` on the wire (honoring the AG-UI interrupts spec), and resumes the run instead of throwing. pass `responses` to resolve specific interrupts while cancelling the rest
