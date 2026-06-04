---
"@assistant-ui/x-generative-compiler": patch
"@assistant-ui/metro": patch
---

feat: merge toolkits across "use generative" files and allow a bare defineMcpToolkit default export

A `"use generative"` toolkit can now spread the default export of another `"use generative"` module, so tools can be split across files: `import weatherTools from "./tools/weather"; export default defineToolkit({ ...weatherTools })`. The compiler resolves the import and confirms the source is itself `"use generative"` before allowing the spread, so a backend `execute` can't leak to the client. Only default imports qualify, since named exports don't survive the build-split generative-module boundary.

`defineMcpToolkit({ ... })` is also now accepted directly as a file's default export, so an MCP-only toolkit no longer needs to be wrapped in an otherwise-empty `defineToolkit`.

`@assistant-ui/metro` is bumped because it bundles the compiler and would not otherwise pick up the new behavior.
