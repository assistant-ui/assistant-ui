# @assistant-ui/core

## 0.3.17

### Patch Changes

- [#6723](https://github.com/assistant-ui/assistant-ui/pull/6723) [`8cc962e`](https://github.com/assistant-ui/assistant-ui/commit/8cc962e4bb33a5d144535373deb8792edd7f6921) - feat: let a tool approval request describe itself and report its outcome ([@okisdev](https://github.com/okisdev))
  
  an approval carries `prompt`, `display`, and `allowFreeform`, so a renderer can tell a question from a permission gate without reading provider metadata, and `ToolApprovalResponse` gains a `text` answer that resolves the request as answered rather than approved. `respondToToolApproval` now returns a promise that rejects when the runtime could not record the response, instead of the external-store runtime logging the rejection away, so a refused response leaves the request retryable.

- [#6539](https://github.com/assistant-ui/assistant-ui/pull/6539) [`2a31285`](https://github.com/assistant-ui/assistant-ui/commit/2a3128570eb52efc30d47c5aa1d7b16fd5e84cff) - fix: avoid duplicate external-store runtime publications ([@rupic-app](https://github.com/apps/rupic-app))

- [#6685](https://github.com/assistant-ui/assistant-ui/pull/6685) [`205acf5`](https://github.com/assistant-ui/assistant-ui/commit/205acf51e026f13a3e9b1755c2cda9a20677f72c) - refactor: walk the nested tool-call tree through one shared traversal ([@okisdev](https://github.com/okisdev))

- [#6678](https://github.com/assistant-ui/assistant-ui/pull/6678) [`740a573`](https://github.com/assistant-ui/assistant-ui/commit/740a5739c2da1363a43b5bde74dbefec1970b060) - fix: never execute a frontend tool on a tool call ADK resolves itself; a client-executed tool must be registered as a `LongRunningFunctionTool` on the agent ([@okisdev](https://github.com/okisdev))

- [#6498](https://github.com/assistant-ui/assistant-ui/pull/6498) [`65d449b`](https://github.com/assistant-ui/assistant-ui/commit/65d449bf225e190f308de00f85196420b72dc6d4) - feat: background thread bodies and a plain cloud adapter factory ([@okisdev](https://github.com/okisdev))
  
  RemoteThreadList gains a backgroundThreads mode that keeps every visited thread mounted: runs continue across switches, per-item isRunning is live, per-thread history and adapters mount once per body, and a freshly initialized thread generates its title. createCloudThreadListAdapter builds the assistant-cloud adapter without a hook call site so non-React hosts can construct it in plain code.

- [#6671](https://github.com/assistant-ui/assistant-ui/pull/6671) [`79283c5`](https://github.com/assistant-ui/assistant-ui/commit/79283c5ab5462d5a15d4f3ef6a079104ec74b605) - fix: report lifecycle events from background thread runtimes ([@rupic-app](https://github.com/apps/rupic-app))

- [#6645](https://github.com/assistant-ui/assistant-ui/pull/6645) [`9ec29e1`](https://github.com/assistant-ui/assistant-ui/commit/9ec29e1708564dcb9ad308f5d565ec2bef7cf6c6) - fix: report run start and end for threads a remote thread list keeps alive in the background ([@Kinfe123](https://github.com/Kinfe123))

- [#6702](https://github.com/assistant-ui/assistant-ui/pull/6702) [`14fc938`](https://github.com/assistant-ui/assistant-ui/commit/14fc93895e3e0c67f84b2722fa2b1180b0341cb3) - fix: cancel AssistantFrame tool calls when their provider is removed ([@Kinfe123](https://github.com/Kinfe123))

- [#6562](https://github.com/assistant-ui/assistant-ui/pull/6562) [`3f7af8b`](https://github.com/assistant-ui/assistant-ui/commit/3f7af8b2df9c62fee5e2cf0cc3871753dbb2814b) - fix: preserve composer queue item component identity after removals ([@Kinfe123](https://github.com/Kinfe123))

- [#6597](https://github.com/assistant-ui/assistant-ui/pull/6597) [`5511057`](https://github.com/assistant-ui/assistant-ui/commit/55110570389771b4b362d3ba502da8e329f4de70) - fix: preserve thread list item state when preceding threads are removed ([@Kinfe123](https://github.com/Kinfe123))

- [#6580](https://github.com/assistant-ui/assistant-ui/pull/6580) [`dc2cab3`](https://github.com/assistant-ui/assistant-ui/commit/dc2cab3aecc0466c6c2274974e42b3196e0763bc) - chore: stop hand-rolling the cloud adapter provider that the hosts synthesize ([@okisdev](https://github.com/okisdev))

- [#6587](https://github.com/assistant-ui/assistant-ui/pull/6587) [`d75944b`](https://github.com/assistant-ui/assistant-ui/commit/d75944b44ffb60cf853f3abdcb8620628fd35dbb) - fix: keep Cloud thread adapter options scoped to committed renders ([@Kinfe123](https://github.com/Kinfe123))

- [#6547](https://github.com/assistant-ui/assistant-ui/pull/6547) [`6bd1570`](https://github.com/assistant-ui/assistant-ui/commit/6bd157073f12006e5f8cdcb41d10735f6d93d6a7) - fix: drop zustand from core ([@okisdev](https://github.com/okisdev))
  
  core declared zustand as an optional peer while importing `create` and `useShallow` unconditionally. pnpm keys a package instance on its resolved peers, so two dependency branches landing on different zustand patches (5.0.14 under one, 5.0.15 under the other) produced two physical copies of core. React context is per copy, so a `RuntimeAdapterProvider` rendered by one copy was invisible to a runtime hook imported from the other: `unstable_Provider` supplied a `history` adapter, `useAISDKRuntime` read `undefined`, `withFormat()` never fired, and every thread loaded with no messages and no error.
  
  core no longer uses zustand at all, so the peer is gone rather than reclassified. the four internal stores now use `WritableSubscribable`, a mutable cell built on the existing `BaseSubscribable` and read through `useSubscribable`. the two `useShallow` call sites wrapped selectors passed to `useAuiState`, aui's own store, so they now use `useShallowSelector` from `@assistant-ui/store/internal`, which memoizes a selector against the `shallowEqual` that already lived there.
  
  `WritableSubscribable` reports a server snapshot and `useSubscribable` forwards one when the subscribable offers it, so the components reading these stores render under SSR the way the zustand hook did. Subscribables without one, including every existing runtime client, keep their current behaviour.
  
  `@assistant-ui/react-native` and `@assistant-ui/react-ink` declared zustand only to satisfy core's optional peer and never imported it, so they no longer declare it. `@assistant-ui/react` and `@assistant-ui/ui` keep theirs because they import it directly, and `@assistant-ui/react` additionally exposes `StoreApi` through `ReadonlyStore` in its published types.

- [#6758](https://github.com/assistant-ui/assistant-ui/pull/6758) [`60ae973`](https://github.com/assistant-ui/assistant-ui/commit/60ae973db6c53941f54bb09e02b898f607366e31) - fix: keep model context callbacks scoped to committed React renders ([@Kinfe123](https://github.com/Kinfe123))

- [#6719](https://github.com/assistant-ui/assistant-ui/pull/6719) [`0fb5390`](https://github.com/assistant-ui/assistant-ui/commit/0fb53906fd4cc35458502c34f699a114f5c887c4) - fix: never run a frontend tool on a call the provider is about to answer or gate ([@okisdev](https://github.com/okisdev))
  
  a tool call whose name matched a registered tool closed its args stream, and therefore executed, as soon as `argsText` parsed. providers that answer or gate a call do so one or more snapshots later, so in that window a frontend `execute` fired on a call the provider was about to take: the AG-UI interrupt protocol carries the outcome only on `RUN_FINISHED`, so the gate landed on a call the client had already run.
  
  closing the args stream now waits until the provider can no longer speak about the call. `unstable_isClientToolCall` decides that per call: a call the adapter reports as client-owned closes as soon as its arguments parse, and a call whose ownership is unknown closes when the run ends. `@assistant-ui/react-google-adk` supplies the predicate and keeps its previous timing; every other runtime defers a frontend tool to the end of the run. `streamCall` still fires once and still streams partial arguments as they arrive, so rendering is unchanged, but a tool that pairs `streamCall` with `execute` (interactables) now commits its authoritative merge when the run settles.

- [#6580](https://github.com/assistant-ui/assistant-ui/pull/6580) [`dc2cab3`](https://github.com/assistant-ui/assistant-ui/commit/dc2cab3aecc0466c6c2274974e42b3196e0763bc) - chore: remove an internal re-export shim and a duplicated type guard ([@okisdev](https://github.com/okisdev))

- [#6761](https://github.com/assistant-ui/assistant-ui/pull/6761) [`1fa3e09`](https://github.com/assistant-ui/assistant-ui/commit/1fa3e099eeab5c19e414da25fcae1b213da3ff10) - fix: report a stopped AI SDK run as cancelled instead of complete ([@Kinfe123](https://github.com/Kinfe123))

- [#6606](https://github.com/assistant-ui/assistant-ui/pull/6606) [`0f17ba5`](https://github.com/assistant-ui/assistant-ui/commit/0f17ba5bb0c048d5b639205900bd590db5b8824b) - refactor: generate composer attachment IDs with the shared ID utility ([@Kinfe123](https://github.com/Kinfe123))

- [#6528](https://github.com/assistant-ui/assistant-ui/pull/6528) [`152a35d`](https://github.com/assistant-ui/assistant-ui/commit/152a35daae0e80b5307865e59af683c4ae720794) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

- [#6764](https://github.com/assistant-ui/assistant-ui/pull/6764) [`0c5c574`](https://github.com/assistant-ui/assistant-ui/commit/0c5c574993328635aac8a3b954141c451f0b127a) - fix: keep a frontend tool's pending `human()` interrupt when execution starts ([@samdickson22](https://github.com/samdickson22))
  
  a tool whose `execute` awaits `human()` before any other await had its `interrupt` status overwritten by the `executing` status the execution-start callback writes, so the approval prompt never rendered and the run never settled.

- [#6728](https://github.com/assistant-ui/assistant-ui/pull/6728) [`ddaac94`](https://github.com/assistant-ui/assistant-ui/commit/ddaac94844317d901e4a655461c5bd928bdf8e06) - fix: isolate errors from initialize listeners replayed after thread startup ([@Kinfe123](https://github.com/Kinfe123))

- [#6781](https://github.com/assistant-ui/assistant-ui/pull/6781) [`0c68179`](https://github.com/assistant-ui/assistant-ui/commit/0c68179227da4d64d73db9c6c36cd674ccaf59e6) - fix: isolate model context update listener errors ([@rupic-app](https://github.com/apps/rupic-app))

- [#6601](https://github.com/assistant-ui/assistant-ui/pull/6601) [`250f69c`](https://github.com/assistant-ui/assistant-ui/commit/250f69ce608cf32c4930f01e49208e70e8ff9274) - fix: preserve attachment component state when message attachments are removed or reordered ([@Kinfe123](https://github.com/Kinfe123))

- [#6567](https://github.com/assistant-ui/assistant-ui/pull/6567) [`c22a3dc`](https://github.com/assistant-ui/assistant-ui/commit/c22a3dc69e51fc719ea54595b595b892303599c5) - feat: resolve toolkit renderText through a framework-neutral seam ([@okisdev](https://github.com/okisdev))

- [#6561](https://github.com/assistant-ui/assistant-ui/pull/6561) [`aca6e30`](https://github.com/assistant-ui/assistant-ui/commit/aca6e30876f675cfd44066dca410db6191e8251e) - fix: preserve composer attachment component identity after removals ([@Kinfe123](https://github.com/Kinfe123))

- [#6711](https://github.com/assistant-ui/assistant-ui/pull/6711) [`6fdfc23`](https://github.com/assistant-ui/assistant-ui/commit/6fdfc2352390a5e227e488ddd5ef3ab348fc1fda) - fix: keep remote thread runtime hooks scoped to committed renders ([@Kinfe123](https://github.com/Kinfe123))

- [#6380](https://github.com/assistant-ui/assistant-ui/pull/6380) [`136bbf5`](https://github.com/assistant-ui/assistant-ui/commit/136bbf5800904dd2c51a878afa55e9fa40b1dc32) - fix: clear the thread list loading state when a reload or adapter change supersedes the request ([@Kinfe123](https://github.com/Kinfe123))

- [#6518](https://github.com/assistant-ui/assistant-ui/pull/6518) [`69d8e1b`](https://github.com/assistant-ui/assistant-ui/commit/69d8e1bab2d5d6e6c4c6f4434c9f055db0f59aa8) - fix: keep remote thread actions scoped to the committed adapter ([@Kinfe123](https://github.com/Kinfe123))

- [#6494](https://github.com/assistant-ui/assistant-ui/pull/6494) [`dabe8f2`](https://github.com/assistant-ui/assistant-ui/commit/dabe8f21f5cea21fa7fdd1b9c1987e0ac7367c07) - feat: adopt an externally owned message repository instance per adapter swap ([@okisdev](https://github.com/okisdev))

- [#6657](https://github.com/assistant-ui/assistant-ui/pull/6657) [`8d128af`](https://github.com/assistant-ui/assistant-ui/commit/8d128afd6919e7ffe84dba365e29da44592e26a4) - fix: prevent deleted threads from becoming the active thread ([@Kinfe123](https://github.com/Kinfe123))

- [#6586](https://github.com/assistant-ui/assistant-ui/pull/6586) [`9f08bdc`](https://github.com/assistant-ui/assistant-ui/commit/9f08bdc9c1208951cc71e60bd762b12bdb588e4b) - chore: share one shallow-equal across the runtime internals ([@okisdev](https://github.com/okisdev))

- [#6760](https://github.com/assistant-ui/assistant-ui/pull/6760) [`47a46db`](https://github.com/assistant-ui/assistant-ui/commit/47a46db1753aeb836bc1f1d0879eb84d5829eaf9) - fix: keep the remote main thread facade scoped to committed selections ([@Kinfe123](https://github.com/Kinfe123))

- [#6688](https://github.com/assistant-ui/assistant-ui/pull/6688) [`8135d16`](https://github.com/assistant-ui/assistant-ui/commit/8135d16dfb871e807d94a427e958d2b957b19f1e) - fix: peer ranges on the packages this workspace releases now track the release train ([@okisdev](https://github.com/okisdev))
  
  changesets rewrites a peer range only when the new version falls outside it, so the hand-written floors had drifted below the code they describe. core declared `@assistant-ui/store: ^0.3.0` while importing `@assistant-ui/store/internal`, a subpath store did not export until 0.3.10, and react-lexical declared `*`. these peers are now `workspace:^`, which publishes as the version released alongside them.

- [#6669](https://github.com/assistant-ui/assistant-ui/pull/6669) [`07fed43`](https://github.com/assistant-ui/assistant-ui/commit/07fed430ca6b1c07782abd36f5c7f91a7bf5256c) - fix: keep one thread slot per remote id and clear every alias on delete ([@okisdev](https://github.com/okisdev))

- [#6495](https://github.com/assistant-ui/assistant-ui/pull/6495) [`fa9c0dc`](https://github.com/assistant-ui/assistant-ui/commit/fa9c0dc8e88724f3d01251e002c3f4bb4c252f4a) - fix: keep the optimistic assistant placeholder id stable within a run ([@okisdev](https://github.com/okisdev))

- [#6450](https://github.com/assistant-ui/assistant-ui/pull/6450) [`4ca7de9`](https://github.com/assistant-ui/assistant-ui/commit/4ca7de95c90f1ce1bba45fd5e635baac2441e53a) - fix: publish assistant transport callbacks before descendant layout effects ([@Kinfe123](https://github.com/Kinfe123))

- [#6348](https://github.com/assistant-ui/assistant-ui/pull/6348) [`49e727b`](https://github.com/assistant-ui/assistant-ui/commit/49e727b440c3c395ec7c4e9530a5b460b03b8f33) - fix: keep suggestion state stable across equal configurations ([@rupic-app](https://github.com/apps/rupic-app))

- [#6701](https://github.com/assistant-ui/assistant-ui/pull/6701) [`d56a66a`](https://github.com/assistant-ui/assistant-ui/commit/d56a66a6d325d6e64abbc405dae204b4ee1dfc1e) - fix: report cached and reasoning tokens from the AI SDK v7 token details ([@okisdev](https://github.com/okisdev))

- [#6489](https://github.com/assistant-ui/assistant-ui/pull/6489) [`96a2df8`](https://github.com/assistant-ui/assistant-ui/commit/96a2df8ba189796dc1cc14a3ab66160625b1e072) - refactor: share the message error and thread-list load-more predicates across bindings ([@okisdev](https://github.com/okisdev))
- Updated dependencies [[`46fad14`](https://github.com/assistant-ui/assistant-ui/commit/46fad145974a890cd18f7fc2df54e9d0bf36b0fb), [`f0d0aa2`](https://github.com/assistant-ui/assistant-ui/commit/f0d0aa2f87b9d881f7003bf6132bbb519509b36b), [`5bdd416`](https://github.com/assistant-ui/assistant-ui/commit/5bdd416af4379a2cc86c12292e06a6e3ce5fcdb9), [`e53299b`](https://github.com/assistant-ui/assistant-ui/commit/e53299be07fd69bd5d64a2f50bd3561d85dc47cc)]:
  - assistant-stream@0.3.41

## 0.3.16

### Patch Changes

- [#6224](https://github.com/assistant-ui/assistant-ui/pull/6224) [`c70c911`](https://github.com/assistant-ui/assistant-ui/commit/c70c911d9537e6f3e87da44768e3363d65e6a19d) - docs: name `@assistant-ui/ai-sdk` in JSDoc examples ([@okisdev](https://github.com/okisdev))
  
  the import examples on `injectQuoteContext`, `unstable_injectInteractableContext`, and the interactable and message JSDoc pointed at `@assistant-ui/react-ai-sdk`. they now name the framework-neutral package, which is where these live; the old package re-exports it, so both imports resolve.

- [#6360](https://github.com/assistant-ui/assistant-ui/pull/6360) [`e0fa1e6`](https://github.com/assistant-ui/assistant-ui/commit/e0fa1e63d068c142ab3154eeddf6bbdb203ba463) - fix: roll back AssistantFrame providers on registration, release, and disposal failures ([@Kinfe123](https://github.com/Kinfe123))

- [#6346](https://github.com/assistant-ui/assistant-ui/pull/6346) [`b2f148e`](https://github.com/assistant-ui/assistant-ui/commit/b2f148ef81681745eeeb931a56f3c54719cb50e4) - refactor: share the attachment add cancellation machinery between the composer core and the store client. ([@okisdev](https://github.com/okisdev))

- [#6365](https://github.com/assistant-ui/assistant-ui/pull/6365) [`9dabbce`](https://github.com/assistant-ui/assistant-ui/commit/9dabbce426e284886e617f3178a7f50a2fbcbb94) - refactor: notify every thread runtime subscriber before rethrowing a subscriber error. ([@okisdev](https://github.com/okisdev))

- [#6262](https://github.com/assistant-ui/assistant-ui/pull/6262) [`5a3e9f7`](https://github.com/assistant-ui/assistant-ui/commit/5a3e9f7c26c85af640a806fa8174508cbf3fb031) - refactor: move the run report tool call shape and its serialization into assistant-cloud ([@okisdev](https://github.com/okisdev))

- [#6297](https://github.com/assistant-ui/assistant-ui/pull/6297) [`43d52ad`](https://github.com/assistant-ui/assistant-ui/commit/43d52adfc7fb1b94d854454f36fedc40cb16e246) - fix: keep prepended id-less messages in the external message converter ([@Kinfe123](https://github.com/Kinfe123))

- [#6268](https://github.com/assistant-ui/assistant-ui/pull/6268) [`cdfc34d`](https://github.com/assistant-ui/assistant-ui/commit/cdfc34d57e86422666a12f4410e05bbe1c48dbdc) - fix: tag static ai-sdk/v6 tool calls as frontend in cloud run telemetry ([@okisdev](https://github.com/okisdev))

- [#6222](https://github.com/assistant-ui/assistant-ui/pull/6222) [`4000eed`](https://github.com/assistant-ui/assistant-ui/commit/4000eed17a9bb97d854a44eb61d9d5b72634e66c) - fix: cancelling an edit session cancels its in-flight attachment adds and removes its non-complete attachments through the attachment adapter ([@Kinfe123](https://github.com/Kinfe123))

- [#6329](https://github.com/assistant-ui/assistant-ui/pull/6329) [`8217a6e`](https://github.com/assistant-ui/assistant-ui/commit/8217a6e7105b682871211e5c93b1965f25198624) - refactor: derive executing-tool running state inside the external-store runtime; adapters now pass raw provider isRunning. ([@okisdev](https://github.com/okisdev))
  the assistant transport runtime enables tool invocations too, so it now keeps the thread running while a client tool executes instead of reporting idle.

- [#6369](https://github.com/assistant-ui/assistant-ui/pull/6369) [`3fcf338`](https://github.com/assistant-ui/assistant-ui/commit/3fcf3383ec002b4e43e27bd96f0b9a4148d7e6cd) - refactor: collapse the external message converter's duplicate derivation chains into one pure module. ([@okisdev](https://github.com/okisdev))

- [#6324](https://github.com/assistant-ui/assistant-ui/pull/6324) [`4802d23`](https://github.com/assistant-ui/assistant-ui/commit/4802d238dd7411589a0ce40102c1c7e90fe53fc0) - fix: derive requires-action for pending and interrupted tool calls in the external-store convertMessage path; messages with unresolved tool calls now report requires-action instead of complete ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#6174](https://github.com/assistant-ui/assistant-ui/pull/6174) [`c3fd2b3`](https://github.com/assistant-ui/assistant-ui/commit/c3fd2b30443ac58019c6c22693c46e18deed18b4) - fix: evict deleted external-store messages so no phantom branch survives. the setMessages path evicts immediately; the onDelete path evicts at the confirming host snapshot ([@Kinfe123](https://github.com/Kinfe123))

- [#6271](https://github.com/assistant-ui/assistant-ui/pull/6271) [`231d148`](https://github.com/assistant-ui/assistant-ui/commit/231d14896f3a2b2bb65d7844e65eca17f9151399) - fix: keep prepended history when convertMessage returns no id ([@okisdev](https://github.com/okisdev))

- [#6439](https://github.com/assistant-ui/assistant-ui/pull/6439) [`7e03b66`](https://github.com/assistant-ui/assistant-ui/commit/7e03b669d08b4cadaf4b381a4d1e57c2fc22d139) - refactor: share the file part source resolution branch ([@okisdev](https://github.com/okisdev))

- [#6236](https://github.com/assistant-ui/assistant-ui/pull/6236) [`1263c1f`](https://github.com/assistant-ui/assistant-ui/commit/1263c1fb8870ff1ba0a1c0e0ec3f3ea53a4c53da) - fix: report frame tool failures whose error message is empty ([@Kinfe123](https://github.com/Kinfe123))

- [#6458](https://github.com/assistant-ui/assistant-ui/pull/6458) [`465a7a6`](https://github.com/assistant-ui/assistant-ui/commit/465a7a68c9870e440040e70e9fe2cd062413de8e) - fix: default assistant frame messaging to the current origin ([@Kinfe123](https://github.com/Kinfe123))

- [#6197](https://github.com/assistant-ui/assistant-ui/pull/6197) [`5355528`](https://github.com/assistant-ui/assistant-ui/commit/5355528559bb575e11bbfbf6cac80203196cedaf) - fix: preserve incomplete tool-call part statuses ([@Gujiassh](https://github.com/Gujiassh))

- [#6199](https://github.com/assistant-ui/assistant-ui/pull/6199) [`e97f7c6`](https://github.com/assistant-ui/assistant-ui/commit/e97f7c61365ef0f73686c7b596751802f1a1ddd2) - fix: resolve InMemoryThreadList index selectors within the archived/regular subset ([@Kinfe123](https://github.com/Kinfe123))

- [#6345](https://github.com/assistant-ui/assistant-ui/pull/6345) [`a6d2da5`](https://github.com/assistant-ui/assistant-ui/commit/a6d2da5a0c021fbcd46ac3b56d5e4086edda1f64) - refactor: share the interactable persistence scheduler between the tap client and the legacy surface. ([@okisdev](https://github.com/okisdev))
  a save that settles after its interactable unregistered no longer recreates the removed persistence-status entry.

- [#6328](https://github.com/assistant-ui/assistant-ui/pull/6328) [`6b797ca`](https://github.com/assistant-ui/assistant-ui/commit/6b797ca09fd63ac988dc7a2e60117ca2fe231f97) - refactor: share the runtime lifecycle callback invoker from core internal. ([@okisdev](https://github.com/okisdev))
  callback errors continue to be reported and swallowed through the shared invoker.

- [#6257](https://github.com/assistant-ui/assistant-ui/pull/6257) [`bea47ed`](https://github.com/assistant-ui/assistant-ui/commit/bea47edbf19aa0258506ade5d73e9096e510b858) - fix: type MCP app metadata in ThreadMessageLike tool calls ([@rupic-app](https://github.com/apps/rupic-app))

- [#6325](https://github.com/assistant-ui/assistant-ui/pull/6325) [`546dae8`](https://github.com/assistant-ui/assistant-ui/commit/546dae8c474463a0c228696e16d250bb9a3578ae) - fix: derive requires-action for pending and interrupted tool calls when importing messages into the repository, and resume local runs after approving an imported pending approval ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#6430](https://github.com/assistant-ui/assistant-ui/pull/6430) [`a06be56`](https://github.com/assistant-ui/assistant-ui/commit/a06be56bfe75f869bb44f1d92949e35516f64686) - refactor: share the message repository session layer between a2a and ag-ui ([@okisdev](https://github.com/okisdev))

- [#6237](https://github.com/assistant-ui/assistant-ui/pull/6237) [`96d4ddf`](https://github.com/assistant-ui/assistant-ui/commit/96d4ddf53398e2e952f3bc365539f2d6f6fd85e4) - fix: preserve generated thread titles across overlapping optimistic updates ([@dawNotPoi](https://github.com/dawNotPoi))

- [#6333](https://github.com/assistant-ui/assistant-ui/pull/6333) [`c8db434`](https://github.com/assistant-ui/assistant-ui/commit/c8db4344d5b597cec7484defc9224a65e41e38d8) - refactor: move queue item state ownership into the runtime layer. ([@okisdev](https://github.com/okisdev))

- [#6293](https://github.com/assistant-ui/assistant-ui/pull/6293) [`bc55058`](https://github.com/assistant-ui/assistant-ui/commit/bc550585b16f1ae0379fb45dd01bd90ce7faf0eb) - docs: `ToolApprovalOption.kind` no longer says the default kit skips custom `_`-prefixed kinds; the kit renders them and answers with an explicit `approved` value alongside the `optionId` ([@samdickson22](https://github.com/samdickson22))

- [#6344](https://github.com/assistant-ui/assistant-ui/pull/6344) [`0221348`](https://github.com/assistant-ui/assistant-ui/commit/0221348df3770f590b34ef45e2c175e8de385e16) - refactor: back ModelContextRegistry's provider handling with CompositeContextProvider. ([@okisdev](https://github.com/okisdev))

- [#6203](https://github.com/assistant-ui/assistant-ui/pull/6203) [`c415384`](https://github.com/assistant-ui/assistant-ui/commit/c415384e392426384c857f1ca00c69128075bf57) - fix: keep threads initialized during a list() flight in the thread list when the stale response lands ([@Kinfe123](https://github.com/Kinfe123))

- [#6347](https://github.com/assistant-ui/assistant-ui/pull/6347) [`5bba723`](https://github.com/assistant-ui/assistant-ui/commit/5bba723caa79600c1c568d0deb937fca8acb0b54) - refactor: share the remote thread list empty state and local thread seeding. ([@okisdev](https://github.com/okisdev))

- [#6246](https://github.com/assistant-ui/assistant-ui/pull/6246) [`0188899`](https://github.com/assistant-ui/assistant-ui/commit/018889996bbc9aefcfc503e12159dfe76f793b40) - fix: preserve streamed RemoteThreadList titles across optimistic replays ([@rupic-app](https://github.com/apps/rupic-app))

- [#6305](https://github.com/assistant-ui/assistant-ui/pull/6305) [`e96d3de`](https://github.com/assistant-ui/assistant-ui/commit/e96d3dea9370159e04f82bf4eb39d6b1b1c4d21d) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

- [#6409](https://github.com/assistant-ui/assistant-ui/pull/6409) [`027f5e2`](https://github.com/assistant-ui/assistant-ui/commit/027f5e20e927b49fac5644283bd622a9725cf346) - refactor: share the pending tool-call scan, abortable thread load, and cloud create fallback via core. ([@okisdev](https://github.com/okisdev))

- [#6227](https://github.com/assistant-ui/assistant-ui/pull/6227) [`ebabca4`](https://github.com/assistant-ui/assistant-ui/commit/ebabca49de57630a2040af0ed59c058da95483d7) - fix: reject archived index selectors on SingleThreadList instead of resolving the regular thread ([@Kinfe123](https://github.com/Kinfe123))

- [#6332](https://github.com/assistant-ui/assistant-ui/pull/6332) [`fc7f72f`](https://github.com/assistant-ui/assistant-ui/commit/fc7f72f0f846848e8c88eaba2131d4ef0005feab) - fix: refresh static suggestions when their configuration changes ([@Kinfe123](https://github.com/Kinfe123))

- [#6282](https://github.com/assistant-ui/assistant-ui/pull/6282) [`0064d1e`](https://github.com/assistant-ui/assistant-ui/commit/0064d1e859171e271c11cec07f4dcde7d0d023bc) - fix: never execute a frontend tool on a tool call that carries a provider approval ([@ShobhitPatra](https://github.com/ShobhitPatra))
- Updated dependencies [[`8626c1f`](https://github.com/assistant-ui/assistant-ui/commit/8626c1ffe1c6d56ec75073e795aa9fbf7493c3ed), [`531f61a`](https://github.com/assistant-ui/assistant-ui/commit/531f61a4d2f5fcee16821a6401d9d11394bf8339), [`dfaa94f`](https://github.com/assistant-ui/assistant-ui/commit/dfaa94fca3ecdd8b0b0ab202f08dafd03c1e2ed5), [`a4bc54a`](https://github.com/assistant-ui/assistant-ui/commit/a4bc54afa976423b6310a2d5be350df0f3b41e42), [`fd471e9`](https://github.com/assistant-ui/assistant-ui/commit/fd471e94babf7b6580e06bbea2b7a8cdd4882869), [`ac7ec15`](https://github.com/assistant-ui/assistant-ui/commit/ac7ec15e118a9279dd60521b839ecc38983675c5), [`e96d3de`](https://github.com/assistant-ui/assistant-ui/commit/e96d3dea9370159e04f82bf4eb39d6b1b1c4d21d), [`f96e22f`](https://github.com/assistant-ui/assistant-ui/commit/f96e22ffa8c85cbfc4a878db4f371c510070066d), [`bfc8bef`](https://github.com/assistant-ui/assistant-ui/commit/bfc8bef9f1ee6cb4cb25f83488a0e4ce1a393ff3), [`2cd5cbc`](https://github.com/assistant-ui/assistant-ui/commit/2cd5cbcf78c586b7557421b00e9c996c62bd7f43), [`105af3e`](https://github.com/assistant-ui/assistant-ui/commit/105af3eaea2093df271d9c44642e1c04d5f5cf7c), [`4c3194a`](https://github.com/assistant-ui/assistant-ui/commit/4c3194aca4470753a2a37e244cb5e3fb27cbc76b)]:
  - assistant-stream@0.3.40

## 0.3.15

### Patch Changes

- [#6100](https://github.com/assistant-ui/assistant-ui/pull/6100) [`fa30915`](https://github.com/assistant-ui/assistant-ui/commit/fa309156e033dc085c0d3b8fb97c27c81a3d2c6e) - fix: propagate AssistantFrame tool cancellation across the frame boundary ([@Kinfe123](https://github.com/Kinfe123))

- [#5823](https://github.com/assistant-ui/assistant-ui/pull/5823) [`b355aef`](https://github.com/assistant-ui/assistant-ui/commit/b355aefbe2403025562f0e08494a57450bfdc049) - fix: prevent AssistantFrameProvider from ignoring a later explicit targetOrigin ([@Kinfe123](https://github.com/Kinfe123))

- [#6136](https://github.com/assistant-ui/assistant-ui/pull/6136) [`f7bd2d9`](https://github.com/assistant-ui/assistant-ui/commit/f7bd2d9392e1e71750012fa87649002e8c9d1dab) - fix: keep DevTools updates flowing when a subscriber throws ([@Kinfe123](https://github.com/Kinfe123))

- [#6107](https://github.com/assistant-ui/assistant-ui/pull/6107) [`4947ef4`](https://github.com/assistant-ui/assistant-ui/commit/4947ef4f9b0956bd4ca21c457b3cc7e79a2fc9e0) - fix: preserve falsy assistant transport artifacts ([@Kinfe123](https://github.com/Kinfe123))

- [#5809](https://github.com/assistant-ui/assistant-ui/pull/5809) [`332f736`](https://github.com/assistant-ui/assistant-ui/commit/332f736e64bfa26f76cd60318279697ddbc0b36d) - fix: load archived threads in the cloud thread list adapter ([@SnowingFox](https://github.com/SnowingFox))

- [#6112](https://github.com/assistant-ui/assistant-ui/pull/6112) [`ef9254d`](https://github.com/assistant-ui/assistant-ui/commit/ef9254d5b2174fb4b58b4e954a8a0d60910a484c) - fix: contain a synchronously throwing clipboard writer in useActionBarCopy ([@samdickson22](https://github.com/samdickson22))

- [#6156](https://github.com/assistant-ui/assistant-ui/pull/6156) [`9c65b51`](https://github.com/assistant-ui/assistant-ui/commit/9c65b511bc7cdc7d6699c128cac4650cae728043) - deprecate leftover Primitive.If and Empty wrappers on react-native and react-ink, and point them at AuiIf ([@okisdev](https://github.com/okisdev))
  
  ThreadIf now reads `thread.isEmpty` instead of `messages.length === 0`, matching the loading-aware field already used by ThreadEmpty and AuiIf. First-party examples and docs samples that still called the leftover wrappers now use `AuiIf` directly.

- [#6106](https://github.com/assistant-ui/assistant-ui/pull/6106) [`5845ba7`](https://github.com/assistant-ui/assistant-ui/commit/5845ba7c5690af776701683fbd2d04e9ca0eaaff) - fix: `ExternalThread` no longer reports an empty thread while it is loading ([@samdickson22](https://github.com/samdickson22))
  
  `ExternalThread` computed `thread.isEmpty` as `messages.length === 0`, omitting
  the `isLoading` term that `thread-runtime-client.ts` already applies. A thread
  with `isLoading: true` and no messages yet reported `isEmpty: true`, so
  `<ThreadPrimitive.Empty>`, `useThreadIsEmpty()`, and `AuiIf` on
  `s.thread.isEmpty` rendered their empty state underneath the loading indicator.
  The `ThreadState` type already documents the intended contract: a thread is
  empty when it has no messages and is not loading.
  
  Both producers now define `isEmpty` identically. Consumers that pass
  `isLoading` to `ExternalThread` and render empty-state UI will see that UI stay
  hidden until loading finishes. `useExternalStoreRuntime` is unaffected — it
  already carried the `isLoading` term.

- [#6125](https://github.com/assistant-ui/assistant-ui/pull/6125) [`1b30bfd`](https://github.com/assistant-ui/assistant-ui/commit/1b30bfdabadfe3613b7c98296de3d6665122136b) - refactor: collapse the two inert thread cores onto a shared base ([@okisdev](https://github.com/okisdev))

- [#6159](https://github.com/assistant-ui/assistant-ui/pull/6159) [`365e763`](https://github.com/assistant-ui/assistant-ui/commit/365e763928ff38d2de518efa2a7c44249afbbf83) - fix: avoid ancestor scans when importing new messages ([@rupic-app](https://github.com/apps/rupic-app))

- [#6135](https://github.com/assistant-ui/assistant-ui/pull/6135) [`d19921d`](https://github.com/assistant-ui/assistant-ui/commit/d19921d3739efb53dcbbb1ae04ffd18a94dca080) - fix: prevent cancelled external-store runs from resyncing after teardown ([@Kinfe123](https://github.com/Kinfe123))

- [#6080](https://github.com/assistant-ui/assistant-ui/pull/6080) [`996aa57`](https://github.com/assistant-ui/assistant-ui/commit/996aa5723cf8d7db00cc72da08713226d90ec0e1) - fix: reset remote thread selection and cached records when the thread-list adapter is replaced ([@okisdev](https://github.com/okisdev))

- [#6177](https://github.com/assistant-ui/assistant-ui/pull/6177) [`21d6e87`](https://github.com/assistant-ui/assistant-ui/commit/21d6e87dc2834af11babb93c004f7d4f3a4f9568) - fix: notify thread subscribers when a remote thread core is republished ([@Yonom](https://github.com/Yonom))

- [#6092](https://github.com/assistant-ui/assistant-ui/pull/6092) [`cd247e5`](https://github.com/assistant-ui/assistant-ui/commit/cd247e557b4876c49feb9b79c4f5149cc2271dad) - fix: traverse long message branches without recursive stack growth ([@Kinfe123](https://github.com/Kinfe123))

- [#6142](https://github.com/assistant-ui/assistant-ui/pull/6142) [`1bf263b`](https://github.com/assistant-ui/assistant-ui/commit/1bf263ba208668ead7f6c0786ca0c3064e31c3ab) - fix: settle aborted and superseded local runs without continuing them, while keeping approval pauses answerable after cancel ([@Kinfe123](https://github.com/Kinfe123))

- [#6124](https://github.com/assistant-ui/assistant-ui/pull/6124) [`06b04a7`](https://github.com/assistant-ui/assistant-ui/commit/06b04a7976d10fac3af40ae9ca59b52385ef2ae2) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

- [#6081](https://github.com/assistant-ui/assistant-ui/pull/6081) [`a614b5e`](https://github.com/assistant-ui/assistant-ui/commit/a614b5e44df5f59d82b63b60132a41c89f82e185) - Disconnect immediately when createVoiceSession receives an already-aborted signal. ([@Gujiassh](https://github.com/Gujiassh))

- [#6087](https://github.com/assistant-ui/assistant-ui/pull/6087) [`07b51db`](https://github.com/assistant-ui/assistant-ui/commit/07b51dbbc749c94023fa25df99bb7f64dc211ff1) - Mark voice sessions cancelled when aborted or explicitly disconnected. ([@rupic-app](https://github.com/apps/rupic-app))

- [#6168](https://github.com/assistant-ui/assistant-ui/pull/6168) [`92e52bd`](https://github.com/assistant-ui/assistant-ui/commit/92e52bd2c99ee8cacd242bf723f617df64e42e2a) - fix: align tool-call status reasons with message status ([@rupic-app](https://github.com/apps/rupic-app))
- Updated dependencies [[`19e52c4`](https://github.com/assistant-ui/assistant-ui/commit/19e52c4012a6a8c32e514134af9ce4eee1146864)]:
  - assistant-stream@0.3.39

## 0.3.14

### Patch Changes

- [#6068](https://github.com/assistant-ui/assistant-ui/pull/6068) [`ac0c836`](https://github.com/assistant-ui/assistant-ui/commit/ac0c8364a0f25555f693e4354d07c411e65f5489) - fix: stabilize `unstable_useAdapters` results on both adapter faces and warn on an unkeyed history factory. the React host's synthesized provider now absorbs a fresh but shallow-equal adapters bag the same way the `RemoteThreadList` store entry does, reusing the store's `useShallowStable` primitive through its internal entry, and the store entry warns in development when a history adapter arrives while the thread factory is unkeyed, since switching threads would silently keep the first thread's history. ([@okisdev](https://github.com/okisdev))

- [#6071](https://github.com/assistant-ui/assistant-ui/pull/6071) [`c3fd447`](https://github.com/assistant-ui/assistant-ui/commit/c3fd447f23cbaa36381b2f62058b420bd54cc148) - feat: host assistant-cloud thread lists on AISDKThreads via RemoteThreadList ([@okisdev](https://github.com/okisdev))
  
  AISDKThreads({ cloud }) uses RemoteThreadList and remounts each thread like useChatRuntime. Cloud history withFormat resolves persistence per call so one adapter can serve many threads. useExternalHistory waits for threadListItem.remoteId instead of latching on the first empty paint.

- [#5872](https://github.com/assistant-ui/assistant-ui/pull/5872) [`f9529bf`](https://github.com/assistant-ui/assistant-ui/commit/f9529bfdea5018505ef393fe46e93809a0012032) - feat: move useAssistantTransportRuntime into core/react ([@okisdev](https://github.com/okisdev))

- [#5872](https://github.com/assistant-ui/assistant-ui/pull/5872) [`f9529bf`](https://github.com/assistant-ui/assistant-ui/commit/f9529bfdea5018505ef393fe46e93809a0012032) - fix: persist data message parts in aui/v0 cloud history ([@okisdev](https://github.com/okisdev))

- [#5983](https://github.com/assistant-ui/assistant-ui/pull/5983) [`05b94bd`](https://github.com/assistant-ui/assistant-ui/commit/05b94bd5ec879fbf87165385028000eb01e47396) - fix: handle failed LocalRuntime user-message history writes without abandoning the run ([@Kinfe123](https://github.com/Kinfe123))

- [#6030](https://github.com/assistant-ui/assistant-ui/pull/6030) [`cef671d`](https://github.com/assistant-ui/assistant-ui/commit/cef671d63d173bd30fcef268b1539f1a64cf5f39) - fix: report automatic thread title generation failures ([@Kinfe123](https://github.com/Kinfe123))

- [#6053](https://github.com/assistant-ui/assistant-ui/pull/6053) [`ef7f70d`](https://github.com/assistant-ui/assistant-ui/commit/ef7f70d4fc05195d6386f8e2d072d3deaef1e56a) - fix: report attachment removal failures without leaking unhandled rejections ([@Kinfe123](https://github.com/Kinfe123))

- [#5376](https://github.com/assistant-ui/assistant-ui/pull/5376) [`39db2ff`](https://github.com/assistant-ui/assistant-ui/commit/39db2ff60c6392267d88bbc42d63aa32dd9be0fe) - fix: isolate WebSpeech dictation listener errors and report async listener rejections from speech synthesis and voice sessions ([@Kinfe123](https://github.com/Kinfe123))

- [#5619](https://github.com/assistant-ui/assistant-ui/pull/5619) [`a2a753b`](https://github.com/assistant-ui/assistant-ui/commit/a2a753b71cf8e2c531a8006060eb9931a44824d8) - fix: handle rejected external-store callbacks ([@Kinfe123](https://github.com/Kinfe123))

- [#6076](https://github.com/assistant-ui/assistant-ui/pull/6076) [`bec0753`](https://github.com/assistant-ui/assistant-ui/commit/bec075348dbdcd377c38074dd179d2751463ba35) - fix: persist cloud history against the departing thread after a switch ([@rupic-app](https://github.com/apps/rupic-app))

- [#6005](https://github.com/assistant-ui/assistant-ui/pull/6005) [`4326079`](https://github.com/assistant-ui/assistant-ui/commit/4326079bfca7cdaac75497958be39e132343b26c) - feat: move useCloudThreadListRuntime into core/react and drop the unused react copy of the aui/v0 codec ([@okisdev](https://github.com/okisdev))

- [#6023](https://github.com/assistant-ui/assistant-ui/pull/6023) [`3d68b16`](https://github.com/assistant-ui/assistant-ui/commit/3d68b168e23bb0fd63853b41368d46f8199a3874) - fix: derive thread composer canCancel from an in-flight run ([@okisdev](https://github.com/okisdev))

- [#5890](https://github.com/assistant-ui/assistant-ui/pull/5890) [`98795aa`](https://github.com/assistant-ui/assistant-ui/commit/98795aa266f724d512b973d791ce08fe4c21c2c5) - fix: snapshot composer role and run configuration before uploading attachments ([@Kinfe123](https://github.com/Kinfe123))

- [#5959](https://github.com/assistant-ui/assistant-ui/pull/5959) [`9d920cc`](https://github.com/assistant-ui/assistant-ui/commit/9d920cc89c25459e602ee0c3037b5f84fd626e01) - feat: expose InMemoryThreadList and its transform scopes from the store entry, with an onDelete callback and a fresh thread after deleting the last one ([@okisdev](https://github.com/okisdev))

- [#5913](https://github.com/assistant-ui/assistant-ui/pull/5913) [`1b9c33d`](https://github.com/assistant-ui/assistant-ui/commit/1b9c33d114ab1589f0592fabda58ca63265265c6) - feat: shared disabled predicates for the primitive layer on @assistant-ui/core/store/internal. the composer, action bar, branch picker, and suggestion disabled selectors previously lived as verbatim copies in each binding's hooks; they are now named exports (composerSendDisabled and friends) consumed by the react hooks and the vue and svelte bridges alike, so disabled semantics cannot drift between frameworks. ([@okisdev](https://github.com/okisdev))

- [#5932](https://github.com/assistant-ui/assistant-ui/pull/5932) [`d68918e`](https://github.com/assistant-ui/assistant-ui/commit/d68918ee5c862ca6a261a01ea0b961e7b2b66af2) - feat: export `runtimeAdapterTransformScopes` from the store entry, so adapter packages can attach `RuntimeAdapter`'s scope defaults to their own config entries. ([@okisdev](https://github.com/okisdev))

- [#5897](https://github.com/assistant-ui/assistant-ui/pull/5897) [`74dca03`](https://github.com/assistant-ui/assistant-ui/commit/74dca0330e907428ec11b85fb1a33306368ddae7) - fix: route ThreadRuntime/ThreadListRuntime subscribe through the memoizing state binding, and give LazyMemoizeSubject the same identity guard ShallowMemoizeSubject has, so getState serves a stable identity between notifications. Note: ThreadRuntime.subscribe now only notifies when the shallow-compared ThreadState changed — composer edits no longer wake thread subscribers; observe them via `runtime.composer.subscribe`, matching every other runtime class. ([@Yonom](https://github.com/Yonom))

- [#6040](https://github.com/assistant-ui/assistant-ui/pull/6040) [`87bf950`](https://github.com/assistant-ui/assistant-ui/commit/87bf95093f6b3f38406b5317545ce697e4979e6d) - fix: generate the thread title as soon as the thread exists. the automatic title generation for a new thread fires when initialization resolves, concurrent with the first run, instead of at the first runEnd, so the sidebar stops showing "New Chat" for the whole first response and a thread abandoned mid-run no longer stays untitled forever. the title request carries the messages present at that moment, typically just the user message. ([@okisdev](https://github.com/okisdev))

- [#5937](https://github.com/assistant-ui/assistant-ui/pull/5937) [`5a01343`](https://github.com/assistant-ui/assistant-ui/commit/5a01343f87ba3282004a08ef014dc3d51f3ce3cf) - fix: avoid trailing spaces when appending empty suggestions ([@rupic-app](https://github.com/apps/rupic-app))

- [#5929](https://github.com/assistant-ui/assistant-ui/pull/5929) [`0f6e9e9`](https://github.com/assistant-ui/assistant-ui/commit/0f6e9e9b56c648249781cef7689f4587209948d0) - chore: replace stale example model ids with gpt-5.6-luna ([@okisdev](https://github.com/okisdev))

- [#6034](https://github.com/assistant-ui/assistant-ui/pull/6034) [`b80a6be`](https://github.com/assistant-ui/assistant-ui/commit/b80a6be3db5b5558792e5e0e267db45c133d248e) - fix: paint the first message of a new thread before initialization resolves. the local core inserts and notifies before awaiting the initialization barrier, rolling the optimistic message back and rejecting with `MessageNotSentError` when the barrier fails, and the external-store core no longer holds `onNew` on it. behavior change for custom external-store adapters under a remote thread list: `onNew` and `onEdit` can now run before the thread record exists, so a dispatch that needs the remote identity must `await threadListItem.initialize()` itself (the ai-sdk transport and langgraph already do, `useStreamRuntime` now does). appends that used to be silently dropped when the thread was stopped, unmounted, or switched away during the initialization wait now dispatch immediately instead; the invalidation guard still covers the tool-abort window. the queue path keeps the pre-enqueue barrier. ([@okisdev](https://github.com/okisdev))

- [#5892](https://github.com/assistant-ui/assistant-ui/pull/5892) [`01580e3`](https://github.com/assistant-ui/assistant-ui/commit/01580e3b8b660542743d63ed79dd02026bb649e4) - fix: retain the message part children props in published declarations ([@charlesverge](https://github.com/charlesverge))

- [#6035](https://github.com/assistant-ui/assistant-ui/pull/6035) [`e8c53e9`](https://github.com/assistant-ui/assistant-ui/commit/e8c53e9ce2b687e0342cbb9158191300827f75e9) - fix: switch away when remote thread unarchive fails ([@rupic-app](https://github.com/apps/rupic-app))

- [#6044](https://github.com/assistant-ui/assistant-ui/pull/6044) [`53ae80f`](https://github.com/assistant-ui/assistant-ui/commit/53ae80f67f7cd82f5af1751f1d73ade437ba7136) - fix: preserve archived thread state when unarchive fallback reseeds ([@rupic-app](https://github.com/apps/rupic-app))

- [#5298](https://github.com/assistant-ui/assistant-ui/pull/5298) [`5f4dee5`](https://github.com/assistant-ui/assistant-ui/commit/5f4dee5e233c2918b61719ef1b91397bad856762) - fix: refresh Cloud attachment uploads when the Cloud client changes ([@Kinfe123](https://github.com/Kinfe123))

- [#5405](https://github.com/assistant-ui/assistant-ui/pull/5405) [`2da61a3`](https://github.com/assistant-ui/assistant-ui/commit/2da61a3be3e8e3f61a4d9310b1845325c44d8ac7) - fix: handle rejected dictation shutdowns ([@Kinfe123](https://github.com/Kinfe123))

- [#5837](https://github.com/assistant-ui/assistant-ui/pull/5837) [`0131fc7`](https://github.com/assistant-ui/assistant-ui/commit/0131fc741624dad2a0c2a60b4a29eb106e0511aa) - fix: migrate interactables update-tool UIs across tools scope replacements and install pending ones once the scope appears ([@okisdev](https://github.com/okisdev))

- [#5593](https://github.com/assistant-ui/assistant-ui/pull/5593) [`a934d03`](https://github.com/assistant-ui/assistant-ui/commit/a934d03a14fb5e2afa6a7647b82a0018d4a66b1d) - fix: preserve metadata from every joined assistant message ([@serhiizghama](https://github.com/serhiizghama))
  
  When consecutive assistant/tool outputs are joined into one message, only the first output's metadata was kept — annotations, data, steps, custom, timing, and feedback on any later assistant message (e.g. the final answer after a tool call) were silently dropped.
  
  `unstable_annotations`, `unstable_data`, and `steps` now accumulate across every joined output, and `custom` merges with later keys overwriting earlier ones for the same key. `unstable_state`, `timing`, and `submittedFeedback` are scalar and take the last joined output's value (last-wins) — the joined message's `id`/`createdAt`/`status` are unaffected and still come from the first output.

- [#5864](https://github.com/assistant-ui/assistant-ui/pull/5864) [`b6d7b2b`](https://github.com/assistant-ui/assistant-ui/commit/b6d7b2b1c553433784a5e52ac411c9c544d8d0c1) - fix: wait for remote thread initialization before external-store appends ([@rupic-app](https://github.com/apps/rupic-app))

- [#6026](https://github.com/assistant-ui/assistant-ui/pull/6026) [`bc337af`](https://github.com/assistant-ui/assistant-ui/commit/bc337af975bb69c0127a7b42ae48790ab8e3440b) - fix: resynchronize lazy memoized state when connecting ([@rupic-app](https://github.com/apps/rupic-app))

- [#5910](https://github.com/assistant-ui/assistant-ui/pull/5910) [`dc6eb2f`](https://github.com/assistant-ui/assistant-ui/commit/dc6eb2f9098e1fd9de112b44a5dfd46d3bcea249) - style: apply oxfmt 0.63 formatting ([@okisdev](https://github.com/okisdev))

- [#5874](https://github.com/assistant-ui/assistant-ui/pull/5874) [`ce57458`](https://github.com/assistant-ui/assistant-ui/commit/ce574588a32f806ebf37e9c2c4457569b1269348) - fix: discard pending appends when their thread runtime is replaced ([@rupic-app](https://github.com/apps/rupic-app))

- [#5880](https://github.com/assistant-ui/assistant-ui/pull/5880) [`ab7ead9`](https://github.com/assistant-ui/assistant-ui/commit/ab7ead9dae979daafd5fb423d4e636cb41b8ed26) - fix: gate queued external-store appends on thread initialization ([@okisdev](https://github.com/okisdev))

- [#5859](https://github.com/assistant-ui/assistant-ui/pull/5859) [`067ef52`](https://github.com/assistant-ui/assistant-ui/commit/067ef528f725fb77a892049bd8d6bbc5422baaa4) - fix: ignore suggestions generated by superseded local runtime runs ([@Kinfe123](https://github.com/Kinfe123))

- [#5971](https://github.com/assistant-ui/assistant-ui/pull/5971) [`e5bf0ef`](https://github.com/assistant-ui/assistant-ui/commit/e5bf0ef9739be0579bb4fb4bb175dc0cdd3143fc) - fix: keep duplicate model context registrations independent ([@rupic-app](https://github.com/apps/rupic-app))

- [#5927](https://github.com/assistant-ui/assistant-ui/pull/5927) [`a2ab997`](https://github.com/assistant-ui/assistant-ui/commit/a2ab997dc645923fa8ebbca5e8e050d467a69cf4) - fix: isolate overlapping tool executions that reuse a toolCallId ([@rupic-app](https://github.com/apps/rupic-app))

- [#6050](https://github.com/assistant-ui/assistant-ui/pull/6050) [`fc9dd90`](https://github.com/assistant-ui/assistant-ui/commit/fc9dd90e25db8635a42e8961f4e371ce09457523) - fix: notify every external thread-list subscriber when one listener throws ([@Kinfe123](https://github.com/Kinfe123))

- [#5572](https://github.com/assistant-ui/assistant-ui/pull/5572) [`0e2a230`](https://github.com/assistant-ui/assistant-ui/commit/0e2a23073b3b62ebd2e614858cd910c75886977c) - fix: flush queued interactable writes through the outgoing persistence adapter, one full-state save at a time ([@Kinfe123](https://github.com/Kinfe123))

- [#5464](https://github.com/assistant-ui/assistant-ui/pull/5464) [`d800f8b`](https://github.com/assistant-ui/assistant-ui/commit/d800f8bbee28f5fe3693f2ec2c8682f4dad2ae62) - fix: notify every model context subscriber before rethrowing, and roll back a provider registration when its subscribe throws ([@Kinfe123](https://github.com/Kinfe123))

- [#6037](https://github.com/assistant-ui/assistant-ui/pull/6037) [`f5b39d4`](https://github.com/assistant-ui/assistant-ui/commit/f5b39d415b447d881bf269d08577d31a9646b0fd) - feat: add `RemoteThreadListAdapter.unstable_useAdapters` so the `RemoteThreadList` store entry can load per-thread history without rendering `unstable_Provider` ([@okisdev](https://github.com/okisdev))

- [#6020](https://github.com/assistant-ui/assistant-ui/pull/6020) [`26f40c1`](https://github.com/assistant-ui/assistant-ui/commit/26f40c1304b5b4dcd081303bd69a5ec95a37334e) - feat: add a `RemoteThreadList` store entry so any `AssistantClient` host can run a remote thread list from a `RemoteThreadListAdapter` and a `thread` factory ([@okisdev](https://github.com/okisdev))

- [#5871](https://github.com/assistant-ui/assistant-ui/pull/5871) [`f618ab6`](https://github.com/assistant-ui/assistant-ui/commit/f618ab692eed3662a60a15d474c1c16715edb012) - fix: retry remote thread initialization after a rejected append ([@rupic-app](https://github.com/apps/rupic-app))

- [#5834](https://github.com/assistant-ui/assistant-ui/pull/5834) [`d80e988`](https://github.com/assistant-ui/assistant-ui/commit/d80e9882c4ec0a7662df28546ddd92cc1f0b1fcd) - fix: model-context registrations follow the committed scope across structural replacements. The new `useAssistantScopeEffect(scope, effect, deps)` re-runs a registration when the scope's bound client is replaced (cleaning up against the old one first) while ignoring value updates, and the toolkit, runtime-adapter, interactables, and MCP registration sites now use it instead of registering once against a stable client ref. ([@okisdev](https://github.com/okisdev))

- [#5922](https://github.com/assistant-ui/assistant-ui/pull/5922) [`7f944be`](https://github.com/assistant-ui/assistant-ui/commit/7f944be666ab4f59d35e68c721bfb93ca7551522) - feat: add `unstable_notifySessionReset` so adapters with a resettable backing session can clear session-scoped tool-invocation state without run-cancel side effects; the eve reset now uses it instead of composing `cancelRun` with a hand-rolled session filter ([@okisdev](https://github.com/okisdev))

- [#5435](https://github.com/assistant-ui/assistant-ui/pull/5435) [`f37f595`](https://github.com/assistant-ui/assistant-ui/commit/f37f5952171240eb04c1fe3395d4c9afe4b5ccc8) - fix: isolate message queue subscriber errors ([@Kinfe123](https://github.com/Kinfe123))

- [#6058](https://github.com/assistant-ui/assistant-ui/pull/6058) [`837ef1b`](https://github.com/assistant-ui/assistant-ui/commit/837ef1b21fead90a2a4176f209dbb01ed6ccae62) - fix: render system messages safely when editing components are omitted ([@rupic-app](https://github.com/apps/rupic-app))

- [#6014](https://github.com/assistant-ui/assistant-ui/pull/6014) [`7748e15`](https://github.com/assistant-ui/assistant-ui/commit/7748e15acf9d7d16701296e9ef89e1757ec346b3) - feat: host remote thread runtimeHooks as keyed tap resources on the list hook. `useRemoteThreadListRuntime` mounts one `useResources` host after each thread's `unstable_Provider`, so the first `runtimeHook` call already sees Provider adapters. AdapterSink only publishes those adapters. `@assistant-ui/store/client` exports `useConfiguredAui` and `useAssistantContextProvider` so that host can extend and provide a client the same way `AuiProvider` does in React. ([@okisdev](https://github.com/okisdev))

- [#6013](https://github.com/assistant-ui/assistant-ui/pull/6013) [`72705c3`](https://github.com/assistant-ui/assistant-ui/commit/72705c39b3241a5a61919baeee3996ddbfe4cf48) - fix: resync a memoized thread snapshot when a subscriber connects, and load local history if the adapter arrives after the first load ([@okisdev](https://github.com/okisdev))

- [#5914](https://github.com/assistant-ui/assistant-ui/pull/5914) [`0d2e23f`](https://github.com/assistant-ui/assistant-ui/commit/0d2e23f5597c2500da03ac417bfee1defd2d808e) - feat: new `threads.selectionChanged` event carrying `threadId` and `previousThreadId`; deprecate `threadListItem.switchedTo`/`switchedAway` in its favor. Un-deprecate the semantically meaningful events (`thread.runStart`, `thread.runEnd`, `thread.initialize`, `composer.send`, `composer.attachmentAdd`). ([@Yonom](https://github.com/Yonom))
  
  The new event fires in situations where the deprecated pair did not, so the selection-driven defaults (`scrollToBottomOnThreadSwitch`, `unstable_focusOnThreadSwitched`) now engage there too: `InMemoryThreadList` emits on selection changes (it previously emitted no switch events at all), `switchToNewThread()` emits for the newly created thread, and runtimes that resolve a deep-linked `threadId`/`initialThreadId` after mount (`useRemoteThreadListRuntime`) emit when the deep link resolves, with the initial placeholder thread as `previousThreadId`.

- [#6052](https://github.com/assistant-ui/assistant-ui/pull/6052) [`4446d45`](https://github.com/assistant-ui/assistant-ui/commit/4446d458e8fc904b66f306749d4e389cb1c46e60) - fix: notify every interactable model-context subscriber when one throws ([@Kinfe123](https://github.com/Kinfe123))

- [#6059](https://github.com/assistant-ui/assistant-ui/pull/6059) [`bfe47b6`](https://github.com/assistant-ui/assistant-ui/commit/bfe47b699ca1ed7e6c222ad1fc5a33b21ec8a4af) - fix: notify every memoized subject subscriber when one throws ([@Kinfe123](https://github.com/Kinfe123))

- [#5860](https://github.com/assistant-ui/assistant-ui/pull/5860) [`ceb8c16`](https://github.com/assistant-ui/assistant-ui/commit/ceb8c166fe233fa8235b3ab4cece8f636c77a164) - fix: handle thread list action failures without unhandled rejections ([@Kinfe123](https://github.com/Kinfe123))

- [#5631](https://github.com/assistant-ui/assistant-ui/pull/5631) [`7ea9de1`](https://github.com/assistant-ui/assistant-ui/commit/7ea9de1204687585297c62981183015cac0baa99) - feat: runtime suggestions can carry a display title and label ([@samdickson22](https://github.com/samdickson22))
  
  `ThreadSuggestion` gains optional `title` and `label`, so an adapter can show a
  short pill while still sending the full `prompt`. `useThreadSuggestions` now
  passes them through instead of hardcoding `title: prompt`, falling back to
  `title ?? prompt` and `label ?? ""` so prompt-only suggestions render exactly as
  before. `SuggestionConfig` is unchanged; the change is additive.

- [#5519](https://github.com/assistant-ui/assistant-ui/pull/5519) [`51886b2`](https://github.com/assistant-ui/assistant-ui/commit/51886b2ce2e023708c3a07b3241f09181e57b418) - fix: clean up disconnected voice sessions ([@Kinfe123](https://github.com/Kinfe123))

- [#5968](https://github.com/assistant-ui/assistant-ui/pull/5968) [`3053195`](https://github.com/assistant-ui/assistant-ui/commit/3053195d8b62b1338335cb5b424f15cd5dda7c83) - fix: isolate voice volume subscriber failures ([@rupic-app](https://github.com/apps/rupic-app))
- Updated dependencies [[`0e91e27`](https://github.com/assistant-ui/assistant-ui/commit/0e91e277ebe218e891d1c318a18eec230ee4f981), [`c5bc8ed`](https://github.com/assistant-ui/assistant-ui/commit/c5bc8ed0c78e8fb66a6c21c596765caeccef3aec), [`f0d1d48`](https://github.com/assistant-ui/assistant-ui/commit/f0d1d48842b61c8f781771375e3893d189321c2d), [`ab7f49f`](https://github.com/assistant-ui/assistant-ui/commit/ab7f49fcb91b8a9d96408426da3259c99f619649), [`61d29f4`](https://github.com/assistant-ui/assistant-ui/commit/61d29f4157b525d3e36ac721d1fcef7d1baf987e), [`a2ab997`](https://github.com/assistant-ui/assistant-ui/commit/a2ab997dc645923fa8ebbca5e8e050d467a69cf4), [`e8997d9`](https://github.com/assistant-ui/assistant-ui/commit/e8997d922d15d0de0d20558ce0735fa3e844f27f), [`44e574f`](https://github.com/assistant-ui/assistant-ui/commit/44e574f8c17dd5603933ec74821eecd08e94e371), [`14c3b5a`](https://github.com/assistant-ui/assistant-ui/commit/14c3b5a25afe2b2f37760dfe8003818b2e4f72d3)]:
  - assistant-stream@0.3.38

## 0.3.13

### Patch Changes

- [#5766](https://github.com/assistant-ui/assistant-ui/pull/5766) [`a90db30`](https://github.com/assistant-ui/assistant-ui/commit/a90db30dbf1c73eb2ba8cc587cf157b1a04ce541) - fix: prevent pending ExternalThread attachment additions from restoring cleared drafts ([@Kinfe123](https://github.com/Kinfe123))

- [#5799](https://github.com/assistant-ui/assistant-ui/pull/5799) [`cfb5fab`](https://github.com/assistant-ui/assistant-ui/commit/cfb5fab251784ce20722ec9371fd66137a9727f8) - fix: make a cancelled run move its trailing user message instead of dropping it. the message now leaves the thread only when the composer actually accepts it, so cancelling while a draft is already being written keeps the message in the thread rather than deleting it and handing it back nowhere, and what comes back carries the attachments and quote instead of the text alone. a message carrying content the composer has no home for, such as an image or file part, is left in the thread untouched. adapters keep the existing `setMessages` guard: without it the runtime cannot see its own removal survive, so an adapter that removes the cancelled message itself owns handing it back. ([@okisdev](https://github.com/okisdev))

- [#5826](https://github.com/assistant-ui/assistant-ui/pull/5826) [`65e03a6`](https://github.com/assistant-ui/assistant-ui/commit/65e03a697366c62cc5295c28ae528634baaf2901) - fix: reconcile cancelRun's deferred resync with store updates that land before it flushes, instead of stamping a pre-cancel snapshot over them ([@okisdev](https://github.com/okisdev))

- [#5789](https://github.com/assistant-ui/assistant-ui/pull/5789) [`d3fece3`](https://github.com/assistant-ui/assistant-ui/commit/d3fece3b17487edbbeeedb903f0e8075f82b2dd7) - feat: give the composer its draft back when a send never reached the backend. a runtime that rejects `onNew` with the new `MessageNotSentError` restores the text, quote, and attachments the composer cleared at dispatch time, as long as nothing has claimed the composer since. that guard and that outcome are the ones `cancelRun` already applies to a trailing user message, so whichever fires first keeps the composer, and of several drafts queued behind one turn only the most recent is still restorable. an edit composer closes at dispatch, so a rejected edit is not restored. ([@okisdev](https://github.com/okisdev))

- [#5780](https://github.com/assistant-ui/assistant-ui/pull/5780) [`1e98bcf`](https://github.com/assistant-ui/assistant-ui/commit/1e98bcf3f406385f3c924521b73300c12898fea6) - fix: gate interactable state snapshots at dispatch instead of at enqueue. a message sent while a run is in flight waits in a queue lane but carried the snapshot taken when the user sent it, so a run that landed its own `update_{name}` in the meantime was folded over by a stale `user-edit` version: a full snapshot replaced the model's edit outright, and a partial one merged the older diff on top of it, producing a state that never existed. every send path now stamps exactly once, when the message is dispatched rather than when it is queued. `LocalThreadRuntimeCore` stamps in `_runAppend`, the point both the direct send and the queue flush pass through, and `ExternalThreadQueueAdapter` gained an optional `__internal_setDispatchTransform` that `createMessageQueue` implements and `ExternalStoreThreadRuntimeCore` installs, so a queued message is re-gated against the thread tail it actually lands on. an adapter that does not implement the transform is stamped at enqueue as before. ([@okisdev](https://github.com/okisdev))

- [#5800](https://github.com/assistant-ui/assistant-ui/pull/5800) [`82cbc15`](https://github.com/assistant-ui/assistant-ui/commit/82cbc1560b069ba1dd7e9b068585f5c647629b36) - fix: pause an external store's message queue when the user cancels. cancelling left the queue running, so the aborted run's settle dispatched the next pending message at the moment the user pressed Stop; the pending items now survive and the next send drains them, matching what the local runtime does under `unstable_queueClearOnCancel: false` and the behaviour that flag becomes once it is removed. ([@okisdev](https://github.com/okisdev))

- [#5808](https://github.com/assistant-ui/assistant-ui/pull/5808) [`e28a62d`](https://github.com/assistant-ui/assistant-ui/commit/e28a62d84439e93a32b64f166196cef2cb02e5db) - fix: hide external thread cancellation when no handler is configured ([@Kinfe123](https://github.com/Kinfe123))

- [#5805](https://github.com/assistant-ui/assistant-ui/pull/5805) [`48af3c5`](https://github.com/assistant-ui/assistant-ui/commit/48af3c5c4198b9f3fe015e77580922b2e4733e7a) - feat: accept `providerMetadata` on image and file message parts, the channel text, reasoning and source parts already carry. A runtime adapter reads its own namespace off it, so a part can carry provider-specific data (an upload id, a document handle) without a field per provider. ([@okisdev](https://github.com/okisdev))

- [#5767](https://github.com/assistant-ui/assistant-ui/pull/5767) [`22fa20f`](https://github.com/assistant-ui/assistant-ui/commit/22fa20ffd1f0d192c417b12d4512dcffeab5161b) - fix: preserve ExternalThread composer state while attachments are prepared for send ([@Kinfe123](https://github.com/Kinfe123))

- [#5777](https://github.com/assistant-ui/assistant-ui/pull/5777) [`417efee`](https://github.com/assistant-ui/assistant-ui/commit/417efee92b48f3fac057d65200f85d4df8657fa0) - fix: stamp interactable state snapshots on every send, not just composer sends. the gate ran in the thread and edit composer cores, so a send that skipped the composer carried `metadata.custom = {}`: a `Suggestions` entry with `send` goes through `thread.append()`, as does user code calling `assistant.thread.append(...)`. the model then saw an `update_{name}` tool whose required `id` is documented as coming from a state snapshot, found no snapshot in the conversation, and could not call the tool at all. gating now runs in `BaseThreadRuntimeCore.enrichAppendMetadata`, applied by both thread runtime cores on append, deriving the branch prefix from the message's `parentId` so the previous composer behavior is reproduced exactly (the thread tail for an ordinary send, the edited message's parent for an edit). the `remove` operation's item id description in generated array-update schemas no longer reuses the instance-addressing wording that told the model each removable list item was an interactable instance. ([@okisdev](https://github.com/okisdev))

- [#5798](https://github.com/assistant-ui/assistant-ui/pull/5798) [`1e1d52b`](https://github.com/assistant-ui/assistant-ui/commit/1e1d52bd2f08b8712764792a9d95b608cb365b64) - fix: keep trailing user messages out of the composer when an external store cannot persist deletions ([@SR0725](https://github.com/SR0725))

- [#5828](https://github.com/assistant-ui/assistant-ui/pull/5828) [`685a069`](https://github.com/assistant-ui/assistant-ui/commit/685a06939edb9478d68258cab632f389c2742a05) - feat: wire `threads.reloadMainThread()` through the tap `ExternalThread` path via a new `onRefetchThread` callback, with the `refetchThread` capability derived from its presence ([@okisdev](https://github.com/okisdev))

- [#5769](https://github.com/assistant-ui/assistant-ui/pull/5769) [`f59d24b`](https://github.com/assistant-ui/assistant-ui/commit/f59d24b3ee7036c94bce7bc0a38f018574f50a69) - fix: deliver `threadListItem.switchedTo` to default-scope listeners ([#5699](https://github.com/assistant-ui/assistant-ui/issues/5699)). the thread list item client now emits the switch from its own observed selection transition, after the flush that rebinds the derived scopes, instead of relaying the runtime's synchronous notification. scoped listeners now resolve their scope against the host's current client at delivery time, so a listener subscribed before a structural swap follows the scope's present binding; the notification manager re-reads the listener set at flush time per the documented live-set semantics. listeners that need a pinned instance subscribe on an id-scoped client instead. ([@okisdev](https://github.com/okisdev))

- [#5757](https://github.com/assistant-ui/assistant-ui/pull/5757) [`092585b`](https://github.com/assistant-ui/assistant-ui/commit/092585b6859eeca4d2947cbe858019f5a9d9e101) - fix: derive the suggestions scope from the thread so runtime-provided suggestions render through `ThreadPrimitive.Suggestions` ([#5529](https://github.com/assistant-ui/assistant-ui/issues/5529)) ([@okisdev](https://github.com/okisdev))

## 0.3.12

### Patch Changes

- [#5745](https://github.com/assistant-ui/assistant-ui/pull/5745) [`1df4327`](https://github.com/assistant-ui/assistant-ui/commit/1df4327dc915103bb1b64e01ee8d888c08de9f59) - refactor: move ExternalThread, SingleThreadList, and the Assistant augmentation namespace into @assistant-ui/core ([@Yonom](https://github.com/Yonom))

## 0.3.11

### Patch Changes

- [#5742](https://github.com/assistant-ui/assistant-ui/pull/5742) [`f551562`](https://github.com/assistant-ui/assistant-ui/commit/f551562162f43b2bbeb2bb46d39b68243ca1d35a) - fix: name the offending input when an external message converter returns an invalid message ([@Yonom](https://github.com/Yonom))

- [#5733](https://github.com/assistant-ui/assistant-ui/pull/5733) [`dc7b77d`](https://github.com/assistant-ui/assistant-ui/commit/dc7b77dca65ad8d0384e8aec268a4141dc8bd0da) - Republish: 0.3.10 was left staged on npm by a failed publish and cannot be re-pushed. ([@Yonom](https://github.com/Yonom))

- [#5718](https://github.com/assistant-ui/assistant-ui/pull/5718) [`d1b7097`](https://github.com/assistant-ui/assistant-ui/commit/d1b7097ca86e84698fcfaabd1b310e30612dd32c) - fix: expose additional Cloud thread pages through the thread list runtime ([@Kinfe123](https://github.com/Kinfe123))

- Updated dependencies [[`0ae51a8`](https://github.com/assistant-ui/assistant-ui/commit/0ae51a8e8c4c49c4b8810b9c64845eeeded8b9bc), [`e319574`](https://github.com/assistant-ui/assistant-ui/commit/e319574df10df2dbf2d57fc2bcf7cb92d3c6a2e6)]:
  - assistant-stream@0.3.37

## 0.3.10

### Patch Changes

- [#5723](https://github.com/assistant-ui/assistant-ui/pull/5723) [`94dc3e5`](https://github.com/assistant-ui/assistant-ui/commit/94dc3e509fa2b4fae1a14c88ec34b910c8d95af8) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

- [#5726](https://github.com/assistant-ui/assistant-ui/pull/5726) [`ab57969`](https://github.com/assistant-ui/assistant-ui/commit/ab5796932c97bc5bade19022e2ac8762949d2967) - chore: reformat with oxfmt 0.62 ([@okisdev](https://github.com/okisdev))

- Updated dependencies [[`94dc3e5`](https://github.com/assistant-ui/assistant-ui/commit/94dc3e509fa2b4fae1a14c88ec34b910c8d95af8)]:
  - assistant-stream@0.3.36

## 0.3.9

### Patch Changes

- [#5720](https://github.com/assistant-ui/assistant-ui/pull/5720) [`ab9e765`](https://github.com/assistant-ui/assistant-ui/commit/ab9e765a2d70e30572c4a72c26526df490334b1e) - fix: route sourceId-carrying edit sends to onEdit instead of the queue adapter, and fail fast on beginEdit without an edit handler ([@Yonom](https://github.com/Yonom))

## 0.3.8

### Patch Changes

- [#5717](https://github.com/assistant-ui/assistant-ui/pull/5717) [`99d09c8`](https://github.com/assistant-ui/assistant-ui/commit/99d09c828c04bfca35d091e73f29c6d6643dfb01) - Edit composer send always emits: an unchanged edit re-sends the message on a new branch instead of silently closing the composer. ([@Yonom](https://github.com/Yonom))

- [#5639](https://github.com/assistant-ui/assistant-ui/pull/5639) [`79253f2`](https://github.com/assistant-ui/assistant-ui/commit/79253f2a5e0a637c8907ba30859f308ff6dcd1c4) - feat: preserve app-authored reasoning summaries on message parts ([@rupic-app](https://github.com/apps/rupic-app))

- Updated dependencies [[`456b056`](https://github.com/assistant-ui/assistant-ui/commit/456b056b2859994bf49ed5cc4cf031f0601e2174), [`a88751d`](https://github.com/assistant-ui/assistant-ui/commit/a88751d71edfd2516f266ce8889081749fba4e5a), [`79253f2`](https://github.com/assistant-ui/assistant-ui/commit/79253f2a5e0a637c8907ba30859f308ff6dcd1c4)]:
  - assistant-stream@0.3.35

## 0.3.7

### Patch Changes

- [#5668](https://github.com/assistant-ui/assistant-ui/pull/5668) [`bd4c0ad`](https://github.com/assistant-ui/assistant-ui/commit/bd4c0ad3d41a65d0a2caea921f82c6502011615a) - feat: expose RuntimeAdapter from the framework-neutral store entry so runtimes mount into createAssistantClient without React ([@okisdev](https://github.com/okisdev))

- [#5675](https://github.com/assistant-ui/assistant-ui/pull/5675) [`4aa1b1d`](https://github.com/assistant-ui/assistant-ui/commit/4aa1b1d1b9368f4812b55a33d6f09bb3dcd71949) - feat: expose framework-neutral seams on the ./store entry (useExternalMessageConverter, convertExternalMessages, useStreamingTiming, createRuntimeExtrasBrand, defineToolkit, defineMcpToolkit) and add unstable_createRuntimeExtrasFromBrand so bindings can share one runtime extras brand across packages ([@okisdev](https://github.com/okisdev))

## 0.3.6

### Patch Changes

- [#5430](https://github.com/assistant-ui/assistant-ui/pull/5430) [`dcacd9b`](https://github.com/assistant-ui/assistant-ui/commit/dcacd9bc45117f9beca698006fd67616d2c1ca61) - feat: AuiProvider extends/config grammar. `config={AuiConfig({...})}` alone creates a top-level root client; nested providers must pass `extends` — a client to extend, or `null` to isolate (dev-enforced). An empty config creates a client extending the `extends` client; `ref` exposes the resulting client. The `config` prop only accepts configs built with `AuiConfig(...)` (branded type). AssistantRuntimeProvider gains an optional `config` prop whose scopes are provided alongside the runtime scope. The `useAui({...})` extension overload and the AuiProvider `value` prop are deprecated; `value={client}` now exposes a client extending the given one (same scopes, new identity) rather than the exact instance. `useAui({})` with an empty scope object now mounts a rooted host (so the scope set can grow across renders) instead of a passthrough derived-only client. `useAuiState` state enumeration (`Object.keys`/spread) now includes scopes inherited from parent clients, matching `in`-operator behavior. Clients derived from a hand-built parent (a plain object with `subscribe`/`on`) forward scoped `on(...)` listeners to the parent's `on` instead of throwing for scopes the parent does not expose. ([@Yonom](https://github.com/Yonom))

- [#5569](https://github.com/assistant-ui/assistant-ui/pull/5569) [`d8a59ad`](https://github.com/assistant-ui/assistant-ui/commit/d8a59ad5d75f220e76e689d4191855c244ddc20a) - fix: preserve falsy tool results ([@Kinfe123](https://github.com/Kinfe123))

- [#5653](https://github.com/assistant-ui/assistant-ui/pull/5653) [`e70da91`](https://github.com/assistant-ui/assistant-ui/commit/e70da91866a5ac880472fbcf23039909270f7623) - fix: drop the react type dependency from the core default entry and pin the framework neutral boundary with a contract test ([@okisdev](https://github.com/okisdev))

- [#5484](https://github.com/assistant-ui/assistant-ui/pull/5484) [`aac3a8c`](https://github.com/assistant-ui/assistant-ui/commit/aac3a8cb8824472f694226a4c53829a0a693072e) - fix: accept all valid image data URLs in sanitizeImageContent instead of a hardcoded format list ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#5650](https://github.com/assistant-ui/assistant-ui/pull/5650) [`34cec64`](https://github.com/assistant-ui/assistant-ui/commit/34cec64fcfbdef0e101d731f5518e9075d989e2f) - feat: two-lane, placement-aware message queue with steer-by-default mid-run sends ([@Yonom](https://github.com/Yonom))

  `ExternalThreadQueueAdapter` is reshaped: `enqueue(message, { steer })` splits into
  `enqueue(message)` / `steer(message)`, `steer(queueItemId)` becomes
  `move(queueItemId, { lane: "steer", insertAfter: null })`, `clear(reason)` is dropped
  (queue clear policy is now host-owned), and `steerItems` / `move` / `edit` and
  `QueueItemState.parts` are required.

- Updated dependencies [[`d52928d`](https://github.com/assistant-ui/assistant-ui/commit/d52928db2c83a3ba6f25bf8c6b21934571dd4622)]:
  - assistant-stream@0.3.34

## 0.3.5

### Patch Changes

- [#5552](https://github.com/assistant-ui/assistant-ui/pull/5552) [`7f7f8a2`](https://github.com/assistant-ui/assistant-ui/commit/7f7f8a24f87bd7eb745675fa2644a5cca2f69372) - fix: handle stopped initial thread runtime starts ([@Kinfe123](https://github.com/Kinfe123))

- Updated dependencies [[`78943a3`](https://github.com/assistant-ui/assistant-ui/commit/78943a37b1006bfbee42596f838850cd96ab4566)]:
  - assistant-stream@0.3.33

## 0.3.4

### Patch Changes

- [#5233](https://github.com/assistant-ui/assistant-ui/pull/5233) [`b19c2f5`](https://github.com/assistant-ui/assistant-ui/commit/b19c2f5efd37e1203502c76d92e0554b63020952) - fix: prevent canceled attachment uploads from reappearing and settle failed removals as attachment errors ([@Kinfe123](https://github.com/Kinfe123))

- [#5447](https://github.com/assistant-ui/assistant-ui/pull/5447) [`8c99934`](https://github.com/assistant-ui/assistant-ui/commit/8c99934ca7fe9a8ffea0aa972e3579ff74e18553) - docs: deprecate Unstable_AudioMessagePart in favour of file parts ([@okisdev](https://github.com/okisdev))

  Audio belongs on a `file` part with an `audio/*` mime type. `file` is a member of both the user and assistant unions and carries a filename, neither of which the audio part can express. The payload form a `file` part needs is still adapter specific; the message primitive docs enumerate it. The audio part and the `Unstable_Audio` slot stay honored everywhere they are accepted and will not gain fields.

- [#5439](https://github.com/assistant-ui/assistant-ui/pull/5439) [`ece5a54`](https://github.com/assistant-ui/assistant-ui/commit/ece5a5422e8b45429e1681b7a845d68be2879834) - feat: sourceType opt-in on file message parts so attachment adapters can send url/id file references ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#5445](https://github.com/assistant-ui/assistant-ui/pull/5445) [`2fdff87`](https://github.com/assistant-ui/assistant-ui/commit/2fdff878211979b1f24d746bf2f16d8b6254102d) - feat: honor sourceType "url" in a2a, ag-ui, and adk file converters ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#5542](https://github.com/assistant-ui/assistant-ui/pull/5542) [`55b2824`](https://github.com/assistant-ui/assistant-ui/commit/55b282476bf3075beff391978a72a13968b6418a) - feat: expose `threadListItem.isRunning` so a thread list row can show its own run ([@okisdev](https://github.com/okisdev))

  a thread list row had no supported way to tell whether its thread was running: `thread.isRunning` describes the open thread, and the item state carried no run state at all, so a run continuing on a thread the user had switched away from was invisible.

  `threadListItem.isRunning` now reports it, and stays true for a background run. runtimes that keep background threads alive answer it through the new optional `ThreadListRuntimeCore.unstable_isThreadRunning`; the rest report the open thread's run state, which they already track.

  `InMemoryThreadList` also renames threads for real instead of dropping the new title.

- [#5459](https://github.com/assistant-ui/assistant-ui/pull/5459) [`22b05a4`](https://github.com/assistant-ui/assistant-ui/commit/22b05a43ec921a6dd7015692a77a746656a61f5f) - fix: wrap a file part payload that is not a parsable url ([@okisdev](https://github.com/okisdev))

  `getPromptParts` put `FileMessagePart.data` straight into the OpenCode file part's `url`. OpenCode forwards that into an AI SDK file part (`sst/opencode`, `session/message-v2.ts`), whose `url` reaches an unguarded `new URL()`, so a payload that is raw base64 rather than a data URL or an http source failed there. A non-parsable payload is now wrapped in a `data:<mime>;base64,` envelope; data URLs and http sources are forwarded untouched, and a `sourceType: "id"` reference is left alone so it fails loudly instead of shipping a corrupt payload.

  The predicate behind that decision moves to `isParsableUrl` in `@assistant-ui/core/internal`, next to the `httpUrlPattern` and `parseDataUrl` it belongs with, and react-ai-sdk now imports it instead of keeping its own copy. No behavior change there.

- [#5522](https://github.com/assistant-ui/assistant-ui/pull/5522) [`f913c21`](https://github.com/assistant-ui/assistant-ui/commit/f913c2142708d8cd1f4ac63bd801e5b6defcb74e) - feat: add the in-place refetch contract behind `threads.reloadMainThread()`. A runtime opts in with `unstable_refetchThread` on `ThreadRuntimeCore`, which an external store supplies through the new `ExternalStoreAdapter.onRefetchThread` (unrelated to `onReload`, which re-generates an assistant message) and which surfaces as `RuntimeCapabilities.refetchThread`, reporting which mechanism a call would take rather than whether it does anything. Runtimes that opt in keep their runtime identity, so composer drafts survive and messages stay rendered while the refetch runs; the rest fall back to remounting the runtime hook. Core does not stop a run in progress before calling the capability: doing that means `cancelRun`, whose contract is that the user abandoned a send, so it returns the trailing user message to the composer. An implementation owns whatever coordination a concurrent run needs. ([@taoche](https://github.com/taoche))

  The remount fallback needs the binder's React key to carry a generation, which changes it from `threadId` to `${threadId}:${generation}` for every `useRemoteThreadListRuntime` consumer rather than only for callers of the new method. One existing behaviour changes with it: a `stopThreadRuntime` followed by `startThreadRuntime` for the same id inside a single React commit used to reuse the mounted binder and now remounts it, so that binder no longer carries state from before the stop.

  No adapter registers the capability yet, so every runtime takes the remount fallback for now. `react-langgraph` adoption is [#5531](https://github.com/assistant-ui/assistant-ui/issues/5531) and `react-google-adk` is [#5528](https://github.com/assistant-ui/assistant-ui/issues/5528).

- [#5537](https://github.com/assistant-ui/assistant-ui/pull/5537) [`c868710`](https://github.com/assistant-ui/assistant-ui/commit/c8687104b0407f424d55dd0a369d692fe7a4c708) - fix: keep a settled tool call distinguishable from an unfinished one, so a tool returning false, 0, "" or null no longer loses its result on the cloud round trip and no longer reads as never completed ([@okisdev](https://github.com/okisdev))

- [#5479](https://github.com/assistant-ui/assistant-ui/pull/5479) [`011e275`](https://github.com/assistant-ui/assistant-ui/commit/011e275c4df5cd85942b5fd545a74d9c7cf549a6) - fix: read an image's media type from its leading bytes in both adapters ([@okisdev](https://github.com/okisdev))

  `detectImageMediaType` and `dataUrlMediaType` join `parseDataUrl` and `isParsableUrl` in `@assistant-ui/core/internal`. An `ImageMessagePart` carries no media type, so an adapter that must declare one on the wire now reads it from the payload rather than assuming a format. It never throws, whatever a caller put on the part.

  react-ai-sdk and react-opencode run the same ladder rung for rung: the attachment's `contentType`, then a data URL's declared type when that is itself an image type (read whether or not the payload is base64, so an SVG data URL keeps its type), then the leading bytes, then `image/png`. Previously react-opencode had no byte rung at all, and react-ai-sdk's was skipped for any `data:` payload, so a JPEG inside a generic `application/octet-stream` envelope resolved to png on both.

  Resolving the label alone was not enough, because a data URL's own media type wins over the declared one downstream. Both adapters now rebuild the envelope when it disagrees with the resolved type and forward it untouched when it agrees. That applies to file parts too, where a `mimeType: "application/pdf"` part carrying an `application/octet-stream` envelope was announced as pdf and delivered as octet-stream. File parts also gain the same three rungs, so an empty `mimeType` falls to the envelope and then to `application/octet-stream` rather than producing a malformed `data:;base64,` url; `vercelAttachmentAdapter` emits exactly that shape for a file the OS cannot type.

- [#5485](https://github.com/assistant-ui/assistant-ui/pull/5485) [`da32fe0`](https://github.com/assistant-ui/assistant-ui/commit/da32fe0b2f51c8a340935c5f4d2e31e747d39460) - refactor: share the media type ladder and wire url between adapters ([@okisdev](https://github.com/okisdev))

  `resolveImageMediaType`, `resolveFileMediaType` and `toMediaWireUrl` join the data URL helpers in `@assistant-ui/core/internal`. react-ai-sdk and react-opencode had arrived at identical ladders and an identical wire url builder by construction rather than by sharing code, and they had already drifted apart twice while getting there. Both now call the shared functions and keep only their own part-shape plumbing.

  No behavior change: both adapters' existing suites pass untouched.

- [#5522](https://github.com/assistant-ui/assistant-ui/pull/5522) [`f913c21`](https://github.com/assistant-ui/assistant-ui/commit/f913c2142708d8cd1f4ac63bd801e5b6defcb74e) - feat: add `threads.reloadMainThread()` to refetch the open thread's remote state in place ([@taoche](https://github.com/taoche))

- [#5417](https://github.com/assistant-ui/assistant-ui/pull/5417) [`5bb2573`](https://github.com/assistant-ui/assistant-ui/commit/5bb25733674396d496046b7c5443366171d0e8cf) - fix: suggestion trigger with `send` no longer overwrites the composer draft while a run is in progress; on runtimes without queue support it now renders disabled mid-run, matching `ComposerPrimitive.Send` ([@ephraimduncan](https://github.com/ephraimduncan))

- Updated dependencies [[`01140bd`](https://github.com/assistant-ui/assistant-ui/commit/01140bde14fbfa89af9bdd080bbf79b3a509b524), [`4c313cf`](https://github.com/assistant-ui/assistant-ui/commit/4c313cfabe9802a7e59362c323ec926a24d089d4), [`c868710`](https://github.com/assistant-ui/assistant-ui/commit/c8687104b0407f424d55dd0a369d692fe7a4c708), [`5ececc1`](https://github.com/assistant-ui/assistant-ui/commit/5ececc1df536e098f8ee252addd2e62be7d61a7a)]:
  - assistant-stream@0.3.32

## 0.3.3

### Patch Changes

- [#5419](https://github.com/assistant-ui/assistant-ui/pull/5419) [`aa74b0d`](https://github.com/assistant-ui/assistant-ui/commit/aa74b0d7c5e334385fabbe48ed79e90b36f63029) - fix: enumerate the attachment content fields the aui/v0 encoder persists so per-part status stays out of the stored shape ([@okisdev](https://github.com/okisdev))

- [#5403](https://github.com/assistant-ui/assistant-ui/pull/5403) [`6e5c450`](https://github.com/assistant-ui/assistant-ui/commit/6e5c450d71242acda30b41c8601b7edb6ed5c701) - feat: honour a supplied per-part status while the message is running ([@okisdev](https://github.com/okisdev))

- [#5404](https://github.com/assistant-ui/assistant-ui/pull/5404) [`59ec21b`](https://github.com/assistant-ui/assistant-ui/commit/59ec21b5f610aaf7c0082508b3a6cbf950ffc1db) - fix: keep copied feedback visible for the full duration after repeated copies ([@Kinfe123](https://github.com/Kinfe123))

- [#5410](https://github.com/assistant-ui/assistant-ui/pull/5410) [`4fd698b`](https://github.com/assistant-ui/assistant-ui/commit/4fd698ba5a3b23ea57b667a02c6f784147f5c42d) - fix: keep grouped and detached part statuses in sync ([@okisdev](https://github.com/okisdev))

## 0.3.2

### Patch Changes

- [#5367](https://github.com/assistant-ui/assistant-ui/pull/5367) [`ecd7c87`](https://github.com/assistant-ui/assistant-ui/commit/ecd7c879cace69d6371b3f673c52a80669377fc0) - feat: AuiProvider accepts value={null} as an isolation boundary; useAui runs a fixed hook count per overload and deprecates the explicit-parent config ([@Yonom](https://github.com/Yonom))

- [#5230](https://github.com/assistant-ui/assistant-ui/pull/5230) [`3ae058c`](https://github.com/assistant-ui/assistant-ui/commit/3ae058c5d275e2444701da70a6513528439ecb3e) - fix: suppress `onThreadIdChange` callbacks for prop-driven thread switches ([@Kinfe123](https://github.com/Kinfe123))

- [#5329](https://github.com/assistant-ui/assistant-ui/pull/5329) [`f30b54c`](https://github.com/assistant-ui/assistant-ui/commit/f30b54c9856d50a18f738c4d485c02bcd039151c) - refactor: move createRuntimeExtras to the @assistant-ui/core/react entry and drop the internal re-export ([@okisdev](https://github.com/okisdev))

- [#5318](https://github.com/assistant-ui/assistant-ui/pull/5318) [`ee87dd9`](https://github.com/assistant-ui/assistant-ui/commit/ee87dd9fef1389165bbfe0019be2a6995b2cfb24) - fix: accept case-insensitive `data:` URL schemes and normalize parsed mime types to lowercase ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#5220](https://github.com/assistant-ui/assistant-ui/pull/5220) [`e41734c`](https://github.com/assistant-ui/assistant-ui/commit/e41734c102a192ab772703899d7980bb5c055d07) - fix: parse zero-byte base64 payloads in parseDataUrl ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#5369](https://github.com/assistant-ui/assistant-ui/pull/5369) [`8643393`](https://github.com/assistant-ui/assistant-ui/commit/8643393490ebe1aa86661f705bb9ac907bfb4eac) - refactor: make Thread client importExternalState required ([@Yonom](https://github.com/Yonom))

- [#5312](https://github.com/assistant-ui/assistant-ui/pull/5312) [`2eca438`](https://github.com/assistant-ui/assistant-ui/commit/2eca4386778618f555258855ee6612eb44d89bb2) - refactor: import `useEffectEvent` from React directly for latest-client reads and drop the `use-effect-event` ponyfill dependency ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`936c52c`](https://github.com/assistant-ui/assistant-ui/commit/936c52c4301b89242572d9890c870050f63cbe93), [`ee87dd9`](https://github.com/assistant-ui/assistant-ui/commit/ee87dd9fef1389165bbfe0019be2a6995b2cfb24)]:
  - assistant-stream@0.3.31

## 0.3.1

### Patch Changes

- [#5304](https://github.com/assistant-ui/assistant-ui/pull/5304) [`1bbaa46`](https://github.com/assistant-ui/assistant-ui/commit/1bbaa467b209986be5dff004be7bc83b27424e2c) - refactor: internal selectors read optional scopes via `s.optional.part` instead of guarding on `aui.part.source` ([@Yonom](https://github.com/Yonom))

- [#5295](https://github.com/assistant-ui/assistant-ui/pull/5295) [`9aac054`](https://github.com/assistant-ui/assistant-ui/commit/9aac05421576813847c4bb0a9d9e864727725800) - fix: keep replacement runs cancellable after superseded runs settle ([@Kinfe123](https://github.com/Kinfe123))

- Updated dependencies [[`a8cd1c9`](https://github.com/assistant-ui/assistant-ui/commit/a8cd1c9ff95bae0921cbd7f7930c05be6d6192a0)]:
  - assistant-stream@0.3.30

## 0.3.0

### Minor Changes

- [#5275](https://github.com/assistant-ui/assistant-ui/pull/5275) [`9a7e776`](https://github.com/assistant-ui/assistant-ui/commit/9a7e77603d59b5e091ee922e2e087f0101679321) - feat: property API for aui — nullary scope accessors are now properties (`aui.thread.getState()` instead of `aui.thread().getState()`); calling them still works but is deprecated. Accessors keep `source`/`query`/`name` selection metadata as properties; these are reserved names for scope methods. An unavailable scope's accessor no longer throws at selection time: `aui.thread` always succeeds and is always truthy, `.source` is null, and any other property read (or a call) throws — check availability via `aui.thread.source != null`. Accessor identity is binding-keyed: stable across renders without structural change, new on structural change — memoization keyed on an accessor now invalidates exactly when its binding changes. ([@Yonom](https://github.com/Yonom))

- [#5281](https://github.com/assistant-ui/assistant-ui/pull/5281) [`2f5d0d4`](https://github.com/assistant-ui/assistant-ui/commit/2f5d0d441caf6a152bf4eef13566a2f9a161541c) - feat: drop APIs deprecated in v0.12/v0.14 — the legacy context hooks (`useAssistantRuntime`, `useThreadRuntime`, `useThread`, `useMessageRuntime`, `useMessage`, `useComposerRuntime`, `useComposer`, `useMessagePartRuntime`, `useMessagePart`, `useAttachmentRuntime`, `useAttachment`, `useThreadListItemRuntime`, `useThreadListItem`, `useThreadList`, `useEditComposer` and their attachment variants; use `useAui` / `useAuiState`), the component-only `ToolsState.tools` map (use `toolUIs`), and the `"mcp-app"` group key in `groupPartByType` (use `"standalone-tool-call"`). See the [v0.15 migration guide](https://assistant-ui.com/docs/migrations/v0-15). ([@Yonom](https://github.com/Yonom))

### Patch Changes

- [#5282](https://github.com/assistant-ui/assistant-ui/pull/5282) [`ae5f831`](https://github.com/assistant-ui/assistant-ui/commit/ae5f83129b20edb38b7f9e7f92b6c60f3c8fe8d9) - feat: `getClientId(client)` returns an opaque, WeakMap-legal identity for a bound client — the same object regardless of accessor wrapping depth. The cloud message persistence cache is now keyed on it instead of the per-mount accessor proxy. Removes `unwrapClientAccessor` and `getBoundClient` (introduced and replaced pre-release, never published). ([@Yonom](https://github.com/Yonom))

- [#5279](https://github.com/assistant-ui/assistant-ui/pull/5279) [`a196711`](https://github.com/assistant-ui/assistant-ui/commit/a1967113d52c6e5751af7ae4109c13b6a322fe23) - fix: cloud history adapter resolves the aui client at call time instead of capturing the client from the first render ([@Yonom](https://github.com/Yonom))

- [#5270](https://github.com/assistant-ui/assistant-ui/pull/5270) [`dcc41bb`](https://github.com/assistant-ui/assistant-ui/commit/dcc41bb50948f64744a052b22720f0f8dffa510e) - feat: render-bound immutable aui instances — derived scopes resolve to client instances during render and are frozen into the returned client; structural swaps produce a new client through React while value updates never change client identity. Removes the PartByIndexProvider lastPartRef guards and the useClientLookup stale-index clamp. ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`9a7e776`](https://github.com/assistant-ui/assistant-ui/commit/9a7e77603d59b5e091ee922e2e087f0101679321), [`ae5f831`](https://github.com/assistant-ui/assistant-ui/commit/ae5f83129b20edb38b7f9e7f92b6c60f3c8fe8d9), [`f78e579`](https://github.com/assistant-ui/assistant-ui/commit/f78e5794d8d9d2f1c815485cb39a56f1072ed795), [`dcc41bb`](https://github.com/assistant-ui/assistant-ui/commit/dcc41bb50948f64744a052b22720f0f8dffa510e)]:
  - @assistant-ui/store@0.3.0
  - assistant-stream@0.3.29

## 0.2.23

### Patch Changes

- [#5202](https://github.com/assistant-ui/assistant-ui/pull/5202) [`6225d6a`](https://github.com/assistant-ui/assistant-ui/commit/6225d6a6e1bc1be99983e19441e62d0bbd849ac5) - fix: abort pending AssistantFrame tool calls when their run is cancelled ([@Kinfe123](https://github.com/Kinfe123))

- [#5262](https://github.com/assistant-ui/assistant-ui/pull/5262) [`801781c`](https://github.com/assistant-ui/assistant-ui/commit/801781c18b8097e0cd968f1421a43beaf41fdf24) - Restore the MessageRepository duplicate-id throw (it detects internal corruption); duplicate ids in an external-store messages array are now deduped at ingestion with a warning, keeping the last occurrence. ([@Yonom](https://github.com/Yonom))

- [#5250](https://github.com/assistant-ui/assistant-ui/pull/5250) [`d4bdf2c`](https://github.com/assistant-ui/assistant-ui/commit/d4bdf2c50f741912c1c165bd65441ff91bc632dc) - Warn instead of throw on recoverable inconsistencies: duplicate same-priority tool registrations merge with the latest registration taking precedence, duplicate message ids skip linking, stale client lookup indices are clamped, and null tool names in tool result messages are tolerated. ([@Yonom](https://github.com/Yonom))

- [#5208](https://github.com/assistant-ui/assistant-ui/pull/5208) [`a0ddc86`](https://github.com/assistant-ui/assistant-ui/commit/a0ddc862b0c506bd791238ebf800868e4836820a) - Adopt `erasableSyntaxOnly`; public enums are now `as const` objects. ([@Yonom](https://github.com/Yonom))

- [#5256](https://github.com/assistant-ui/assistant-ui/pull/5256) [`cee74f1`](https://github.com/assistant-ui/assistant-ui/commit/cee74f1302299f0cf662ee7ad83ea552a1a3ac2d) - fix: ExternalThread validates the adapter accept string on every addAttachment entry point ([@Yonom](https://github.com/Yonom))

- [#5237](https://github.com/assistant-ui/assistant-ui/pull/5237) [`cf839ff`](https://github.com/assistant-ui/assistant-ui/commit/cf839ff72efe8852072a1323b902e540f0a1d9d2) - feat: ExternalThread props for assistant-transport (isLoading, state, extras, onResume, onAddToolResult, onLoadExternalState, onResumeToolCall, attachmentAdapter; importExternalState); export ToolInvocationTracker from core internal; composer parentId, draft-restore, and part-status fixes ([@Yonom](https://github.com/Yonom))

- [#5116](https://github.com/assistant-ui/assistant-ui/pull/5116) [`396ea1f`](https://github.com/assistant-ui/assistant-ui/commit/396ea1fda2cbee9a254daba7531a50d5ac62b961) - fix(core): persist LocalRuntime runs paused for tool approval ([@serhiizghama](https://github.com/serhiizghama))

- [#5231](https://github.com/assistant-ui/assistant-ui/pull/5231) [`e1f27d8`](https://github.com/assistant-ui/assistant-ui/commit/e1f27d8ca87443569aede02ceba0ca99e1a9e4a3) - fix(core): preserve thread-list position when switchToThread's on-demand fetch settles after a concurrent list() ([@rupic-app](https://github.com/apps/rupic-app))

- [#5224](https://github.com/assistant-ui/assistant-ui/pull/5224) [`3e8f59e`](https://github.com/assistant-ui/assistant-ui/commit/3e8f59e1e0732f473cb190c9fcc423503ca4d32d) - fix: avoid reloading Cloud thread lists on unchanged runtime rerenders ([@Kinfe123](https://github.com/Kinfe123))

- [#5263](https://github.com/assistant-ui/assistant-ui/pull/5263) [`06f5266`](https://github.com/assistant-ui/assistant-ui/commit/06f5266bf8d7d347020c113c089b199b182a0099) - Same-priority duplicate tool registrations throw again. The `Tool` type gains an optional `overwrite` flag (discouraged escape hatch) that lets a later registration silently replace a same-priority tool of the same name; the flag is stripped from the merged output. ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`f9c1b0f`](https://github.com/assistant-ui/assistant-ui/commit/f9c1b0fec5ac4cae09c1c9da77f901c0799140ad), [`235c17e`](https://github.com/assistant-ui/assistant-ui/commit/235c17e22acae8a643c583905f3bf90955651794), [`a0ddc86`](https://github.com/assistant-ui/assistant-ui/commit/a0ddc862b0c506bd791238ebf800868e4836820a), [`06f5266`](https://github.com/assistant-ui/assistant-ui/commit/06f5266bf8d7d347020c113c089b199b182a0099), [`d319637`](https://github.com/assistant-ui/assistant-ui/commit/d319637df1297b7aa589a77ff268467270a85386)]:
  - assistant-stream@0.3.28

## 0.2.22

### Patch Changes

- [#5089](https://github.com/assistant-ui/assistant-ui/pull/5089) [`908ec91`](https://github.com/assistant-ui/assistant-ui/commit/908ec91a15b247b629fbcee6fd8b7af620af6632) - fix: avoid reporting copy success without a clipboard handler ([@Kinfe123](https://github.com/Kinfe123))

- [#5126](https://github.com/assistant-ui/assistant-ui/pull/5126) [`0d0834d`](https://github.com/assistant-ui/assistant-ui/commit/0d0834d77967eb3f68198c48597a3bb9c6f474cb) - fix: refresh Cloud history persistence when the Cloud client changes ([@Kinfe123](https://github.com/Kinfe123))

- [#5163](https://github.com/assistant-ui/assistant-ui/pull/5163) [`3355098`](https://github.com/assistant-ui/assistant-ui/commit/33550987bbed0ffaa424218e4d415cb8a4191f72) - fix: restrict AssistantFrame provider messages to the parent window ([@Kinfe123](https://github.com/Kinfe123))

- [#5066](https://github.com/assistant-ui/assistant-ui/pull/5066) [`79034bb`](https://github.com/assistant-ui/assistant-ui/commit/79034bbfe8da82c3739969bf7b4cc744910d203a) - fix: settle thread runtime starts when stopped before mounting ([@Kinfe123](https://github.com/Kinfe123))

- [#5137](https://github.com/assistant-ui/assistant-ui/pull/5137) [`7207b19`](https://github.com/assistant-ui/assistant-ui/commit/7207b19041c4ceed31acc1b28d39836f99d4eae6) - fix: isolate speech synthesis listener failures ([@Kinfe123](https://github.com/Kinfe123))

- [#5090](https://github.com/assistant-ui/assistant-ui/pull/5090) [`b17d392`](https://github.com/assistant-ui/assistant-ui/commit/b17d3929d785cb418615d18b739fb9e3b7b53728) - fix: mark a cancelled local runtime run incomplete when the adapter returns without throwing ([@VihaanAgarwal](https://github.com/VihaanAgarwal))

- [#5091](https://github.com/assistant-ui/assistant-ui/pull/5091) [`20643e2`](https://github.com/assistant-ui/assistant-ui/commit/20643e299a3d9eeb73d73dca72d4b70220f4dc0b) - fix nested message runtime path references ([@Kinfe123](https://github.com/Kinfe123))

- [#5028](https://github.com/assistant-ui/assistant-ui/pull/5028) [`afacb10`](https://github.com/assistant-ui/assistant-ui/commit/afacb1081447b899e6e84df969ec1ac9b6d8609f) - test: verify compiler-sensitive hooks against the built package ([@Kinfe123](https://github.com/Kinfe123))

- [#5088](https://github.com/assistant-ui/assistant-ui/pull/5088) [`af6c945`](https://github.com/assistant-ui/assistant-ui/commit/af6c9450f0242c4eee3d9e03f82f20efe8c9a89b) - fix: preserve falsy runtime state values ([@Kinfe123](https://github.com/Kinfe123))

- [#5132](https://github.com/assistant-ui/assistant-ui/pull/5132) [`33924df`](https://github.com/assistant-ui/assistant-ui/commit/33924df40ad3463f4e589617876d2496f48936ec) - fix: stop auto-submitting a parse-error tool result when divergent argsText closes without a backend result ([@rupic-app](https://github.com/apps/rupic-app))

- [#5067](https://github.com/assistant-ui/assistant-ui/pull/5067) [`19cfdcd`](https://github.com/assistant-ui/assistant-ui/commit/19cfdcdfdc6778a3ed3f607f694787fe1ef54612) - fix: detect removed keys in shallow memoized state ([@Kinfe123](https://github.com/Kinfe123))

- [#5057](https://github.com/assistant-ui/assistant-ui/pull/5057) [`044def8`](https://github.com/assistant-ui/assistant-ui/commit/044def8b0c6173dbed5a888993c55933d6a81177) - fix: preserve the latest thread selection when switches finish out of order ([@Kinfe123](https://github.com/Kinfe123))

- [#5097](https://github.com/assistant-ui/assistant-ui/pull/5097) [`039b75f`](https://github.com/assistant-ui/assistant-ui/commit/039b75f91f189a8cb391bb6ea75c87cddefaaebb) - fix: support attachments without relying on a global File constructor ([@Kinfe123](https://github.com/Kinfe123))

- [#5112](https://github.com/assistant-ui/assistant-ui/pull/5112) [`fc6b4ad`](https://github.com/assistant-ui/assistant-ui/commit/fc6b4ad0c77d195bb69148536e52759d13df2a99) - fix: keep composer attachments visible while their upload is in flight ([@serhiizghama](https://github.com/serhiizghama))

- [#4847](https://github.com/assistant-ui/assistant-ui/pull/4847) [`121ee83`](https://github.com/assistant-ui/assistant-ui/commit/121ee830d7d26a7db0a8007c0394ffa86c7d56d9) - fix: preserve concurrent local thread metadata and history writes ([@Kinfe123](https://github.com/Kinfe123))

- [#4958](https://github.com/assistant-ui/assistant-ui/pull/4958) [`2b2587a`](https://github.com/assistant-ui/assistant-ui/commit/2b2587ac09bfe09d552915300b8dcf5b5bb7107d) - fix: preserve optimistic updates in invocation order ([@Kinfe123](https://github.com/Kinfe123))

- [#4981](https://github.com/assistant-ui/assistant-ui/pull/4981) [`ca80153`](https://github.com/assistant-ui/assistant-ui/commit/ca801537e02bbab09532d0f505992778d282dddb) - fix: handle failed composer append tasks ([@Kinfe123](https://github.com/Kinfe123))

- [#5081](https://github.com/assistant-ui/assistant-ui/pull/5081) [`e4ce1a2`](https://github.com/assistant-ui/assistant-ui/commit/e4ce1a2a59faaa117cd8bd819a7c2a5c3bc9c6a6) - fix: reject pending AssistantFrame tool calls when the host is disposed ([@Kinfe123](https://github.com/Kinfe123))

- [#5117](https://github.com/assistant-ui/assistant-ui/pull/5117) [`f2f5e83`](https://github.com/assistant-ui/assistant-ui/commit/f2f5e8361fa5cee5c67ede5b5dac239416aa32ac) - fix: handle failed local history loads ([@Kinfe123](https://github.com/Kinfe123))

- [#5177](https://github.com/assistant-ui/assistant-ui/pull/5177) [`ec8ee6a`](https://github.com/assistant-ui/assistant-ui/commit/ec8ee6a84975632c2ec28f20e7d9cb8a16573495) - fix: isolate public runtime event subscribers ([@Gujiassh](https://github.com/Gujiassh))

- [#5107](https://github.com/assistant-ui/assistant-ui/pull/5107) [`666aaab`](https://github.com/assistant-ui/assistant-ui/commit/666aaab6ac3a64ec0f58c3ae958186a9880d8764) - fix: prioritize backend tool results over stale argument parse errors ([@Solaris-star](https://github.com/Solaris-star))

- [#5078](https://github.com/assistant-ui/assistant-ui/pull/5078) [`c1b1750`](https://github.com/assistant-ui/assistant-ui/commit/c1b175040e49ecb82b43d2713536aef7a1f2300e) - fix: isolate realtime voice session listener errors ([@Kinfe123](https://github.com/Kinfe123))

- [#5113](https://github.com/assistant-ui/assistant-ui/pull/5113) [`f263c9e`](https://github.com/assistant-ui/assistant-ui/commit/f263c9e827f3ed96f6773b3d8d14f573e53ee941) - fix: apply pending mute state after voice session setup ([@Kinfe123](https://github.com/Kinfe123))

- [#5034](https://github.com/assistant-ui/assistant-ui/pull/5034) [`475fca3`](https://github.com/assistant-ui/assistant-ui/commit/475fca35d81a2f30909566e2b3703f5fbce76869) - fix: allow omitting externalId in RemoteThreadInitializeResponse ([@darreleng](https://github.com/darreleng))

- [#5039](https://github.com/assistant-ui/assistant-ui/pull/5039) [`8faad07`](https://github.com/assistant-ui/assistant-ui/commit/8faad07801875f2877635380179a18a7fd4f3193) - refactor: share parseDataUrl and httpUrlPattern from core internal ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#5127](https://github.com/assistant-ui/assistant-ui/pull/5127) [`61518b9`](https://github.com/assistant-ui/assistant-ui/commit/61518b99c11c49f439fc9411187b1cb148777b79) - fix: keep derived part scopes stable while removed parts unmount ([@Kinfe123](https://github.com/Kinfe123))

- [#5120](https://github.com/assistant-ui/assistant-ui/pull/5120) [`1eb7275`](https://github.com/assistant-ui/assistant-ui/commit/1eb72757257d1919b2c198c8700deb79ff280253) - fix: generate Cloud attachment IDs without requiring Web Crypto ([@Kinfe123](https://github.com/Kinfe123))

- [#5171](https://github.com/assistant-ui/assistant-ui/pull/5171) [`c47bdf4`](https://github.com/assistant-ui/assistant-ui/commit/c47bdf475381d2b79abed6201157984afa1e22c4) - fix: isolate composer runtime event listener errors ([@rupic-app](https://github.com/apps/rupic-app))

- [#5144](https://github.com/assistant-ui/assistant-ui/pull/5144) [`de54334`](https://github.com/assistant-ui/assistant-ui/commit/de54334ab8416be1a5ec9ebcebc58258bb80cbd5) - fix: isolate thread runtime event listener errors ([@Kinfe123](https://github.com/Kinfe123))

- [#5122](https://github.com/assistant-ui/assistant-ui/pull/5122) [`2f69f68`](https://github.com/assistant-ui/assistant-ui/commit/2f69f682d2490c945acb378cdf33052e69d40790) - fix: preserve metadata.isOptimistic on user messages in fromThreadMessageLike ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#5079](https://github.com/assistant-ui/assistant-ui/pull/5079) [`390e417`](https://github.com/assistant-ui/assistant-ui/commit/390e4177ca47f7ece839613ad0f076add9313328) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`8630186`](https://github.com/assistant-ui/assistant-ui/commit/8630186c86f651bd5e3db9901de14b3feff073ec), [`446a118`](https://github.com/assistant-ui/assistant-ui/commit/446a1187d38f3ca8ce12b1f0ac739400cb32d63e), [`a081656`](https://github.com/assistant-ui/assistant-ui/commit/a0816568bcb0632a67f6e09dc0c90e76cc2b50cc), [`25a5be0`](https://github.com/assistant-ui/assistant-ui/commit/25a5be0c8b7101a382ee7fc31102bdf4fb7ad114), [`47562fd`](https://github.com/assistant-ui/assistant-ui/commit/47562fd231b35fe41c61b437ff66021f9cf0e554), [`5e4dd9f`](https://github.com/assistant-ui/assistant-ui/commit/5e4dd9fd00161fd79df60821d2b9af0cd7ebcefd), [`5da0d93`](https://github.com/assistant-ui/assistant-ui/commit/5da0d93808089b9fca35667ab442dff196de46b8), [`85d4976`](https://github.com/assistant-ui/assistant-ui/commit/85d49764ca3585fc553257dafa00a47830727e36), [`5135400`](https://github.com/assistant-ui/assistant-ui/commit/5135400d054297889312b9ae03fe803443ee2fae), [`9a343db`](https://github.com/assistant-ui/assistant-ui/commit/9a343db871ceab7e574bfcec9ab22af0ddaf1841), [`666aaab`](https://github.com/assistant-ui/assistant-ui/commit/666aaab6ac3a64ec0f58c3ae958186a9880d8764), [`ba948d8`](https://github.com/assistant-ui/assistant-ui/commit/ba948d8192b8c4bf12cbe60ece4d0f2d11506aa6), [`44aac58`](https://github.com/assistant-ui/assistant-ui/commit/44aac5834cff3a4f985b3b0aefe31c8b7951732f), [`9402648`](https://github.com/assistant-ui/assistant-ui/commit/94026488709d1fcc4ed446f39e2dcb78f9eb1daf), [`4651ea5`](https://github.com/assistant-ui/assistant-ui/commit/4651ea5b003bcd56d82e0bb3de16f918d6722906), [`2bc6798`](https://github.com/assistant-ui/assistant-ui/commit/2bc6798346378fd6c1f8b7e8423fda162d7f3a27)]:
  - assistant-stream@0.3.27

## 0.2.21

### Patch Changes

- [#4728](https://github.com/assistant-ui/assistant-ui/pull/4728) [`2aca5e0`](https://github.com/assistant-ui/assistant-ui/commit/2aca5e09337b5b867562e6280b8cc6d49763e845) - feat: surface the upload failure reason on failed attachment status ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#4961](https://github.com/assistant-ui/assistant-ui/pull/4961) [`908af6d`](https://github.com/assistant-ui/assistant-ui/commit/908af6d6104b355c3097fcf77367bed1bf5541b8) - fix(core): accept application/json text attachments and parameterized MIME types ([@Kinfe123](https://github.com/Kinfe123))

- [#4722](https://github.com/assistant-ui/assistant-ui/pull/4722) [`1b46551`](https://github.com/assistant-ui/assistant-ui/commit/1b465515f38be1d7d4e844ab5d95c90537745d15) - fix(core): log the swallowed CloudFileAttachmentAdapter upload error instead of discarding it ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#4714](https://github.com/assistant-ui/assistant-ui/pull/4714) [`7865f67`](https://github.com/assistant-ui/assistant-ui/commit/7865f6730d0a98e43bc27d5a0482bc43f2678de5) - fix(core): CloudFileAttachmentAdapter now fails uploads that return an HTTP error status instead of attaching a dead link ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#4754](https://github.com/assistant-ui/assistant-ui/pull/4754) [`438ecd3`](https://github.com/assistant-ui/assistant-ui/commit/438ecd350d5f14e5c5d329d6f4c0689b491c0845) - fix: preserve user attachments in Cloud history ([@Kinfe123](https://github.com/Kinfe123))

- [#4715](https://github.com/assistant-ui/assistant-ui/pull/4715) [`5a34e8c`](https://github.com/assistant-ui/assistant-ui/commit/5a34e8c2721b02e7a115d085bc09a447e0d3caa9) - fix: restore composer text and attachments when an attachment upload fails during send ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#4971](https://github.com/assistant-ui/assistant-ui/pull/4971) [`5dbbac4`](https://github.com/assistant-ui/assistant-ui/commit/5dbbac4f49b6269c1017f11c9bf6da2909fa6c96) - refactor: host the shared JSON type guards in @assistant-ui/core/internal ([@okisdev](https://github.com/okisdev))

- [#4704](https://github.com/assistant-ui/assistant-ui/pull/4704) [`d3bd0ed`](https://github.com/assistant-ui/assistant-ui/commit/d3bd0ede457f50043ff59f8987f59b16c675ef01) - fix: re-convert cached messages when the converter callback or metadata changes, and re-parent children of skipped optimistic messages in repository export ([@samdickson22](https://github.com/samdickson22))

- [#4842](https://github.com/assistant-ui/assistant-ui/pull/4842) [`84e8ddf`](https://github.com/assistant-ui/assistant-ui/commit/84e8ddf548d808d74d84b6be5a8ed28642baad3d) - feat: AssistantError taxonomy with severity and display metadata propagated through run error status. behavior note: local runtime run failures now store a structured AssistantError object in message status.error instead of a plain string; useMessageError keeps returning a human-readable string for both shapes, and code reading status.error directly should use isAssistantError or toAssistantError ([@okisdev](https://github.com/okisdev))

- [#4833](https://github.com/assistant-ui/assistant-ui/pull/4833) [`8282269`](https://github.com/assistant-ui/assistant-ui/commit/8282269f0864bc43c999cd209fbbee035ee53641) - feat: createSuggestionAdapter factory and AbortSignal forwarding for suggestion generation ([@okisdev](https://github.com/okisdev))

- [#4662](https://github.com/assistant-ui/assistant-ui/pull/4662) [`03ffe44`](https://github.com/assistant-ui/assistant-ui/commit/03ffe44808f4898a2862e608db7258682cf12383) - feat: infer tool argument types from Standard Schema parameters ([@Kinfe123](https://github.com/Kinfe123))

- [#4954](https://github.com/assistant-ui/assistant-ui/pull/4954) [`77c7b26`](https://github.com/assistant-ui/assistant-ui/commit/77c7b269795c7aad03ce83e7e574425c3e0f26c8) - fix: stop isJSONArray from consuming the array index as recursion depth ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#4969](https://github.com/assistant-ui/assistant-ui/pull/4969) [`026a7ae`](https://github.com/assistant-ui/assistant-ui/commit/026a7aeabc8134d3ecb26127225ebf0070267261) - fix: resume the local runtime when a human tool returns a falsy result ([@serhiizghama](https://github.com/serhiizghama))

- [#4741](https://github.com/assistant-ui/assistant-ui/pull/4741) [`160b0af`](https://github.com/assistant-ui/assistant-ui/commit/160b0afa773b13a5e0f462cf05b7661baa1627f5) - fix: ignore malformed local thread storage ([@Kinfe123](https://github.com/Kinfe123))

- [#4675](https://github.com/assistant-ui/assistant-ui/pull/4675) [`c814c9c`](https://github.com/assistant-ui/assistant-ui/commit/c814c9cf562a66ab3864ca0472d667902ebc131b) - feat: support prefixed MCP toolkit tool names ([@Kinfe123](https://github.com/Kinfe123))

- [#4665](https://github.com/assistant-ui/assistant-ui/pull/4665) [`6be3b67`](https://github.com/assistant-ui/assistant-ui/commit/6be3b6781b3ddd178208bc9de15326ab35d496d4) - feat: support disabled MCP toolkit entries ([@Kinfe123](https://github.com/Kinfe123))

- [#4667](https://github.com/assistant-ui/assistant-ui/pull/4667) [`c590a21`](https://github.com/assistant-ui/assistant-ui/commit/c590a21a63405f5a52a6d372e003afca06cf4a1e) - feat: support disabled MCP toolkit tools ([@Kinfe123](https://github.com/Kinfe123))

- [#4746](https://github.com/assistant-ui/assistant-ui/pull/4746) [`0686f4e`](https://github.com/assistant-ui/assistant-ui/commit/0686f4e6b8ee5f6e17c968997ef11622ef8f9c98) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#4898](https://github.com/assistant-ui/assistant-ui/pull/4898) [`a84cf6d`](https://github.com/assistant-ui/assistant-ui/commit/a84cf6ddc37ba7a7ea7244eb73e5d40a00ea5e24) - feat: plumb an optional serverId through MCP Apps metadata and host calls for multi-MCP routing ([@okisdev](https://github.com/okisdev))

- [#4806](https://github.com/assistant-ui/assistant-ui/pull/4806) [`9f99c46`](https://github.com/assistant-ui/assistant-ui/commit/9f99c46ca1ca724081466f97c7e17eda316e8fb3) - feat: preserve providerMetadata on text, reasoning, and tool-call message parts ([@DLOVRIC2](https://github.com/DLOVRIC2))

  The AI SDK message converter already kept `providerMetadata` on source parts but
  dropped it on text, reasoning, and tool-call parts (where the AI SDK surfaces it
  as `callProviderMetadata`). Provider- or app-scoped metadata such as agent
  attribution now survives the conversion to assistant-ui messages.

- [#4650](https://github.com/assistant-ui/assistant-ui/pull/4650) [`e3aba86`](https://github.com/assistant-ui/assistant-ui/commit/e3aba86b7a788261d25921e4a58cebbe7a59fb44) - fix: make the default attachment adapter work without FileReader (Node, react-ink, SSR) by sharing a single getFileDataURL from @assistant-ui/core/internal, whose base64 fallback chunks large inputs and works on runtimes without Buffer ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#4901](https://github.com/assistant-ui/assistant-ui/pull/4901) [`25f9eb2`](https://github.com/assistant-ui/assistant-ui/commit/25f9eb2caacade2e5522f92e3221ee8173da0608) - refactor: host the streaming-stable tool-args stringifier in @assistant-ui/core/internal ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#4887](https://github.com/assistant-ui/assistant-ui/pull/4887) [`d03e5cf`](https://github.com/assistant-ui/assistant-ui/commit/d03e5cf0e6efada832503fedc565a1fb8f14676a) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#4744](https://github.com/assistant-ui/assistant-ui/pull/4744) [`ef81c86`](https://github.com/assistant-ui/assistant-ui/commit/ef81c869a3292175a32f0d924e911564a07d439b) - fix: include thread ids in thread list runtime errors ([@Kinfe123](https://github.com/Kinfe123))

- [#4943](https://github.com/assistant-ui/assistant-ui/pull/4943) [`5ade3a5`](https://github.com/assistant-ui/assistant-ui/commit/5ade3a500498b59a4449f46d443ced8a1e3136be) - fix: keep tool-args key-order caches independent for keys containing dots or brackets ([@okisdev](https://github.com/okisdev))

- [#4956](https://github.com/assistant-ui/assistant-ui/pull/4956) [`1f284ac`](https://github.com/assistant-ui/assistant-ui/commit/1f284ac2f4e20b0daebfdb6829a44ba0a56033b3) - fix: generate unique IDs for built-in file attachments ([@Kinfe123](https://github.com/Kinfe123))

- [#4957](https://github.com/assistant-ui/assistant-ui/pull/4957) [`65ba32a`](https://github.com/assistant-ui/assistant-ui/commit/65ba32a956661804203450cfb9a2b0285450da9d) - fix: complete unsupported title generation streams ([@Kinfe123](https://github.com/Kinfe123))

- [#4815](https://github.com/assistant-ui/assistant-ui/pull/4815) [`5325f09`](https://github.com/assistant-ui/assistant-ui/commit/5325f0985768b750b050cf07f592fdfed34eccac) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

- Updated dependencies [[`43b8ce8`](https://github.com/assistant-ui/assistant-ui/commit/43b8ce862520e1f53d837407c5fcd7106c9ffd7c), [`1e926b6`](https://github.com/assistant-ui/assistant-ui/commit/1e926b68a8f61d5d099a53c89ad25b168872b853), [`d6c7571`](https://github.com/assistant-ui/assistant-ui/commit/d6c757149df4cc66aa3261a3bd3beb041cac6c49), [`4d7a447`](https://github.com/assistant-ui/assistant-ui/commit/4d7a4479b2dd673e3f5a356c4dd763f3aa72053d), [`ca751f4`](https://github.com/assistant-ui/assistant-ui/commit/ca751f41905a82e9b1622d100af62b8b31314a5c), [`38bf104`](https://github.com/assistant-ui/assistant-ui/commit/38bf1045406da7eff1b9c5847e4e7db96d327c2c), [`19b2a00`](https://github.com/assistant-ui/assistant-ui/commit/19b2a00add7f1900bc3fed579759400fc241747c), [`0686f4e`](https://github.com/assistant-ui/assistant-ui/commit/0686f4e6b8ee5f6e17c968997ef11622ef8f9c98), [`c2d2271`](https://github.com/assistant-ui/assistant-ui/commit/c2d2271b9709c235da18036a0edd5283ce279916), [`84e8ddf`](https://github.com/assistant-ui/assistant-ui/commit/84e8ddf548d808d74d84b6be5a8ed28642baad3d), [`d03e5cf`](https://github.com/assistant-ui/assistant-ui/commit/d03e5cf0e6efada832503fedc565a1fb8f14676a), [`5325f09`](https://github.com/assistant-ui/assistant-ui/commit/5325f0985768b750b050cf07f592fdfed34eccac)]:
  - assistant-stream@0.3.26

## 0.2.20

### Patch Changes

- [#4653](https://github.com/assistant-ui/assistant-ui/pull/4653) [`523e0b5`](https://github.com/assistant-ui/assistant-ui/commit/523e0b563a71a656f050473c42c414b26c2d5ab4) - fix: skip malformed generative UI component nodes ([@Kinfe123](https://github.com/Kinfe123))

- Updated dependencies [[`f833bc1`](https://github.com/assistant-ui/assistant-ui/commit/f833bc118b49641f3f6e0ab22bcfc63bf0a04408)]:
  - assistant-stream@0.3.25

## 0.2.19

### Patch Changes

- [#4497](https://github.com/assistant-ui/assistant-ui/pull/4497) [`ddc40b7`](https://github.com/assistant-ui/assistant-ui/commit/ddc40b7791563057749ecf1121e15d19574479ff) - fix: tolerate reasoning and image content blocks that omit their declared fields ([@okisdev](https://github.com/okisdev))

- [#4466](https://github.com/assistant-ui/assistant-ui/pull/4466) [`ea52de0`](https://github.com/assistant-ui/assistant-ui/commit/ea52de06368853b7af7ac6755b157ec5305a8494) - refactor: add an internal createRuntimeExtras helper shared by external-store adapter authors ([@okisdev](https://github.com/okisdev))

- [#4548](https://github.com/assistant-ui/assistant-ui/pull/4548) [`29c6fdb`](https://github.com/assistant-ui/assistant-ui/commit/29c6fdbc8ede04fb2647b0a47184003ee3c2f090) - feat(core): add shared client-side streaming timing primitive (`useStreamingTiming` + pure `stepStreamingTiming`) ([@okisdev](https://github.com/okisdev))

- [#4543](https://github.com/assistant-ui/assistant-ui/pull/4543) [`d0987a3`](https://github.com/assistant-ui/assistant-ui/commit/d0987a32540880e5058ee529fd52a3efb4298706) - external-store: add `unstable_onBranchChange` adapter callback that fires on explicit `switchToBranch`, emitting the canonical (persisted) head and visible message ids, deduped by head ([@AVGVSTVS96](https://github.com/AVGVSTVS96))

- [#4517](https://github.com/assistant-ui/assistant-ui/pull/4517) [`cefcf27`](https://github.com/assistant-ui/assistant-ui/commit/cefcf27b4b53ceafef18e469644d51797c11c8ff) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

- [#4310](https://github.com/assistant-ui/assistant-ui/pull/4310) [`0c51b90`](https://github.com/assistant-ui/assistant-ui/commit/0c51b905d22418b93532636b1028c080ecc819e0) - feat: add `unstable_` interactables API; restore and deprecate the previous interactables API ([@AVGVSTVS96](https://github.com/AVGVSTVS96))

  The redesigned interactables API is now available as an additive `unstable_*` surface for building editable, in-message UI while preserving the existing stable API for compatibility.

  - `unstable_useInteractable(name, config)` registers an interactable and returns its state plus methods in one hook.
  - Each unstable interactable name gets one stable `update_{name}` tool. When multiple instances share a name, the tool targets an instance by `id`.
  - Thread-scoped interactables rendered inside message parts expose `version`, including the state for that message, whether it is the latest tool-driven version, and `restore()`.
  - Added `unstable_interactableTool(...)` for defining a creating tool and its in-message render UI together.
  - Added `unstable_useInteractableVersions(id, name)` for version history UIs.
  - Persistence adapters can now provide `load()` and be passed directly to `unstable_Interactables({ persistence })`.

  The previous `useAssistantInteractable` / `useInteractableState` / `Interactables` API remains available unchanged and is marked deprecated. Existing apps do not need to migrate immediately.

  Migration notes for the unstable API:

  ```diff
  - const id = useAssistantInteractable("taskBoard", config);
  - const [state, { setState }] = useInteractableState(id, initialState);
  + const [state, { id, setState }] = unstable_useInteractable("taskBoard", config);
  ```

  - Use `unstable_interactables: unstable_Interactables()` when registering the unstable scope.
  - `unstable_useInteractableState(id)` is intended for secondary readers and returns `undefined` until the owner registers.
  - The unstable API uses per-name update tools (`update_{name}`) with an `id` parameter instead of legacy per-instance tools (`update_{name}_{id}`).
  - A top-level `id` field in `stateSchema` is reserved for instance addressing. Rename domain state fields to `itemId`, `recordId`, etc. if the model should edit them.
  - Model selection should be represented as ordinary state in the unstable API; the legacy `selected` registration prop and `setSelected` method remain available on the deprecated stable API.

- [#4482](https://github.com/assistant-ui/assistant-ui/pull/4482) [`3a8f685`](https://github.com/assistant-ui/assistant-ui/commit/3a8f685e23a3e7ad76ac41e3ce6fff05714e04d3) - feat: add `onThreadIdChange` to the remote thread list runtime so `threadId` can be used as a managed/controlled value (e.g. synced to a URL). Only the settled remote ID is emitted; the transient optimistic local ID is never surfaced. ([@Yonom](https://github.com/Yonom))

- [#4567](https://github.com/assistant-ui/assistant-ui/pull/4567) [`ec6adf4`](https://github.com/assistant-ui/assistant-ui/commit/ec6adf4adc91fe12c7de47fc93adcc347ece8245) - fix: make PartPrimitive.Messages props a discriminated union so rendering with neither components nor children is a compile error ([@ephraimduncan](https://github.com/ephraimduncan))

- [#4542](https://github.com/assistant-ui/assistant-ui/pull/4542) [`4acd4c0`](https://github.com/assistant-ui/assistant-ui/commit/4acd4c0f608da1c62bf23a666bc0fec870a27dca) - add unstable id-keyed thread message rendering APIs for virtualized and custom message lists. `unstable_useThreadMessageIds()` returns the thread's message ids (stable array identity across content-only updates), and `ThreadPrimitive.Unstable_MessageById` renders a single message by id with the same component surface as `MessageByIndex`. A missing or removed id renders `null` instead of throwing. ([@AVGVSTVS96](https://github.com/AVGVSTVS96))

- Updated dependencies [[`cefcf27`](https://github.com/assistant-ui/assistant-ui/commit/cefcf27b4b53ceafef18e469644d51797c11c8ff)]:
  - assistant-stream@0.3.24

## 0.2.18

### Patch Changes

- [#4426](https://github.com/assistant-ui/assistant-ui/pull/4426) [`68dfbaa`](https://github.com/assistant-ui/assistant-ui/commit/68dfbaa348fba7ccec251c63d0c5cc8765e42a64) - chore: mark `generateId` and `fromThreadMessageLike` as experimental ([@okisdev](https://github.com/okisdev))

  these two utilities became public in [#4414](https://github.com/assistant-ui/assistant-ui/issues/4414). they now carry an `@deprecated` JSDoc noting the API is experimental and may change without notice, matching how the other unstable public utilities (e.g. `bindExternalStoreMessage`) are flagged. the distribution packages (`@assistant-ui/react`, `@assistant-ui/react-native`, `@assistant-ui/react-ink`) re-export them, so the annotation lands in their published types too.

- [#4420](https://github.com/assistant-ui/assistant-ui/pull/4420) [`fe24ad6`](https://github.com/assistant-ui/assistant-ui/commit/fe24ad645e292cc77d9bdda6b0c18ccd8be23096) - feat(react-ag-ui): apply external state from `ThreadHistoryAdapter.load()` ([@dkachur1](https://github.com/dkachur1))

  `onSwitchToThread` already applies returned `state` via `loadExternalState`, but the history `load()` path did not, so state restored on a fresh page load was dropped. `ThreadHistoryAdapter.load()` may now return an optional `state`, and `AgUiThreadRuntimeCore` applies it — making both load paths symmetric.

## 0.2.17

### Patch Changes

- [#4414](https://github.com/assistant-ui/assistant-ui/pull/4414) [`344f737`](https://github.com/assistant-ui/assistant-ui/commit/344f7370511f7238db17e1982f2a43a10829604c) - feat: export `fromThreadMessageLike` and `generateId` from the public API ([@okisdev](https://github.com/okisdev))

  these two utilities were only reachable via `@assistant-ui/core/internal`, so materializing a `ThreadMessageLike` into a `ThreadMessage`, or generating an id for a hand-built message, meant reaching into internals (the first-party ag-ui and a2a runtimes already did). they are now exported from `@assistant-ui/core`, `@assistant-ui/react`, `@assistant-ui/react-native`, and `@assistant-ui/react-ink`. also removes the now-redundant duplicate listing of both from the unstable `INTERNAL` namespace (the one in-repo consumer, the with-ffmpeg example, now uses the public export).

- [#4415](https://github.com/assistant-ui/assistant-ui/pull/4415) [`a2e21ee`](https://github.com/assistant-ui/assistant-ui/commit/a2e21ee797761907db9b7e4559da2a41afd00fc9) - perf: sync the external-store `messageRepository` incrementally instead of clear()+import() ([@okisdev](https://github.com/okisdev))

  when an `ExternalStoreAdapter` drives the thread via `messageRepository`, each update tore the whole repository down (`clear()`) and rebuilt it from scratch (`import()`). it now diffs against the current repository (add or update incoming messages, delete the ones no longer present), so unchanged messages keep their existing per-message repository state instead of being recreated, and short-circuits when only `isRunning` flips on an unchanged repository reference. behavior is unchanged; this removes the teardown/rebuild churn on high-frequency streaming that previously pushed consumers to subclass the runtime core.

## 0.2.16

### Patch Changes

- [#4393](https://github.com/assistant-ui/assistant-ui/pull/4393) [`434bba5`](https://github.com/assistant-ui/assistant-ui/commit/434bba5f7c59ab7cf6f1c78a8898fd4d3addb12d) - fix: resolve typecheck regressions ([@Yonom](https://github.com/Yonom))

- [#4392](https://github.com/assistant-ui/assistant-ui/pull/4392) [`4cc7eaa`](https://github.com/assistant-ui/assistant-ui/commit/4cc7eaac61d68ae970b998465bb7e5c722cc9dda) - chore: update peer and dependency ranges for @assistant-ui/tap 0.9 ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`434bba5`](https://github.com/assistant-ui/assistant-ui/commit/434bba5f7c59ab7cf6f1c78a8898fd4d3addb12d)]:
  - assistant-stream@0.3.23

## 0.2.15

### Patch Changes

- [#4367](https://github.com/assistant-ui/assistant-ui/pull/4367) [`c207bcd`](https://github.com/assistant-ui/assistant-ui/commit/c207bcda24468c1ae6e5adb61054a3682d3ff1d8) - feat: add reasoningEffort to LanguageModelConfig ([@AVGVSTVS96](https://github.com/AVGVSTVS96))

- [#4385](https://github.com/assistant-ui/assistant-ui/pull/4385) [`ae59baf`](https://github.com/assistant-ui/assistant-ui/commit/ae59baf3bb9b1779f403d378aca19bb3d83781ff) - feat: precompile packages with React Compiler ([@Yonom](https://github.com/Yonom))
  - aui-build runs React Compiler over packages that depend on tap and remaps `react/compiler-runtime` to the tap shim subpath, so compiled hooks and components work both in React components and inside tap resource renders
  - `@assistant-ui/tap/react-shim` exports `useMemoCache` (tap inside a resource render, `React.__COMPILER_RUNTIME.c` otherwise, with a React 18 polyfill); new `@assistant-ui/tap/react-shim/compiler-runtime` subpath mirrors `react/compiler-runtime`'s `c` export
  - tap implements `useSyncExternalStore` and a no-op `useDebugValue`; `useSubscribable` now builds on `useSyncExternalStore` so its store reads stay visible to the compiler
  - `AssistantProviderBase` opts out via `"use no memo"` because the runtime receives options through an effect inside a re-rendered child element

- [#4378](https://github.com/assistant-ui/assistant-ui/pull/4378) [`4583ca7`](https://github.com/assistant-ui/assistant-ui/commit/4583ca7477c834ef0906e7268005b469c7300cbe) - feat: approval options vocabulary on tool approvals. `ToolCallMessagePart.approval` gains request-supplied `options` (machine-readable kinds allow-once / allow-always / reject-once / reject-always, open to `_`-prefixed custom kinds), a recorded `optionId`, and a terminal `resolution` ("cancelled" | "expired") for non-decision outcomes. `respondToApproval` additionally accepts `{ optionId }`, resolved in core against the option's kind; custom kinds require an explicit `approved`. `ExternalThread` gains an `onRespondToToolApproval` callback. The kit approval bar renders supplied options with an opt-in confirmation step showing the grants an option would persist. Persistence stays host-owned. ([@okisdev](https://github.com/okisdev))

- [#4379](https://github.com/assistant-ui/assistant-ui/pull/4379) [`94cc028`](https://github.com/assistant-ui/assistant-ui/commit/94cc02875b4e813e1af7020709511bb5f61e6067) - feat: per-tool-call timing and stall detection. `ToolCallMessagePart` gains a `timing` field (`{ startedAt, completedAt? }` in epoch ms), auto-populated by the assistant-stream accumulator at part start and result, and accepted on `ThreadMessageLike` for external-store hosts. New `useToolCallElapsed()` hook returns the call's elapsed milliseconds, ticking once per second while running; `unstable_useMessageStallDetection({ thresholdMs })` reports mid-run output stalls by watching a message content fingerprint. The kit `ToolFallback` trigger renders the duration when timing is present. ([@okisdev](https://github.com/okisdev))

- Updated dependencies [[`94cc028`](https://github.com/assistant-ui/assistant-ui/commit/94cc02875b4e813e1af7020709511bb5f61e6067)]:
  - assistant-stream@0.3.22

## 0.2.14

### Patch Changes

- [#4340](https://github.com/assistant-ui/assistant-ui/pull/4340) [`ab8e5bc`](https://github.com/assistant-ui/assistant-ui/commit/ab8e5bc8650b1e39c8f01ab6c0efb80aa8baf723) - fix: exclude reasoning parts from copied message text ([@serhiizghama](https://github.com/serhiizghama))

  `getCopyText` filtered parts with `"text" in part`, which also matched `reasoning` parts (they carry a `text` field), leaking the model's chain-of-thought into the clipboard. Both copy paths now delegate to the canonical `getThreadMessageText`, so copy returns only `type: "text"` content — consistent with the rest of the runtime.

- [#4359](https://github.com/assistant-ui/assistant-ui/pull/4359) [`59d252f`](https://github.com/assistant-ui/assistant-ui/commit/59d252fa09c1511acd7e31c9d8178514c5a5cb77) - feat: branch switching for the ExternalThread client ([@okisdev](https://github.com/okisdev))

  `ExternalThread` accepts an optional `branches` adapter (`ExternalThreadBranchAdapter` in `@assistant-ui/core`, re-exported from `@assistant-ui/react`): `getBranches(messageId)` returns ordered sibling branch ids and `switchToBranch(branchId)` makes a sibling visible by swapping the `messages` array. messages with more than one sibling get real `branchNumber`/`branchCount`, which is what shows the branch picker; `capabilities.switchToBranch` is set for parity with the legacy external store. without the adapter, behavior is unchanged.

- [#4347](https://github.com/assistant-ui/assistant-ui/pull/4347) [`feecac3`](https://github.com/assistant-ui/assistant-ui/commit/feecac38c6ba0f8f30ec356376d1d6b19188e08f) - feat: support tool approvals on the local runtime ([@okisdev](https://github.com/okisdev))

  `LocalRuntime.respondToToolApproval` previously threw "Local runtime does not support tool approvals". the local runtime now implements the approval gate natively, treating the `ChatModelAdapter` as the server side of the protocol: the adapter emits `approval: { id }` on a tool call part and ends the run with `requires-action`. a pending approval pauses the run (previously `shouldContinue` ignored approvals, so an unlisted tool call carrying one re-invoked the adapter in a loop). denying records the decision and synthesizes an error result (`{ error: reason || "Tool approval denied" }` with `isError: true`, matching the AI SDK v6 denial shape); approving records the decision and resumes the run once every gate on the message is decided, with the decisions readable via `unstable_getMessage()`. tool calls carrying an approval are exempt from the `unstable_humanToolNames` result requirement, and a gated call that receives a result via `addToolResult` counts as resolved, so neither combination deadlocks.

  resumed runs (from `respondToToolApproval` and `addToolResult` alike) now go through the same run loop as `startRun`: they continue multi-step turns instead of stalling after one roundtrip, emit `runStart`/`runEnd` events, mark the message queue busy so a concurrent send no longer aborts the in-flight roundtrip, and regenerate suggestions on completion. `addToolResult` also notifies subscribers when it records a result without resuming. `resumeToolCall` still throws, now with an error that points at the supported alternatives, and the `unstable_humanToolNames` JSDoc no longer describes the pause as an approval ([#4339](https://github.com/assistant-ui/assistant-ui/issues/4339)).

- [#4325](https://github.com/assistant-ui/assistant-ui/pull/4325) [`5a4f20e`](https://github.com/assistant-ui/assistant-ui/commit/5a4f20e75dcd93aeb70a4a5582a0a5a1f870b4f2) - chore: update @assistant-ui/tap dependency ranges to ^0.7.0 ([@Yonom](https://github.com/Yonom))

- [#4328](https://github.com/assistant-ui/assistant-ui/pull/4328) [`f10b8ae`](https://github.com/assistant-ui/assistant-ui/commit/f10b8ae6659ed8df8b0c25b5bb2bb8cfa7d7a718) - feat: expose `lastMessageAt` on thread list items, populated from the cloud thread list adapter ([@okisdev](https://github.com/okisdev))

- [#4351](https://github.com/assistant-ui/assistant-ui/pull/4351) [`1fb5862`](https://github.com/assistant-ui/assistant-ui/commit/1fb586241534064fa48e3498f422bdaa7f382139) - fix: stable identity for grouped message parts across reorders ([@okisdev](https://github.com/okisdev))

  tool groups (and chain-of-thought groups) in `MessagePrimitive.Parts` and group nodes in `MessagePrimitive.GroupedParts` are now keyed by the id of their first part (`toolCallId`) instead of their positional index, and tool parts inside a group are keyed by their own id. when a message's parts array re-orders between live streaming and the settled shape, group and part React identity now survives the re-slice, so collapse/open state no longer resets. groups whose first part has no id keep their structural key, and duplicate ids fall back to structural keys, so keys stay unique.

## 0.2.13

### Patch Changes

- [#4315](https://github.com/assistant-ui/assistant-ui/pull/4315) [`60ef0e9`](https://github.com/assistant-ui/assistant-ui/commit/60ef0e9ed26ceab722468332ff93c4751cc631fb) - feat: add runtime support for deleting messages ([@Yonom](https://github.com/Yonom))

- [#4318](https://github.com/assistant-ui/assistant-ui/pull/4318) [`1b6a0d6`](https://github.com/assistant-ui/assistant-ui/commit/1b6a0d6ae40b343b233c8c12ab119b13c43cb69b) - feat(tap): resources carry all hook arguments; elements are `{ hook, args }` ([@Yonom](https://github.com/Yonom))

  A `ResourceElement` is now `{ hook, args }` (was `{ type, props }`): the underlying hook plus the full tuple of arguments to call it with. This lets a resource take multiple positional arguments, exactly like a hook, and makes hosting just `hook(...args)`:

  ```ts
  const usePair = (a: number, b: string) => ({ a, b });
  const Pair = resource(usePair);
  const element = Pair(1, "hi"); // { hook: usePair, args: [1, "hi"] }
  ```

  The single-object case is unchanged ergonomically (`Counter({ initialValue: 0 })` still works; its `args` is just `[{ initialValue: 0 }]`), so existing resources and call sites are unaffected. `resource()`'s overloads collapse into one variadic signature, and the `fnSymbol` / `callResourceFn` indirection is gone (the element holds the hook directly; `renderResourceFiber` calls `fiber.hook(...args)`).

  Breaking (internal/advanced):
  - The second type parameter of `Resource` / `ResourceElement` / `ContravariantResource` now means the argument tuple `A extends readonly unknown[]` rather than a single payload `P`. Explicit two-arg annotations must wrap the payload in a tuple (e.g. `ResourceElement<R, [Props]>`).
  - A resource's identity is now its hook. Reading `element.props` becomes `element.args[0]`; reading `element.type` becomes `element.hook`. `attachTransformScopes` is now keyed by (and called with) the hook rather than the factory.
  - `useResource(element, deps)`'s second arg is unchanged in behavior (renamed `argsDeps`).

- [#4318](https://github.com/assistant-ui/assistant-ui/pull/4318) [`1b6a0d6`](https://github.com/assistant-ui/assistant-ui/commit/1b6a0d6ae40b343b233c8c12ab119b13c43cb69b) - refactor: adopt the extracted-hook convention for resources ([@Yonom](https://github.com/Yonom))

  A resource body is a hook, so resources are now authored as a `use`-prefixed hook
  wrapped with `resource()`:

  ```ts
  const useCounter = () => { ... };
  const Counter = resource(useCounter);
  ```

  `resource()` turns a hook into a Resource; `useResource(Counter(props))` turns it
  back into a hook call. Extracting the body to a `use`-prefixed hook lets React's
  stock rules-of-hooks and exhaustive-deps lint resource bodies directly. No
  public API or runtime behavior changes.

## 0.2.12

### Patch Changes

- Updated dependencies:
  - @assistant-ui/tap@0.6.1

## 0.2.11

### Patch Changes

- [#4271](https://github.com/assistant-ui/assistant-ui/pull/4271) [`2a84174`](https://github.com/assistant-ui/assistant-ui/commit/2a8417422996920c4a58be80eddc1c1740158518) - feat: expose `joinStrategy` on `useAISDKRuntime` / `useChatRuntime` ([@okisdev](https://github.com/okisdev))

  the new AI SDK runtime always merged consecutive `role: "assistant"` UIMessages into a single rendered turn, with no supported way to opt out (the converter accepts `joinStrategy` but the runtime never forwarded it, and `AISDKMessageConverter` is not exported). this follows up on [#1633](https://github.com/assistant-ui/assistant-ui/issues/1633), where the same knob shipped on the legacy `useVercelUseChatRuntime` as `unstable_joinStrategy`. pass `joinStrategy: "none"` to keep proactive or history loaded consecutive assistant messages as separate turns.

  core now exports a shared `JoinStrategy` type so the `"concat-content" | "none"` union has a single source of truth across the converter and the runtimes.

- [#4255](https://github.com/assistant-ui/assistant-ui/pull/4255) [`a0a0769`](https://github.com/assistant-ui/assistant-ui/commit/a0a076915dafdb7152c9fde75b40cfddebcb2676) - feat: check the generative compiler version against the core package compatibility range ([@Yonom](https://github.com/Yonom))

- [#4260](https://github.com/assistant-ui/assistant-ui/pull/4260) [`19c5b5f`](https://github.com/assistant-ui/assistant-ui/commit/19c5b5f3b1616a82ddfa928325c5e02c5786e867) - fix: make defineToolkit usable for plain runtime toolkits ([@Yonom](https://github.com/Yonom))

- [#4246](https://github.com/assistant-ui/assistant-ui/pull/4246) [`dbdfb15`](https://github.com/assistant-ui/assistant-ui/commit/dbdfb15e8b609d3886c71fedb25a9d8345e5fc3c) - feat: message queuing for external-store, langgraph, and local runtimes ([@okisdev](https://github.com/okisdev))

  the composer can now stay usable while a run is in progress: a message sent during a run is held in `composer.queue` (rendered via `ComposerPrimitive.Queue` / `QueueItemPrimitive.*`) and processed once the run settles. external-store adapters opt in by providing a `queue` adapter (typically built with the new `createMessageQueue` helper); `useLangGraphRuntime` and `useLocalRuntime` opt in via `unstable_enableMessageQueue`. `ExternalThreadQueueAdapter` now lives in `@assistant-ui/core` (still re-exported from `@assistant-ui/react`).

- [#4249](https://github.com/assistant-ui/assistant-ui/pull/4249) [`ca191dc`](https://github.com/assistant-ui/assistant-ui/commit/ca191dc63f4a63c7d3f98566e9febd7d7f857aec) - feat: add externalTool for render-only generative toolkit entries ([@Yonom](https://github.com/Yonom))

- [#4306](https://github.com/assistant-ui/assistant-ui/pull/4306) [`15878d8`](https://github.com/assistant-ui/assistant-ui/commit/15878d8114edbbb82c2a467cf811478e5f4e08bc) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#4256](https://github.com/assistant-ui/assistant-ui/pull/4256) [`44ff4bf`](https://github.com/assistant-ui/assistant-ui/commit/44ff4bf5765ec2675454362a00214cd9de5cfb60) - feat: rename hitlTool to humanTool while keeping deprecated compatibility aliases ([@Yonom](https://github.com/Yonom))

- [#4245](https://github.com/assistant-ui/assistant-ui/pull/4245) [`26a365b`](https://github.com/assistant-ui/assistant-ui/commit/26a365bb2b5bf840e21cd0caf1870627fb57c045) - fix: make `SimpleTextAttachmentAdapter` and `SimpleImageAttachmentAdapter` work without `FileReader`. they read files via the browser only `FileReader`, so sending an attachment in a non browser runtime (e.g. `@assistant-ui/react-ink` in a terminal) threw `ReferenceError: FileReader is not defined`. the adapters now feature detect: they keep using `FileReader` when it exists (browser, and React Native whose Blob polyfill provides it) and fall back to `file.text()` / `file.arrayBuffer()` in Node. output is byte identical across all three environments, so `@assistant-ui/react`, `@assistant-ui/react-native`, and `@assistant-ui/react-ink` all keep re-exporting the same core implementation. ([@ShobhitPatra](https://github.com/ShobhitPatra))

- Updated dependencies [[`15878d8`](https://github.com/assistant-ui/assistant-ui/commit/15878d8114edbbb82c2a467cf811478e5f4e08bc)]:
  - assistant-stream@0.3.21

## 0.2.10

### Patch Changes

- [#4234](https://github.com/assistant-ui/assistant-ui/pull/4234) [`4145caa`](https://github.com/assistant-ui/assistant-ui/commit/4145caaa23452f38c71366b55c03f8ec4da3fd54) - fix: infer `defineToolkit` streamCall argument readers from Standard Schema parameters ([@Yonom](https://github.com/Yonom))

- [#4212](https://github.com/assistant-ui/assistant-ui/pull/4212) [`5fe118d`](https://github.com/assistant-ui/assistant-ui/commit/5fe118d6e61fd661859ee0d6b5ef10a370992a84) - feat: add MCP server support to generative toolkits ([@Yonom](https://github.com/Yonom))

- [#4213](https://github.com/assistant-ui/assistant-ui/pull/4213) [`dcd5897`](https://github.com/assistant-ui/assistant-ui/commit/dcd5897f6dd6ca6bfe6978c3c03371e070965eab) - feat: add provider-executed tool support to generative toolkits ([@Yonom](https://github.com/Yonom))

- [#4208](https://github.com/assistant-ui/assistant-ui/pull/4208) [`0558db2`](https://github.com/assistant-ui/assistant-ui/commit/0558db28952fcd1c05a2ea3f15020cf50ca52489) - feat: add `updateCustom` to thread list runtimes, adapters, and clients ([@okisdev](https://github.com/okisdev))

- [#4214](https://github.com/assistant-ui/assistant-ui/pull/4214) [`69540af`](https://github.com/assistant-ui/assistant-ui/commit/69540af906f4301af0fd453b0ab425fd62703a46) - feat: add renderText helpers for tool call status text ([@Yonom](https://github.com/Yonom))

- [#4199](https://github.com/assistant-ui/assistant-ui/pull/4199) [`d9b3119`](https://github.com/assistant-ui/assistant-ui/commit/d9b311977759818fcdcea6037c938e7070276f47) - feat: a `defineToolkit` entry may now be an already-formed `ToolDefinition` (carrying its own `type`), not only an inline definition whose `type` the compiler infers. This is what lets a factory like `new JSONGenerativeUI({ library }).present()` be used directly as a tool. ([@Yonom](https://github.com/Yonom))

  Renames the authoring types to match `defineToolkit`: `ToolkitDeclaration` → `ToolkitDefinition`, and adds `ToolkitDefinitionEntry` (the union of an inline tool definition and a pre-formed `ToolDefinition`). The per-tool inline type is now an internal `ToolkitDefinitionInput` and is no longer exported.

- [#4236](https://github.com/assistant-ui/assistant-ui/pull/4236) [`ae54c55`](https://github.com/assistant-ui/assistant-ui/commit/ae54c55c8c8b0f9e9ef455ced1498f37d998c6cb) - feat: add `stubTool()` and experimental `useAuiToolOverrides()` for locally executed generative toolkit tools ([@Yonom](https://github.com/Yonom))

- [#4235](https://github.com/assistant-ui/assistant-ui/pull/4235) [`7640b31`](https://github.com/assistant-ui/assistant-ui/commit/7640b319f704414bd5eb197f34e11ae0b2324a1d) - Deprecate component tool registration APIs in favor of toolkit registrations. ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`cba2b42`](https://github.com/assistant-ui/assistant-ui/commit/cba2b42c26083e730ae07194186ab4473f9f4cf3), [`58f80e0`](https://github.com/assistant-ui/assistant-ui/commit/58f80e09b51a9d025403f8692c3f41adc6d403e0), [`78ff336`](https://github.com/assistant-ui/assistant-ui/commit/78ff336028ce125608a4b716a93a2519ad6d9eab), [`5fe118d`](https://github.com/assistant-ui/assistant-ui/commit/5fe118d6e61fd661859ee0d6b5ef10a370992a84), [`dcd5897`](https://github.com/assistant-ui/assistant-ui/commit/dcd5897f6dd6ca6bfe6978c3c03371e070965eab), [`ae54c55`](https://github.com/assistant-ui/assistant-ui/commit/ae54c55c8c8b0f9e9ef455ced1498f37d998c6cb)]:
  - assistant-stream@0.3.20
  - assistant-cloud@0.1.31
  - @assistant-ui/store@0.2.13
  - @assistant-ui/tap@0.5.14

## 0.2.9

### Patch Changes

- [#4176](https://github.com/assistant-ui/assistant-ui/pull/4176) [`27ae936`](https://github.com/assistant-ui/assistant-ui/commit/27ae936dec6dc5d05d21fd892af0a8e1db61928e) - feat: add the `ToolkitDeclaration` / `ToolkitDeclarationDefinition` types for authoring a toolkit permissively (a backend tool may declare `description`/`parameters`/`execute`); the canonical `Toolkit` keeps those fields erased. Author with `defineToolkit()` from `@assistant-ui/react`, which the `"use generative"` compiler strips per build. ([@Yonom](https://github.com/Yonom))

- [#4176](https://github.com/assistant-ui/assistant-ui/pull/4176) [`27ae936`](https://github.com/assistant-ui/assistant-ui/commit/27ae936dec6dc5d05d21fd892af0a8e1db61928e) - feat: move the `defineToolkit` and `hitl` use-generative markers from `@assistant-ui/next` into `@assistant-ui/core/react`, so they ship once from every distribution (`@assistant-ui/react`, `@assistant-ui/react-native`, `@assistant-ui/react-ink`) and stay portable across build targets. Import them from `@assistant-ui/react` instead of `@assistant-ui/next`; they remain no-op markers stripped at build time by a `"use generative"` compiler. ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`27ae936`](https://github.com/assistant-ui/assistant-ui/commit/27ae936dec6dc5d05d21fd892af0a8e1db61928e)]:
  - assistant-stream@0.3.19

## 0.2.8

### Patch Changes

- [#4172](https://github.com/assistant-ui/assistant-ui/pull/4172) [`1315789`](https://github.com/assistant-ui/assistant-ui/commit/13157895e4d69ad4266d6ab278edfc2e3ea1de92) - feat: add the `ToolkitDeclaration` / `ToolkitDeclarationDefinition` types for authoring a toolkit permissively (a backend tool may declare `description`/`parameters`/`execute`); the canonical `Toolkit` keeps those fields erased. Author with `defineToolkit()` from `@assistant-ui/next`, which the `"use generative"` compiler strips per build. ([@Yonom](https://github.com/Yonom))

- [#4151](https://github.com/assistant-ui/assistant-ui/pull/4151) [`299d448`](https://github.com/assistant-ui/assistant-ui/commit/299d4488c8a5bbec0679680866f5975055fe71b3) - chore: drop stale `biome-ignore` pragmas now that the repo lints with oxlint ([@okisdev](https://github.com/okisdev))

- [#4136](https://github.com/assistant-ui/assistant-ui/pull/4136) [`4429aa3`](https://github.com/assistant-ui/assistant-ui/commit/4429aa32f6bd4fd50a7a8ddbad1e19f6ccad192b) - centralize thread-level shared options forwarding across runtime wrapper hooks. follow-up to [#4135](https://github.com/assistant-ui/assistant-ui/issues/4135). ([@okisdev](https://github.com/okisdev))

  new public exports from `@assistant-ui/core` (re-exported from `@assistant-ui/react`):
  - `ExternalStoreSharedOptions`, a typed `Pick` over `ExternalStoreAdapter` covering the four thread-level optional fields every wrapper forwards: `isDisabled`, `isSendDisabled`, `unstable_capabilities`, `suggestions`.
  - `pickExternalStoreSharedOptions(options)`, plucks those four fields from a wider options object. the body uses `satisfies Required<...>` so adding a key to the type without copying it in the function is a compile error rather than a silent missing-field bug.
  - `useExternalStoreSharedOptions(options)` (from `@assistant-ui/core/react`), a memoized variant for wrappers that wrap their store in `useMemo`. lets the wrapper list a single stable `shared` reference as a dep instead of enumerating the four fields. same `satisfies` guard internally so the destructure stays in sync with the type.

  internal: every runtime wrapper hook (`useChatRuntime`, `useAISDKRuntime`, `useLangGraphRuntime`, `useA2ARuntime`, `useAgUiRuntime`, `useAdkRuntime`, `useStreamRuntime`, `useOpenCodeRuntime`) now uses these helpers instead of inlining the conditional spreads added in [#4135](https://github.com/assistant-ui/assistant-ui/issues/4135). each wrapper sheds 20 to 40 lines of duplicated declarations and conditional spreads; future additions to the shared option set propagate through a single edit in `pickExternalStoreSharedOptions` instead of touching every wrapper. no user-facing behavior change.

- [#4160](https://github.com/assistant-ui/assistant-ui/pull/4160) [`e76611f`](https://github.com/assistant-ui/assistant-ui/commit/e76611fcb80a39d7b6071d82bcfaf1bb7345110b) - feat: add `indicator` support to `MessagePrimitive.GroupedParts`. ([@Yonom](https://github.com/Yonom))

  Restores loading-state handling that was dropped from the grouped renderer. `GroupedParts` now emits a synthetic `{ part: { type: "indicator" } }` render call you handle with `case "indicator"` in your `switch (part.type)` — render a "thinking…" dot or any loading affordance.
  - The indicator is only ever emitted while the message is **running**, so its presence alone means "render loading UI here" — there's no `status` to branch on.
  - New `indicator` prop restricts which running states qualify: `"never"`, `"empty"` (no parts yet), `"no-text"` (default — last part isn't `text`/`reasoning`, e.g. the model ended on a tool call), or `"always"` (any running state).

- [#4161](https://github.com/assistant-ui/assistant-ui/pull/4161) [`76f7d16`](https://github.com/assistant-ui/assistant-ui/commit/76f7d161c2d802b72e07a12f67595f94c9ad7e4d) - perf: memoize the `RuntimeAdapterProvider` context value so adapter consumers no longer re-render on every parent render when `adapters` is stable. ([@Yonom](https://github.com/Yonom))

- [#4162](https://github.com/assistant-ui/assistant-ui/pull/4162) [`eef724e`](https://github.com/assistant-ui/assistant-ui/commit/eef724efe4a9075337577c626d7ea7aead45cfbe) - fix: drop phantom sibling messages when an external store swaps an optimistic message id mid-run ([#4037](https://github.com/assistant-ui/assistant-ui/issues/4037)). ([@Yonom](https://github.com/Yonom))

  Messages can now be flagged `metadata.isOptimistic`. Optimistic messages are treated as ephemeral: they only ever live on the current head branch (the repository evicts off-branch optimistic messages whenever the head moves) and they are never written to persisted state (`export()` omits them). The AI SDK v6 adapter flags the streaming assistant message as optimistic, so when its client-generated id is replaced by a server-provided one mid-run, the stale placeholder no longer lingers as a phantom branch (e.g. `BranchPicker` showing `2/2` on a turn the user never branched). Unlike the reverted blanket id-diff ([#4040](https://github.com/assistant-ui/assistant-ui/issues/4040)), only explicitly-optimistic messages are affected, so legitimate `onEdit` / `onReload` / `switchToBranch` branches are preserved.

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

- Updated dependencies [[`1315789`](https://github.com/assistant-ui/assistant-ui/commit/13157895e4d69ad4266d6ab278edfc2e3ea1de92), [`299d448`](https://github.com/assistant-ui/assistant-ui/commit/299d4488c8a5bbec0679680866f5975055fe71b3), [`2dec3ae`](https://github.com/assistant-ui/assistant-ui/commit/2dec3aeba0431178f4ca26e470b304f5a89390ba), [`fcb6baf`](https://github.com/assistant-ui/assistant-ui/commit/fcb6baf161a9ee7dda65191e0b42de12b368724d), [`c4d3eea`](https://github.com/assistant-ui/assistant-ui/commit/c4d3eeac6907a2fc15718f3c710d73d24eaeb652), [`331f2f7`](https://github.com/assistant-ui/assistant-ui/commit/331f2f7f432285fd0cdc14e0862b550e5d15769e)]:
  - assistant-stream@0.3.18
  - @assistant-ui/store@0.2.13
  - @assistant-ui/tap@0.5.14
  - assistant-cloud@0.1.30

## 0.2.7

### Patch Changes

- [#4121](https://github.com/assistant-ui/assistant-ui/pull/4121) [`7395092`](https://github.com/assistant-ui/assistant-ui/commit/73950929dbebadb275e3bdee23331f65f2635a33) - feat: detect and diagnose duplicate `@assistant-ui/core` installs ([@Yonom](https://github.com/Yonom))
  - In dev mode (`NODE_ENV !== "production"`), `@assistant-ui/core` now emits a single `console.warn` when it detects a second copy of itself loaded into the same JavaScript runtime. Mismatched transitive versions are a common source of subtle bugs (lost tool registrations, broken context lookups, failed `instanceof` checks — see issue [#4101](https://github.com/assistant-ui/assistant-ui/issues/4101)). The warning points users at `npx assistant-ui doctor`.
  - New `assistant-ui doctor` CLI command. It walks `node_modules` recursively (including nested copies), surfaces every duplicate version of any `@assistant-ui/*`, `assistant-stream` or `assistant-cloud` package, queries the npm registry for the latest versions and reports outdated installs. Use `--no-network` to skip the registry check.

- [#4118](https://github.com/assistant-ui/assistant-ui/pull/4118) [`a6e0653`](https://github.com/assistant-ui/assistant-ui/commit/a6e0653bad29fb93627646a77c3383000c57ee33) - feat(core): build a client-side tool-invocations pipeline directly into `useExternalStoreRuntime`. Tool-call parts in messages now fire `streamCall` / `execute` automatically for any external-store runtime that opts in. Opt in per-adapter via `unstable_enableToolInvocations: true` (off by default — most external-store runtimes either run tools server-side or already wire their own client-side dispatch path; double-firing is the risk). The `_store.isLoading` flag signals when initial history is loaded: snapshots observed while `isLoading === true` are treated as historical (no fire), matching the contract that callers like `importExternalState` already rely on. Six in-tree runtimes (`useAssistantTransportRuntime`, `useAISDKRuntime`, `useLangGraphRuntime`, `useStreamRuntime`, `useAgUiRuntime`, `useAdkRuntime`) are migrated to the embedded tracker; the standalone `useToolInvocations` React hook is removed. Adds `ExternalStoreAdapter.setToolStatuses` so adapters can mirror the tracker's per-tool-call status into local React state for converter metadata. Auto-aborts in-flight tool calls on new turns (`append()` with `startRun`, `startRun()`) so a tool that finishes after the user moves on can no longer feed a stale result into the next turn. ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`cabfc71`](https://github.com/assistant-ui/assistant-ui/commit/cabfc715e99f23a55dc1276a6028792d7ecad822)]:
  - @assistant-ui/tap@0.5.13
  - @assistant-ui/store@0.2.12

## 0.2.6

### Patch Changes

- [#4120](https://github.com/assistant-ui/assistant-ui/pull/4120) [`372d4f0`](https://github.com/assistant-ui/assistant-ui/commit/372d4f0c538a766fd9a849fef74e413dde86d74a) - feat: simplify `MessagePrimitive.GroupedParts` API and add `groupPartByType` helper. ([@Yonom](https://github.com/Yonom))
  - New `groupPartByType({ ... })` helper builds a `groupBy` from a `part.type → group-key path` lookup. The map keys are typed against `PartState["type"]` (autocomplete + typo rejection), missing keys leave the part ungrouped, and the returned function carries an internal memo fingerprint so the tree survives unrelated re-renders even when reconstructed inline.
  - Special map key `"mcp-app"` matches tool-call parts that point at an assistant-ui MCP app resource (`ui://...`). It takes precedence over the `"tool-call"` entry for those parts, so MCP apps can be routed separately (e.g. rendered outside a chain-of-thought wrapper).
  - `groupBy` signature simplified from `(part, index, parts) => string | string[] | null | undefined` to `(part) => readonly \`group-${string}\`[] | null`. The 2nd/3rd args were unused in practice. Arrays are required (no bare-string shorthand); `null`is accepted as an alias for`[]` to soften the migration.
  - Internal memoization now uses the helper's memo fingerprint when present, otherwise rebuilds the tree per render (O(n), cheap). The previous "pass a stable reference" advice is dropped — inline `groupBy` is fine.
  - Docs and examples updated to lead with `groupPartByType`. The `getMcpAppFromToolPart` branch in `packages/ui` switches to `"mcp-app": []` via the helper.

- [#4107](https://github.com/assistant-ui/assistant-ui/pull/4107) [`32ae846`](https://github.com/assistant-ui/assistant-ui/commit/32ae846a91b61eccd01330693868a48f2f3bb0c4) - feat: surface AI SDK v6 tool approvals as a first-class `respondToApproval` prop on tool components. tool-call parts in the `approval-requested` state now carry `part.approval = { id, isAutomatic? }`; tool components call `respondToApproval({ approved, reason? })` to ack the gate without threading `chatHelpers` through application context. also fixes a transient `requires-action` flicker for the `approval-responded` state and tightens the external-message converter so interrupt vs pending tool calls are distinguished by an actual `interrupt`/`approval` field rather than by `result === undefined`. ([@okisdev](https://github.com/okisdev))

- Updated dependencies [[`d4f1db4`](https://github.com/assistant-ui/assistant-ui/commit/d4f1db428b1a1fe5c122150e1e366a377e9adb5f)]:
  - assistant-stream@0.3.17

## 0.2.5

### Patch Changes

- [#3967](https://github.com/assistant-ui/assistant-ui/pull/3967) [`0a0c306`](https://github.com/assistant-ui/assistant-ui/commit/0a0c306286598ea885b046a1dfb85016f720051c) - feat(core, react): add `MessagePrimitive.GenerativeUI` primitive ([@samdickson22](https://github.com/samdickson22))

  A new first-class primitive for rendering agent-described React UI from a JSON
  spec, with a consumer-provided component allowlist as the security boundary.

  The agent emits a new `generative-ui` message part containing a tree of
  components by name; `MessagePrimitive.GenerativeUI` walks the spec and resolves
  each name against the registry you pass in. Unknown names throw a typed
  `GenerativeUIRenderError` (or invoke the optional `Fallback`). Composes with
  `MessagePrimitive.Parts` via the new `components.generativeUI` option, and
  supports streaming partial specs.

  ```tsx
  <MessagePrimitive.Parts
    components={{
      generativeUI: { components: { Card, Button } },
    }}
  />
  ```

- [#3651](https://github.com/assistant-ui/assistant-ui/pull/3651) [`6a0ecb2`](https://github.com/assistant-ui/assistant-ui/commit/6a0ecb2e49f24c5f066052018db5a9f1411dcc59) - feat(react-ink): add file storage adapter ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#4072](https://github.com/assistant-ui/assistant-ui/pull/4072) [`e4634a5`](https://github.com/assistant-ui/assistant-ui/commit/e4634a59b7a926d158e929d559326f243efe438b) - fix(core): replay the latched `initialize` thread event to late subscribers. `ensureInitialized` emits `initialize` once during construction, so a runtime seeded with non-empty `messages` (e.g. `useChatRuntime({ messages })` under `useRemoteThreadListRuntime`) fired it before the title binder's effect subscribed, and the `runEnd` → `generateTitle` wiring was never installed. `unstable_on("initialize", ...)` now schedules a one-off replay (on a microtask, re-checking the subscription) when the thread has already initialized, mirroring a BehaviorSubject, so late subscribers (the title binder, and `ThreadViewport`'s `thread.initialize` top-anchor reset) no longer miss it. ([@okisdev](https://github.com/okisdev))

- [#3867](https://github.com/assistant-ui/assistant-ui/pull/3867) [`325de4c`](https://github.com/assistant-ui/assistant-ui/commit/325de4c73b348d4c20dafa4a2ac6d436c69dbf28) - relax `thread-message-like` image validation to accept `https://` and `blob:` URLs (and `svg+xml` data URIs) alongside base64 `data:` URIs, so assistant-authored images served from a URL render. ([@samdickson22](https://github.com/samdickson22))

- [#4085](https://github.com/assistant-ui/assistant-ui/pull/4085) [`01244a5`](https://github.com/assistant-ui/assistant-ui/commit/01244a56026ee92bd4e49cb985136f9eb6d45154) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#4099](https://github.com/assistant-ui/assistant-ui/pull/4099) [`f2ec01c`](https://github.com/assistant-ui/assistant-ui/commit/f2ec01ce0f01317a8444b779d88f9b6a26d691c5) - feat(core, react): opt-out of auto-unarchive when switching threads ([@adityamohta](https://github.com/adityamohta))

  `switchToThread` (and `ThreadListItemRuntime.switchTo`) now accept an optional `{ unarchive?: boolean }` argument. The default remains `true`, preserving the existing behavior of auto-unarchiving an archived thread when it becomes the main thread. Pass `unarchive: false` to keep the thread archived after switching — useful when the UI lets users preview an archived conversation without restoring it.

  ```ts
  // existing behavior — archived thread becomes regular
  await threadList.switchToThread(threadId);

  // new — keep status as archived
  await threadList.switchToThread(threadId, { unarchive: false });

  // same option on the item runtime
  await threadListItem.switchTo({ unarchive: false });
  ```

- Updated dependencies [[`13a12c4`](https://github.com/assistant-ui/assistant-ui/commit/13a12c46c94f7e5e62af02692cf3479fff48bd02), [`01244a5`](https://github.com/assistant-ui/assistant-ui/commit/01244a56026ee92bd4e49cb985136f9eb6d45154), [`1e21076`](https://github.com/assistant-ui/assistant-ui/commit/1e2107648bc281f1673f4ad053fd019b28a602d0)]:
  - assistant-stream@0.3.16
  - assistant-cloud@0.1.29
  - @assistant-ui/store@0.2.12
  - @assistant-ui/tap@0.5.12

## 0.2.4

### Patch Changes

- [#4077](https://github.com/assistant-ui/assistant-ui/pull/4077) [`221d320`](https://github.com/assistant-ui/assistant-ui/commit/221d320cee987a4cd464c9cbae152d918197499e) - fix(core|MessageParts,GroupedParts): key part fibers by absolute part index ([@Yonom](https://github.com/Yonom))

  Inside `MessagePrimitive.GroupedParts` and the auto-grouped
  `toolGroup` / `reasoningGroup` ranges of `MessagePrimitive.Parts`,
  leaf fibers were keyed by their **structural position** in the
  group tree rather than by the underlying part's absolute index.
  When the parts list reshaped (e.g., a thread switch with a
  different group layout), React reused the same fiber at a given
  structural slot but with a different `index` prop, keeping the
  prior tap subscription alive against an index that may now point
  at a different part or be out of range — surfacing as
  `tapClientLookup: Index N out of bounds` or
  `MessagePartText can only be used inside text or reasoning message
parts`. Keying by part index instead causes React to unmount the
  fiber when the part underneath actually changes.

## 0.2.3

### Patch Changes

- [#4023](https://github.com/assistant-ui/assistant-ui/pull/4023) [`94548fa`](https://github.com/assistant-ui/assistant-ui/commit/94548fa8d587962d8ab0338a9609a9ff21240c33) - docs: add JSDoc for core runtime and assistant tool APIs ([@AVGVSTVS96](https://github.com/AVGVSTVS96))

- [#3513](https://github.com/assistant-ui/assistant-ui/pull/3513) [`8b6fc88`](https://github.com/assistant-ui/assistant-ui/commit/8b6fc8836871e62efc2fd8c131c6783e12c5fc47) - fix: guard `navigator.clipboard` availability and swallow write rejections in `ActionBarPrimitive.Copy`. Previously, copy clicks in SSR, non-HTTPS contexts, or older browsers without the Clipboard API threw a `ReferenceError`, and permission-denied rejections surfaced as unhandled promise rejections. The web copyToClipboard implementation in `@assistant-ui/react` now early-rejects when the API is unavailable, and `useActionBarCopy` in `@assistant-ui/core` silently absorbs the rejection so the rest of the UI is unaffected. ([@JustAnOkapi](https://github.com/JustAnOkapi))

- [#4057](https://github.com/assistant-ui/assistant-ui/pull/4057) [`179895f`](https://github.com/assistant-ui/assistant-ui/commit/179895fdcb56edee2e8d9efb4b38cd3859eeecdd) - fix(core): fire `streamCall` for already-resolved tool calls observed after the initial snapshot, and promote in-progress tool calls from the initial snapshot once they change. Previously the runtime silently skipped `streamCall` whenever a tool-call part arrived already-resolved (history reload, thread switch, mid-run resume, PTC sub-call surfacing), forcing fragile render-effect fallbacks. `execute` stays suppressed for these cases so side effects don't double-run. ([@Yonom](https://github.com/Yonom))

  Also collapses the per-tool-call ref soup inside `useToolInvocations` into a single discriminated `ToolCallEntry` map keyed by logical tool-call id, with execution-lifecycle bookkeeping tracked separately by physical stream id. Removes `ignoredToolIds`, `lastToolStates`, `toolCallIdAliasesRef` identity entries, the parallel `restoredSignaturesRef`/`preResolvedToolCallIdsRef`/`startedExecutionToolCallIdsRef` sets, and the early-return that suppressed `streamCall` for already-resolved tool calls. `reset()` semantics are unchanged; integrators that already call `reset()` on history reload don't need to change.

- [#3958](https://github.com/assistant-ui/assistant-ui/pull/3958) [`7a8bf26`](https://github.com/assistant-ui/assistant-ui/commit/7a8bf26eda76f5f8490f96b3ff9dce1ccd072917) - refactor: hoist `MessagePartPrimitiveInProgress` to `@assistant-ui/core/react` so `@assistant-ui/react`, `@assistant-ui/react-ink`, and other distributions can share the same implementation. `@assistant-ui/react`'s `MessagePartPrimitive.InProgress` is unchanged for callers; it now re-exports from core. ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#3636](https://github.com/assistant-ui/assistant-ui/pull/3636) [`3b2bbce`](https://github.com/assistant-ui/assistant-ui/commit/3b2bbce1589b44a13b8b7a570c19bf35a2266fbd) - feat(core): expose modelName and toolNames in ModelContextState ([@ShobhitPatra](https://github.com/ShobhitPatra))

- Updated dependencies [[`845c7c1`](https://github.com/assistant-ui/assistant-ui/commit/845c7c12fecbb448da7f1135c33163b653a50710), [`db721df`](https://github.com/assistant-ui/assistant-ui/commit/db721df32434296ac14eab27030628107975b71c), [`94548fa`](https://github.com/assistant-ui/assistant-ui/commit/94548fa8d587962d8ab0338a9609a9ff21240c33), [`94548fa`](https://github.com/assistant-ui/assistant-ui/commit/94548fa8d587962d8ab0338a9609a9ff21240c33)]:
  - assistant-cloud@0.1.28
  - @assistant-ui/store@0.2.11
  - assistant-stream@0.3.15
  - @assistant-ui/tap@0.5.11

## 0.2.2

### Patch Changes

- [#4024](https://github.com/assistant-ui/assistant-ui/pull/4024) [`19d4d94`](https://github.com/assistant-ui/assistant-ui/commit/19d4d9412234628ae850b4b04da594201022a398) - feat: add native MCP Apps renderer — `McpAppRenderer` composes into `Tools` to render MCP UI resources inline in chat over a JSON-RPC postMessage bridge on `SafeContentFrame`. Adds an `mcp` field to `ToolCallMessagePart` and forwards `callProviderMetadata.mcp.app` through the AI SDK message converter. ([@Yonom](https://github.com/Yonom))

## 0.2.1

### Patch Changes

- [#3984](https://github.com/assistant-ui/assistant-ui/pull/3984) [`35d0146`](https://github.com/assistant-ui/assistant-ui/commit/35d014628a69b0003799666895c2552b46ac7198) - feat(composer): expose `canSend` state and `isSendDisabled` adapter input ([@okisdev](https://github.com/okisdev))

  `ComposerState.canSend` (read-only) is now derivable via `useAuiState((s) => s.composer.canSend)` and `<AuiIf condition={(s) => s.composer.canSend}/>`. it reflects whether the composer is in a state where send is permitted; cross-thread gating (`isRunning`, `capabilities.queue`) continues to be layered on top by `useComposerSend`.

  `ExternalStoreAdapter.isSendDisabled` is a new optional input alongside `isDisabled`. when `true`, the thread composer's input remains usable but `send()` becomes a no-op and `canSend` is `false`. use this to gate sending on external React state (e.g. while tool config is loading) without disabling the input itself. edit composers (saving in-progress message edits) intentionally ignore this flag, since it is a thread-scoped gate.

  `BaseComposerRuntimeCore.send()` now early-returns when `!canSend`, so the `Cmd/Ctrl+Shift+Enter` steer hotkey, form-`requestSubmit()`, and direct `aui.composer().send()` calls are all gated by the same flag. the same gating is wired through the tap-based `ExternalThread` client via a new `isSendDisabled` prop on `ExternalThreadProps`.

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

- [#3972](https://github.com/assistant-ui/assistant-ui/pull/3972) [`c9dd16c`](https://github.com/assistant-ui/assistant-ui/commit/c9dd16c4b1edc52f6a2529a9a07ebb7964aee9a1) - fix: `useExternalStoreRuntime` no longer crashes with "Entry not available in the store" when the adapter sets `threadId` to a value that isn't present in `threads`/`archivedThreads`. The runtime now synthesizes a regular thread item for `mainThreadId`, so thin adapters (e.g. `useAgUiRuntime`) that only expose `threadId` resolve correctly on first render and after switching threads. Closes [#3971](https://github.com/assistant-ui/assistant-ui/issues/3971). ([@okisdev](https://github.com/okisdev))

- [#3674](https://github.com/assistant-ui/assistant-ui/pull/3674) [`dea8bc7`](https://github.com/assistant-ui/assistant-ui/commit/dea8bc7e122ad6ff53e48e6b0ffc6fcc2abaadd3) - fix(core): guard MessagePrimitive.Attachments against missing user message attachments ([@cewinharhar](https://github.com/cewinharhar))

- [#3634](https://github.com/assistant-ui/assistant-ui/pull/3634) [`9c3d24d`](https://github.com/assistant-ui/assistant-ui/commit/9c3d24d8a358bcf5f683f85473b82524ea018930) - Support AI SDK `source-document` parts by preserving them as assistant-ui ([@sicko7947](https://github.com/sicko7947))
  document source message parts across conversion and cloud serialization,
  including the legacy React cloud encoder.
- Updated dependencies [[`9ecda1d`](https://github.com/assistant-ui/assistant-ui/commit/9ecda1dfdd96f2c638e7b51cc951319ccacd06c9), [`fa4510a`](https://github.com/assistant-ui/assistant-ui/commit/fa4510a3f3a23e0458ce8f3a397c352e3b0cde07)]:
  - assistant-stream@0.3.14

## 0.2.0

### Minor Changes

- [#3970](https://github.com/assistant-ui/assistant-ui/pull/3970) [`040d469`](https://github.com/assistant-ui/assistant-ui/commit/040d469acfcf782de6fc188c646dfd8732d27088) - chore: drop APIs deprecated in v0.11/v0.12 ([@Yonom](https://github.com/Yonom))

  See the [v0.14 migration guide](https://assistant-ui.com/docs/migrations/v0-14) for the full removal list and replacements.
  - `useAssistantApi` / `useAssistantState` / `useAssistantEvent` / `AssistantIf` removed (use `useAui` / `useAuiState` / `useAuiEvent` / `AuiIf`).
  - `getExternalStoreMessage` (singular) removed (use `getExternalStoreMessages`).
  - `MessageState.submittedFeedback` removed (use `message.metadata.submittedFeedback`).
  - `ThreadRuntime.startRun(parentId)` positional overload removed (pass `{ parentId }`).
  - `ThreadRuntime.unstable_loadExternalState` removed (use `importExternalState`).
  - `ThreadRuntime.unstable_resumeRun` removed (use `resumeRun`).
  - `ThreadRuntime.getModelConfig` removed (use `getModelContext`).
  - `AssistantRuntime.threadList` / `switchToNewThread` / `switchToThread` / `registerModelConfigProvider` / `reset` removed (use `threads` / `threads.switchToNewThread` / `threads.switchToThread` / `registerModelContextProvider` / `thread.reset`).
  - `ChatModelRunOptions.config` removed (use `context`).
  - `useLocalThreadRuntime` alias removed (use `useLocalRuntime`).
  - `unstable_useRemoteThreadListRuntime` / `unstable_useCloudThreadListAdapter` / `unstable_RemoteThreadListAdapter` / `unstable_InMemoryThreadListAdapter` aliases removed (drop the `unstable_` prefix).
  - `react-langgraph` `onSwitchToThread` removed (use `load`).
  - `toAISDKTools` / `getEnabledTools` removed (use `toToolsJSONSchema` from `assistant-stream`).

## 0.1.18

### Patch Changes

- [#3953](https://github.com/assistant-ui/assistant-ui/pull/3953) [`7098bab`](https://github.com/assistant-ui/assistant-ui/commit/7098bab4c67fbd507c3fad746ef130daa01b3fd6) - Add cursor-based pagination to the thread list. `RemoteThreadListAdapter.list()` accepts an optional `{ after }` cursor and may return `nextCursor` on the response. The runtime exposes `loadMore()`, `hasMore`, and `isLoadingMore` through both the legacy `ThreadListRuntime` API and the tap-only `aui.threads()` path; `ThreadListRuntimeCore.loadMore?()`, `hasMore?`, and `isLoadingMore?` are optional, so non-paginating cores (local, external-store, single-thread, in-memory) remain conformant. ([@okisdev](https://github.com/okisdev))

  `@assistant-ui/react` ships a matching `ThreadListPrimitive.LoadMore` button built on `createActionButton`, plus a `useThreadListLoadMore` primitive hook. Consumers wanting an `IntersectionObserver` sentinel can read `s.threads.hasMore` / `isLoadingMore` from `useAuiState` and call `aui.threads().loadMore()` directly.

  In-flight `loadMore()` calls dedup via a single promise. The existing `_loadGeneration` counter drops stale append callbacks when a `reload()` interleaves a `loadMore()`. The loadMore reducer captures the active adapter so a mid-flight adapter swap cannot leak a stale page. Empty-string `nextCursor` is normalised to `undefined`. `reload()` pre-clears the cursor so consumers reading `hasMore` directly during a reload do not observe a stale value.

  Adapter rejections are surfaced via `console.error` in both the initial-load and `loadMore` paths, matching the pattern in `RemoteThreadListHookInstanceManager` and `useToolInvocations`.

- [#3962](https://github.com/assistant-ui/assistant-ui/pull/3962) [`b090acb`](https://github.com/assistant-ui/assistant-ui/commit/b090acb98f6bf3579aab4efedddaff83a0b54c94) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`b090acb`](https://github.com/assistant-ui/assistant-ui/commit/b090acb98f6bf3579aab4efedddaff83a0b54c94), [`5fdf17e`](https://github.com/assistant-ui/assistant-ui/commit/5fdf17e019c91b000c6f4cf9e3e56c89d764a435)]:
  - assistant-stream@0.3.13
  - @assistant-ui/store@0.2.10
  - @assistant-ui/tap@0.5.11
  - assistant-cloud@0.1.27

## 0.1.17

### Patch Changes

- [#3916](https://github.com/assistant-ui/assistant-ui/pull/3916) [`0bbf5dd`](https://github.com/assistant-ui/assistant-ui/commit/0bbf5dd7357c0993958a2e8e55eb60705eca3207) - chore: drop `./*` wildcard export and surface internal attachment status types ([@Yonom](https://github.com/Yonom))

  The `./*` wildcard in `exports` was exposing the entire dist tree as importable subpaths, which inadvertently leaked internal modules (e.g. `@assistant-ui/core/tests/*`, `@assistant-ui/core/types/*`) as public API. Removing it.

  Two attachment status types that were previously only reachable through the wildcard (`PendingAttachmentStatus`, `CompleteAttachmentStatus`) are now re-exported from the package root so that consumers' inferred types remain portable.

- [#3917](https://github.com/assistant-ui/assistant-ui/pull/3917) [`98f165c`](https://github.com/assistant-ui/assistant-ui/commit/98f165ca83c4df9b9133eb4ce4fdf8c7a06886bb) - feat: enrich `composer.attachmentAddError` event with typed payload ([@okisdev](https://github.com/okisdev))

  The event now carries `{ reason, message, attachmentId?, error? }` so subscribers can branch on the failure mode (`no-adapter` / `not-accepted` / `adapter-error`). The bridge no longer relies on a `findLast` heuristic to recover the failed attachment id.

  Several state-derivable events are now annotated `@deprecated` because they duplicate state observation: `composer.send`, `composer.attachmentAdd`, `thread.runStart`, `thread.runEnd`, `thread.initialize`, `threadListItem.switchedTo`, `threadListItem.switchedAway`. They continue to fire for backward compatibility; new code should observe state via `useAuiState` instead.

- [#3914](https://github.com/assistant-ui/assistant-ui/pull/3914) [`62ec5bd`](https://github.com/assistant-ui/assistant-ui/commit/62ec5bd3368fb69ea7bcde275858e0ea8fa1d59b) - fix: add typesVersions to support moduleResolution: node ([@shashank-100](https://github.com/shashank-100))

  Users with `moduleResolution: node` in their tsconfig were seeing `Property 'message' does not exist on type 'AssistantState'` because the `exports` map sub-paths (e.g. `@assistant-ui/core/react`) are ignored by legacy node module resolution. Adding `typesVersions` makes TypeScript resolve sub-path types correctly under all moduleResolution modes.

- [#3853](https://github.com/assistant-ui/assistant-ui/pull/3853) [`6a919c1`](https://github.com/assistant-ui/assistant-ui/commit/6a919c1fa21113080f46dd0e08142c939dad3ea4) - feat: add `<MessagePrimitive.GroupedParts>` for hierarchical adjacent grouping of message parts ([@Yonom](https://github.com/Yonom))

  Introduces a new primitive that coalesces adjacent parts into groups via a user-supplied `groupBy(part) → "group-…" | readonly "group-…"[] | null`. Adjacent parts sharing a key-path prefix coalesce up to that prefix; ungrouped parts render as direct leaves.

  The render function takes `{ part, children }` and dispatches on a single `switch (part.type)`. `"group-…"` cases wrap `children` (the recursively-rendered subtree); real part types (`"text"`, `"tool-call"`, `"reasoning"`, …) render the part directly with the same `EnrichedPartState` enrichments (`toolUI`, `addResult`, `resume`, `dataRendererUI`) that `<MessagePrimitive.Parts>` provides.

  `GroupPart` is intentionally minimal: `{ type, status, indices }`. The render function is invoked once per group node and once per individual leaf part, so users never have to nest a `<MessagePrimitive.Parts>` call.

  The `groupBy` return type is constrained to `` `group-${string}` `` so the unified switch can never collide with a real part type. The component infers a literal `TKey` per call site, so `part.type` narrows to the exact union of group keys plus part types.

  For leaf parts, `children` is a sentinel that throws if rendered — accidental fall-through like `default: return children;` errors loudly instead of silently rendering nothing. Returning `null` from a leaf case is fine.

  Deprecates the legacy `components.ToolGroup`, `components.ReasoningGroup`, and `components.ChainOfThought` props on `<Parts>`, and `<MessagePrimitive.Unstable_PartsGrouped>` for adjacent grouping — all still work for backwards compatibility.

## 0.1.16

### Patch Changes

- [#3895](https://github.com/assistant-ui/assistant-ui/pull/3895) [`549037a`](https://github.com/assistant-ui/assistant-ui/commit/549037ac77aed8736823cfb82baf9645e3364adf) - fix(core): emit attachmentAddError when no adapter is configured or file type is rejected ([@okisdev](https://github.com/okisdev))

- [#3896](https://github.com/assistant-ui/assistant-ui/pull/3896) [`976aec5`](https://github.com/assistant-ui/assistant-ui/commit/976aec566330bee3c607cfb356f3358eefe28ac1) - fix(core): respect `adapter.accept` when adding external `CreateAttachment` ([@okisdev](https://github.com/okisdev))

  `composer.addAttachment` previously bypassed the configured `AttachmentAdapter` for `CreateAttachment` descriptors, including the `adapter.accept` content-type check. It now validates the descriptor's `contentType` (or filename extension) against `adapter.accept` when an adapter is configured, throwing and emitting `composer.attachmentAddError` on mismatch. Without an adapter, external attachments are still added as-is, preserving the existing "no adapter required" guarantee for external sources.

- [#3716](https://github.com/assistant-ui/assistant-ui/pull/3716) [`25b97d5`](https://github.com/assistant-ui/assistant-ui/commit/25b97d5c62fb038471b06eaa784ad4b7e23ef533) - fix(core): show loading state for empty parts children API ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#3891](https://github.com/assistant-ui/assistant-ui/pull/3891) [`2008fc9`](https://github.com/assistant-ui/assistant-ui/commit/2008fc9af3d6fe05604d6b08275c2e9cec099bd9) - fix(core): hoist remote thread runtime binder out of `unstable_Provider` ([@okisdev](https://github.com/okisdev))

  `RemoteThreadListAdapter.unstable_Provider` is now allowed to render any subtree it likes; the runtime binding (composer state, `__internal_setGetInitializePromise`, `runEnd → generateTitle` listener) executes outside it. This fixes `EMPTY_THREAD_ERROR` when the Provider defers `children` (e.g. behind a history-loading state) and avoids the history-switch regression seen when only the binder, but not the init listeners, were hoisted. Adds a dev-mode warning when the Provider does not render `children` within ~100ms.

- [#3889](https://github.com/assistant-ui/assistant-ui/pull/3889) [`88fcd35`](https://github.com/assistant-ui/assistant-ui/commit/88fcd352ecffd12f124abe988cc5499f784f81d6) - feat: add `custom` slot to `RemoteThreadMetadata` and `ThreadListItemState` ([@okisdev](https://github.com/okisdev))

  allows adapter authors to carry arbitrary backend session data through `list()` / `fetch()` and surface it on the thread list item state. matches the existing `custom: Record<string, unknown>` convention used on `ThreadMessage`, `RunConfig`, and `ChatModelRunResult`. consumers can intersect a typed shape at their own boundary, e.g. `RemoteThreadMetadata & { custom: { workspaceId: string } }`.

- Updated dependencies [[`005f83f`](https://github.com/assistant-ui/assistant-ui/commit/005f83f3ebfb94b3a9d7c34bc7d2a71bbaf63a9e)]:
  - @assistant-ui/store@0.2.9
  - @assistant-ui/tap@0.5.10

## 0.1.15

### Patch Changes

- [#3857](https://github.com/assistant-ui/assistant-ui/pull/3857) [`c7a274e`](https://github.com/assistant-ui/assistant-ui/commit/c7a274e968f8e081ded4c29cc37986392f04130e) - fix(core): edit composer no longer re-injects original file parts when user message attachments are modified. Non-text content parts on user messages are lifted into `_attachments` so attachment removals take effect and files aren't duplicated on resend; non-user messages keep the existing content pass-through. ([@okisdev](https://github.com/okisdev))

- [#3876](https://github.com/assistant-ui/assistant-ui/pull/3876) [`ce865bc`](https://github.com/assistant-ui/assistant-ui/commit/ce865bc46af996d53f89e18068139d4d38546ca6) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#3796](https://github.com/assistant-ui/assistant-ui/pull/3796) [`ca8f526`](https://github.com/assistant-ui/assistant-ui/commit/ca8f526944968036d47849a7659353765072a836) - feat(react-langgraph): add uiComponents option for static and dynamic data renderers ([@ShobhitPatra](https://github.com/ShobhitPatra))

  Add `uiComponents` option to `useLangGraphRuntime` for registering static data renderers by name and a `fallback` renderer for dynamic loading (e.g. LangSmith's `LoadExternalComponent`), directly from the runtime hook.

  Core `DataRenderers` scope also gains a `fallbacks` stack (plus `setFallbackDataUI` method) that the adapter registers into; resolution is `renderers[name][0]` → `fallbacks[0]` → inline `Fallback`.

- [#3873](https://github.com/assistant-ui/assistant-ui/pull/3873) [`c56f98f`](https://github.com/assistant-ui/assistant-ui/commit/c56f98f5759e710281fc57b343b41af102914f1a) - feat(core): add `reload()` method on `ThreadListRuntime` and `aui.threads()` that re-invokes the remote adapter's `list()` and refreshes the thread list. Use this after asynchronous auth (e.g. OIDC, better-auth) completes to recover from an initial load that ran before the authenticated user was available. A generation counter ensures a mid-flight response from a superseded load cannot overwrite a newer reload's state. ([@okisdev](https://github.com/okisdev))

- [#3855](https://github.com/assistant-ui/assistant-ui/pull/3855) [`974d15e`](https://github.com/assistant-ui/assistant-ui/commit/974d15e34675cc5a611f0297904f5cb2c1b3da8c) - fix: `useExternalStoreRuntime` now correctly initializes `mainThreadId`, `threadIds`, and `archivedThreadIds` from the adapter on first render. Previously they stayed at `DEFAULT_THREAD_ID` until the user switched threads, so `isMain` was `false` on initial load. Closes [#2577](https://github.com/assistant-ui/assistant-ui/issues/2577). ([@okisdev](https://github.com/okisdev))

- [#3859](https://github.com/assistant-ui/assistant-ui/pull/3859) [`4b19d42`](https://github.com/assistant-ui/assistant-ui/commit/4b19d42970cb98cee6ea69e2c26dc22763091568) - fix(core): `switchToThread` could duplicate a thread or leave it in both `threadIds` and `archivedThreadIds` when it raced with `list()`. Both arrays are now filtered before the status-keyed append, matching the `updateStatusReducer` pattern. ([@bilaltahseen](https://github.com/bilaltahseen))

- [#3858](https://github.com/assistant-ui/assistant-ui/pull/3858) [`da0f598`](https://github.com/assistant-ui/assistant-ui/commit/da0f59818085c7b97d157da1260c5e20873c32c1) - fix: `useAISDKRuntime` now throws when the supplied `ThreadHistoryAdapter` omits `withFormat`, instead of silently dropping all history load/append/update calls. The optional-call chain `historyAdapter.withFormat?.(…).load()` previously short-circuited to `undefined`. The `withFormat`-wrapped adapter is now memoized, and the persist effect short-circuits when no adapter is supplied (avoiding a redundant thread subscription). `ThreadHistoryAdapter.withFormat` gains a JSDoc note clarifying that it is required on the AI SDK path. ([@okisdev](https://github.com/okisdev))

- [#3831](https://github.com/assistant-ui/assistant-ui/pull/3831) [`d53ff4f`](https://github.com/assistant-ui/assistant-ui/commit/d53ff4f3f8b7d7220c1cb274c4fda335598fb063) - chore: remove decorative separator comments across packages ([@okisdev](https://github.com/okisdev))

- [#3872](https://github.com/assistant-ui/assistant-ui/pull/3872) [`20f8404`](https://github.com/assistant-ui/assistant-ui/commit/20f8404b70098e4b7cbc8df5bbb47985ac81b52c) - feat(core): let runtimes provide an explicit `isRunning` that overrides the last-message-status heuristic. `ExternalStoreAdapter.isRunning` now flows through to `thread.isRunning` directly, so applications can keep the thread in a running state even after the last assistant message has completed (e.g. while non-message stream chunks like suggestions, step-finish, or metadata updates are still arriving). When a runtime does not provide `isRunning`, the previous last-message-based behavior is preserved. ([@okisdev](https://github.com/okisdev))

- [#3834](https://github.com/assistant-ui/assistant-ui/pull/3834) [`17958c9`](https://github.com/assistant-ui/assistant-ui/commit/17958c9234ccc42394260125df54d897c06a47fd) - refactor: unify mention/slash under behavior sub-primitives; delete Mention/SlashCommand aliases and the `execute` field on `Unstable_TriggerItem`; split TriggerPopoverResource; rename react-lexical `MentionNode`/`MentionPlugin`/`MentionChipProvider`/`mentionChip` prop to `DirectiveNode`/`DirectivePlugin`/`DirectiveChipProvider`/`directiveChip`; fix IME/Unicode/copy-paste/undo bugs. Breaking (`Unstable_` APIs): replace `onSelect={{type:"insertDirective",formatter}}` with `<Unstable_TriggerPopover.Directive formatter={...}>`; replace `onSelect={{type:"action",handler}}` with `<Unstable_TriggerPopover.Action onExecute={...}>`. Rename `unstable_useToolMentionAdapter` → `unstable_useMentionAdapter` with new `items`/`categories`/`includeModelContextTools` options. `unstable_useSlashCommandAdapter` now returns `{ adapter, action }` — `execute` stays in the hook closure instead of on the item. Rename CSS class `aui-mention-chip` → `aui-directive-chip` and attributes `data-mention-*` → `data-directive-*`. ([@okisdev](https://github.com/okisdev))

- Updated dependencies [[`ce865bc`](https://github.com/assistant-ui/assistant-ui/commit/ce865bc46af996d53f89e18068139d4d38546ca6), [`055dda5`](https://github.com/assistant-ui/assistant-ui/commit/055dda54b68031d0c9c760bf89a7c1036dd2174d), [`d53ff4f`](https://github.com/assistant-ui/assistant-ui/commit/d53ff4f3f8b7d7220c1cb274c4fda335598fb063)]:
  - assistant-stream@0.3.12
  - assistant-cloud@0.1.27
  - @assistant-ui/store@0.2.8
  - @assistant-ui/tap@0.5.9

## 0.1.14

### Patch Changes

- f20b9ca: feat: add ExportedMessageRepository.fromBranchableArray() for constructing branching message trees from ThreadMessageLike messages
- c988db8: chore: update dependencies
- Updated dependencies [c988db8]
  - assistant-stream@0.3.11
  - assistant-cloud@0.1.26
  - @assistant-ui/store@0.2.7
  - @assistant-ui/tap@0.5.8

## 0.1.13

### Patch Changes

- 42bc640: feat: support edit lineage and startRun in EditComposer send flow
  - Add `SendOptions` with `startRun` flag to `composer.send()`
  - Expose `parentId` and `sourceId` on `EditComposerState`
  - Add `EditComposerRuntimeCore` interface extending `ComposerRuntimeCore`
  - Bypass text-unchanged guard when `startRun` is explicitly set
  - `ComposerSendOptions` extends `SendOptions` for consistent layering

- 87e7761: feat: generalize mention system into trigger popover architecture with slash command support
  - Introduce `ComposerInputPlugin` protocol to decouple ComposerInput from mention-specific code
  - Extract generic `TriggerPopoverResource` from `MentionResource` supporting multiple trigger characters
  - Add `Unstable_TriggerItem`, `Unstable_TriggerCategory`, `Unstable_TriggerAdapter` generic types
  - Add `Unstable_SlashCommandAdapter`, `Unstable_SlashCommandItem` types
  - Add `ComposerPrimitive.Unstable_TriggerPopoverRoot` and related primitives
  - Add `ComposerPrimitive.Unstable_SlashCommandRoot` and related primitives
  - Add `unstable_useSlashCommandAdapter` hook for building slash command adapters
  - Refactor `MentionResource` as thin wrapper around `TriggerPopoverResource`
  - Alias `Unstable_MentionItem`/`Unstable_MentionAdapter` to generic trigger types
  - Update `react-lexical` `KeyboardPlugin` to use plugin protocol
  - All existing `Unstable_Mention*` APIs remain unchanged

- Updated dependencies [376bb00]
  - assistant-cloud@0.1.25
  - @assistant-ui/tap@0.5.7
  - @assistant-ui/store@0.2.6

## 0.1.12

### Patch Changes

- 19b1024: fix(core): move initialThreadId/threadId handling from constructor to \_\_internal_load to prevent SSR crash

## 0.1.11

### Patch Changes

- de29641: fix(core): start RemoteThreadList isLoading as true
- a8bf84b: feat(core): expose `getLoadThreadsPromise()` on `ThreadListRuntime` public API
- 5fd5c3d: feat(core): add reactive `threadId` option to `useRemoteThreadListRuntime` for URL-based routing
- ec50e8a: fix(core): prevent resolved history tool calls from re-executing
- Updated dependencies [2c5cd97]
  - assistant-stream@0.3.10

## 0.1.10

### Patch Changes

- 6554892: feat: add useAssistantContext for dynamic context injection

  Register a callback-based context provider that injects computed text into the system prompt at evaluation time, ensuring the prompt always reflects current application state.

- 9103282: fix: resolve biome lint warnings (optional chaining, unused suppressions)
- 876f75d: feat: add interactable state persistence

  Add persistence API to interactables with exportState/importState, debounced setPersistenceAdapter, per-id isPending/error tracking, flush() for immediate sync, and auto-flush on component unregister.

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
- Updated dependencies [9103282]
- Updated dependencies [bdce66f]
- Updated dependencies [209ae81]
- Updated dependencies [2dd0c9f]
  - assistant-stream@0.3.9
  - assistant-cloud@0.1.24
  - @assistant-ui/store@0.2.6
  - @assistant-ui/tap@0.5.6

## 0.1.9

### Patch Changes

- 781f28d: feat: accept all file types and validate against adapter's accept constraint
- 3227e71: feat: add interactables with partial updates, multi-instance, and selection
  - `useInteractable(name, config)` hook and `makeInteractable` factory for registering AI-controllable UI
  - `Interactables()` scope resource with auto-generated update tools and system prompt injection
  - Partial updates — auto-generated tools use partial schemas so AI only sends changed fields
  - Multi-instance support — same name with different IDs get separate `update_{name}_{id}` tools
  - Selection — `setSelected(true)` marks an interactable as focused, surfaced as `(SELECTED)` in system prompt

- 0f55ce8: fix(core): hide phantom empty bubble when user message has no text content
- 83a15f7: feat(core): stream interactable state updates as tool args arrive
- 52403c3: chore: update dependencies
- ffa3a0f: feat(core): add attachmentAddError composer event
- Updated dependencies [3227e71]
- Updated dependencies [52403c3]
  - assistant-stream@0.3.8
  - assistant-cloud@0.1.23
  - @assistant-ui/store@0.2.5
  - @assistant-ui/tap@0.5.5

## 0.1.8

### Patch Changes

- 1406aed: fix(core): prevent stale list() response from undoing concurrent delete/archive/unarchive in OptimisticState
- 9480f30: fix(core): stop thread runtime on delete to prevent store crash
- 28a987a: feat: SingleThreadList resource
  refactor: attachTransformScopes should mutate the scopes instead of cloning it
- 736344c: chore: update dependencies
- ff3be2a: Add @-mention system with cursor-aware trigger detection, keyboard navigation, search, and Lexical rich editor support
- 70b19f3: feat: add native queue and steer support
  - Add `queue` adapter to `ExternalThreadProps` for runtimes that support message queuing
  - Add `QueueItemPrimitive.Text`, `.Steer`, `.Remove` primitives for rendering queue items
  - Add `ComposerPrimitive.Queue` for rendering the queue list within the composer
  - Add `ComposerSendOptions` with `steer` flag to `composer.send()`
  - Add `capabilities.queue` to `RuntimeCapabilities`
  - `ComposerPrimitive.Send` stays enabled during runs when queue is supported
  - Cmd/Ctrl+Shift+Enter hotkey sends with `steer: true` (interrupt current run)
  - Add `queueItem` scope to `ScopeRegistry`
  - Add `queue` field to `ComposerState` and `queueItem()` method to `ComposerMethods`

- Updated dependencies [28a987a]
- Updated dependencies [736344c]
- Updated dependencies [c71cb58]
  - @assistant-ui/store@0.2.4
  - assistant-stream@0.3.7
  - @assistant-ui/tap@0.5.4

## 0.1.7

### Patch Changes

- 7ecc497: feat: children API for primitives with part.toolUI, part.dataRendererUI, and MessagePrimitive.Quote

## 0.1.6

### Patch Changes

- 1ed9867: feat: move resumeRun to stable
- 427ffaa: refactor: drop all barrel files
- 349f3c7: chore: update deps
- 02614aa: feat: add multi-agent support
  - `ReadonlyThreadProvider` and `MessagePartPrimitive.Messages` for rendering sub-agent messages
  - `assistant-stream`: add `messages` field to `tool-result` chunks, `ToolResponseLike`, and `ToolCallPart` types, enabling sub-agent messages to flow through the streaming protocol

- 6cc4122: refactor: use primitive hooks
- 642bcda: Add `quote.tsx` registry components and `injectQuoteContext` helper
- Updated dependencies [427ffaa]
- Updated dependencies [349f3c7]
- Updated dependencies [02614aa]
  - assistant-stream@0.3.6
  - assistant-cloud@0.1.22
  - @assistant-ui/store@0.2.3
  - @assistant-ui/tap@0.5.3

## 0.1.5

### Patch Changes

- 990e41d: refactor: code sharing between the multiple platforms

## 0.1.4

### Patch Changes

- f032ea5: fix: restore `typeof process` runtime guard in useCloudThreadListAdapter
- Updated dependencies [2828b67]
  - assistant-stream@0.3.5

## 0.1.3

### Patch Changes

- 5ae74fe: fix: prevent double-submit when ComposerPrimitive.Send child has type="submit"
- 8ed9d6f: Refactor React Native component API: move shared runtime logic (remote thread list, external store, cloud adapters, message converter, tool invocations) into @assistant-ui/core for reuse across React and React Native
- 01bee2b: Remove zod dependency by using assistant-stream's toJSONSchema utility for schema serialization in AssistantFrameProvider

## 0.1.2

### Patch Changes

- 03714af: fix: DataRenderers not in scope

## 0.1.1

### Patch Changes

- a638f05: refactor(core): depend on @assistant-ui/store, register chat scopes via module augmentation
- 28f39fe: Support custom content types via `data-*` prefix in ThreadMessageLike (auto-converted to DataMessagePart), widen `BaseAttachment.type` to accept custom strings, make `contentType` optional
- 36ef3a2: chore: update dependencies
- 6692226: feat: support external source attachments in composer

  `addAttachment()` now accepts either a `File` or a `CreateAttachment` descriptor, allowing users to add attachments from external sources (URLs, API data, CMS references) without creating dummy `File` objects or requiring an `AttachmentAdapter`.

- c31c0fa: Extract shared React code (model-context, client, types, providers, RuntimeAdapter) into `@assistant-ui/core/react` sub-path so both `@assistant-ui/react` and `@assistant-ui/react-native` re-export from one source.
- fc98475: feat(core): move `@assistant-ui/tap` to peerDependencies to fix npm deduplication
- 374f83a: fix(core): stabilize object references in ExternalStoreThreadRuntimeCore to prevent infinite re-render loop
- 1672be8: feat: bindExternalStoreMessage
- 14769af: refactor: move RuntimeAdapter base logic to @assistant-ui/core; re-export missing core APIs from distribution packages
- Updated dependencies [36ef3a2]
- Updated dependencies [fc98475]
- Updated dependencies [a638f05]
  - assistant-stream@0.3.4
  - @assistant-ui/store@0.2.1
  - @assistant-ui/tap@0.5.1

## 0.1.0

### Minor Changes

- 60bbe53: feat(core): ready for release

### Patch Changes

- 546c053: feat(core): extract subscribable, utils, and model-context; add public/internal API split
- a7039e3: feat(core): extract remote-thread-list and assistant-transport utilities to @assistant-ui/core
- 16c10fd: feat(core): extract runtime and adapters to @assistant-ui/core
- 40a67b6: feat(core): add message, attachment, and utility type definitions
- b181803: feat(core): introduce @assistant-ui/core package

  Extract framework-agnostic core from @assistant-ui/react. Replace React ComponentType references with framework-agnostic types and decouple AssistantToolProps/AssistantInstructionsConfig from React hook files.

- 4d7f712: feat(core): move runtime-to-client bridge to core/store for framework reuse
- ecc29ec: feat(core): move scope types and client implementations to @assistant-ui/core/store
- 6e97999: feat(core): move store tap infrastructure to @assistant-ui/core/store
- Updated dependencies [b65428e]
- Updated dependencies [b65428e]
- Updated dependencies [b65428e]
- Updated dependencies [6bd6419]
- Updated dependencies [b65428e]
- Updated dependencies [61b54e9]
- Updated dependencies [b65428e]
- Updated dependencies [93910bd]
- Updated dependencies [b65428e]
  - @assistant-ui/tap@0.5.0
  - assistant-stream@0.3.3
