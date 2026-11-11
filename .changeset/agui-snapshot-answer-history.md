---
"@assistant-ui/react-ag-ui": patch
---

Persist assistant messages that a snapshot adds during a run, including an answer the snapshot moves the run onto or delivers on its own. A run's assistants that were never written are appended first, in branch order, so the stored head ends on the thread's last message.
