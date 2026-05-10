---
"@assistant-ui/core": patch
---

fix(core): render thread list items by stable ID instead of index

Keying ThreadListItems children by thread ID instead of numeric index
eliminates the zombie-child crash. When a thread is removed, React drops
the keyed child before its getSnapshot runs, so tapClientLookup never
receives an out-of-bounds index.
