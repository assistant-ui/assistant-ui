---
"@assistant-ui/react": patch
---

feat(react): add `minCommitMs` to `SmoothOptions` to throttle committed reveal updates

`useSmooth` keeps advancing the typewriter reveal every frame, but with `minCommitMs` the visible text (and the downstream re-render and markdown re-parse it triggers) is committed at most once per interval. The final frame always commits, so no characters are lost. Defaults to `0`, which commits every frame and preserves the previous behavior.
