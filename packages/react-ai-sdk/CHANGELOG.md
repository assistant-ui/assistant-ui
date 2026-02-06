# @assistant-ui/react-ai-sdk

## 1.3.6

### Patch Changes

- a088518: chore: update dependencies
- Updated dependencies [a088518]
- Updated dependencies [d8122cc]
  - assistant-cloud@0.1.17
  - @assistant-ui/react@0.12.9

## 1.3.5

### Patch Changes

- 39fefec: feat: importExternalState API
- Updated dependencies [39fefec]
  - @assistant-ui/react@0.12.6

## 1.3.4

### Patch Changes

- d45b893: chore: update dependencies
- Updated dependencies [d45b893]
- Updated dependencies [fe71bfc]
  - assistant-cloud@0.1.16
  - @assistant-ui/react@0.12.5

## 1.3.3

### Patch Changes

- acbaf07: feat: add framework-agnostic `toToolsJSONSchema` and `toGenericMessages` utilities to `assistant-stream`
- Updated dependencies [07d1c65]
- Updated dependencies [b591d72]
- Updated dependencies [59a338a]
- Updated dependencies [acbaf07]
- Updated dependencies [c665612]
- Updated dependencies [0371d72]
- Updated dependencies [e8b3f34]
  - @assistant-ui/react@0.12.3
  - assistant-cloud@0.1.15

## 1.3.2

### Patch Changes

- 605d825: chore: update dependencies
- Updated dependencies [1ea3e28]
- Updated dependencies [8cbf686]
- Updated dependencies [a8be364]
- Updated dependencies [605d825]
  - @assistant-ui/react@0.12.2
  - assistant-cloud@0.1.14

## 1.3.1

### Patch Changes

- 5876c0f: feat(react-ai-sdk): propagate ModelContext config (modelName) through AssistantChatTransport
- Updated dependencies [8672695]
  - @assistant-ui/react@0.12.1

## 1.2.1

### Patch Changes

- 083ed83: fix(cloud): serialize image and file parts across all formats
- Updated dependencies [6eab31e]
- Updated dependencies [9314b36]
- Updated dependencies [083ed83]
- Updated dependencies [6511990]
- Updated dependencies [a526e63]
  - @assistant-ui/react@0.11.60

## 1.2.0

### Minor Changes

- 6fd744a: Upgrade to Vercel AI SDK v6
  - Updated peer dependencies: `ai@^6.0.0`, `@ai-sdk/react@^3.0.0`
  - Renamed format adapter from `aiSDKV5FormatAdapter` to `aiSDKV6FormatAdapter`
  - Updated `@ai-sdk/provider` to use LanguageModelV2 types

### Patch Changes

- 3719567: chore: update deps
- Updated dependencies [3719567]
  - assistant-cloud@0.1.13
  - @assistant-ui/react@0.11.58

## 1.1.21

### Patch Changes

- 5ce45bd: fix(react-ai-sdk): preserve metadata in message conversion
- Updated dependencies [3a0b9c8]
- Updated dependencies [b8f62e1]
- Updated dependencies [8d5c20c]
  - @assistant-ui/react@0.11.56

## 1.1.20

### Patch Changes

- 57bd207: chore: update dependencies
- cce009d: chore: use tsc for building packages
- Updated dependencies [57bd207]
- Updated dependencies [cce009d]
  - assistant-cloud@0.1.12
  - @assistant-ui/react@0.11.53

## 1.1.19

### Patch Changes

- e8ea57b: chore: update deps
- Updated dependencies [bae3aa2]
- Updated dependencies [e8ea57b]
  - @assistant-ui/react@0.11.50
  - assistant-stream@0.2.45
  - assistant-cloud@0.1.11

## 1.1.18

### Patch Changes

- 89aec17: feat: AI SDK frontend tool execution cancellation support
  fix: AI SDK isRunning status when running frontend tools
