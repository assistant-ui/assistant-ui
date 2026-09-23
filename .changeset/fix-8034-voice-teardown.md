---
"@assistant-ui/core": patch
"@assistant-ui/store": patch
"@assistant-ui/tap": patch
---

fix: end voice sessions when a runtime hook's host is deleted. tap keeps insertion effects through soft unmounts and runs them on permanent release
