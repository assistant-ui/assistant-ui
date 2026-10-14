---
"@assistant-ui/core": patch
---

feat: report a failed thread switch, such as a URL-controlled `threadId` whose `fetch()` rejects, as `switchError` on the threads state, and retry a controlled switch when the browser comes back online or the tab becomes visible
