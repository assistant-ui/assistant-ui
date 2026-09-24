# @assistant-ui/x-buildutils

`aui-build` and the tsconfig presets every package builds with; the root and `packages/AGENTS.md` still apply.

## Rules

- Write tests with `node:test`, never vitest, and run them with this package's `test` script, because the tool every package builds with carries no test framework.
- Import a module with its `.ts` extension wherever `node --test` loads it (`allowImportingTsExtensions`); only `src/index.ts`, which jiti loads, stays extensionless.
- Keep `node` out of the `types` in `ts/base.json`, which browser and React Native packages extend; a Node-only package extends `ts/base-node.json`.
