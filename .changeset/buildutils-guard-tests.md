---
"@assistant-ui/x-buildutils": patch
---

chore: cover the undeclared-import guard with tests

The allowlist and declaration scan behind the undeclared-import guard move unchanged to `src/declared-imports.ts`, where `node --test` pins the `@types/*` mapping, specifier splitting, builtin listing and the two declaration shapes the scan reports. Test files stay out of the published tarball.