- Updated dependencies [89aec17]
- Updated dependencies [ee7040f]
- Updated dependencies [bd27465]
- Updated dependencies [a3e9549]
- Updated dependencies [206616b]
- Updated dependencies [7aa77b5]
  - assistant-stream@0.2.44
  - @assistant-ui/react@0.11.49

## 1.1.17

### Patch Changes

- 01c31fe: chore: update dependencies
- Updated dependencies [ba26b22]
- Updated dependencies [d169e4f]
- Updated dependencies [da9f8a6]
- Updated dependencies [01c31fe]
  - @assistant-ui/react@0.11.48
  - assistant-stream@0.2.43
  - assistant-cloud@0.1.10

## 1.1.16

### Patch Changes

- c4142ac: fix(react-ai-sdk): pass runConfig metadata to backend API request

## 1.1.15

### Patch Changes

- ab8953b: feat(react): add `allowNesting` option to allow wrapping runtimes with custom thread list adapters
- Updated dependencies [ab8953b]
  - @assistant-ui/react@0.11.46

## 1.1.14

### Patch Changes

- ec662cd: chore: update dependencies
- cdb5ea5: mark tool call as complete once user sends new message when tool calling
- 5dd925e: feat(ai-sdk): allow updates to headers/body
- Updated dependencies [ec662cd]
  - assistant-stream@0.2.42
  - assistant-cloud@0.1.9
  - @assistant-ui/react@0.11.45

## 1.1.13

### Patch Changes

- 4f6afef: feat: unified json schema
- Updated dependencies [4f6afef]
  - @assistant-ui/react@0.11.44

## 1.1.12

### Patch Changes

- faed815: feat: AI SDK error toolOutput support
- 2c33091: chore: update deps
- Updated dependencies [2c33091]
  - assistant-stream@0.2.41
  - assistant-cloud@0.1.8
  - @assistant-ui/react@0.11.40

## 1.1.11

### Patch Changes

- 0bcbb58: feat: custom `toCreateMessage` callback
  fix: use AI SDK's idGenerator function for new messages
- b408005: feat(react-ai-sdk): Integrate AI SDK v5 data parts in message content
- Updated dependencies [b408005]
- Updated dependencies [7a6d9ca]
- Updated dependencies [70d5966]
- Updated dependencies [3754bdd]
- Updated dependencies [0a4bdc1]
  - @assistant-ui/react@0.11.39

## 1.1.10

### Patch Changes

- 34d1c78: fix(react-ai-sdk): correctly initialize history loading state
- Updated dependencies [66a13a0]
- Updated dependencies [4e3877e]
- Updated dependencies [eef682b]
  - @assistant-ui/react@0.11.38
  - assistant-cloud@0.1.7

## 1.1.9

### Patch Changes

- 81b581f: feat: display AI SDK errors
- 6d2c134: feat: useChatRuntime should use the assistant ui thread id remote id as the threadid by default
- 2fc7e99: chore: update deps
- Updated dependencies [3ab9484]
- Updated dependencies [7a88ead]
- Updated dependencies [81b581f]
- Updated dependencies [2fc7e99]
  - @assistant-ui/react@0.11.36
  - assistant-stream@0.2.39
  - assistant-cloud@0.1.6

## 1.1.8

### Patch Changes

- 953db24: chore: update deps
- Updated dependencies [953db24]
- Updated dependencies
  - assistant-stream@0.2.37
  - assistant-cloud@0.1.5
  - @assistant-ui/react@0.11.34

## 1.1.7

### Patch Changes

- chore: update deps
- Updated dependencies
  - assistant-stream@0.2.36
  - assistant-cloud@0.1.4
  - @assistant-ui/react@0.11.31

## 1.1.6

### Patch Changes

- a5f9dd5: Export missing types for custom runtime integration
- Updated dependencies [92dfb0f]
  - @assistant-ui/react@0.11.29

## 1.1.5

### Patch Changes

