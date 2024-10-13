# @assistant-ui/react

## 0.5.77

### Patch Changes

- 0a3bd06: feat: Attachment image thumbnail and previews

## 0.5.76

### Patch Changes

- c3806f8: fix: do not export internal Runtime types
- 899b963: refactor: add BaseThreadRuntimeCore class
- 899b963: feat: work towards Edit Composer attachment support
- 899b963: refactor: remove composerState.attachmentAccept, add composerRuntime.getAttachmentAccept()
- 8c80f2a: feat: MessageState.submittedFeedback state
- 809c5c1: feat: New Attachment UI

## 0.5.75

### Patch Changes

- 31702b2: feat: MessageRuntime.stopSpeaking MessageState.speech state
- 44bfecd: refactor: move primitive types under the same namespace as the primitive components

## 0.5.74

### Patch Changes

- 3d31f10: refactor: deprecate primitive-hooks
- cf872da: feat: AttachmentPrimitive

## 0.5.73

### Patch Changes

- fb46305: chore: update dependencies
- e225116: feat(ui): add component override option for ThreadWelcome
- 0ff22a7: feat: switch to DataStream transfer protocol for edge runtime
- 378ee99: refactor: rename maxToolRoundtrips to maxSteps
- 378ee99: feat: server-side tool roundtrips support

## 0.5.72

### Patch Changes

- d0db602: fix: useDangerousInBrowserRuntime correct options forwarding

## 0.5.71

### Patch Changes

- 55942d8: fix: useContentPartText backwards compat type
- e455aff: feat: FollowupSuggestions
- f7c156b: feat: mark new runtime API methods as stable
- f6a832e: chore: update dependencies
- 2b7c6fe: refactor: define interface types for the new runtime API

## 0.5.70

### Patch Changes

- 3df0061: fix: TextContentPartProvider missing fields

## 0.5.69

### Patch Changes

- 46f91c2: feat(langgraph): allow disabling autocancellation of pending tool calls

## 0.5.68

### Patch Changes

- 96b9d1f: feat: new Runtime API part 8
- 9fd85da: fix: ensure branch picker is supported before showing it
- d8bd40b: chore: update dependencies
- 42156cf: refactor: drop ReactThreadRuntimeCore, unstable_synchronizer

## 0.5.67

### Patch Changes

- cfa8844: feat: useComposerRuntime hook
- 70720ba: feat: lift EditComposer to runtime layer

## 0.5.66

### Patch Changes

- 325b049: fix: include attachments prop in the useExternalMessageConverter
- df9ec8f: feat: new Runtime API rollout part 2
- 3f549b2: refactor: rename internal export

## 0.5.65

### Patch Changes

- 27208fb: fix: only include "use client" banner in ESM builds

## 0.5.64

### Patch Changes

- ed24305: fix: add newline after "use client" for .js builds

## 0.5.63

### Patch Changes

- c438773: feat: allow disabling ComposerInput keyboard shortcuts
- e1ae3d0: chore: update dependencies

## 0.5.62

### Patch Changes

- cd1b286: fix: BranchPicker styles

## 0.5.61

### Patch Changes

- 88957ac: feat: New unified Runtime API (part 1/n)
- 1a99132: feat: ThreadRuntime.Composer subscribe
- 3187013: feat: add status, attachments and metadata fields to all messages

## 0.5.60

### Patch Changes

- 926dce5: feat: Feedback Primtives, UI and Adapter
- 155d6e7: chore: update dependencies
- f80226f: feat: ThreadActions.getModelConfig

## 0.5.59

### Patch Changes

- 0f547a9: fix: useSmooth should work inside TextContentPartProvider

## 0.5.58

### Patch Changes

- 6507071: fix: TextContentPartProvider text streaming support
- 6507071: feat: TextContentPartProvider isRunning

## 0.5.57

### Patch Changes

- 745d6e1: fix(runtimes/external-store): switch to thread should correctly copy the entire store
- 745d6e1: fix: only deprecate the null usage of switchToThread

