---
"@assistant-ui/react-opencode": patch
---

Keep the `cancelling`/`reverting` run state when a streamed part arrives, so a failed revert is still reported as a run error.
