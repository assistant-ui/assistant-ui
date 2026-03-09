---
"@assistant-ui/cloud-ai-sdk": patch
---

refactor: convert autoCloud to lazy singleton

The autoCloud singleton is now lazily initialized on first hook call instead of at module load time, eliminating module-level side effects and making sideEffects: false accurate.
