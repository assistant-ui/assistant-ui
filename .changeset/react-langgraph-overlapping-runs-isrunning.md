---
"@assistant-ui/react-langgraph": patch
---

fix: keep isRunning true across overlapping frontend-tool-result runs

Count pending runs instead of a boolean so only the last run to settle
clears isRunning. A frontend tool result starts run #2 before run #1's
onComplete fires; the previous boolean let run #1's settle clobber run #2's
in-flight flag, dropping isRunning to false between the tool result and run
#2's first event.