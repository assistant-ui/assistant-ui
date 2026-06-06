---
"@assistant-ui/tap": patch
---

feat: install a React dispatcher around every resource render so hooks imported from `react` (`import { useState } from "react"`) route to tap inside a resource, with no build step. It also backs `react/compiler-runtime`'s `useMemoCache`, so React Compiler output runs in a resource without a `"use no memo"` opt-out. Hooks tap has no equivalent for stay unimplemented and throw when called inside a resource.
