# @assistant-ui/core

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
