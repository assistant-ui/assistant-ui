---
"setup-agent": patch
---

fix: refuse a setup URL that is not https (http only on localhost) or holds characters a shell treats as code, quote it in printed commands, and refuse a deposited key that would write extra lines to the env file
