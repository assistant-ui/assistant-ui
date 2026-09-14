---
"assistant-stream": patch
---

fix: skip in-memory resumable stream expiry sweeps until an expiry can be due, avoiding full-store scans on every chunk while preserving TTL and reader wakeups.
