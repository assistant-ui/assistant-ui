---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

show an Assistant Cloud reply whose run went stale as a regular error with Regenerate, and drop the message of one that had no content: the thread loads ending on the user message, `thread.canResume` turns true, and `ComposerPrimitive.Resume` (the Resume button of the default Thread's interrupted warning) runs it again from that message with no branch, deleting the empty row once the new run starts. Regenerate is disabled while another tab still drives the run. `ActionBarPrimitive.Resume` and `useActionBarResume` are deprecated in favor of `ActionBarPrimitive.Reload`.