## 0.5.56

### Patch Changes

- e4863bb: feat(runtimes/external): add onSwitchToNewThread callback
- e4863bb: feat: add attachmentAccept to ThreadComposer

## 0.5.55

### Patch Changes

- b0a22e3: feat: runtime.switchToNewThread()
- 11ca453: refactor: drop useModelConfig Context - use useAssistantActions instead

## 0.5.54

### Patch Changes

- 0f99aa6: feat: New Context API
- c348553: chore: update dependencies

## 0.5.53

### Patch Changes

- f0f7497: feat: MessageContent Empty should be displayed for empty messages with empty text part
- 8555685: feat: allow editing assistant/system messages
- 892b019: fix: Empty should default to the provided Text component

## 0.5.52

### Patch Changes

- c0f975a: feat: TextContentPartProvider

## 0.5.51

### Patch Changes

- 164e46c: feat: ignore edits with text part unchanged
- 5eccae7: fix: createActionButton disabled handling

## 0.5.50

### Patch Changes

- 04f6fc8: chore: update deps

## 0.5.49

### Patch Changes

- 7ed296b: fix: make AppendMessage attachments field optional for now

## 0.5.48

### Patch Changes

- 25a711d: fix: user message action bar css

## 0.5.47

### Patch Changes

- a81b18f: feat: ComposerPrimitive.AddAttachment
- 44d08bd: feat: styled components for attachments
- b48fbcc: feat: UserMessageAttachment UI
- cc5e7d4: perf: memoize tool Ul components
- bdd3084: feat: allow runtimes to signal support for attachments
- 7dcab47: fix: message copy handling for runtimes
- a22e6bb: feat: AttachmentAdapter.accept allow attachment adapters to specify supported file types
- 9e00772: feat: add composer attachments state
- d2580d3: feat: SimpleImageAttachmentAdapter
- c845fcf: feat: allow sending attachment-only messages
- 3ba193e: feat: AttachmentContext
- d2580d3: feat: SimpleTextAttachmentAdapter
- 3b0f20b: feat: MessagePrimitive.Attachments
- 3ba193e: feat: ComposerPrimitive.Attachments
- d2580d3: feat: CompositeAttachmentAdapter
- 44d08bd: feat: Edge/Local runtime AttachmentAdapter support

## 0.5.46

### Patch Changes

- 0a4b8d7: feat: adjust the override order of tool UIs
- 34ad491: feat: ThreadConfig.ToolFallback
- 34ad491: feat: ThreadConfig.tools
- 0a4b8d7: fix: tool UI fallback should not override makeAssistantToolUI definitions

## 0.5.45

### Patch Changes

- fb8e58f: feat: add thread runtime threadId

## 0.5.44

### Patch Changes

- b2801ce: feat(styling): cursor-not-allowed when composer input is disabled
- 0aa4e6b: fix: use-smooth-state should notdesync

## 0.5.43

### Patch Changes

- 3962831: feat: useExternalMessageConverter API
- 85defe1: feat: allow string content in ThreadMessageLike
- 6f7ccf7: feat: add toolName to addToolResult callback
- 6f7ccf7: feat: thread converter should ignore empty text parts

## 0.5.42

### Patch Changes

- c8b98b6: feat: animate composer border color on focus
- 800eb9e: fix: error on switchToThread / switchToNewThread
- 8768c67: feat: support shadcn scroll area

## 0.5.41

### Patch Changes

- f526279: feat: SpeechSyntehsis
- e8aa697: refactor: remove unsupported external runtime onCopy callback

## 0.5.40

### Patch Changes

- 4333382: fix(runtime/edge): handle maxToolRoundtrips

## 0.5.39

### Patch Changes

- ab1160c: fix: switchToThread should persist maxToolRoundtrips

## 0.5.38

### Patch Changes

- 554a423: chore: update deps

## 0.5.37

### Patch Changes

- 60c0fdc: fix: remove Composer focus ring when using @tailwindcss/forms
- edbab24: feat(runtimes/local): reset thread

