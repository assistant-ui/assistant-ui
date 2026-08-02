---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-ai-sdk": patch
"@assistant-ui/react-opencode": patch
"@assistant-ui/react-pi": patch
---

fix: isolate remote thread state across backing scope changes

Remote thread-list adapters can now identify their backing account or workspace
with `unstable_scopeKey`. Changing that key clears the previous scope's mounted
runtimes and cached records before loading the replacement scope, while an
ordinary adapter recreation performs a non-destructive list refresh.
Adapters without a scope key retain the non-destructive behavior for backwards
compatibility and should provide one when they can switch accounts or
workspaces.
Controlled thread selections are reconciled as paginated replacement lists
load, so a later page can restore the requested thread or confirm it is absent.

Reloading a paginated list now treats the returned first page as authoritative.
Records and mounted runtimes from omitted later pages are dropped so a later
`loadMore()` can fetch and append those pages again.

React Pi now reads `includeArchived` through its stable adapter, so changing
the list filter refreshes results without resetting the active thread scope.
