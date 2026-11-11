---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/ai-sdk": patch
"@assistant-ui/react-ag-ui": patch
"@assistant-ui/react-native": patch
"@assistant-ui/react-ink": patch
---

Assistant Cloud run leases live on the thread, and no reply is stored when a run starts: the run opens the thread's lease, its checkpoints (every 20 seconds) store the reply once it has content, and a run that dies before writing leaves no message, so Resume no longer forks the thread. A thread ending with the user's message reads `useThreadReplyState() === "in-progress"` while another tab's fresh lease answers it, and `"interrupted"` once none does; the new `ThreadPrimitive.RefreshRun` and `ThreadPrimitive.Resume` act on it, and Resume runs from the user's message with no branch. A stale reply that stored content is an ordinary error (`run_stale`) answered with Regenerate. Empty replies that earlier clients stored at run start are left out on load. The default `Thread` shows "Generating in another tab" or an interrupted bar with Resume at its end. `ActionBarPrimitive.Resume` and `useActionBarResume` are deprecated in favor of the thread-level ones.
