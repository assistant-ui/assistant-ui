---
"@assistant-ui/next": patch
---

fix: only run the use-generative loader on modules carrying the directive

turbopack matches loader rules against the modules it generates itself, including the shim behind `new Worker(new URL(...))`. that shim's resource path is not on the project filesystem, so reading its source back through a webpack loader fails the build (next 16.3 surfaces this as `Resource path "worker/browser/createWorker.ts" needs to be on project filesystem`). gating the rule on the directive matches the loader's own detection and leaves generated modules alone.
