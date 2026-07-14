# assistant-stream

## 0.3.25

### Patch Changes

- [#4687](https://github.com/assistant-ui/assistant-ui/pull/4687) [`f833bc1`](https://github.com/assistant-ui/assistant-ui/commit/f833bc118b49641f3f6e0ab22bcfc63bf0a04408) - feat: support server-side MCP connection timeouts ([@Kinfe123](https://github.com/Kinfe123))

## 0.3.24

### Patch Changes

- [#4517](https://github.com/assistant-ui/assistant-ui/pull/4517) [`cefcf27`](https://github.com/assistant-ui/assistant-ui/commit/cefcf27b4b53ceafef18e469644d51797c11c8ff) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

## 0.3.23

### Patch Changes

- [#4393](https://github.com/assistant-ui/assistant-ui/pull/4393) [`434bba5`](https://github.com/assistant-ui/assistant-ui/commit/434bba5f7c59ab7cf6f1c78a8898fd4d3addb12d) - fix: resolve typecheck regressions ([@Yonom](https://github.com/Yonom))

## 0.3.22

### Patch Changes

- [#4379](https://github.com/assistant-ui/assistant-ui/pull/4379) [`94cc028`](https://github.com/assistant-ui/assistant-ui/commit/94cc02875b4e813e1af7020709511bb5f61e6067) - feat: per-tool-call timing and stall detection. `ToolCallMessagePart` gains a `timing` field (`{ startedAt, completedAt? }` in epoch ms), auto-populated by the assistant-stream accumulator at part start and result, and accepted on `ThreadMessageLike` for external-store hosts. New `useToolCallElapsed()` hook returns the call's elapsed milliseconds, ticking once per second while running; `unstable_useMessageStallDetection({ thresholdMs })` reports mid-run output stalls by watching a message content fingerprint. The kit `ToolFallback` trigger renders the duration when timing is present. ([@okisdev](https://github.com/okisdev))

## 0.3.21

### Patch Changes

- [#4306](https://github.com/assistant-ui/assistant-ui/pull/4306) [`15878d8`](https://github.com/assistant-ui/assistant-ui/commit/15878d8114edbbb82c2a467cf811478e5f4e08bc) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

## 0.3.20

### Patch Changes

- [#4163](https://github.com/assistant-ui/assistant-ui/pull/4163) [`cba2b42`](https://github.com/assistant-ui/assistant-ui/commit/cba2b42c26083e730ae07194186ab4473f9f4cf3) - fix(assistant-stream): resolve `argsReader.get()` to `undefined` once args close ([@Yonom](https://github.com/Yonom))

  Awaiting an optional arg that the model never produced (`reader.args.get("optional")`) previously hung forever, because the args stream was never closed and pending handles were never settled. The reader now closes when args streaming finishes, resolving outstanding `get()` calls to `undefined` for absent fields and closing open `streamValues`/`streamText`/`forEach` streams.

- [#4226](https://github.com/assistant-ui/assistant-ui/pull/4226) [`58f80e0`](https://github.com/assistant-ui/assistant-ui/commit/58f80e09b51a9d025403f8692c3f41adc6d403e0) - fix: avoid uploading backend-default schemas for use-generative frontend and human tools ([@Yonom](https://github.com/Yonom))

- [#4212](https://github.com/assistant-ui/assistant-ui/pull/4212) [`5fe118d`](https://github.com/assistant-ui/assistant-ui/commit/5fe118d6e61fd661859ee0d6b5ef10a370992a84) - feat: add MCP server support to generative toolkits ([@Yonom](https://github.com/Yonom))

- [#4213](https://github.com/assistant-ui/assistant-ui/pull/4213) [`dcd5897`](https://github.com/assistant-ui/assistant-ui/commit/dcd5897f6dd6ca6bfe6978c3c03371e070965eab) - feat: add provider-executed tool support to generative toolkits ([@Yonom](https://github.com/Yonom))

- [#4236](https://github.com/assistant-ui/assistant-ui/pull/4236) [`ae54c55`](https://github.com/assistant-ui/assistant-ui/commit/ae54c55c8c8b0f9e9ef455ced1498f37d998c6cb) - feat: add `stubTool()` and experimental `useAuiToolOverrides()` for locally executed generative toolkit tools ([@Yonom](https://github.com/Yonom))

## 0.3.19

### Patch Changes

- [#4176](https://github.com/assistant-ui/assistant-ui/pull/4176) [`27ae936`](https://github.com/assistant-ui/assistant-ui/commit/27ae936dec6dc5d05d21fd892af0a8e1db61928e) - feat: add the `ToolkitDeclaration` / `ToolkitDeclarationDefinition` types for authoring a toolkit permissively (a backend tool may declare `description`/`parameters`/`execute`); the canonical `Toolkit` keeps those fields erased. Author with `defineToolkit()` from `@assistant-ui/react`, which the `"use generative"` compiler strips per build. ([@Yonom](https://github.com/Yonom))

## 0.3.18

### Patch Changes

- [#4172](https://github.com/assistant-ui/assistant-ui/pull/4172) [`1315789`](https://github.com/assistant-ui/assistant-ui/commit/13157895e4d69ad4266d6ab278edfc2e3ea1de92) - feat: add the `ToolkitDeclaration` / `ToolkitDeclarationDefinition` types for authoring a toolkit permissively (a backend tool may declare `description`/`parameters`/`execute`); the canonical `Toolkit` keeps those fields erased. Author with `defineToolkit()` from `@assistant-ui/next`, which the `"use generative"` compiler strips per build. ([@Yonom](https://github.com/Yonom))

- [#4151](https://github.com/assistant-ui/assistant-ui/pull/4151) [`299d448`](https://github.com/assistant-ui/assistant-ui/commit/299d4488c8a5bbec0679680866f5975055fe71b3) - chore: drop stale `biome-ignore` pragmas now that the repo lints with oxlint ([@okisdev](https://github.com/okisdev))

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

- [#4133](https://github.com/assistant-ui/assistant-ui/pull/4133) [`c4d3eea`](https://github.com/assistant-ui/assistant-ui/commit/c4d3eeac6907a2fc15718f3c710d73d24eaeb652) - forward per-tool `providerOptions` from `useAssistantTool` through `toToolsJSONSchema` and `frontendTools` into the AI SDK request body, and emit tool entries in alphabetical order so identical tool sets produce byte-identical request bodies for stable prompt caching. `react-ag-ui` inherits the sort via `toAgUiTools`, so identical tool sets reach the AG-UI runtime in a stable order regardless of mount order. ([@okisdev](https://github.com/okisdev))

  this lets you opt into provider-specific tool features (e.g. Anthropic's `defer_loading`, Anthropic Tool Search Tool) without any provider-aware code in assistant-ui:

  ```ts
  useAssistantTool({
    toolName: "get_weather",
    parameters: schema,
    providerOptions: { anthropic: { deferLoading: true } },
    execute: async ({ city }) => fetchWeather(city),
  });
  ```

  the value is passed through verbatim; the AI SDK provider (`@ai-sdk/anthropic`, `@ai-sdk/openai`, ...) interprets it.

## 0.3.17

### Patch Changes

- [#4116](https://github.com/assistant-ui/assistant-ui/pull/4116) [`d4f1db4`](https://github.com/assistant-ui/assistant-ui/commit/d4f1db428b1a1fe5c122150e1e366a377e9adb5f) - fix: preserve parentId on streamed text and reasoning parts ([@ShobhitPatra](https://github.com/ShobhitPatra))

  `AssistantStreamController` dropped `parentId` for text/reasoning parts written through a `withParentId(...)` controller: `addTextPart`/`addReasoningPart` never attached it, and `appendText`/`appendReasoning` reused the open append part across a `parentId` change. This silently merged parts and broke the `AuiTextDelta`/`AuiReasoningDelta` data-stream round trip (including the decoder's own `withParentId(...).appendText(...)` path).

## 0.3.16

### Patch Changes

- [#4096](https://github.com/assistant-ui/assistant-ui/pull/4096) [`13a12c4`](https://github.com/assistant-ui/assistant-ui/commit/13a12c46c94f7e5e62af02692cf3479fff48bd02) - docs(assistant-stream): fix README usage example and clarify wire-format pairing ([@okisdev](https://github.com/okisdev))

  the README Usage snippet was calling `controller.appendText()` with no arguments and treating the return value as a writer, but `AssistantStreamController.appendText` has signature `(textDelta: string): void`. copy-pasting the old snippet threw `TypeError: Cannot read properties of undefined (reading 'append')` at the first `text.append(...)` call. switched the example to the actual API.

  also added a short note that `createAssistantStreamResponse` returns a standard Web `Response` (drops into Next.js / Hono / Bun / Deno / Cloudflare Workers; Express and Fastify need a small adapter), and that the emitted bytes are the data stream wire format. on the frontend pair it with `useDataStreamRuntime({ api, protocol: "data-stream" })`; the default `protocol: "ui-message-stream"` expects AI SDK v6's SSE-based UI message stream format and will throw `Stream ended abruptly without receiving [DONE] marker` against this output.

- [#4085](https://github.com/assistant-ui/assistant-ui/pull/4085) [`01244a5`](https://github.com/assistant-ui/assistant-ui/commit/01244a56026ee92bd4e49cb985136f9eb6d45154) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

## 0.3.15

### Patch Changes

- [#4023](https://github.com/assistant-ui/assistant-ui/pull/4023) [`94548fa`](https://github.com/assistant-ui/assistant-ui/commit/94548fa8d587962d8ab0338a9609a9ff21240c33) - docs: add JSDoc for assistant stream tool definitions ([@AVGVSTVS96](https://github.com/AVGVSTVS96))

## 0.3.14

### Patch Changes

- [#3979](https://github.com/assistant-ui/assistant-ui/pull/3979) [`9ecda1d`](https://github.com/assistant-ui/assistant-ui/commit/9ecda1dfdd96f2c638e7b51cc951319ccacd06c9) - feat(assistant-stream): add resumable stream primitives ([@okisdev](https://github.com/okisdev))

  new `assistant-stream/resumable` entrypoint for persisting an in-flight `AssistantStream` and replaying it after a disconnect or reload.

  `createResumableStreamContext({ store, ttlMs?, waitUntil?, onAcquire?, onAppend?, onFinalize?, onError? })` returns `{ run, resume, requireResume, status, delete }`.

  `createResumableAssistantStreamResponse` and `createResumeAssistantStreamResponse` bridge `AssistantStreamController` callbacks to any `AssistantStreamEncoder`.

  `createInMemoryResumableStreamStore` covers dev and tests; Redis adapters live at `assistant-stream/resumable/redis` and `assistant-stream/resumable/ioredis` (peer deps), with pipelined appends and binary chunk values.

  typed errors via `ResumableStreamError` with codes `"missing" | "exists" | "finalized" | "invalid-id"`.

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

## 0.3.13

### Patch Changes

- [#3962](https://github.com/assistant-ui/assistant-ui/pull/3962) [`b090acb`](https://github.com/assistant-ui/assistant-ui/commit/b090acb98f6bf3579aab4efedddaff83a0b54c94) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

## 0.3.12

### Patch Changes

- [#3876](https://github.com/assistant-ui/assistant-ui/pull/3876) [`ce865bc`](https://github.com/assistant-ui/assistant-ui/commit/ce865bc46af996d53f89e18068139d4d38546ca6) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

## 0.3.11

### Patch Changes

- c988db8: chore: update dependencies

## 0.3.10

### Patch Changes

- 2c5cd97: fix(assistant-stream): handle CRLF line endings in LineDecoderStream

## 0.3.9

### Patch Changes

- dffb6b4: feat: add data part type to streaming pipeline

  Add DataPart as a new streamable content part type, enabling AI to send structured named data that renders via makeAssistantDataUI. Includes appendData() controller method and DataStream serialization support.

- 9103282: fix: resolve biome lint warnings (optional chaining, unused suppressions)
- bdce66f: chore: update dependencies
- 209ae81: chore: remove aui-source export condition from package.json exports

## 0.3.8

### Patch Changes

- 3227e71: feat: add `toPartialJSONSchema` utility for making JSON Schema properties optional
- 52403c3: chore: update dependencies

## 0.3.7

### Patch Changes

- 736344c: chore: update dependencies

## 0.3.6

### Patch Changes

- 427ffaa: refactor: drop all barrel files
- 349f3c7: chore: update deps
- 02614aa: feat: add multi-agent support
  - `ReadonlyThreadProvider` and `MessagePartPrimitive.Messages` for rendering sub-agent messages
  - `assistant-stream`: add `messages` field to `tool-result` chunks, `ToolResponseLike`, and `ToolCallPart` types, enabling sub-agent messages to flow through the streaming protocol

## 0.3.5

### Patch Changes

- 2828b67: fix(assistant-stream): throw a clear error when a Standard Schema (e.g. Zod v3) cannot be converted to JSON Schema, instead of silently passing through invalid data. Also add support for `~standard.jsonSchema.input()` conversion path.

## 0.3.4

### Patch Changes

- 36ef3a2: chore: update dependencies

## 0.3.3

### Patch Changes

- 61b54e9: Add message timing metadata: `AssistantMessageTiming` type, automatic timing tracking in `AssistantMessageAccumulator`, `MessageTiming` type, `useMessageTiming()` hook, and client-side streaming timing for AI SDK runtime.
- 93910bd: Rename .tsx files to .ts where no JSX syntax is used

## 0.3.2

### Patch Changes

- a088518: chore: update dependencies

## 0.3.1

### Patch Changes

- d45b893: chore: update dependencies

## 0.3.0

### Minor Changes

- acbaf07: feat: add framework-agnostic `toToolsJSONSchema` and `toGenericMessages` utilities to `assistant-stream`

## 0.2.48

### Patch Changes

- 605d825: chore: update dependencies

## 0.2.47

### Patch Changes

- 3719567: chore: update deps

## 0.2.46

### Patch Changes

- 57bd207: chore: update dependencies
- cce009d: chore: use tsc for building packages

## 0.2.45

### Patch Changes

- e8ea57b: chore: update deps

## 0.2.44

### Patch Changes

- 89aec17: feat: AI SDK frontend tool execution cancellation support
  fix: AI SDK isRunning status when running frontend tools

## 0.2.43

### Patch Changes

- 01c31fe: chore: update dependencies

## 0.2.42

### Patch Changes

- ec662cd: chore: update dependencies

## 0.2.41

### Patch Changes

- 2c33091: chore: update deps

## 0.2.40

### Patch Changes

- ef58020: feat(assistant-stream): parallel tool calling

## 0.2.39

### Patch Changes

- 2fc7e99: chore: update deps

## 0.2.38

### Patch Changes

- 2fc5c3d: feat: AssistantTransport wire format

## 0.2.37

### Patch Changes

- 953db24: chore: update deps

## 0.2.36

### Patch Changes

- chore: update deps

## 0.2.35

### Patch Changes

- 7c5943b: fix: detect duplicate tool calls in data stream

## 0.2.34

### Patch Changes

- e6a46e4: chore: update deps

## 0.2.33

### Patch Changes

- 3caad00: refactor: rename interrupt -> human for tool input handling

## 0.2.32

### Patch Changes

- e81784b: feat: Tool Call interrupt() resume() API

## 0.2.31

### Patch Changes

- c0f5003: fix(stream): always use async to flush controller appends

## 0.2.30

### Patch Changes

- 8812f86: chore: update deps

## 0.2.29

### Patch Changes

- d19ebab: feat(assistant-transport): surface stream errors to caller

## 0.2.28

### Patch Changes

- feat: throttle only on stream resume

## 0.2.27

### Patch Changes

- fix: make accumulator throttling smoother

## 0.2.26

### Patch Changes

- 0f21c70: feat: throttle AssistantMessageAccumulator emits

## 0.2.25

### Patch Changes

- 2e7a10f: feat: createInitialMessage unstable_state support
  feat: export AssistantMetaTransformStream

## 0.2.24

### Patch Changes

- cf26771: feat: export AssistantTransformStream API

## 0.2.23

### Patch Changes

- 12e0a77: chore: update deps

## 0.2.22

### Patch Changes

- 0f063e0: chore: update dependencies

## 0.2.21

### Patch Changes

- fix: race condition in RunController when using parentIds

## 0.2.20

### Patch Changes

- f23fdb6: feat: add parent ID grouping for message parts

## 0.2.19

### Patch Changes

- 20a4649: fix: preserve message error statuses, avoid being overwritten by finish chunks
- 9793e64: fix: if tool calls have no argsText, assume empty object instead of crashing

## 0.2.18

### Patch Changes

- 65b3ff1: chore: update deps

## 0.2.17

### Patch Changes

- 644abb8: chore: update deps

## 0.2.16

### Patch Changes

- de00319: fix: add assistant-stream/utils subpath import workaround

## 0.2.15

### Patch Changes

- 51b8493: feat: add missing exports

## 0.2.14

### Patch Changes

- 52e18bc: feat: ToolResponseLike

## 0.2.13

### Patch Changes

- fix: Last is not a partial call attempt 3

## 0.2.12

### Patch Changes

- fix: add another workaround for Last is not a partial call

## 0.2.11

### Patch Changes

- fix: Last is not a partial call error

## 0.2.10

### Patch Changes

- chore: update deps

## 0.2.9

### Patch Changes

- fix: PlainTextEncoder should ignore part-start/finish

## 0.2.8

### Patch Changes

- fix: close argsTextController when setResponse is called

## 0.2.7

### Patch Changes

- 5cb9598: feat(assistant-stream): ObjectStream

## 0.2.6

### Patch Changes

- 0809c9f: feat: add missing exports from 'assistant-stream'

## 0.2.5

### Patch Changes

- c4c60cf: fix: server-side tool results should be forwarded to StreamCallController
- 73a6ff1: feat: Tool.type

## 0.2.4

### Patch Changes

- 98a680e: chore: update deps

## 0.2.3

### Patch Changes

- 30ae924: fix: disabled tools should still execute if invoked

## 0.2.2

### Patch Changes

- fix: ESM without bundler compat

## 0.2.1

### Patch Changes

- fix: correctly include Typescript declarations

## 0.2.0

### Patch Changes

- 557c3f7: build: drop CJS builds

## 0.1.8

### Patch Changes

- fix: types in ESM

## 0.1.7

### Patch Changes

- 51104f0: feat: ship declarationMaps

## 0.1.6

### Patch Changes

- feat: export AssistantStreamController

## 0.1.5

### Patch Changes

- 2e4a7c1: fix: correctly forward tool result from data stream

## 0.1.4

### Patch Changes

- 62c2af7: feat: tool.streamCall API
- b9c731a: chore: update dependencies

## 0.1.3

### Patch Changes

- c0c9422: feat: useToolArgsFieldStatus

## 0.1.2

### Patch Changes

- chore: update deps

## 0.1.1

### Patch Changes

- fix: throw error when LineDecoderStream ends with incomplete line instead of emitting it

## 0.1.0

### Patch Changes

- 1f65c94: fix: ToolResponse instanceof check via named symbol
- 8df35f6: feat: fix duplicate tool calls appearing from ai-sdk
- 476cbfb: fix: make text-delta support reasoning part type

## 0.0.32

### Patch Changes

- 545a17c: fix: do not crash on tool call with empty argsText

## 0.0.31

### Patch Changes

- 93c3eb4: fix: drop ToolResponseBrand

## 0.0.30

### Patch Changes

- a22bc7a: refactor: merge setResult and setArtifact to setResponse
- 39aecd7: chore: update dependencies

## 0.0.29

### Patch Changes

- feat: expose assitant-stream ToolResponse API

## 0.0.28

### Patch Changes

- 40579cd: feat: ToolResponse support

## 0.0.27

### Patch Changes

- fix: assistant-stream appendText must only append to the very last part

## 0.0.26

### Patch Changes

- c4d7b29: feat: tool call artifacts

## 0.0.25

### Patch Changes

- fix: frontend tool call enqueue bug

## 0.0.24

### Patch Changes

- chore: bump assistant-stream

## 0.0.23

### Patch Changes

- 439ae67: fix: properly emit tool-call args-text finish

## 0.0.22

### Patch Changes

- b07603d: feat: assistant-stream rewrite

## 0.0.21

### Patch Changes

- fix: pin nanoid version for CJS compat

## 0.0.20

### Patch Changes

- 7f7ab5e: refactor: assitant-stream API

## 0.0.19

### Patch Changes

- 72e66db: chore: update dependencies

## 0.0.18

### Patch Changes

- b44a7ad: feat: error message part
- 22272e6: chore: update dependencies

## 0.0.17

### Patch Changes

- 70ccbe6: feat: AssistantMessageStream

## 0.0.16

### Patch Changes

- 345f3d5: chore: update dependencies

## 0.0.15

### Patch Changes

- 4c2bf58: chore: update dependencies

## 0.0.14

### Patch Changes

- 982a6a2: chore: update dependencies

## 0.0.13

### Patch Changes

- ec3b8cc: chore: update dependencies

## 0.0.12

### Patch Changes

- ignore unsupported data stream parts

## 0.0.11

### Patch Changes

- 4c54273: chore: update dependencies

## 0.0.10

### Patch Changes

- interop with module resolution node

## 0.0.8

### Patch Changes

- 2112ce8: chore: update dependencies

## 0.0.7

### Patch Changes

- 933b8c0: chore: update deps

## 0.0.6

### Patch Changes

- c59d8b5: chore: update dependencies

## 0.0.5

### Patch Changes

- 1ada091: chore: update deps

## 0.0.4

### Patch Changes

- ff5b86c: chore: update deps

## 0.0.3

### Patch Changes

- d2375cd: build: disable bundling in UI package releases

## 0.0.1

### Patch Changes

- fb32e61: chore: update deps

## 0.0.0

### Patch Changes

- fb46305: chore: update dependencies