## 0.5.36

### Patch Changes

- edb5a16: feat: DangerousInBrowserRuntime
- f8e2cf1: fix: @tailwindcss/forms input border

## 0.5.35

### Patch Changes

- 53cf707: fix: do not require content in ChatModelRunResult

## 0.5.34

### Patch Changes

- 3178788: feat: custom AssistantMessage metadata

## 0.5.33

### Patch Changes

- c154b8f: feat(runtime/edge): allow extra headers & body

## 0.5.32

### Patch Changes

- cd70d4f: refactor: rewrite ai-sdk integration to use external runtime

## 0.5.31

### Patch Changes

- 34621cc: feat(runtimes/edge): getEdgeRuntimeResponse API
- 2df3e73: fix: CircleStopIcon invisible on safari
- 1b9ded0: feat: lift thread composer state to ThreadRuntime.Composer

## 0.5.30

### Patch Changes

- ccf5fef: fix: do not capture enter key during IME composition events

## 0.5.29

### Patch Changes

- 556001f: chore: update deps
- 556001f: feat: tool call cancellation support

## 0.5.28

### Patch Changes

- 915b5b7: feat: expose streamUtils
- 9a55735: chore: update deps

## 0.5.27

### Patch Changes

- dbf1042: fix: minor styling fixes
- dbf1042: chore: update deps

## 0.5.26

### Patch Changes

- 440b051: fix: sending messages when thread is empty

## 0.5.25

### Patch Changes

- 0445cdf: fix: disallow sending new messages when last message is in requires-action state
- 0445cdf: refactor: remove Runtime.isRunning / auto-infer isRunning state from last message state
- 71f4b77: feat: update Tooltip styles

## 0.5.24

### Patch Changes

- a7e8ef6: refactor: rewrite external store sync
- 6629dd8: fix: render loop if a message ID is used twice

## 0.5.23

### Patch Changes

- f83e4d1: feat: LocalRuntime export / import

## 0.5.22

### Patch Changes

- 134d39e: fix: undo moving internal utilities to /react/internal

## 0.5.20

### Patch Changes

- de04d92: feat: loading status & smooth streaming interop
- 3cc67f2: refactor: move internal utilities to @assistant-ui/react/internal

## 0.5.19

### Patch Changes

- 2534938: feat: Message.Content Empty component

## 0.5.18

### Patch Changes

- 0302235: fix(external-store): add initial messages to message repository

## 0.5.17

### Patch Changes

- 4b4f9c8: feat(local-runtime): AsyncGenerator support

## 0.5.16

### Patch Changes

- 9dc942f: feat: useThread.isDisabled flag

## 0.5.15

### Patch Changes

- 0418c73: fix(runtimes/external-store): invalidate cache when isRunning changes during autoStatus

## 0.5.12

### Patch Changes

- 8688a9f: feat(runtimes/external-store): loosen the return type for convertMessage callback

## 0.5.11

### Patch Changes

- fc6bc35: feat: initialMessages SSR support

## 0.5.10

### Patch Changes

- 1c6bf72: feat(tailwindcss): allow customizing colors directly in tailwind config

## 0.5.9

### Patch Changes

- a216fbf: chore: update deps

## 0.5.6

### Patch Changes

- e5e6b20: feat(runtime): BranchPicker feature detection

## 0.5.5

### Patch Changes

- f26783a: feat(ui): allow ReactNode in SuggestionConfig.text

## 0.5.4

### Patch Changes

- f2d7590: fix(rsc): hide copy message button

## 0.5.3

### Patch Changes

- 1acdf45: feat: external store runtime

## 0.5.2

### Patch Changes

- 2d7a8bd: fix: markdown loading indicator
- 2d7a8bd: fix: ScrollToBottom visbility bug
- 2d7a8bd: fix: text content part data-status field

## 0.5.1

### Patch Changes

