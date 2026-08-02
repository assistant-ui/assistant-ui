---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-ai-sdk": patch
---

fix: isolate remote thread state across adapter changes

Remote thread-list adapters now use object identity as their account or
workspace boundary. Replacing an adapter clears the previous scope's mounted
runtimes and cached records before loading the replacement scope.

Reloading a paginated list now treats the returned first page as authoritative.
Records and mounted runtimes from omitted later pages are dropped so a later
`loadMore()` can fetch and append those pages again.
