---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

fix: suggestion trigger with `send` no longer overwrites the composer draft while a run is in progress; on runtimes without queue support it now renders disabled mid-run, matching `ComposerPrimitive.Send`
