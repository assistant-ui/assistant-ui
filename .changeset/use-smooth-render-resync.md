---
"@assistant-ui/react": patch
---

fix(react|useSmooth): render-phase resync of displayed text on part change

Drop one frame of stale text after a thread switch by resyncing
`displayedText` in render when the part instance flips or `text`
breaks its streaming-append continuity, instead of waiting for
the post-commit effect.