- ee38c0c: feat: message status v2
- ee38c0c: fix(runtimes/edge): wait for serverside tool call results before reporting onFinish
- 2baa898: chore: v5

## 0.4.6

### Patch Changes

- bc77b4f: feat(runtimes/edge): dynamic model creator functions
- e220617: feat(runtimes/edge): client side API key, model name, model parameters specification

## 0.4.4

### Patch Changes

- 998081b: fix: reduce specificity of built-in CSS styles

## 0.4.3

### Minor Changes

- feat: scrolling to bottom during streaming is now instant
- fix: useSmooth gets triggered during branch switch

## 0.4.2

### Minor Changes

- fix: issue with forwarding props to primitives

## 0.4.1

### Minor Changes

- fix: useSmooth scrolling performance in dev mode

## 0.4.0

### Minor Changes

- e0e51cf: refactor!: Rename AssistantMessage to ThreadAssistantMessage
- e0e51cf: refactor!: Rename UserMessage to ThreadUserMessage
- 679cd54: feat: system message support

### Patch Changes

- c7ba6a2: feat: Edge Runtime API
- e0e51cf: feat: add styled UI components

## 0.3.5

### Patch Changes

- ef25706: feat: Code Header and Syntax Highlighter support

## 0.3.3

### Patch Changes

- b5aa29f: feat: smooth streaming by default

## 0.3.2

### Patch Changes

- 1a8919b: feat: smooth text streaming

## 0.3.1

### Patch Changes

- 05fd5d6: feat: runtime capabilities API

## 0.3.0

### Minor Changes

- 5b68f4a: refactor!: drop Message.InProgress support

### Patch Changes

- 3dd7384: fix: better message hover state tracking
- 23f474e: fix: remove warning about useLayoutEffect in SSR

## 0.2.4

### Patch Changes

- c373fc9: feat: AssistantModalPrimitive.Anchor

## 0.2.3

### Patch Changes

- be2c26b: fix: Vercel useAssistant BranchPicker duplicates bug

## 0.2.2

### Patch Changes

- 62e9f19: feat: AssistantRuntime newThread
- 611fdcc: feat: useAssistantActions
- ca0eaa1: feat: Programmatic Interactions API

## 0.2.1

### Patch Changes

- d52c345: feat: Primitive Prop Types

## 0.2.0

### Minor Changes

- de20b1c: feat!: ContentPartText is now a <p> element
- 2ab2cab: feat!: experimental features are now marked as stable

## 0.1.12

### Patch Changes

- 904556d: feat: ComposerContext focus() API
- 33ae8f9: feat: AssistantModalPrimitive

## 0.1.11

### Patch Changes

- fd6a202: feat: Primitive Hook useThreadViewportAutoScroll
- c2a6b22: fix: improved Viewport autoscroll handling
- c2a6b22: fix: more reliable escape hotkey handling
- c2a6b22: feat: add "role" field to AppendMessage

## 0.1.10

### Patch Changes

- 269b32f: feat: Primitive Hooks API
- 2867923: feat: Composer API Docs

## 0.1.9

### Patch Changes

- ab16a99: feat: useMessageUtils Context API
- ab16a99: feat: useThreadActions Context API
- ab16a99: fix: make all Context APIs read-only

## 0.1.8

### Patch Changes

- 8513f9a: feat: ToolUI addResult API

## 0.1.7

### Patch Changes

- 36f3a1f: fix: add DisplayName to primitive components for better error logs
- 36f3a1f: chore: upgrade to radix-ui 1.1
- 36f3a1f: chore: update dependencies

## 0.1.6

### Patch Changes

- a6769d5: feat: ContentPartComponent types
- 52236ab: feat: new default chat bubble design

## 0.1.5

### Patch Changes

- 671dc86: feat: Tool Render functions

## 0.1.4

### Patch Changes

- a73b50f: fix: ComposerRoot onSubmit should be called when using keyboard shortcuts

## 0.1.3

### Patch Changes

- 6e9528d: build: add changesets
- 6e9528d: feat: add useAssistantTool API
