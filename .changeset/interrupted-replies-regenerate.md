---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

an Assistant Cloud reply whose run went stale after it wrote content is now a regular error with Regenerate (`message.runState` is undefined for it), and only a reply that wrote nothing reads as `runState: "stale"`. For that reply, `ActionBarPrimitive.Resume` deletes it and its stored row and runs again from the user message, with no branch; a runtime that cannot delete messages starts a new branch as before. Regenerate is disabled while another tab still drives the run.
