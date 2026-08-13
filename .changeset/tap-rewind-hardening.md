---
"@assistant-ui/tap": patch
---

fix: restore application snapshots when a rewound replay is discarded, stop dispatch-before-mount from stranding replay history retention, and throw in development and test environments when a below-committed replay finds no committed history to rewind
