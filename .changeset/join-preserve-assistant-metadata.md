---
"@assistant-ui/core": patch
---

fix: preserve metadata from every joined assistant message

When consecutive assistant/tool outputs are joined into one message, only the first output's metadata was kept — annotations, data, steps, custom, timing, and feedback on any later assistant message (e.g. the final answer after a tool call) were silently dropped.

`unstable_annotations`, `unstable_data`, and `steps` now accumulate across every joined output, and `custom` merges with later keys overwriting earlier ones for the same key. `unstable_state`, `timing`, and `submittedFeedback` are scalar and take the last joined output's value (last-wins) — the joined message's `id`/`createdAt`/`status` are unaffected and still come from the first output.
