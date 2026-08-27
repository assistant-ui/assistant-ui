---
"@assistant-ui/x-buildutils": patch
"@assistant-ui/metro": patch
---

refactor: derive a bundled commonjs build mode from the exports map, and drop metro's private tsdown config. a package whose exports targets are .cjs files now builds as a bundled cjs/node artifact with declared dependencies external and workspace devDependencies inlined; metro's dist is byte-identical to what its per-package config produced.
