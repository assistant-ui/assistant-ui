---
"@assistant-ui/x-buildutils": patch
"@assistant-ui/react-streamdown": patch
---

fix: fail the build when emitted output imports an undeclared package

`aui-build` kept package imports external without checking them against the manifest, so emitted JavaScript or declarations could import a package a consumer cannot resolve. A build now allows only the package's own name, its declared dependencies, peers and optional dependencies (with a `@types/*` package standing in for the module it types), its `imports` map and node builtins. tsdown's `deps.onlyImport` covers import statements; a pass over the finished declarations covers the inline `import("pkg").Type` form, which that check does not visit.

Test helpers, `testUtils` modules and benches under `src` are no longer build entries. They were unreachable through every exports map and carried `vitest` and `ink-testing-library` imports into published output.

`@assistant-ui/react-streamdown` declares `remark-rehype`, whose `Options` type it re-exports as `RemarkRehypeOptions`.
