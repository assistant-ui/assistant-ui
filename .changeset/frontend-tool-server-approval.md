---
"assistant-stream": patch
---

run a frontend tool streamed inside a step when that step finishes, and never for a call the provider gates with an approval, so a frontend tool sharing a server tool's name no longer runs before the approval is answered. `unstable_runPendingTools` skips calls that carry an approval.
