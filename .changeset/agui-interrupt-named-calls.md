---
"@assistant-ui/react-ag-ui": patch
---

fix: never run a frontend tool's `execute` for a tool call that an interrupt names, including when the approval UI cannot show that interrupt, and project nothing when two gates share one interrupt id so one decision answers one call
