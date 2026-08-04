---
"@assistant-ui/next": patch
---

fix: only run the use-generative loader on modules carrying the directive

turbopack matches loader rules against the modules it generates itself, including the shim behind `new Worker(new URL(...))`. that shim's resource path is not on the project filesystem, so reading its source back through a webpack loader fails the build (next 16.3 surfaces this as `Resource path "worker/browser/createWorker.ts" needs to be on project filesystem`). gating the rule on the directive matches the loader's own detection and leaves generated modules alone.

the rule now lands as its own entry alongside a rule the caller already set on the same glob, rather than merging into it. a condition only ever scopes the entry it sits on, so sharing one would have narrowed the caller's loaders to the same directive; sharing also spread a caller's array of rules into an object keyed by index.
