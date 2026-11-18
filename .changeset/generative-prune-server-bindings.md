---
"@assistant-ui/x-generative-compiler": patch
"@assistant-ui/next": patch
---

fix: drop module bindings that only a stripped region used, whatever their initializer, so calls and constructors such as `createDb(...)` or `new PrismaClient(...)` that only a backend `execute` needed no longer stay in the client build. A file whose `"use generative"` directive is not its first statement now fails the build instead of shipping uncompiled, and `withAui` runs the loader on every JS/TS extension, including `.mts` and `.cts`.
