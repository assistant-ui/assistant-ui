# @assistant-ui/react-ink

## 0.0.27

### Patch Changes

- [#4390](https://github.com/assistant-ui/assistant-ui/pull/4390) [`bb38d08`](https://github.com/assistant-ui/assistant-ui/commit/bb38d085b04b59f68c8cf16b23c2211454384668) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#4392](https://github.com/assistant-ui/assistant-ui/pull/4392) [`4cc7eaa`](https://github.com/assistant-ui/assistant-ui/commit/4cc7eaac61d68ae970b998465bb7e5c722cc9dda) - chore: update peer and dependency ranges for @assistant-ui/tap 0.9 ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`434bba5`](https://github.com/assistant-ui/assistant-ui/commit/434bba5f7c59ab7cf6f1c78a8898fd4d3addb12d), [`bb38d08`](https://github.com/assistant-ui/assistant-ui/commit/bb38d085b04b59f68c8cf16b23c2211454384668), [`4cc7eaa`](https://github.com/assistant-ui/assistant-ui/commit/4cc7eaac61d68ae970b998465bb7e5c722cc9dda), [`4cc7eaa`](https://github.com/assistant-ui/assistant-ui/commit/4cc7eaac61d68ae970b998465bb7e5c722cc9dda)]:
  - assistant-stream@0.3.23
  - @assistant-ui/core@0.2.16
  - @assistant-ui/tap@0.9.1
  - @assistant-ui/store@0.2.18

## 0.0.26

### Patch Changes

- [#4385](https://github.com/assistant-ui/assistant-ui/pull/4385) [`ae59baf`](https://github.com/assistant-ui/assistant-ui/commit/ae59baf3bb9b1779f403d378aca19bb3d83781ff) - feat: precompile packages with React Compiler ([@Yonom](https://github.com/Yonom))
  - aui-build runs React Compiler over packages that depend on tap and remaps `react/compiler-runtime` to the tap shim subpath, so compiled hooks and components work both in React components and inside tap resource renders
  - `@assistant-ui/tap/react-shim` exports `useMemoCache` (tap inside a resource render, `React.__COMPILER_RUNTIME.c` otherwise, with a React 18 polyfill); new `@assistant-ui/tap/react-shim/compiler-runtime` subpath mirrors `react/compiler-runtime`'s `c` export
  - tap implements `useSyncExternalStore` and a no-op `useDebugValue`; `useSubscribable` now builds on `useSyncExternalStore` so its store reads stay visible to the compiler
  - `AssistantProviderBase` opts out via `"use no memo"` because the runtime receives options through an effect inside a re-rendered child element

- Updated dependencies [[`c207bcd`](https://github.com/assistant-ui/assistant-ui/commit/c207bcda24468c1ae6e5adb61054a3682d3ff1d8), [`ae59baf`](https://github.com/assistant-ui/assistant-ui/commit/ae59baf3bb9b1779f403d378aca19bb3d83781ff), [`9f13fdb`](https://github.com/assistant-ui/assistant-ui/commit/9f13fdb22d0bc1bf2ad001147b8acc0df4844302), [`4583ca7`](https://github.com/assistant-ui/assistant-ui/commit/4583ca7477c834ef0906e7268005b469c7300cbe), [`94cc028`](https://github.com/assistant-ui/assistant-ui/commit/94cc02875b4e813e1af7020709511bb5f61e6067)]:
  - @assistant-ui/core@0.2.15
  - @assistant-ui/tap@0.8.1
  - @assistant-ui/store@0.2.17
  - assistant-stream@0.3.22

## 0.0.25

### Patch Changes

- [#4347](https://github.com/assistant-ui/assistant-ui/pull/4347) [`feecac3`](https://github.com/assistant-ui/assistant-ui/commit/feecac38c6ba0f8f30ec356376d1d6b19188e08f) - docs: reword the useNotification JSDoc from "pauses for human approval" to "pauses for user input"; the needs-input trigger fires on `requires-action` with reason `interrupt`, not on tool approval gates ([@okisdev](https://github.com/okisdev))

- [#4325](https://github.com/assistant-ui/assistant-ui/pull/4325) [`5a4f20e`](https://github.com/assistant-ui/assistant-ui/commit/5a4f20e75dcd93aeb70a4a5582a0a5a1f870b4f2) - chore: update @assistant-ui/tap dependency ranges to ^0.7.0 ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`ab8e5bc`](https://github.com/assistant-ui/assistant-ui/commit/ab8e5bc8650b1e39c8f01ab6c0efb80aa8baf723), [`59d252f`](https://github.com/assistant-ui/assistant-ui/commit/59d252fa09c1511acd7e31c9d8178514c5a5cb77), [`feecac3`](https://github.com/assistant-ui/assistant-ui/commit/feecac38c6ba0f8f30ec356376d1d6b19188e08f), [`3e58253`](https://github.com/assistant-ui/assistant-ui/commit/3e5825369c7206f4df3532d5fabfbe5cf5e4fd40), [`12b016b`](https://github.com/assistant-ui/assistant-ui/commit/12b016bd14560c847dadae075edb57631ac9c516), [`3e58253`](https://github.com/assistant-ui/assistant-ui/commit/3e5825369c7206f4df3532d5fabfbe5cf5e4fd40), [`5a4f20e`](https://github.com/assistant-ui/assistant-ui/commit/5a4f20e75dcd93aeb70a4a5582a0a5a1f870b4f2), [`f10b8ae`](https://github.com/assistant-ui/assistant-ui/commit/f10b8ae6659ed8df8b0c25b5bb2bb8cfa7d7a718), [`1fb5862`](https://github.com/assistant-ui/assistant-ui/commit/1fb586241534064fa48e3498f422bdaa7f382139)]:
  - @assistant-ui/core@0.2.14
  - @assistant-ui/store@0.2.16
  - @assistant-ui/tap@0.7.1

## 0.0.24

### Patch Changes

- [#4260](https://github.com/assistant-ui/assistant-ui/pull/4260) [`19c5b5f`](https://github.com/assistant-ui/assistant-ui/commit/19c5b5f3b1616a82ddfa928325c5e02c5786e867) - fix: make defineToolkit usable for plain runtime toolkits ([@Yonom](https://github.com/Yonom))

- [#4249](https://github.com/assistant-ui/assistant-ui/pull/4249) [`ca191dc`](https://github.com/assistant-ui/assistant-ui/commit/ca191dc63f4a63c7d3f98566e9febd7d7f857aec) - feat: add externalTool for render-only generative toolkit entries ([@Yonom](https://github.com/Yonom))

- [#4243](https://github.com/assistant-ui/assistant-ui/pull/4243) [`b79794d`](https://github.com/assistant-ui/assistant-ui/commit/b79794da4fed63d424376cae7cc4be720c7cf605) - fix(react-ink): block Enter submission while the thread is running unless the runtime supports queueing. `ComposerInput` called `composer().send()` unconditionally, so pressing Enter mid-run interrupted the active stream even on runtimes with `capabilities.queue: false`. It now applies the same gate as the web `ComposerInput` (`isRunning && !capabilities.queue` no-ops, keeping the typed text). The `onSubmit` override path is unaffected; apps using it own their submit behavior. ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#4306](https://github.com/assistant-ui/assistant-ui/pull/4306) [`15878d8`](https://github.com/assistant-ui/assistant-ui/commit/15878d8114edbbb82c2a467cf811478e5f4e08bc) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#4253](https://github.com/assistant-ui/assistant-ui/pull/4253) [`4c8f894`](https://github.com/assistant-ui/assistant-ui/commit/4c8f89413693e184d46e5f0f1bec1982457a2fe5) - feat: `defineToolkit` and the tool markers (`hitlTool` / `stubTool` / `providerTool`) now have runtime implementations in `@assistant-ui/react-ink`, so Ink apps author tools with the same `defineToolkit` API (and typed args) as the web. An Ink app runs in a single Node process with no client/server boundary, so there is nothing for the `"use generative"` compiler to split: `defineToolkit` resolves each tool's `type` at runtime and no build step is required. ([@Yonom](https://github.com/Yonom))

- [#4256](https://github.com/assistant-ui/assistant-ui/pull/4256) [`44ff4bf`](https://github.com/assistant-ui/assistant-ui/commit/44ff4bf5765ec2675454362a00214cd9de5cfb60) - feat: rename hitlTool to humanTool while keeping deprecated compatibility aliases ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`2a84174`](https://github.com/assistant-ui/assistant-ui/commit/2a8417422996920c4a58be80eddc1c1740158518), [`a0a0769`](https://github.com/assistant-ui/assistant-ui/commit/a0a076915dafdb7152c9fde75b40cfddebcb2676), [`19c5b5f`](https://github.com/assistant-ui/assistant-ui/commit/19c5b5f3b1616a82ddfa928325c5e02c5786e867), [`dbdfb15`](https://github.com/assistant-ui/assistant-ui/commit/dbdfb15e8b609d3886c71fedb25a9d8345e5fc3c), [`ca191dc`](https://github.com/assistant-ui/assistant-ui/commit/ca191dc63f4a63c7d3f98566e9febd7d7f857aec), [`15878d8`](https://github.com/assistant-ui/assistant-ui/commit/15878d8114edbbb82c2a467cf811478e5f4e08bc), [`44ff4bf`](https://github.com/assistant-ui/assistant-ui/commit/44ff4bf5765ec2675454362a00214cd9de5cfb60), [`01cf957`](https://github.com/assistant-ui/assistant-ui/commit/01cf957c209b1a58c69f5621565397de6d1eb794), [`01cf957`](https://github.com/assistant-ui/assistant-ui/commit/01cf957c209b1a58c69f5621565397de6d1eb794), [`26a365b`](https://github.com/assistant-ui/assistant-ui/commit/26a365bb2b5bf840e21cd0caf1870627fb57c045)]:
  - @assistant-ui/core@0.2.11
  - assistant-stream@0.3.21
  - @assistant-ui/store@0.2.14
  - @assistant-ui/tap@0.6.0

## 0.0.23

### Patch Changes

- [#4198](https://github.com/assistant-ui/assistant-ui/pull/4198) [`78ff336`](https://github.com/assistant-ui/assistant-ui/commit/78ff336028ce125608a4b716a93a2519ad6d9eab) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#4212](https://github.com/assistant-ui/assistant-ui/pull/4212) [`5fe118d`](https://github.com/assistant-ui/assistant-ui/commit/5fe118d6e61fd661859ee0d6b5ef10a370992a84) - feat: add MCP server support to generative toolkits ([@Yonom](https://github.com/Yonom))

- [#4213](https://github.com/assistant-ui/assistant-ui/pull/4213) [`dcd5897`](https://github.com/assistant-ui/assistant-ui/commit/dcd5897f6dd6ca6bfe6978c3c03371e070965eab) - feat: add provider-executed tool support to generative toolkits ([@Yonom](https://github.com/Yonom))

- [#4214](https://github.com/assistant-ui/assistant-ui/pull/4214) [`69540af`](https://github.com/assistant-ui/assistant-ui/commit/69540af906f4301af0fd453b0ab425fd62703a46) - feat: add renderText helpers for tool call status text ([@Yonom](https://github.com/Yonom))

- [#4199](https://github.com/assistant-ui/assistant-ui/pull/4199) [`d9b3119`](https://github.com/assistant-ui/assistant-ui/commit/d9b311977759818fcdcea6037c938e7070276f47) - feat: a `defineToolkit` entry may now be an already-formed `ToolDefinition` (carrying its own `type`), not only an inline definition whose `type` the compiler infers. This is what lets a factory like `new JSONGenerativeUI({ library }).present()` be used directly as a tool. ([@Yonom](https://github.com/Yonom))

  Renames the authoring types to match `defineToolkit`: `ToolkitDeclaration` → `ToolkitDefinition`, and adds `ToolkitDefinitionEntry` (the union of an inline tool definition and a pre-formed `ToolDefinition`). The per-tool inline type is now an internal `ToolkitDefinitionInput` and is no longer exported.

- [#4236](https://github.com/assistant-ui/assistant-ui/pull/4236) [`ae54c55`](https://github.com/assistant-ui/assistant-ui/commit/ae54c55c8c8b0f9e9ef455ced1498f37d998c6cb) - feat: add `stubTool()` and experimental `useAuiToolOverrides()` for locally executed generative toolkit tools ([@Yonom](https://github.com/Yonom))

- [#4235](https://github.com/assistant-ui/assistant-ui/pull/4235) [`7640b31`](https://github.com/assistant-ui/assistant-ui/commit/7640b319f704414bd5eb197f34e11ae0b2324a1d) - Deprecate component tool registration APIs in favor of toolkit registrations. ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`cba2b42`](https://github.com/assistant-ui/assistant-ui/commit/cba2b42c26083e730ae07194186ab4473f9f4cf3), [`4145caa`](https://github.com/assistant-ui/assistant-ui/commit/4145caaa23452f38c71366b55c03f8ec4da3fd54), [`58f80e0`](https://github.com/assistant-ui/assistant-ui/commit/58f80e09b51a9d025403f8692c3f41adc6d403e0), [`5fe118d`](https://github.com/assistant-ui/assistant-ui/commit/5fe118d6e61fd661859ee0d6b5ef10a370992a84), [`dcd5897`](https://github.com/assistant-ui/assistant-ui/commit/dcd5897f6dd6ca6bfe6978c3c03371e070965eab), [`0558db2`](https://github.com/assistant-ui/assistant-ui/commit/0558db28952fcd1c05a2ea3f15020cf50ca52489), [`69540af`](https://github.com/assistant-ui/assistant-ui/commit/69540af906f4301af0fd453b0ab425fd62703a46), [`d9b3119`](https://github.com/assistant-ui/assistant-ui/commit/d9b311977759818fcdcea6037c938e7070276f47), [`ae54c55`](https://github.com/assistant-ui/assistant-ui/commit/ae54c55c8c8b0f9e9ef455ced1498f37d998c6cb), [`7640b31`](https://github.com/assistant-ui/assistant-ui/commit/7640b319f704414bd5eb197f34e11ae0b2324a1d)]:
  - assistant-stream@0.3.20
  - @assistant-ui/core@0.2.10

## 0.0.22

### Patch Changes

- [#4176](https://github.com/assistant-ui/assistant-ui/pull/4176) [`27ae936`](https://github.com/assistant-ui/assistant-ui/commit/27ae936dec6dc5d05d21fd892af0a8e1db61928e) - feat: move the `defineToolkit` and `hitl` use-generative markers from `@assistant-ui/next` into `@assistant-ui/core/react`, so they ship once from every distribution (`@assistant-ui/react`, `@assistant-ui/react-native`, `@assistant-ui/react-ink`) and stay portable across build targets. Import them from `@assistant-ui/react` instead of `@assistant-ui/next`; they remain no-op markers stripped at build time by a `"use generative"` compiler. ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`27ae936`](https://github.com/assistant-ui/assistant-ui/commit/27ae936dec6dc5d05d21fd892af0a8e1db61928e), [`27ae936`](https://github.com/assistant-ui/assistant-ui/commit/27ae936dec6dc5d05d21fd892af0a8e1db61928e)]:
  - assistant-stream@0.3.19
  - @assistant-ui/core@0.2.9

## 0.0.21

### Patch Changes

- [#3852](https://github.com/assistant-ui/assistant-ui/pull/3852) [`356d8a0`](https://github.com/assistant-ui/assistant-ui/commit/356d8a0f9e6c20dfbe1cb6f755e0044520c60ca4) - add a `useNotification` hook plus `ringBell` / `sendOSCNotification` helpers to `@assistant-ui/react-ink`. the hook rings the terminal bell and emits an OSC desktop notification when the assistant finishes a run, stops with an error, or pauses for human approval (`requires-action` with `reason: "interrupt"` only; tool-call pauses are skipped). pass `useNotification()` for the default bell-on-every-transition behavior, `useNotification({ onTaskComplete: false })` to suppress one trigger, or `useNotification({ onTaskComplete: { custom: (event) => ... } })` for a user-supplied callback. transitions are derived from `useAuiState` so deprecated `thread.runStart` / `thread.runEnd` events are not relied on. `ringBell` and `sendOSCNotification` are also exported for imperative use. ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#4165](https://github.com/assistant-ui/assistant-ui/pull/4165) [`4dfc5da`](https://github.com/assistant-ui/assistant-ui/commit/4dfc5da01f4e702d45afe43963df81765d7a76ab) - fix(react-ink): show the error icon for completed tool calls that errored. `ToolFallback` resolved a part with a `complete` status to the success icon (`+`) even when `isError` was set, so a finished-but-failed tool call rendered green. It now checks `isError` within the complete branch and shows the error icon (`x`), matching `useToolCallChecklist`. ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#3681](https://github.com/assistant-ui/assistant-ui/pull/3681) [`9040b7c`](https://github.com/assistant-ui/assistant-ui/commit/9040b7c06e4970019261c90f0d0d449b8b43e0dc) - feat: add live checklist primitives (ChecklistPrimitive, LiveChecklist) for tracking tool-call progress ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#4175](https://github.com/assistant-ui/assistant-ui/pull/4175) [`2dec3ae`](https://github.com/assistant-ui/assistant-ui/commit/2dec3aeba0431178f4ca26e470b304f5a89390ba) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#4167](https://github.com/assistant-ui/assistant-ui/pull/4167) [`fcb6baf`](https://github.com/assistant-ui/assistant-ui/commit/fcb6baf161a9ee7dda65191e0b42de12b368724d) - feat: add a `display` presentation hint to tools and a `"standalone-tool-call"` key to `groupPartByType`. ([@Yonom](https://github.com/Yonom))

  Tool UIs fall into three buckets: prompting the user (human-in-the-loop), informing the user (generative UI), and traces of what the model is doing (routine frontend/backend tool calls). The first two should be surfaced on their own; the last belongs folded into the chain-of-thought trace. The new `display` field on a tool lets you place a tool in the right bucket without overloading `type`:

  ```ts
  const toolkit = {
    ask_user: { type: "human", render: AskUI }, // standalone (forced — can't opt out)
    search_web: { type: "frontend", render: SearchUI }, // inline trace (default)
    checkout: {
      type: "frontend",
      render: CheckoutUI,
      display: "standalone", // opt in
    },
  } satisfies Toolkit;
  ```

  - `display?: "standalone" | "inline"` is a client-only presentation hint (it never reaches the model). Defaults to `"inline"`.
  - `human` tools are always `"standalone"` and cannot opt out (the type only allows `"standalone"`). MCP-app tool calls and the built-in generative-UI tool are standalone too. Every other tool defaults to inline and opts in explicitly.
  - `groupPartByType` gains a synthetic `"standalone-tool-call"` key that matches all of the above. `MessagePrimitive.GroupedParts` passes the live tool-UI registry to the `groupBy` function as a second `context` argument (`{ toolUIs }`), and the helper reads it to resolve the registry-driven cases; MCP-app calls are detected from the part alone.
  - The `"mcp-app"` key on `groupPartByType` is **deprecated** in favor of `"standalone-tool-call"` (a superset). It still works for back-compat.

  The shadcn `thread.tsx` template is updated to use `"standalone-tool-call": []` in place of `"mcp-app": []`.

- Updated dependencies [[`1315789`](https://github.com/assistant-ui/assistant-ui/commit/13157895e4d69ad4266d6ab278edfc2e3ea1de92), [`299d448`](https://github.com/assistant-ui/assistant-ui/commit/299d4488c8a5bbec0679680866f5975055fe71b3), [`4429aa3`](https://github.com/assistant-ui/assistant-ui/commit/4429aa32f6bd4fd50a7a8ddbad1e19f6ccad192b), [`e76611f`](https://github.com/assistant-ui/assistant-ui/commit/e76611fcb80a39d7b6071d82bcfaf1bb7345110b), [`76f7d16`](https://github.com/assistant-ui/assistant-ui/commit/76f7d161c2d802b72e07a12f67595f94c9ad7e4d), [`eef724e`](https://github.com/assistant-ui/assistant-ui/commit/eef724efe4a9075337577c626d7ea7aead45cfbe), [`2dec3ae`](https://github.com/assistant-ui/assistant-ui/commit/2dec3aeba0431178f4ca26e470b304f5a89390ba), [`fcb6baf`](https://github.com/assistant-ui/assistant-ui/commit/fcb6baf161a9ee7dda65191e0b42de12b368724d), [`c4d3eea`](https://github.com/assistant-ui/assistant-ui/commit/c4d3eeac6907a2fc15718f3c710d73d24eaeb652)]:
  - assistant-stream@0.3.18
  - @assistant-ui/core@0.2.8
  - @assistant-ui/store@0.2.13
  - @assistant-ui/tap@0.5.14

## 0.0.20

### Patch Changes

- [#4123](https://github.com/assistant-ui/assistant-ui/pull/4123) [`4b95d4c`](https://github.com/assistant-ui/assistant-ui/commit/4b95d4c9510febbd5175f30884a87afa69f5adf8) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`7395092`](https://github.com/assistant-ui/assistant-ui/commit/73950929dbebadb275e3bdee23331f65f2635a33), [`a6e0653`](https://github.com/assistant-ui/assistant-ui/commit/a6e0653bad29fb93627646a77c3383000c57ee33), [`cabfc71`](https://github.com/assistant-ui/assistant-ui/commit/cabfc715e99f23a55dc1276a6028792d7ecad822)]:
  - @assistant-ui/core@0.2.7
  - @assistant-ui/tap@0.5.13

## 0.0.19

### Patch Changes

- [#4107](https://github.com/assistant-ui/assistant-ui/pull/4107) [`32ae846`](https://github.com/assistant-ui/assistant-ui/commit/32ae846a91b61eccd01330693868a48f2f3bb0c4) - feat: surface AI SDK v6 tool approvals as a first-class `respondToApproval` prop on tool components. tool-call parts in the `approval-requested` state now carry `part.approval = { id, isAutomatic? }`; tool components call `respondToApproval({ approved, reason? })` to ack the gate without threading `chatHelpers` through application context. also fixes a transient `requires-action` flicker for the `approval-responded` state and tightens the external-message converter so interrupt vs pending tool calls are distinguished by an actual `interrupt`/`approval` field rather than by `result === undefined`. ([@okisdev](https://github.com/okisdev))

- Updated dependencies [[`372d4f0`](https://github.com/assistant-ui/assistant-ui/commit/372d4f0c538a766fd9a849fef74e413dde86d74a), [`d4f1db4`](https://github.com/assistant-ui/assistant-ui/commit/d4f1db428b1a1fe5c122150e1e366a377e9adb5f), [`32ae846`](https://github.com/assistant-ui/assistant-ui/commit/32ae846a91b61eccd01330693868a48f2f3bb0c4)]:
  - @assistant-ui/core@0.2.6
  - assistant-stream@0.3.17

## 0.0.18

### Patch Changes

- [#3651](https://github.com/assistant-ui/assistant-ui/pull/3651) [`6a0ecb2`](https://github.com/assistant-ui/assistant-ui/commit/6a0ecb2e49f24c5f066052018db5a9f1411dcc59) - feat(react-ink): add file storage adapter ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#4085](https://github.com/assistant-ui/assistant-ui/pull/4085) [`01244a5`](https://github.com/assistant-ui/assistant-ui/commit/01244a56026ee92bd4e49cb985136f9eb6d45154) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`13a12c4`](https://github.com/assistant-ui/assistant-ui/commit/13a12c46c94f7e5e62af02692cf3479fff48bd02), [`0a0c306`](https://github.com/assistant-ui/assistant-ui/commit/0a0c306286598ea885b046a1dfb85016f720051c), [`6a0ecb2`](https://github.com/assistant-ui/assistant-ui/commit/6a0ecb2e49f24c5f066052018db5a9f1411dcc59), [`e4634a5`](https://github.com/assistant-ui/assistant-ui/commit/e4634a59b7a926d158e929d559326f243efe438b), [`325de4c`](https://github.com/assistant-ui/assistant-ui/commit/325de4c73b348d4c20dafa4a2ac6d436c69dbf28), [`01244a5`](https://github.com/assistant-ui/assistant-ui/commit/01244a56026ee92bd4e49cb985136f9eb6d45154), [`f2ec01c`](https://github.com/assistant-ui/assistant-ui/commit/f2ec01ce0f01317a8444b779d88f9b6a26d691c5), [`1e21076`](https://github.com/assistant-ui/assistant-ui/commit/1e2107648bc281f1673f4ad053fd019b28a602d0)]:
  - assistant-stream@0.3.16
  - @assistant-ui/core@0.2.5
  - @assistant-ui/store@0.2.12
  - @assistant-ui/tap@0.5.12

## 0.0.17

### Patch Changes

- [#3635](https://github.com/assistant-ui/assistant-ui/pull/3635) [`4ae1d2b`](https://github.com/assistant-ui/assistant-ui/commit/4ae1d2bfb7f9bceadbf8e476cd5e580a31584897) - feat(react-ink): add StatusBarPrimitive components ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#3860](https://github.com/assistant-ui/assistant-ui/pull/3860) [`c1ffce1`](https://github.com/assistant-ui/assistant-ui/commit/c1ffce17208cc95da8e4222033a67386176f4f17) - feat(react-ink): add intra-line highlighting to DiffView replacement lines ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#3983](https://github.com/assistant-ui/assistant-ui/pull/3983) [`a26f2bd`](https://github.com/assistant-ui/assistant-ui/commit/a26f2bdf201a680dfe65991f358479ae91887872) - fix(react-ink): guard `Pressable`'s `onPress` against the `disabled` prop independently of `isFocused`, so `disabled` reliably blocks key presses even when focus state and the prop disagree. ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#3633](https://github.com/assistant-ui/assistant-ui/pull/3633) [`300b3eb`](https://github.com/assistant-ui/assistant-ui/commit/300b3ebbb5f7bfa27ff4bad72c3c951dc0ce19b3) - feat(react-ink): add LoadingPrimitive for terminal loading states ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#3983](https://github.com/assistant-ui/assistant-ui/pull/3983) [`a26f2bd`](https://github.com/assistant-ui/assistant-ui/commit/a26f2bdf201a680dfe65991f358479ae91887872) - feat(react-ink): add `Status` sub-component for terminal-safe attachment status display, and fall back from extensionless filenames to the attachment `type` in `Thumb`. ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#3965](https://github.com/assistant-ui/assistant-ui/pull/3965) [`a71f716`](https://github.com/assistant-ui/assistant-ui/commit/a71f716e95602531264603f1ce405ac2e0a5ab8b) - feat(react-ink): add ComposerPrimitive.Queue and QueueItemPrimitive (Text, Remove, Steer) ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#3969](https://github.com/assistant-ui/assistant-ui/pull/3969) [`2bcbaf2`](https://github.com/assistant-ui/assistant-ui/commit/2bcbaf2105fc2035a478cf6b4350f6add8ce703a) - feat(react-ink): add ComposerPrimitive.Quote, QuoteText, and QuoteDismiss for terminal composer quote parity with `@assistant-ui/react` ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#3957](https://github.com/assistant-ui/assistant-ui/pull/3957) [`a25381e`](https://github.com/assistant-ui/assistant-ui/commit/a25381e08e9a5ca59d38b2c3cdf9f6ee3fa6e3c2) - feat(react-ink): harden terminal pressable interactions ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#3958](https://github.com/assistant-ui/assistant-ui/pull/3958) [`7a8bf26`](https://github.com/assistant-ui/assistant-ui/commit/7a8bf26eda76f5f8490f96b3ff9dce1ccd072917) - feat(react-ink): add `MessagePartPrimitive` namespace with terminal-safe defaults for image, file, source, reasoning, and data parts. ([@ShobhitPatra](https://github.com/ShobhitPatra))

  Behavior changes in `react-ink`:
  - `MessagePrimitive.Content` (deprecated) now renders the new terminal-safe defaults for image/file/source/reasoning/data parts when no `render*` prop is provided; previously these parts were silently dropped. Pass `render*={() => null}` to restore the prior behavior.
  - `MessagePrimitive.Content` now consults `dataRenderers.fallbacks[0]` before falling back to the inline data renderer, matching `MessagePrimitive.Parts`.
  - `MessagePrimitive.Parts` now forwards `data` and `Quote` components alongside `ChainOfThought`; previously `data` was dropped when `ChainOfThought` was set.

- Updated dependencies [[`db721df`](https://github.com/assistant-ui/assistant-ui/commit/db721df32434296ac14eab27030628107975b71c), [`94548fa`](https://github.com/assistant-ui/assistant-ui/commit/94548fa8d587962d8ab0338a9609a9ff21240c33), [`94548fa`](https://github.com/assistant-ui/assistant-ui/commit/94548fa8d587962d8ab0338a9609a9ff21240c33), [`94548fa`](https://github.com/assistant-ui/assistant-ui/commit/94548fa8d587962d8ab0338a9609a9ff21240c33), [`8b6fc88`](https://github.com/assistant-ui/assistant-ui/commit/8b6fc8836871e62efc2fd8c131c6783e12c5fc47), [`179895f`](https://github.com/assistant-ui/assistant-ui/commit/179895fdcb56edee2e8d9efb4b38cd3859eeecdd), [`7a8bf26`](https://github.com/assistant-ui/assistant-ui/commit/7a8bf26eda76f5f8490f96b3ff9dce1ccd072917), [`3b2bbce`](https://github.com/assistant-ui/assistant-ui/commit/3b2bbce1589b44a13b8b7a570c19bf35a2266fbd)]:
  - @assistant-ui/store@0.2.11
  - assistant-stream@0.3.15
  - @assistant-ui/core@0.2.3

## 0.0.16

### Patch Changes

- [#4008](https://github.com/assistant-ui/assistant-ui/pull/4008) [`fa4510a`](https://github.com/assistant-ui/assistant-ui/commit/fa4510a3f3a23e0458ce8f3a397c352e3b0cde07) - feat: support multi-modal tool results via `toModelOutput` ([@okisdev](https://github.com/okisdev))

  frontend tools can now project their execution output into multi-modal model content (text + image / pdf / arbitrary file parts), aligning with the AI SDK v6 `toModelOutput` callback. previously, tool results were always serialized as a single JSON value, so a "read pdf" style tool had no way to send the PDF back to a multi-modal model.
  - `assistant-stream` exports a new `ToolModelContentPart` type (`{ type: "text", text } | { type: "file", data, mediaType, filename? }`) and a `ToolModelOutputFunction<TArgs, TResult>` callback type. `Tool.toModelOutput` is wired through `unstable_runPendingTools` and `ToolExecutionStream`, attaching the resulting `modelContent` to the `tool-call` part on the assistant message.
  - `@assistant-ui/core` re-exports `ToolModelContentPart` and adds an optional `modelContent?: readonly ToolModelContentPart[]` field on `ToolCallMessagePart`. existing tools and renderers are unchanged.
  - `@assistant-ui/react-ai-sdk`'s `frontendTools(...)` helper now also registers a `toModelOutput` on each forwarded tool. it transparently unwraps an envelope that `useAISDKRuntime` writes when a frontend-executed tool produced `modelContent`, turning it into AI SDK's `{ type: "content", value: [...] }` output. plain (non-envelope) outputs fall back to the existing `{ type: "text" | "json", value }` shape, so behavior for tools without `toModelOutput` is unchanged.

  route handlers that adopt `toModelOutput` also need to pass `tools` to `convertToModelMessages` (this is the [AI SDK's documented pattern](https://ai-sdk.dev/docs/reference/ai-sdk-ui/convert-to-model-messages#multi-modal-tool-responses)):

  ```ts
  const aiSDKTools = { ...frontendTools(tools ?? {}) };
  streamText({
    messages: await convertToModelMessages(messages, { tools: aiSDKTools }),
    tools: aiSDKTools,
  });
  ```

  templates and existing examples are unchanged. they keep the simpler `convertToModelMessages(messages)` form because none of the tools they ship with use `toModelOutput`. the new tools guide page documents how to opt in.

  **reserved key.** when a frontend tool defines `toModelOutput`, its result is persisted in the AI SDK chat as `{ __aui_modelContent: ToolModelContentPart[], value: <your result> }`. tools must not return objects whose top-level key is literally `__aui_modelContent`, or `convertMessage` will misread the result. the prefix is namespaced for this reason.

  **read/write compatibility for persisted threads.** the envelope is recognized by `@assistant-ui/react-ai-sdk` from this version onward. if you persist UI messages and read them from multiple environments, upgrade every reader before any writer starts producing `toModelOutput`; otherwise older readers will treat the envelope object as the `result` and break the affected tool `render` functions.

- [#3966](https://github.com/assistant-ui/assistant-ui/pull/3966) [`3d78764`](https://github.com/assistant-ui/assistant-ui/commit/3d7876471f55ad9d8f145b9215865a0fb6096a0b) - perf: Virtualize message list and memoize per-message render in long ink threads ([@samdickson22](https://github.com/samdickson22))

  `ThreadPrimitive.Messages` now accepts optional `windowSize` / `windowOverscan`. When set, the live render region keeps the last `windowSize + windowOverscan` messages; older ones graduate through Ink's `<Static>` into terminal scrollback. Each rendered message is wrapped in a memoized boundary keyed by `(index, render)`, so streaming a single message no longer reconciles the full list. Defaults preserve legacy behavior; negative values clamp to 0.

- Updated dependencies [[`9ecda1d`](https://github.com/assistant-ui/assistant-ui/commit/9ecda1dfdd96f2c638e7b51cc951319ccacd06c9), [`35d0146`](https://github.com/assistant-ui/assistant-ui/commit/35d014628a69b0003799666895c2552b46ac7198), [`fa4510a`](https://github.com/assistant-ui/assistant-ui/commit/fa4510a3f3a23e0458ce8f3a397c352e3b0cde07), [`c9dd16c`](https://github.com/assistant-ui/assistant-ui/commit/c9dd16c4b1edc52f6a2529a9a07ebb7964aee9a1), [`dea8bc7`](https://github.com/assistant-ui/assistant-ui/commit/dea8bc7e122ad6ff53e48e6b0ffc6fcc2abaadd3), [`9c3d24d`](https://github.com/assistant-ui/assistant-ui/commit/9c3d24d8a358bcf5f683f85473b82524ea018930)]:
  - assistant-stream@0.3.14
  - @assistant-ui/core@0.2.1

## 0.0.15

### Patch Changes

- Updated dependencies [[`040d469`](https://github.com/assistant-ui/assistant-ui/commit/040d469acfcf782de6fc188c646dfd8732d27088)]:
  - @assistant-ui/core@0.2.0

## 0.0.14

### Patch Changes

- [#3932](https://github.com/assistant-ui/assistant-ui/pull/3932) [`6700da5`](https://github.com/assistant-ui/assistant-ui/commit/6700da5a4a435779311eb7db90211738b18f55c9) - feat: re-export RuntimeAdapterProvider, useRuntimeAdapters, and CompleteAttachment ([@AVGVSTVS96](https://github.com/AVGVSTVS96))

- [#3962](https://github.com/assistant-ui/assistant-ui/pull/3962) [`b090acb`](https://github.com/assistant-ui/assistant-ui/commit/b090acb98f6bf3579aab4efedddaff83a0b54c94) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`7098bab`](https://github.com/assistant-ui/assistant-ui/commit/7098bab4c67fbd507c3fad746ef130daa01b3fd6), [`b090acb`](https://github.com/assistant-ui/assistant-ui/commit/b090acb98f6bf3579aab4efedddaff83a0b54c94), [`5fdf17e`](https://github.com/assistant-ui/assistant-ui/commit/5fdf17e019c91b000c6f4cf9e3e56c89d764a435)]:
  - @assistant-ui/core@0.1.18
  - assistant-stream@0.3.13
  - @assistant-ui/store@0.2.10
  - @assistant-ui/tap@0.5.11

## 0.0.13

### Patch Changes

- [#3850](https://github.com/assistant-ui/assistant-ui/pull/3850) [`63da83a`](https://github.com/assistant-ui/assistant-ui/commit/63da83af6e2ffc60d37f8ea9e518fee849fc882f) - feat(react-ink): rewrite react-ink composer input into a cursor aware terminal editor ([@ShobhitPatra](https://github.com/ShobhitPatra))

- Updated dependencies [[`549037a`](https://github.com/assistant-ui/assistant-ui/commit/549037ac77aed8736823cfb82baf9645e3364adf), [`005f83f`](https://github.com/assistant-ui/assistant-ui/commit/005f83f3ebfb94b3a9d7c34bc7d2a71bbaf63a9e), [`976aec5`](https://github.com/assistant-ui/assistant-ui/commit/976aec566330bee3c607cfb356f3358eefe28ac1), [`25b97d5`](https://github.com/assistant-ui/assistant-ui/commit/25b97d5c62fb038471b06eaa784ad4b7e23ef533), [`2008fc9`](https://github.com/assistant-ui/assistant-ui/commit/2008fc9af3d6fe05604d6b08275c2e9cec099bd9), [`88fcd35`](https://github.com/assistant-ui/assistant-ui/commit/88fcd352ecffd12f124abe988cc5499f784f81d6)]:
  - @assistant-ui/core@0.1.16
  - @assistant-ui/store@0.2.9
  - @assistant-ui/tap@0.5.10

## 0.0.12

### Patch Changes

- [#3876](https://github.com/assistant-ui/assistant-ui/pull/3876) [`ce865bc`](https://github.com/assistant-ui/assistant-ui/commit/ce865bc46af996d53f89e18068139d4d38546ca6) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`c7a274e`](https://github.com/assistant-ui/assistant-ui/commit/c7a274e968f8e081ded4c29cc37986392f04130e), [`ce865bc`](https://github.com/assistant-ui/assistant-ui/commit/ce865bc46af996d53f89e18068139d4d38546ca6), [`ca8f526`](https://github.com/assistant-ui/assistant-ui/commit/ca8f526944968036d47849a7659353765072a836), [`c56f98f`](https://github.com/assistant-ui/assistant-ui/commit/c56f98f5759e710281fc57b343b41af102914f1a), [`974d15e`](https://github.com/assistant-ui/assistant-ui/commit/974d15e34675cc5a611f0297904f5cb2c1b3da8c), [`4b19d42`](https://github.com/assistant-ui/assistant-ui/commit/4b19d42970cb98cee6ea69e2c26dc22763091568), [`055dda5`](https://github.com/assistant-ui/assistant-ui/commit/055dda54b68031d0c9c760bf89a7c1036dd2174d), [`da0f598`](https://github.com/assistant-ui/assistant-ui/commit/da0f59818085c7b97d157da1260c5e20873c32c1), [`d53ff4f`](https://github.com/assistant-ui/assistant-ui/commit/d53ff4f3f8b7d7220c1cb274c4fda335598fb063), [`20f8404`](https://github.com/assistant-ui/assistant-ui/commit/20f8404b70098e4b7cbc8df5bbb47985ac81b52c), [`17958c9`](https://github.com/assistant-ui/assistant-ui/commit/17958c9234ccc42394260125df54d897c06a47fd)]:
  - @assistant-ui/core@0.1.15
  - assistant-stream@0.3.12
  - @assistant-ui/store@0.2.8
  - @assistant-ui/tap@0.5.9

## 0.0.11

### Patch Changes

- c988db8: chore: update dependencies
- Updated dependencies [f20b9ca]
- Updated dependencies [c988db8]
  - @assistant-ui/core@0.1.14
  - assistant-stream@0.3.11
  - @assistant-ui/store@0.2.7
  - @assistant-ui/tap@0.5.8

## 0.0.10

### Patch Changes

- 376bb00: chore: update dependencies
- Updated dependencies [42bc640]
- Updated dependencies [376bb00]
- Updated dependencies [87e7761]
  - @assistant-ui/core@0.1.13
  - @assistant-ui/tap@0.5.7

## 0.0.9

### Patch Changes

- 6554892: feat: add useAssistantContext for dynamic context injection

  Register a callback-based context provider that injects computed text into the system prompt at evaluation time, ensuring the prompt always reflects current application state.

- bdce66f: chore: update dependencies
- 4abb898: refactor: align interactables with codebase conventions
  - Rename `useInteractable` to `useAssistantInteractable` (registration only, returns id)
  - Add `useInteractableState` hook for reading/writing interactable state
  - Remove `makeInteractable` and related types
  - Rename `UseInteractableConfig` to `AssistantInteractableProps`
  - Extract `buildInteractableModelContext` from `Interactables` resource
  - Add `with-interactables` example to CLI

- 209ae81: chore: remove aui-source export condition from package.json exports
- af70d7f: feat: add useToolArgsStatus hook for per-prop streaming status

  Add a convenience hook that derives per-property streaming completion status from tool call args using structural partial JSON analysis.

- Updated dependencies [dffb6b4]
- Updated dependencies [6554892]
- Updated dependencies [9103282]
- Updated dependencies [876f75d]
- Updated dependencies [bdce66f]
- Updated dependencies [4abb898]
- Updated dependencies [209ae81]
- Updated dependencies [2dd0c9f]
- Updated dependencies [af70d7f]
  - assistant-stream@0.3.9
  - @assistant-ui/core@0.1.10
  - @assistant-ui/store@0.2.6
  - @assistant-ui/tap@0.5.6

## 0.0.8

### Patch Changes

- 3227e71: feat: add interactables with partial updates, multi-instance, and selection
  - `useInteractable(name, config)` hook and `makeInteractable` factory for registering AI-controllable UI
  - `Interactables()` scope resource with auto-generated update tools and system prompt injection
  - Partial updates — auto-generated tools use partial schemas so AI only sends changed fields
  - Multi-instance support — same name with different IDs get separate `update_{name}_{id}` tools
  - Selection — `setSelected(true)` marks an interactable as focused, surfaced as `(SELECTED)` in system prompt

- 52403c3: chore: update dependencies
- Updated dependencies [781f28d]
- Updated dependencies [3227e71]
- Updated dependencies [3227e71]
- Updated dependencies [0f55ce8]
- Updated dependencies [83a15f7]
- Updated dependencies [52403c3]
- Updated dependencies [ffa3a0f]
  - @assistant-ui/core@0.1.9
  - assistant-stream@0.3.8
  - @assistant-ui/store@0.2.5
  - @assistant-ui/tap@0.5.5

## 0.0.7

### Patch Changes

- 3247231: feat(react-ink): add DiffPrimitive and DiffView for terminal diff rendering
- 736344c: chore: update dependencies
- Updated dependencies [1406aed]
- Updated dependencies [9480f30]
- Updated dependencies [28a987a]
- Updated dependencies [736344c]
- Updated dependencies [ff3be2a]
- Updated dependencies [70b19f3]
- Updated dependencies [c71cb58]
  - @assistant-ui/core@0.1.8
  - @assistant-ui/store@0.2.4
  - assistant-stream@0.3.7
  - @assistant-ui/tap@0.5.4

## 0.0.6

### Patch Changes

- 7ecc497: feat: children API for primitives with part.toolUI, part.dataRendererUI, and MessagePrimitive.Quote
- 639792c: feat(react-ink): add ErrorPrimitive (Root, Message)
- Updated dependencies [7ecc497]
  - @assistant-ui/core@0.1.7

## 0.0.5

### Patch Changes

- 4a904de: refactor: remove useAssistantRuntime hook
- 349f3c7: chore: update deps
- 6cc4122: refactor: use primitive hooks
- Updated dependencies [1ed9867]
- Updated dependencies [427ffaa]
- Updated dependencies [349f3c7]
- Updated dependencies [02614aa]
- Updated dependencies [6cc4122]
- Updated dependencies [642bcda]
  - @assistant-ui/core@0.1.6
  - assistant-stream@0.3.6
  - @assistant-ui/store@0.2.3
  - @assistant-ui/tap@0.5.3

## 0.0.4

### Patch Changes

- f38a59b: Launch React Ink: add documentation, landing page, CLI --ink flag, and README
- 990e41d: refactor: code sharing between the multiple platforms
- Updated dependencies [990e41d]
  - @assistant-ui/core@0.1.5

## 0.0.3

### Patch Changes

- 6d78873: feat: add ToolFallback component with collapsible tool call visualization
- Updated dependencies [f032ea5]
- Updated dependencies [2828b67]
  - @assistant-ui/core@0.1.4
  - assistant-stream@0.3.5

## 0.0.2

### Patch Changes

- 8ed9d6f: Refactor React Native component API: move shared runtime logic (remote thread list, external store, cloud adapters, message converter, tool invocations) into @assistant-ui/core for reuse across React and React Native
- Updated dependencies [5ae74fe]
- Updated dependencies [8ed9d6f]
- Updated dependencies [01bee2b]
  - @assistant-ui/core@0.1.3
