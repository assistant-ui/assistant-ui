---
"@assistant-ui/next": patch
---

fix(next): bust the `"use generative"` loader cache when the compiler changes. `withAui` now folds a token derived from `@assistant-ui/x-generative-compiler`'s version and dist mtime into the loader options, which Turbopack and webpack include in their transform cache key. Previously a change to the compiler (a published upgrade, or an in-place rebuild in a monorepo) could leave stale compiled `"use generative"` modules cached until `.next` was cleared.