- e6a46e4: chore: update deps
- Updated dependencies [e6a46e4]
  - assistant-stream@0.2.34
  - assistant-cloud@0.1.3
  - @assistant-ui/react@0.11.27

## 1.1.4

### Patch Changes

- e81784b: feat: Tool Call interrupt() resume() API
- Updated dependencies [e8d6d7b]
- Updated dependencies [e81784b]
  - @assistant-ui/react@0.11.22
  - assistant-stream@0.2.32

## 1.1.3

### Patch Changes

- e46e4d3: fix: guard threadItem access for useAISDKRuntime
- Updated dependencies [c0f5003]
  - assistant-stream@0.2.31

## 1.1.2

### Patch Changes

- 8812f86: chore: update deps
- Updated dependencies [8812f86]
  - assistant-stream@0.2.30
  - assistant-cloud@0.1.2

## 1.1.1

### Patch Changes

- 68ef242: feat(ui): load external history only when thread has remote id
- Updated dependencies [2c6198a]
  - @assistant-ui/react@0.11.19

## 1.1.0

### Patch Changes

- 39ac2f3: feat: AI SDK v5 import support
- Updated dependencies [39ac2f3]
- Updated dependencies [5437dbe]
  - @assistant-ui/react@0.11.0

## 1.0.7

### Patch Changes

- d7d9058: fix: cloud chat history not loading in some configurations

## 1.0.6

### Patch Changes

- 860bf42: feat: useAISDKRuntime cloud history support (without useChatRuntime)
- Updated dependencies [3498c99]
  - @assistant-ui/react@0.10.50

## 1.0.5

### Patch Changes

- 90fc83b: fixes attachment naming
- e64b20c: fix: persistence only saving the first two messages

## 1.0.4

### Patch Changes

- 9235fe1: update dep array in external history adapter

## 1.0.3

### Patch Changes

- ceedf45: feat: pass run-config to ai-sdk metadata to let user decide what to do after
- 5504836: pass callsettings in extra body object to AI chat transport
- Updated dependencies [a80dcff]
  - @assistant-ui/react@0.10.43

## 1.0.2

### Patch Changes

- 672db5a: feat: frontend function calling support
- 12e0a77: chore: update deps
- Updated dependencies [12e0a77]
  - assistant-stream@0.2.23
  - assistant-cloud@0.1.1
  - @assistant-ui/react@0.10.42

## 1.0.1

### Patch Changes

- eda5558: feat: AI SDK custom UIMessage type support
- Updated dependencies [eda5558]
  - @assistant-ui/react@0.10.41

## 1.0.0

### Patch Changes

- de215fd: fix: history loading
- Updated dependencies [179f8b7]
  - assistant-cloud@0.1.0
  - @assistant-ui/react@0.10.40

## 0.11.5

### Patch Changes

- a4389da: feat: AI SDK v5 assistant-cloud thread history support
- Updated dependencies [a4389da]
  - @assistant-ui/react@0.10.39

## 0.11.4

### Patch Changes

- 979ee67: feat: forward system and tools to the backend for useChatRuntime
- 979ee67: feat: assistant cloud support for AI SDK v5
- 979ee67: feat: add AssistantChatTransport
- Updated dependencies [979ee67]
  - @assistant-ui/react@0.10.38

## 0.11.3

### Patch Changes

- 2ef6cae: feat: Add useChatRuntime as new recommended entry point for AI-SDK V5
- Updated dependencies [f32b6a4]
  - @assistant-ui/react@0.10.37

## 0.11.1

### Patch Changes

- 20ffa06: fix: Don't omit attachments from `AISDKRuntimeAdapter` type
- Updated dependencies [ed78407]
- Updated dependencies [77ce337]
- Updated dependencies [f59959e]
  - @assistant-ui/react@0.10.36

## 0.11.0

### Patch Changes

- 0f063e0: chore: update dependencies
- Updated dependencies [0f063e0]
- Updated dependencies [5d8b074]
  - assistant-stream@0.2.22
  - @assistant-ui/react@0.10.34
