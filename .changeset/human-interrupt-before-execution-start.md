---
"@assistant-ui/core": patch
---

fix: keep a frontend tool's pending `human()` interrupt when execution starts

a tool whose `execute` awaits `human()` before any other await had its `interrupt` status overwritten by the `executing` status the execution-start callback writes, so the approval prompt never rendered and the run never settled.
