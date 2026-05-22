# `@assistant-ui/x-buildutils`

This package is an internal dependency of assistant-ui and does not follow semantic versioning. If you are not working inside this monorepo, you should use your own build pipeline instead.

## What it provides

- **`aui-build` CLI**: invoked as `"build": "aui-build"` from every package's `package.json`. Compiles TypeScript with our shared strict config, validates that imports resolve to declared `exports` sub-paths, and rewrites `.ts` import specifiers to `.js` so the emitted ESM works at runtime.
- **`ts/`**: shared `tsconfig` fragments (`base.json`, `base-node.json`, `next.json`).
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
