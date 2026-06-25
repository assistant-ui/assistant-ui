# @assistant-ui/react-devtools

## 1.2.8

### Patch Changes

- [#4517](https://github.com/assistant-ui/assistant-ui/pull/4517) [`cefcf27`](https://github.com/assistant-ui/assistant-ui/commit/cefcf27b4b53ceafef18e469644d51797c11c8ff) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

## 1.2.7

### Patch Changes

- [#4433](https://github.com/assistant-ui/assistant-ui/pull/4433) [`7b550df`](https://github.com/assistant-ui/assistant-ui/commit/7b550dfd19df2235d48cde07781fbe5d4f5b1975) - render devtools inline instead of in a hosted iframe. the devtools UI now ships inside the package and renders in an isolated shadow root, so it no longer loads the deployed `devtools-frame` web app. `DevToolsModal` is unchanged at the call site and gains an extensible tab registry via the `plugins` prop (`createDevToolsPlugin`, `DevToolsPanel`). ([@okisdev](https://github.com/okisdev))

  removes the iframe/extension transport exports that are no longer used: `DevToolsFrame`, `FrameHost`, `FrameClient`, `ExtensionHost`, `DevToolsHost`, `sanitizeForMessage`, the stale `TabType`/`ViewMode` types, and the `*_FRAME_URL` constants.

- [#4443](https://github.com/assistant-ui/assistant-ui/pull/4443) [`8dee2b3`](https://github.com/assistant-ui/assistant-ui/commit/8dee2b370b8546287843e7d91fb659249858c75a) - redesign the devtools panel and add new inspection capabilities. visually the panel becomes a borderless, flatter floating window (lighter dim backdrop, smaller spring-animated launcher) with a single consolidated top nav bar (underline-pill tabs, multi-instance select, a live status pill, close), a refreshed ChatGPT-style light/dark token theme (bumped --radius, retuned surfaces/borders, new --shadow-window and --shadow-launcher elevation tokens, prefers-reduced-motion handling), and an interactive collapsible JSONTree with copy-to-clipboard replacing the old static JSON dumps throughout. ([@okisdev](https://github.com/okisdev))

  beyond the reskin, every tab is restructured from a single scrolling stack into a master/detail layout with stable-id selection persisted per instance and per tab. Thread becomes a transcript-driven spine (ConversationList plus Transcript rail plus message detail) with status dots, trend sparklines, true interleaved tool/text rendering, a TTFT timing bar, richer tool-call and attachment previews, and a copy-message export. Context, Activity, and Raw each gain grouped left rails with dedicated detail panes; Activity adds per-run timelines, scope/text filtering, and opt-in payload diffs. the panel also defaults to the built-in inProcessClient when no client is passed.

  this is not visual only; it adds public API. ApiInfo gains an optional threadSnapshots field (cached per-thread states keyed by thread id, populated for threads mounted in the app and feeding the Thread tab), DevToolsClient gains an optional switchToThread(apiId, threadId) method (wired by inProcessClient to api.threads().switchToThread and surfaced as a per-thread switch and a "load conversation" action for unloaded threads), and DevToolsTabContext gains selection, setSelection, and switchToThread so custom tab plugins receive the new selection state and thread-switch callback. projectApi now emits threadSnapshots when at least one thread runtime is mounted. the new master/detail chassis and view components remain internal building blocks (not added to the package exports), and the internal projectApi helper has been dropped from the public exports (it was an in-process-client implementation detail; DevToolsModal, the plugin API, and the DevToolsClient surface are unchanged).

- [#4430](https://github.com/assistant-ui/assistant-ui/pull/4430) [`82f8709`](https://github.com/assistant-ui/assistant-ui/commit/82f870964335ac69719366da7e173ab95b39c824) - fix(devtools): stop reporting shared (non-cyclic) references as `[Circular]` when serializing model context ([@JSap0914](https://github.com/JSap0914))

## 1.2.6

### Patch Changes

- [#4390](https://github.com/assistant-ui/assistant-ui/pull/4390) [`bb38d08`](https://github.com/assistant-ui/assistant-ui/commit/bb38d085b04b59f68c8cf16b23c2211454384668) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#4392](https://github.com/assistant-ui/assistant-ui/pull/4392) [`4cc7eaa`](https://github.com/assistant-ui/assistant-ui/commit/4cc7eaac61d68ae970b998465bb7e5c722cc9dda) - chore: update peer and dependency ranges for @assistant-ui/tap 0.9 ([@Yonom](https://github.com/Yonom))

## 1.2.5

### Patch Changes

- [#4385](https://github.com/assistant-ui/assistant-ui/pull/4385) [`ae59baf`](https://github.com/assistant-ui/assistant-ui/commit/ae59baf3bb9b1779f403d378aca19bb3d83781ff) - feat: precompile packages with React Compiler ([@Yonom](https://github.com/Yonom))
  - aui-build runs React Compiler over packages that depend on tap and remaps `react/compiler-runtime` to the tap shim subpath, so compiled hooks and components work both in React components and inside tap resource renders
  - `@assistant-ui/tap/react-shim` exports `useMemoCache` (tap inside a resource render, `React.__COMPILER_RUNTIME.c` otherwise, with a React 18 polyfill); new `@assistant-ui/tap/react-shim/compiler-runtime` subpath mirrors `react/compiler-runtime`'s `c` export
  - tap implements `useSyncExternalStore` and a no-op `useDebugValue`; `useSubscribable` now builds on `useSyncExternalStore` so its store reads stay visible to the compiler
  - `AssistantProviderBase` opts out via `"use no memo"` because the runtime receives options through an effect inside a re-rendered child element

## 1.2.4

### Patch Changes

- [#4325](https://github.com/assistant-ui/assistant-ui/pull/4325) [`5a4f20e`](https://github.com/assistant-ui/assistant-ui/commit/5a4f20e75dcd93aeb70a4a5582a0a5a1f870b4f2) - chore: update @assistant-ui/tap dependency ranges to ^0.7.0 ([@Yonom](https://github.com/Yonom))

## 1.2.3

### Patch Changes

- [#4291](https://github.com/assistant-ui/assistant-ui/pull/4291) [`f22ac47`](https://github.com/assistant-ui/assistant-ui/commit/f22ac47f965b0829e763c8aa0f935fa94488b986) - feat: surface full tool metadata (type, provider id, MCP server, providerOptions, deferred-results, backend defaults) in the devtools model context, and redact credentials (apiKey, authorization headers, tokens, MCP server headers/env) at the serializer boundary before they cross the postMessage bridge ([@okisdev](https://github.com/okisdev))

- [#4296](https://github.com/assistant-ui/assistant-ui/pull/4296) [`8cf94ab`](https://github.com/assistant-ui/assistant-ui/commit/8cf94abc0b1639dccda9e546c0e65658a972bf23) - feat: forward the scope graph from the host (each accessor's name, source, query, and available method names) so the devtools frame can show a Scopes tab with the scope hierarchy and a per-scope read-only method catalog ([@okisdev](https://github.com/okisdev))

- [#4306](https://github.com/assistant-ui/assistant-ui/pull/4306) [`15878d8`](https://github.com/assistant-ui/assistant-ui/commit/15878d8114edbbb82c2a467cf811478e5f4e08bc) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- chore: allow `@assistant-ui/tap` 0.6 in the peer dependency range

## 1.2.2

### Patch Changes

- [#4151](https://github.com/assistant-ui/assistant-ui/pull/4151) [`299d448`](https://github.com/assistant-ui/assistant-ui/commit/299d4488c8a5bbec0679680866f5975055fe71b3) - chore: drop stale `biome-ignore` pragmas now that the repo lints with oxlint ([@okisdev](https://github.com/okisdev))

- Updated dependencies [[`1315789`](https://github.com/assistant-ui/assistant-ui/commit/13157895e4d69ad4266d6ab278edfc2e3ea1de92), [`299d448`](https://github.com/assistant-ui/assistant-ui/commit/299d4488c8a5bbec0679680866f5975055fe71b3), [`4429aa3`](https://github.com/assistant-ui/assistant-ui/commit/4429aa32f6bd4fd50a7a8ddbad1e19f6ccad192b), [`0b99959`](https://github.com/assistant-ui/assistant-ui/commit/0b999594ff30ded9f804896093eab0478ac5ce46), [`e76611f`](https://github.com/assistant-ui/assistant-ui/commit/e76611fcb80a39d7b6071d82bcfaf1bb7345110b), [`eef724e`](https://github.com/assistant-ui/assistant-ui/commit/eef724efe4a9075337577c626d7ea7aead45cfbe), [`2dec3ae`](https://github.com/assistant-ui/assistant-ui/commit/2dec3aeba0431178f4ca26e470b304f5a89390ba), [`2d9595e`](https://github.com/assistant-ui/assistant-ui/commit/2d9595e04977ca16fb7edb1295309831945f4914), [`fcb6baf`](https://github.com/assistant-ui/assistant-ui/commit/fcb6baf161a9ee7dda65191e0b42de12b368724d)]:
  - @assistant-ui/react@0.14.12
  - @assistant-ui/tap@0.5.14

## 1.2.1

### Patch Changes

- [#4085](https://github.com/assistant-ui/assistant-ui/pull/4085) [`01244a5`](https://github.com/assistant-ui/assistant-ui/commit/01244a56026ee92bd4e49cb985136f9eb6d45154) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`b02b701`](https://github.com/assistant-ui/assistant-ui/commit/b02b7012cff158b4e73b82503b9ea90638b7398d), [`0a0c306`](https://github.com/assistant-ui/assistant-ui/commit/0a0c306286598ea885b046a1dfb85016f720051c), [`01244a5`](https://github.com/assistant-ui/assistant-ui/commit/01244a56026ee92bd4e49cb985136f9eb6d45154), [`f2ec01c`](https://github.com/assistant-ui/assistant-ui/commit/f2ec01ce0f01317a8444b779d88f9b6a26d691c5), [`1e21076`](https://github.com/assistant-ui/assistant-ui/commit/1e2107648bc281f1673f4ad053fd019b28a602d0)]:
  - @assistant-ui/react@0.14.8
  - @assistant-ui/tap@0.5.12

## 1.2.0

### Patch Changes

- Updated dependencies [[`040d469`](https://github.com/assistant-ui/assistant-ui/commit/040d469acfcf782de6fc188c646dfd8732d27088)]:
  - @assistant-ui/react@0.14.0

## 1.1.0

### Patch Changes

- [#3962](https://github.com/assistant-ui/assistant-ui/pull/3962) [`b090acb`](https://github.com/assistant-ui/assistant-ui/commit/b090acb98f6bf3579aab4efedddaff83a0b54c94) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`801b9a6`](https://github.com/assistant-ui/assistant-ui/commit/801b9a68d9c7c70ab15ca53842d0df6adacb7b86), [`7098bab`](https://github.com/assistant-ui/assistant-ui/commit/7098bab4c67fbd507c3fad746ef130daa01b3fd6), [`aa6e071`](https://github.com/assistant-ui/assistant-ui/commit/aa6e071fdd6ea832c5aff3f6cf817b2e3eb6ceb0), [`b090acb`](https://github.com/assistant-ui/assistant-ui/commit/b090acb98f6bf3579aab4efedddaff83a0b54c94), [`df7eb3e`](https://github.com/assistant-ui/assistant-ui/commit/df7eb3eee6beeac72d3220707cf4660adf932586), [`f4a693e`](https://github.com/assistant-ui/assistant-ui/commit/f4a693ec1898f6ed0b81be47512fe51fd93a2de8), [`d864d07`](https://github.com/assistant-ui/assistant-ui/commit/d864d0709d9db5f8e042e62cf1f40669f087ba68)]:
  - @assistant-ui/react@0.13.0
  - @assistant-ui/tap@0.5.11

## 1.0.6

### Patch Changes

- c988db8: chore: update dependencies
- Updated dependencies [c988db8]
  - @assistant-ui/react@0.12.25
  - @assistant-ui/tap@0.5.8

## 1.0.5

### Patch Changes

- 376bb00: chore: update dependencies
- Updated dependencies [42bc640]
- Updated dependencies [e82726c]
- Updated dependencies [376bb00]
- Updated dependencies [87e7761]
  - @assistant-ui/react@0.12.24
  - @assistant-ui/tap@0.5.7

## 1.0.4

### Patch Changes

- 209ae81: chore: remove aui-source export condition from package.json exports
- Updated dependencies [6554892]
- Updated dependencies [d726499]
- Updated dependencies [876f75d]
- Updated dependencies [bdce66f]
- Updated dependencies [c362685]
- Updated dependencies [4abb898]
- Updated dependencies [209ae81]
- Updated dependencies [50b3100]
- Updated dependencies [af70d7f]
  - @assistant-ui/react@0.12.22
  - @assistant-ui/tap@0.5.6

## 1.0.3

### Patch Changes

- 349f3c7: chore: update deps
- Updated dependencies [1ed9867]
- Updated dependencies [427ffaa]
- Updated dependencies [349f3c7]
- Updated dependencies [02614aa]
- Updated dependencies [642bcda]
  - @assistant-ui/react@0.12.18
  - @assistant-ui/tap@0.5.3

## 1.0.2

### Patch Changes

- a845911: chore: update dependencies
- Updated dependencies [07dcce0]
- Updated dependencies [a845911]
- Updated dependencies [bc40eaf]
- Updated dependencies [be23d74]
- Updated dependencies [1eb059c]
  - @assistant-ui/react@0.12.15
  - @assistant-ui/tap@0.5.2

## 1.0.1

### Patch Changes

- 36ef3a2: chore: update dependencies
- Updated dependencies [36ef3a2]
- Updated dependencies [6692226]
- Updated dependencies [c31c0fa]
- Updated dependencies [1672be8]
- Updated dependencies [28f39fe]
- Updated dependencies [3a1cb66]
- Updated dependencies [14769af]
- Updated dependencies [7c360ce]
- Updated dependencies [a638f05]
- Updated dependencies [8a78cd2]
  - @assistant-ui/react@0.12.12
  - @assistant-ui/tap@0.5.1

## 1.0.0

### Patch Changes

- Updated dependencies [b65428e]
- Updated dependencies [5bbe8a9]
- Updated dependencies [5e304ea]
- Updated dependencies [546c053]
- Updated dependencies [a7039e3]
- Updated dependencies [16c10fd]
- Updated dependencies [98c3d54]
- Updated dependencies [b65428e]
- Updated dependencies [b181803]
- Updated dependencies [b65428e]
- Updated dependencies [6bd6419]
- Updated dependencies [7836760]
- Updated dependencies [9276547]
- Updated dependencies [b65428e]
- Updated dependencies [b65428e]
- Updated dependencies [af5b085]
- Updated dependencies [61b54e9]
- Updated dependencies [a094c45]
- Updated dependencies [4d7f712]
- Updated dependencies [ecc29ec]
- Updated dependencies [6e97999]
- Updated dependencies [a247fc9]
- Updated dependencies [b65428e]
- Updated dependencies [f414af9]
- Updated dependencies [b48912c]
- Updated dependencies [93910bd]
- Updated dependencies [58a8472]
- Updated dependencies [b65428e]
  - @assistant-ui/tap@0.5.0
  - @assistant-ui/react@0.12.11

## 0.2.3

### Patch Changes

- a088518: chore: update dependencies
- Updated dependencies [a088518]
- Updated dependencies [d8122cc]
  - @assistant-ui/react@0.12.9
  - @assistant-ui/tap@0.4.5

## 0.2.2

### Patch Changes

- d45b893: chore: update dependencies
- Updated dependencies [d45b893]
- Updated dependencies [fe71bfc]
- Updated dependencies [fe71bfc]
  - @assistant-ui/react@0.12.5
  - @assistant-ui/tap@0.4.3

## 0.2.1

### Patch Changes

- 605d825: chore: update dependencies
- Updated dependencies [1ea3e28]
- Updated dependencies [8cbf686]
- Updated dependencies [a8be364]
- Updated dependencies [605d825]
- Updated dependencies [fe15232]
  - @assistant-ui/react@0.12.2
  - @assistant-ui/tap@0.4.1

## 0.1.14

### Patch Changes

- Updated dependencies [fe06c7c]
- Updated dependencies
  - @assistant-ui/react@0.11.59
  - @assistant-ui/tap@0.4.0

## 0.1.13

### Patch Changes

- 3719567: chore: update deps
- Updated dependencies [3719567]
  - @assistant-ui/react@0.11.58
  - @assistant-ui/tap@0.3.6

## 0.1.12

### Patch Changes

- 57bd207: chore: update dependencies
- cce009d: chore: use tsc for building packages
- Updated dependencies [57bd207]
- Updated dependencies [cce009d]
  - @assistant-ui/react@0.11.53
  - @assistant-ui/tap@0.3.5

## 0.1.11

### Patch Changes

- e8ea57b: chore: update deps
- Updated dependencies [bae3aa2]
- Updated dependencies [bae3aa2]
- Updated dependencies [bae3aa2]
- Updated dependencies [bae3aa2]
- Updated dependencies [bae3aa2]
- Updated dependencies [bae3aa2]
- Updated dependencies [bae3aa2]
- Updated dependencies [e8ea57b]
- Updated dependencies [bae3aa2]
  - @assistant-ui/tap@0.3.3
  - @assistant-ui/react@0.11.50

## 0.1.10

### Patch Changes

- 01c31fe: chore: update dependencies
- Updated dependencies [ba26b22]
- Updated dependencies [d169e4f]
- Updated dependencies [da9f8a6]
- Updated dependencies [01c31fe]
  - @assistant-ui/react@0.11.48
  - @assistant-ui/tap@0.3.2

## 0.1.9

### Patch Changes

- ec662cd: chore: update dependencies
- Updated dependencies [ec662cd]
  - @assistant-ui/react@0.11.45
  - @assistant-ui/tap@0.3.1

## 0.1.8

### Patch Changes

- 2c33091: chore: update deps
- Updated dependencies [2c33091]
  - @assistant-ui/react@0.11.40
  - @assistant-ui/tap@0.2.2

## 0.1.7

### Patch Changes

- 2fc7e99: chore: update deps
- Updated dependencies [3ab9484]
- Updated dependencies [dbc4ec7]
- Updated dependencies [7a88ead]
- Updated dependencies [81b581f]
- Updated dependencies [2fc7e99]
  - @assistant-ui/react@0.11.36
  - @assistant-ui/tap@0.1.5

## 0.1.6

### Patch Changes

- 953db24: chore: update deps
- Updated dependencies [953db24]
- Updated dependencies
  - @assistant-ui/react@0.11.34
  - @assistant-ui/tap@0.1.4

## 0.1.5

### Patch Changes

- chore: update deps
- Updated dependencies
  - @assistant-ui/react@0.11.31
  - @assistant-ui/tap@0.1.3

## 0.1.4

### Patch Changes

- e6a46e4: chore: update deps
- Updated dependencies [e6a46e4]
  - @assistant-ui/react@0.11.27
  - @assistant-ui/tap@0.1.2

## 0.1.3

### Patch Changes

- 8812f86: chore: update deps

## 0.1.2

### Patch Changes

- 16b1106: fix dark mode not working
- Updated dependencies [94fcc39]
  - @assistant-ui/react@0.11.20

## 0.1.1

### Patch Changes

- 2c6198a: fix: thread empty should return false while thread is loading
  fix: devtools hydration warning
- Updated dependencies [2c6198a]
  - @assistant-ui/react@0.11.19
