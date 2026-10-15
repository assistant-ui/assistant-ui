---
"@assistant-ui/core": patch
---

A message an external-store host drops from the middle of its `messages` array is removed from the thread, with its feedback, instead of staying behind as a sibling branch.
