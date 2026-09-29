# packages

The npm packages and their private tooling; the root AGENTS.md still applies.

## Rules

- Build every published package with `aui-build` (`@assistant-ui/x-buildutils`), never a per-package config, tsup, unbuild, swc, or the tsc CLI.
- Keep every exports map types-first (`"types"` before `"default"`) and ESM with `type: module` and `sideEffects: false`, unless the package's consumer requires CommonJS or side effects.
- Read the package version as `__AUI_PACKAGE_VERSION__` behind a `typeof` guard with a `"0.0.0"` fallback, because vitest and unbundled runs leave it undefined.
- Declare a runtime the host already owns as an optional peer of the subpath that needs it, never a dependency.
- Extract a resource as a `use`-prefixed hook (`const Foo = resource(useFoo)`) and pass `createTapRoot` or `useTapRoot` a named function expression, because oxlint's hook rules skip anonymous bodies.
- `aui-build` fails on a published import or declaration type reference missing from `dependencies`, `peerDependencies`, or `optionalDependencies`; a `devDependencies` entry never satisfies it.
- `pnpm distributions:check` asserts the react, react-native, and react-ink barrels re-export the same shared surface; its `EXCEPTIONS` table is the only place a platform keeps a symbol out.
- `pnpm workspace-ranges:check` asserts every peer on a workspace package is `workspace:^` except its named consumer-installed exemptions, which keep a wide floor; when this file and a check disagree, the check wins.

### Adapters

- Build a framework adapter on `useExternalStoreRuntime`, or `useLocalRuntime` with a `ChatModelAdapter`, wrapped in `useRemoteThreadListRuntime` for threads, and expose its state with `createRuntimeExtras` from `@assistant-ui/core/internal`; `@assistant-ui/react-langchain` is the reference shape.
- Let the provider decide the core primitive, whether a thin wrapper, accumulator, or controller, the transport, HITL richness, and thread-list depth.
- Split an adapter into `use<Name>Runtime.ts` (orchestration only), `<name>Extras.ts`, `hooks.ts`, a pure two-way `convertMessages.ts`, and `types.ts`, plus a `<Name>ThreadController.ts` with a pure `reduce<Name>ThreadState` when it owns thread state.
- Colocate tests for the converter in both directions and the reducer or controller, and give each accessor hook its own `.test.tsx`.
- Never introduce a `*ThreadRuntimeCore` state holder, a hand-rolled `Symbol` brand and guard, a `notifyUpdate` or version-counter re-render hack, `Object.create` method grafting, or monkeypatching of caller objects.
- Add adapter behavior as a hook on the `createRuntimeExtras` surface, reusing shared core primitives (`getAutoStatus`, `useStreamingTiming`) instead of a per-adapter copy or a new opt-out flag.
- Expose a capability added to one runtime on every runtime that supports the concept, or document why one diverges, because users switching adapters expect parity.
- Keep server-only and provider SDK code in a `./server` or `./node` subpath, added when the protocol owns the wire, out of the default and React Native entries.
- Keep converters and content renderers from throwing on missing fields, non-spec payloads, or absent platform APIs, and keep browser-only APIs out of code that runs in Node, Ink, or React Native.
