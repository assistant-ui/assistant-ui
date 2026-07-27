---
"@assistant-ui/react": patch
---

fix: stop logging attachment-add rejections to the console from ComposerPrimitive.AttachmentDropzone and ComposerPrimitive.Input; the rejection is already surfaced via the structured composer.attachmentAddError event, so the per-file console.error produced unopt-outable duplicate noise for apps handling the event