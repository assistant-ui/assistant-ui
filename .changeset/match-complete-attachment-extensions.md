---
"@assistant-ui/core": patch
---

fix: match attachment extensions against the complete filename suffix, so `.tar.gz` accepts `backup.tar.gz` and `.png` rejects extensionless `png`.
