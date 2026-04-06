---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

feat: support edit lineage and startRun in EditComposer send flow

- Add `SendOptions` with `startRun` flag to `composer.send()`
- Expose `parentId` and `sourceId` on `EditComposerState`
- Add `EditComposerRuntimeCore` interface extending `ComposerRuntimeCore`
- Bypass text-unchanged guard when `startRun` is explicitly set
- `ComposerSendOptions` extends `SendOptions` for consistent layering
