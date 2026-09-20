# `@assistant-ui/x-buildutils`

This package is an internal dependency of assistant-ui and does not follow semantic versioning. If you are not working inside this monorepo, you should use your own build pipeline instead.

## What it provides

- **`aui-build` CLI**: invoked as `"build": "aui-build"` from every package's `package.json`. Compiles TypeScript with our shared strict config, validates that imports resolve to declared `exports` sub-paths, and rewrites `.ts` import specifiers to `.js` so the emitted ESM works at runtime. Declarations come from one TypeScript program over the whole package (a TypeScript API pass after the JavaScript build for ESM packages, tsdown's declaration build mode for CommonJS ones), so two builds of the same commit produce the same `.d.ts`. A `/// <reference>` directive in an entry file carries `preserve="true"`, since the declaration emitter drops every other directive; either build fails on one without it.
- **`ts/`**: shared `tsconfig` fragments (`base.json`, `base-node.json`, `next.json`, and `test.json` for a package's colocated vitest suites, which run under Node).
- **`types/`**: shared ambient types (e.g. `browser-process`).

## Usage inside the monorepo

```jsonc
// packages/example/package.json
{
  "scripts": {
    "build": "aui-build"
  },
  "devDependencies": {
    "@assistant-ui/x-buildutils": "workspace:*"
  }
}
```

```jsonc
// packages/example/tsconfig.json
{
  "extends": "@assistant-ui/x-buildutils/ts/base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```
