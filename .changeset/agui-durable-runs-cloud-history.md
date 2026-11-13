---
"@assistant-ui/react-ag-ui": patch
---

feat: `durableRuns` option pairs Assistant Cloud history with an AG-UI server whose runs outlive the browser. A thread opened mid-run rejoins the run in place of the stored partial reply, a run that finished with no tab open has its answer stored, and a second tab leaves the reply to the tab writing it.
