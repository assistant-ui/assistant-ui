# @assistant-ui/react

## 0.12.7

### Patch Changes

- 77af8c3: fix: runtime not responsive if loaded under React StrictMode (critial bug)
- 9ef966a: fix(store): memoize the aui client instance
- Updated dependencies [77af8c3]
- Updated dependencies [9ef966a]
  - @assistant-ui/tap@0.4.4
  - @assistant-ui/store@0.1.5

## 0.12.6

### Patch Changes

- 39fefec: feat: importExternalState API

## 0.12.5

### Patch Changes

- d45b893: chore: update dependencies
- fe71bfc: feat: use enhanced tapSubscribableResource hook
- Updated dependencies [d45b893]
- Updated dependencies [fe71bfc]
- Updated dependencies [fe71bfc]
  - assistant-stream@0.3.1
  - assistant-cloud@0.1.16
  - @assistant-ui/store@0.1.4
  - @assistant-ui/tap@0.4.3

## 0.12.4

### Patch Changes

- 86baaee: fix(react): devtools not register
- 3bbe318: fix: allow destructuring proxy methods (e.g. `addToolResult`, `resumeToolCall`)
- Updated dependencies [3bbe318]
  - @assistant-ui/store@0.1.3

## 0.12.3

### Patch Changes

- 07d1c65: fix: nesting assistant providers
- b591d72: feat: new tools API
- 59a338a: feat: åshowEmptyOnNonTextEnd
- acbaf07: feat: add framework-agnostic `toToolsJSONSchema` and `toGenericMessages` utilities to `assistant-stream`
- c665612: fix: do not capture handleSendMessage errors
- 0371d72: feat: AssistantRuntimeProvider aui prop
- e8b3f34: feat: Suggestions API and Primitives
- Updated dependencies [07d1c65]
- Updated dependencies [acbaf07]
- Updated dependencies [5ab3690]
- Updated dependencies [0371d72]
  - @assistant-ui/store@0.1.2
  - assistant-stream@0.3.0
  - @assistant-ui/tap@0.4.2
  - assistant-cloud@0.1.15

## 0.12.2

### Patch Changes

- 1ea3e28: feat(react): better error handling
- 8cbf686: fix: tap should run effects after remount
- a8be364: feat: log individual errors when throwing AggregateError
- 605d825: chore: update dependencies
- Updated dependencies [8cbf686]
- Updated dependencies [2e088eb]
- Updated dependencies [a8be364]
- Updated dependencies [605d825]
- Updated dependencies [fe15232]
  - @assistant-ui/tap@0.4.1
  - @assistant-ui/store@0.1.1
  - assistant-stream@0.2.48
  - assistant-cloud@0.1.14

## 0.12.1

### Patch Changes

- 8672695: fix: race condition in RemoteThreadListRuntime causing app crash on thread deletion

## 0.12.0

### Minor Changes

- 9314b36: feat: use @assistant-ui/store to power state management

# Patch Changes

- 6eab31e: fix(react): handle tool argsText key reordering during streaming
- 083ed83: fix(cloud): serialize image and file parts across all formats
- 6511990: fix(react): bind `this` context when calling `__internal_setGetInitializePromise`
- a526e63: fix uncaught AbortError when cancelling streams
- Updated dependencies [11625b5]
  - @assistant-ui/store@0.0.7

## 0.11.59

### Patch Changes

- fe06c7c: Revert "fix(react): accept URL-based images in sanitizeImageContent (#3069)"
- Updated dependencies
  - @assistant-ui/tap@0.4.0

## 0.11.58

### Patch Changes

- 3719567: chore: update deps
- Updated dependencies [3719567]
  - assistant-stream@0.2.47
  - assistant-cloud@0.1.13
  - @assistant-ui/tap@0.3.6

## 0.11.57

### Patch Changes

- 9a110ea: fix(react): prevent viewport slack feedback loop
- caee095: feat(react): allow passing threadId to backend
- 9883125: fix(react): merge reasoning parts with same parentId in ExternalStoreRuntime

## 0.11.56

### Patch Changes

- 3a0b9c8: fix(react): scroll to bottom on initial history load
- b8f62e1: fix: add missing type export for `ExportedMessageRespositoryItem`
- 8d5c20c: fix: restore `useLocalThreadRuntime` export as deprecated alias to `useLocalRuntime`

## 0.11.55

### Patch Changes

- 5ca09bc: fix(cloud): filter unsupported messages parts passed to `generateTitle`

## 0.11.54

### Patch Changes

- ab2259d: feat(react): thread list item more primitive
- 699e585: feat(react): action bar more primitive
- 4b63488: Allow async function for `body` in runtime options
- aee8561: feat(react): add dictation (speech-to-text) support

  Adds dictation (speech-to-text) support via a new `DictationAdapter` interface. Users can now convert voice input to text in the composer using the browser's Web Speech API or custom adapters.
  - New adapter: `WebSpeechDictationAdapter` - uses browser's Web Speech API
  - New components: `ComposerPrimitive.Dictate`, `ComposerPrimitive.StopDictation`, `ComposerPrimitive.DictationTranscript`
  - New state: `composer.dictation` for dictation status and transcript
  - New methods: `composer.startDictation()`, `composer.stopDictation()`
  - Configuration via `adapters.dictation` in runtime options

- dbfdb11: fix(docs): fix broken migration links

## 0.11.53

### Patch Changes

- 57bd207: chore: update dependencies
- cce009d: chore: use tsc for building packages
- Updated dependencies [57bd207]
- Updated dependencies [cce009d]
  - assistant-stream@0.2.46
  - assistant-cloud@0.1.12
  - @assistant-ui/tap@0.3.5

## 0.11.52

### Patch Changes

- 4db92c9: fix(react): useIsHoveringRef on SSR issue

## 0.11.51

### Patch Changes

- fix: update tap package

## 0.11.50

### Patch Changes

- bae3aa2: feat: use new tap global flushSync method
- e8ea57b: chore: update deps
- Updated dependencies [bae3aa2]
- Updated dependencies [bae3aa2]
- Updated dependencies [bae3aa2]
- Updated dependencies [bae3aa2]
- Updated dependencies [bae3aa2]
- Updated dependencies [bae3aa2]
- Updated dependencies [e8ea57b]
- Updated dependencies [bae3aa2]
  - @assistant-ui/tap@0.3.3
  - assistant-stream@0.2.45
  - assistant-cloud@0.1.11

## 0.11.49

### Patch Changes

- 89aec17: feat: AI SDK frontend tool execution cancellation support
  fix: AI SDK isRunning status when running frontend tools
- ee7040f: fix: always scroll to bottom when switching to a thread
- bd27465: feat: ability to disable auto scrollToBottom on message send / thread switch
- a3e9549: feat: only add turn anchor slack after the first turn
- 206616b: fix: scroll to bottom button flickers on send message
- 7aa77b5: feat: do not take viewport padding into account when calculating the slack inset
- Updated dependencies [89aec17]
  - assistant-stream@0.2.44

## 0.11.48

### Patch Changes

- ba26b22: feat(react): export as anything
- d169e4f: feat: add AssistantIf
- da9f8a6: Fix ESC keydown handler to only trigger when event originates from the composer input

  The `useEscapeKeydown` hook was intercepting ESC key events globally, preventing other UI elements (like Radix dialogs) from responding to ESC. The handler now checks if the event target is within the composer input before calling `preventDefault()`.

- 01c31fe: chore: update dependencies
- Updated dependencies [01c31fe]
  - assistant-stream@0.2.43
  - assistant-cloud@0.1.10
  - @assistant-ui/tap@0.3.2

## 0.11.47

### Patch Changes

- 45d771f: fix(react): data-status stuck on running when smooth streaming disabled

## 0.11.46

### Patch Changes

- ab8953b: feat(react): add `allowNesting` option to allow wrapping runtimes with custom thread list adapters

## 0.11.45

### Patch Changes

- ec662cd: chore: update dependencies
- Updated dependencies [ec662cd]
  - assistant-stream@0.2.42
  - assistant-cloud@0.1.9
  - @assistant-ui/tap@0.3.1

## 0.11.44

### Patch Changes

- 4f6afef: feat: unified json schema

## 0.11.43

### Patch Changes

- f54c17b: feat: Viewport turnAnchor="top"

## 0.11.42

### Patch Changes

- 354c5c3: feat: MessageState.index
- c3ac004: fix: export `ComposerAttachmentDropzone` as `ComposerPrimitive.AttachmentDropzone`
  fix: prevent drag state flicker in `ComposerAttachmentDropzone`
- 282a596: feat: ThreadPrimitive.ScrollToBottom behavior prop

## 0.11.41

### Patch Changes

- 08430e8: feat(assistant-transport): support command enqueue inside onError/onCancel
  feat(assistant-transport): cancel queued commands on error

## 0.11.40

### Patch Changes

- 2c33091: chore: update deps
- Updated dependencies [2c33091]
  - assistant-stream@0.2.41
  - assistant-cloud@0.1.8
  - @assistant-ui/tap@0.2.2

## 0.11.39

### Patch Changes

- b408005: feat(react-ai-sdk): Integrate AI SDK v5 data parts in message content
- 7a6d9ca: fix: LocalThreadRuntime deleting branches during message reloads
- 70d5966: feat: allow storing runConfig with ThreadHistoryAdapter
- 3754bdd: refactor: rename toolUIs to tools and remove ToolUI API
- 0a4bdc1: feat: renamed `ResourceElementConstructor` to `Resource`, changed `ResourceElement.type` to be `Resource` instead of `ResourceFn`
- Updated dependencies [0a4bdc1]
  - @assistant-ui/tap@0.2.1

## 0.11.38

### Patch Changes

- 66a13a0: fix: separate scroll-to-bottom button from autoScroll behavior (#1916)
- 4e3877e: feat: Add thread fetching capability to remote thread list adapter
  - Add `fetch` method to `RemoteThreadListAdapter` interface
  - Implement `fetch` in cloud adapter to retrieve individual threads
  - Enhance `switchToThread` to automatically fetch and load threads not present in the current list
  - Add `get` method to `AssistantCloudThreads` for individual thread retrieval

- eef682b: fix(react): update check for scroll position in autoscroll
- Updated dependencies [4e3877e]
  - assistant-cloud@0.1.7

## 0.11.37

### Patch Changes

- 0ce129b: add scroll lock hook for reasoning component

## 0.11.36

### Patch Changes

- 3ab9484: feat: Toolkit API
- 7a88ead: chore: mark all old context API hooks as deprecated
- 81b581f: feat: display AI SDK errors
- 2fc7e99: chore: update deps
- Updated dependencies [dbc4ec7]
- Updated dependencies [2fc7e99]
  - @assistant-ui/tap@0.1.5
  - assistant-stream@0.2.39
  - assistant-cloud@0.1.6

## 0.11.35

### Patch Changes

- 2fc5c3d: feat: AssistantTransport wire format
- 04144dd: feat: useAssistantTransportState
- Updated dependencies [2fc5c3d]
  - assistant-stream@0.2.38

## 0.11.34

### Patch Changes

- 953db24: chore: update deps
- fix: submittedFeedback external message converter support
- Updated dependencies [953db24]
  - assistant-stream@0.2.37
  - assistant-cloud@0.1.5
  - @assistant-ui/tap@0.1.4

## 0.11.33

### Patch Changes

- refactor: move submittedFeedback to metadata, add ThreadMessageLike support

## 0.11.32

### Patch Changes

- fix: Cannot enqueue a chunk into a readable stream that is closed or has been requested to be closed

## 0.11.31

### Patch Changes

- chore: update deps
- Updated dependencies
  - assistant-stream@0.2.36
  - assistant-cloud@0.1.4
  - @assistant-ui/tap@0.1.3

## 0.11.30

### Patch Changes

- feat: add submittedFeedback ThreadAssistantMessage

## 0.11.29

### Patch Changes

- 92dfb0f: fix: update and maintain message levels on reparent

## 0.11.28

### Patch Changes

- fix: useExternalMessageConverter Tool subagent messages support

## 0.11.27

### Patch Changes

- e6a46e4: chore: update deps
- Updated dependencies [e6a46e4]
  - assistant-stream@0.2.34
  - assistant-cloud@0.1.3
  - @assistant-ui/tap@0.1.2

## 0.11.26

### Patch Changes

- feat: Add support for nested tool calls in assistant transport. Tool calls can now include a `messages` field containing nested `ThreadMessage[]`, enabling subagent tool calls to be automatically invoked by `useToolInvocations`.

## 0.11.25

### Patch Changes

- feat: ToolCallMessagePart.messages for subagent messages

## 0.11.24

### Patch Changes

- 4a1e4cf: Deprecate `autoSend` and `method` in favor of `send` and `clearComposer`

  ```tsx
  <ThreadPrimitive.Suggestion
    prompt="Tell me about React hooks"
    send // same as autoSend=true
    clearComposer // same as method="replace", defaults to true
  />
  ```

  When `send` and `clearComposer` are `false`, the suggestion is appended to existing user input

## 0.11.23

### Patch Changes

- 3caad00: refactor: rename interrupt -> human for tool input handling
- Updated dependencies [3caad00]
  - assistant-stream@0.2.33

## 0.11.22

### Patch Changes

- e8d6d7b: feat: revamp Assistant augmentation mechanism
- e81784b: feat: Tool Call interrupt() resume() API
- Updated dependencies [e81784b]
  - assistant-stream@0.2.32

## 0.11.21

### Patch Changes

- 7a020fa: fix: disallow branch switching during runs for most runtimes
- 7a020fa: feat: Add switchBranchDuringRun capability flag to control branch switching while running
- c5188d9: feat: revamp langgraph thread management integration

## 0.11.20

### Patch Changes

- 94fcc39: feat: Add custom commands support to useAssistantTransportRuntime

  Adds the ability to send custom commands through useAssistantTransportRuntime by:
  - Introducing a global augmentation pattern via `Assistant.Commands` interface
  - Adding `useAssistantTransportSendCommand` hook for sending custom commands
  - Supporting custom command types in the transport layer

  Users can now extend the Assistant interface to define their own command types:

  ```typescript
  declare global {
    interface Assistant {
      Commands: {
        myCommand: { type: "my-command"; data: string };
      };
    }
  }
  ```

## 0.11.19

### Patch Changes

- 2c6198a: fix: thread empty should return false while thread is loading
  fix: devtools hydration warning

## 0.11.18

### Patch Changes

- 057cdc7: fix: notify when suggestions change

## 0.11.17

### Patch Changes

- 2bbe604: feat: createMssageConverter toThreadMessages isRunning support

## 0.11.16

### Patch Changes

- cc9945b: feat: MessageProvider API

## 0.11.15

### Patch Changes

- d19ebab: feat(assistant-transport): surface stream errors to caller
- Updated dependencies [d19ebab]
  - assistant-stream@0.2.29

## 0.11.14

### Patch Changes

- feat: throttle only on stream resume
- Updated dependencies
  - assistant-stream@0.2.28

## 0.11.13

### Patch Changes

- 3ce485f: feat: add cancel handling and extend message types

## 0.11.12

### Patch Changes

- c4830cc: feat: assistant transport allow passing state in converter

## 0.11.11

### Patch Changes

- fix: make accumulator throttling smoother
- Updated dependencies
  - assistant-stream@0.2.27

## 0.11.10

### Patch Changes

- 367996e: fix: subscribe to scope identity changes

## 0.11.9

### Patch Changes

- 6c36e21: fix: react 18 compatibility for AssistantProvider API

## 0.11.8

### Patch Changes

- 0f21c70: feat: Attachment support for useAssistantTransportRuntime
- Updated dependencies [0f21c70]
  - assistant-stream@0.2.26

## 0.11.7

### Patch Changes

- 8f6fb59: feat: useAssistantTransportRuntime (experimental)
- d318c83: fix: ThreadMessageLike should prefer argsText if provided over json stringifying args

## 0.11.6

### Patch Changes

- 5cdfc9c: fix: TextContentPartProvider not updating when passed text changes

## 0.11.5

### Patch Changes

- 161db8b: fix: newThreadId should be null instead of undefined when empty
- 161db8b: fix: composer.add-attachment should only fire once
- 161db8b: feat: add wildcard event support to EventManager
  - Added support for wildcard "\*" event subscriptions to listen to all events
  - Wildcard listeners receive events in format: `{ event: string, payload: any }`
  - Updated type definitions to include "\*" as a valid event type
  - Modified emit method to trigger both specific and wildcard listeners

## 0.11.4

### Patch Changes

- effd817: fix: race condition in remote threadlist runtime

## 0.11.3

### Patch Changes

- 2e1815e: feat: select attachment by id

## 0.11.2

### Patch Changes

- 2d46069: chore: drop deprecated renamed fields

## 0.11.1

### Patch Changes

- 986b1c0: fix: attachments should not cause infinite rerenders
- 0534bc5: refactor: reorganize runtime files to prepare for part 2 of runtime rearchitecture
- Updated dependencies [0534bc5]
  - @assistant-ui/tap@0.1.1

## 0.11.0

### Minor Changes

- 5437dbe: feat: runtime rearchitecture (unified state API)

### Patch Changes

- 39ac2f3: feat: AI SDK v5 import support
- Updated dependencies [5437dbe]
  - @assistant-ui/tap@0.1.0

## 0.10.50

### Patch Changes

- 3498c99: feat: assistant cloud attachments support

## 0.10.49

### Patch Changes

- af2666a: fix: AssistantCloudThreadHistoryAdapter should be stateless

## 0.10.48

### Patch Changes

- ad53f5f: fix: ComposerInput does not auto focus on thread switch when using ExternalStoreRuntime

## 0.10.47

### Patch Changes

- 1f2ad24: fix: reset assistantOptimisticId on import
- 1f2ad24: fix: drop resetScheduled mechanism

## 0.10.46

### Patch Changes

- 25104d0: feat: MessageRepository should delete dangling messages on resetHead

## 0.10.45

### Patch Changes

- e242a06: feat: AssistantFrameHost, AssistantFrameProvider APIs
- e242a06: feat: ModelContextRegistry API

## 0.10.44

### Patch Changes

- 13684d5: feat: useExternalStoreRuntime improved reset handling

## 0.10.43

### Patch Changes

- a80dcff: feat: Add \*ByIndex primitives for direct indexed access

  Added new primitives that allow rendering individual items by index, improving performance and enabling more granular control:
  - `ThreadPrimitive.MessageByIndex` - Render a specific message by index
  - `MessagePrimitive.PartByIndex` - Render a specific message part by index
  - `MessagePrimitive.AttachmentByIndex` - Render a specific message attachment by index
  - `ComposerPrimitive.AttachmentByIndex` - Render a specific composer attachment by index
  - `ThreadListPrimitive.ItemByIndex` - Render a specific thread list item by index

  These primitives provide direct access to individual items without iterating through entire collections, and are now used internally by their parent components (Messages, Parts, Attachments, Items) for improved efficiency.

## 0.10.42

### Patch Changes

- 12e0a77: chore: update deps
- Updated dependencies [12e0a77]
  - assistant-stream@0.2.23
  - assistant-cloud@0.1.1

## 0.10.41

### Patch Changes

- eda5558: feat: AI SDK custom UIMessage type support

## 0.10.40

### Patch Changes

- 179f8b7: Add format parameter support to assistant-cloud client library
  - Add optional `format` query parameter to `AssistantCloudThreadMessages.list()` method
  - Update cloud history adapter to pass format parameter when loading messages
  - Enables backend-level message format conversion when supported by the cloud backend

- Updated dependencies [179f8b7]
  - assistant-cloud@0.1.0

## 0.10.39

### Patch Changes

- a4389da: feat: AI SDK v5 assistant-cloud thread history support

## 0.10.38

### Patch Changes

- 979ee67: feat: assistant cloud support for AI SDK v5

## 0.10.37

### Patch Changes

- f32b6a4: fix: new thread functionality no longer working with new threadlistruntime

## 0.10.36

### Patch Changes

- ed78407: Modified the `detach` and `cancelRun` methods to create a standardized `Error` object with a JSON-encoded message and a name of `"AbortError"`, improving consistency in how abort reasons are passed and processed.
- 77ce337: Fix polymorphic ref type error in `ComposerInput`
- f59959e: fix: add image message part support and sanitize function

## 0.10.35

### Patch Changes

- fix: threadListItemRuntime Method not implemented
- feat: support zod v4

## 0.10.34

### Patch Changes

- 0f063e0: chore: update dependencies
- 5d8b074: feat: MessagePrimitive.PartsGrouedp
- Updated dependencies [0f063e0]
  - assistant-stream@0.2.22
  - assistant-cloud@0.0.4

## 0.10.33

### Patch Changes

- fix: error on mount of local runtime

## 0.10.32

### Patch Changes

- fix: race condition in generateTitle when a newly running thread is detached

## 0.10.31

### Patch Changes

- fix: maintain chronological order for parts without parentId in PartsGroupedByParentId

## 0.10.30

### Patch Changes

- fix: race condition in RunController when using parentIds
- 3fb37f9: Fix internal dependency cycles
- Updated dependencies
  - assistant-stream@0.2.21

## 0.10.29

### Patch Changes

- 1f2fb01: fix: message id not found when using messageRepository in external store

## 0.10.28

### Patch Changes

- e92f7cc: feat: ExternalStoreAdapter.messageRepository API
- c823efe: feat: add `runtime.thread.reset()` method for clearing thread

## 0.10.27

### Patch Changes

- f23fdb6: feat: add parent ID grouping for message parts
- Updated dependencies [f23fdb6]
  - assistant-stream@0.2.20

## 0.10.26

### Patch Changes

- e359ffc: Fix circular dependency in ThreadMessageLike
- 2561cc0: fix: remove double onAddToolResult call in ExternalStoreThreadRuntimeCore
- 9793e64: fix: if tool calls have no argsText, assume empty object instead of crashing
- Updated dependencies [20a4649]
- Updated dependencies [9793e64]
  - assistant-stream@0.2.19

## 0.10.25

### Patch Changes

- 65b3ff1: chore: update deps
- 2731323: refactor: rename ContentPart to MessagePart
- 308afff: feat(react): add isLoading state to ThreadList and Thread runtimes
- cc9f567: feat: allow forwarding portal props for assistant modal content
- c380f37: feat: MessageContent.ToolGroup
- Updated dependencies [65b3ff1]
  - assistant-stream@0.2.18
  - assistant-cloud@0.0.3

## 0.10.24

### Patch Changes

- b65e354: docs: add JSDoc comments
- 8eda24b: performance: Memoize Array.from() calls in render methods
- 644abb8: chore: update deps
- Updated dependencies [644abb8]
  - assistant-stream@0.2.17
  - assistant-cloud@0.0.2

## 0.10.23

### Patch Changes

- 1b77d8a: fix: Add missing `useLocalThreadRuntime` export

## 0.10.22

### Patch Changes

- 5a86bda: feat(runtime): export `useLocalThreadRuntime` for more flexibility and runtime customization
- 7a65c80: feat(assistant-cloud): filesToPdf support
- Updated dependencies [51b8493]
  - assistant-stream@0.2.15

## 0.10.21

### Patch Changes

- 57b5735: fix: logic for ComposerPrimitive.Input disabled prop

## 0.10.20

### Patch Changes

- 8aa3020: Fix: Export missing adapter primitives
- f69ca69: fix(react): preserve message metadata in useThreadRuntime().append()

## 0.10.19

### Patch Changes

- d0867eb: fix(message): add missing condition in `MessageIf`
- 52e18bc: feat: addToolResponse ToolResponse support
- 52e18bc: fix: add support for artifact and isError for langgraph tool calls
- Updated dependencies [52e18bc]
  - assistant-stream@0.2.14

## 0.10.18

### Patch Changes

- 3ed39ef: feat: export MessagePartStatus

## 0.10.17

### Patch Changes

- fix: useInlineRender should correctly handle updates

## 0.10.16

### Patch Changes

- fix: Last is not a partial call attempt 3
- Updated dependencies
  - assistant-stream@0.2.13

## 0.10.15

### Patch Changes

- fix: add another workaround for Last is not a partial call
- Updated dependencies
  - assistant-stream@0.2.12

## 0.10.14

### Patch Changes

- fix: Last is not a partial call error
- Updated dependencies
  - assistant-stream@0.2.11

## 0.10.13

### Patch Changes

- 971b05c: feat: useCloudRuntime (wip)

## 0.10.12

### Patch Changes

- chore: update deps
- Updated dependencies
  - assistant-stream@0.2.10

## 0.10.11

### Patch Changes

- 6d214b9: add ComposerAttachmentDropzone component to enable file drag and drop

## 0.10.10

### Patch Changes

- 9811ff8: Introduced a new `ErrorPrimitive` component for displaying error messages in the UI, including `ErrorPrimitive.Root` and `ErrorPrimitive.Message`.

  Added `MessagePrimitive.Error` for rendering error states in messages.

- 1a4927a: feat: ThreadListItem.detach()

## 0.10.9

### Patch Changes

- fix: correctly forward state updates from ChatModelAdapter

## 0.10.8

### Patch Changes

- 5cb9598: feat(assistant-stream): ObjectStream
- Updated dependencies [5cb9598]
  - assistant-stream@0.2.7

## 0.10.7

### Patch Changes

- 621f35a: fix: patch Safari/iOS attachment issue by adding/removing input element to DOM
- Updated dependencies [0809c9f]
  - assistant-stream@0.2.6

## 0.10.6

### Patch Changes

- e63d574: feat: MessagePrimitive.If last

## 0.10.5

### Patch Changes

- e9f8e7e: feat: tighten tool args type to be object
- c4c60cf: fix: server-side tool results should be forwarded to StreamCallController
- 73a6ff1: feat: Tool.type
- Updated dependencies [c4c60cf]
- Updated dependencies [73a6ff1]
  - assistant-stream@0.2.5

## 0.10.4

### Patch Changes

- 98a680e: fix: allow import from route handlers
- 98a680e: chore: update deps
- Updated dependencies [98a680e]
  - assistant-stream@0.2.4

## 0.10.3

### Patch Changes

- 30ae924: fix: disabled tools should still execute if invoked

## 0.10.2

### Patch Changes

- fix: ESM without bundler compat

## 0.10.1

### Patch Changes

- fix: correctly include Typescript declarations

## 0.10.0

### Patch Changes

- 557c3f7: build: drop CJS builds

## 0.9.6

### Patch Changes

- chore: update deps

## 0.9.5

### Patch Changes

- chore: bump assistant-stream dependency
- 1ad0696: feat: assistant-ui update CLI command

## 0.9.4

### Patch Changes

- c77ef43: feat: assistant-ui update CLI command

## 0.9.3

### Patch Changes

- 62c2af7: feat: tool.streamCall API
- b9c731a: chore: update dependencies

## 0.9.2

### Patch Changes

- 553bdff: feat: early return ChatModelAdapter.run on cancellation
- c0c9422: feat: useToolArgsFieldStatus
- 675fb20: feat: export types from `external-store`
- 4e86ab4: fix: should allow sending assistant messages from the composer
- e893985: fix: allow useMessagePartText on reasoning parts
- 0500584: fix: make addResult typesafe

## 0.9.1

### Patch Changes

- chore: update deps

## 0.9.0

### Patch Changes

- afae5c9: refactor!: edge package split
- Updated dependencies [1f65c94]
- Updated dependencies [8df35f6]
- Updated dependencies [476cbfb]
  - assistant-stream@0.0.33

## 0.8.20

### Patch Changes

- Updated dependencies [545a17c]
  - assistant-stream@0.0.32

## 0.8.19

### Patch Changes

- 93c3eb4: fix: drop ToolResponseBrand
- Updated dependencies [93c3eb4]
  - assistant-stream@0.0.31

## 0.8.18

### Patch Changes

- a22bc7a: refactor: merge setResult and setArtifact to setResponse
- 39aecd7: chore: update dependencies
- Updated dependencies [a22bc7a]
- Updated dependencies [39aecd7]
  - assistant-stream@0.0.30

## 0.8.17

### Patch Changes

- feat: expose assitant-stream ToolResponse API
- Updated dependencies
  - assistant-stream@0.0.29

## 0.8.16

### Patch Changes

- 40579cd: feat: ToolResponse support
- Updated dependencies [40579cd]
  - assistant-stream@0.0.28

## 0.8.15

### Patch Changes

- fix: assistant-stream appendText must only append to the very last part
- Updated dependencies
  - assistant-stream@0.0.27

## 0.8.14

### Patch Changes

- feat: update resumeRun signature

## 0.8.12

### Patch Changes

- c4d7b29: feat: tool call artifacts
- 0962274: feat: ThreadRuntime.unstable_resumeRun
- Updated dependencies [c4d7b29]
  - assistant-stream@0.0.26

## 0.8.11

### Patch Changes

- Updated dependencies
  - assistant-stream@0.0.25

## 0.8.10

### Patch Changes

- Updated dependencies
  - assistant-stream@0.0.24

## 0.8.9

### Patch Changes

- fix: adjust message status even if no message-finish event is emitted

## 0.8.8

### Patch Changes

- 439ae67: fix: properly emit tool-call args-text finish
- Updated dependencies [439ae67]
  - assistant-stream@0.0.23

## 0.8.7

### Patch Changes

- ecc6afd: feat: ThreadHistoryAdapter.resume
- b07603d: feat: assistant-stream rewrite
- b07603d: feat: use assistant-stream
- Updated dependencies [b07603d]
  - assistant-stream@0.0.22

## 0.8.6

### Patch Changes

- f8a157a: Add support for dynamic headers in EdgeChatAdapter
- 2497388: fix: useAssistantInstructions should correctly update on disabled change

## 0.8.5

### Patch Changes

- chore: update deps

## 0.8.4

### Patch Changes

- 4f22af9: fix: infinite rerender bug with useThread

## 0.8.3

### Patch Changes

- 2e299b6: chore: update typescript

## 0.8.2

### Patch Changes

- feat: source message parts

## 0.8.1

### Patch Changes

- ba4a282: fix: cloud env variable loading

## 0.8.0

### Breaking changes

- pre-styled UI components have moved to `@assistant-ui/react-ui`
- run `npx assistant-ui upgrade` to update your codebase
- manual upgrade: change styled component imports from `@assistant-ui/react` to `@assistant-ui/react-ui` (and same with markdown)

* manual upgrade: change styled component imports from `@assistant-ui/react` to `@assistant-ui/react-ui` (and same with Markdown)

## 0.7.91

### Patch Changes

- feat: dispatch events for edit action; allow text area

## 0.7.90

### Patch Changes

- feat: makeAssistantVisible editable

## 0.7.89

### Patch Changes

- 5540aae: feat: local runtime SuggestionAdapter

## 0.7.88

### Patch Changes

- a36fd9e: fix: bind reset method

## 0.7.87

### Patch Changes

- e01b6cd: fix: remove reset() method on local-runtime
- 2dd5abc: feat: makeAssistantReadable
- 4531190: feat: ExportdMessageRepository.fromArray
- 400ff97: feat:thread.import() should reset the MessageRepository

## 0.7.86

### Patch Changes

- 4685652: feat: useToolArgsFieldStatus

## 0.7.85

### Patch Changes

- 3454871: fix: Vite bundler compat

## 0.7.84

### Patch Changes

- fix: pin nanoid version for CJS compat
- Updated dependencies
  - assistant-stream@0.0.21

## 0.7.83

### Patch Changes

- 54b631c: chore: update README

## 0.7.82

### Patch Changes

- 934ee4b: feat: anonymous login and auto-config for cloud

## 0.7.81

### Patch Changes

- 7f7ab5e: refactor: assitant-stream API
- Updated dependencies [7f7ab5e]
  - assistant-stream@0.0.20

## 0.7.80

### Patch Changes

- fix: relax ReadonlyJSONObject requirement on tool/toolUI

## 0.7.79

### Patch Changes

- fix: argsText parsing

## 0.7.78

### Patch Changes

- fix: result sometimes set to undefined

## 0.7.77

### Patch Changes

- f2a1e86: feat: unstable_humanToolNames

## 0.7.76

### Patch Changes

- fix: README

## 0.7.75

### Patch Changes

- 87fa024: fix: remove tailwind from peerdeps

## 0.7.74

### Patch Changes

- 61f278b: fix: drop tailwind peer dependency

## 0.7.73

### Patch Changes

- fix: return from createMessageConverter
- 86ba433: fix: ToolMessagePart.args should never be null

## 0.7.72

### Patch Changes

- 797ce9c: fix: ToolMessagePart.args should never be null

## 0.7.71

### Patch Changes

- 72e66db: chore: update dependencies
- Updated dependencies [72e66db]
  - assistant-stream@0.0.19

## 0.7.70

### Patch Changes

- 55a9cb2: fix: runConfig for reload / edits
- 2bc6781: feat: send toolCallId to the exeucte callback
- 2bc6781: feat: Tool.experimental_onSchemaValidationError
- 9fefc9d: feat: ThreadViewportContext & multiple renders of the same thread support

## 0.7.69

### Patch Changes

- a7a871e: feat: make ThreadPrimitive.Suggestion method optional
- a7a871e: fix: ThreadPrimitive.Suggestion no longer clears the composer
- a7a871e: feat: expose the useThreadViewportAutoScroll in the API

## 0.7.68

### Patch Changes

- eb4e13c: feat: useExternalMessageConverter megeConfig.joinStrategy

## 0.7.67

### Patch Changes

- ddf468e: fix: import path

## 0.7.66

### Patch Changes

- f4d71da: feat: Edge Runtime onResponse/onError/onfinish, sendExtraMessageFields, unstable_AISDKInterop=v2 support
- 16cd124: feat(local-runtime): native support for AssistantCloud

## 0.7.65

### Patch Changes

- a07d8c1: fix: thread auto-scroll reliability

## 0.7.64

### Patch Changes

- 6703842: feat: codemod to migrate to @assistant-ui/react-ui
- 79f7120: feat: createMessageConverter API

## 0.7.63

### Patch Changes

- 843047d: feat(thread-list): forward model context to thread runtimes

## 0.7.62

### Patch Changes

- 7e5f127: fix: useSmooth unnecessary re-renders

## 0.7.61

### Patch Changes

- bd78a70: feat: ThreadListPrimitive.Root
- 9ea8100: feat: ThreadMessageLike optional toolCallId + args

## 0.7.60

### Patch Changes

- 246ce4e: fix: export getExternalStoreMessages

## 0.7.59

### Patch Changes

- 8ec1f07: feat: AssistantCloudThreadHistoryAdapter
- 4f5d77f: feat: ToolCallMessagePart.args should be JSONObject
- 8ec1f07: feat: auto-inject history adapter in local runtime

## 0.7.58

### Patch Changes

- 02996f9: fix: support AISDKInterop + sendMessageId for human+system messages

## 0.7.57

### Patch Changes

- 103efee: fix: mark ChatAdapter types as readonly
- 60bb6ff: fix: memoize MessageRepository.getMessages()

## 0.7.56

### Patch Changes

- dba4dde: feat(ai-sdk): message.metadata.annotations
- efd60fe: fix(ai-sdk): onSwitchToThread

## 0.7.55

### Patch Changes

- 0bf5082: fix: tailwindcss plugin crashes without config

## 0.7.54

### Patch Changes

- 6cb7d10: refactor: rename ModelConfig to ModelContext
- c302933: feat: convertExternalMessages

## 0.7.53

### Patch Changes

- 7618bf3: feat: AI SDK DataStream ReasoningDelta, StartStep support

## 0.7.52

### Patch Changes

- fix: excessive number of classes included via tailwindcss plugin

## 0.7.51

### Patch Changes

- fix: crash when message part is empty

## 0.7.50

### Patch Changes

- fix: properly forward unstable_shouldContinueIgnoreToolNames

## 0.7.49

### Patch Changes

- feat(local-runtime): add temporary shouldContinueIgnoreToolNames override

## 0.7.48

### Patch Changes

- fix: crash

## 0.7.47

### Patch Changes

- a3c6c1a: feat: ensure runtime methods are bound to the object
- a76ea0e: feat: AttachmentAdapter file upload progress update support via generator add callback
- a3c6c1a: feat: useRuntimeState API

## 0.7.46

### Patch Changes

- fix: improved interrupt+Command support
- feat: MessagesFooter UI
- 2713487: feat: styled UI assistant message footer

## 0.7.45

### Patch Changes

- 9934aef: feat(cloud-threadlist): auto initialize threads
- 3a8b55a: feat: styled UI assistant message footer

## 0.7.44

### Patch Changes

- 2f44e9e: refactor: move switchToThread / switchToNewThread to runtime.threads
- 2f44e9e: refactor: rename runtime.threadList to runtime.threads
- 2f44e9e: refactor: drop CloudThreadListItemRuntime
- 2f44e9e: feat: add threads.getById and threads.main
- 2f44e9e: feat: ThreadListItemRuntime.initialize()

## 0.7.43

### Patch Changes

- feat: reverse order of threads in useRemoteThreadListRuntime

## 0.7.42

### Patch Changes

- 9c3961d: fix: event subscriptions triggering on threadList changes

## 0.7.41

### Patch Changes

- 08de9c9: fix: RemoteThreadList should not return an iterator

## 0.7.40

### Patch Changes

- feat: export useRemoteThreadListRuntime

## 0.7.39

### Patch Changes

- 0979334: feat(local-runtime): New ThreadList items should appear at the top of the list
- 22272e6: chore: update dependencies
- Updated dependencies [b44a7ad]
- Updated dependencies [22272e6]
  - assistant-stream@0.0.18

## 0.7.38

### Patch Changes

- 5794b1b: feat: CreateStartRunConfig

## 0.7.37

### Patch Changes

- 799dc79: feat: AppendMessage.sourceId
- 799dc79: feat: StartRunConfig.sourceId

## 0.7.36

### Patch Changes

- 34d2915: feat: widen initialMessages type to ThreadMessageLike
- 4f3834a: refactor: deprecate UIMessagePart
- b8b11d3: feat: FileMessagePart
- 889a55e: fix: attachment filename should never overflow
- a7d9e41: feat: ComposerRuntime.unstable_on("attachment_add", ...)

## 0.7.35

### Patch Changes

- 345f3d5: chore: update dependencies
- 345f3d5: fix: import errors in react server environments
- 2846559: feat: allow selecting multiple files as attachments

## 0.7.34

### Patch Changes

- 9a3dc93: fix(external-store): metadata & attachments support
- 4c2bf58: chore: update dependencies

## 0.7.33

### Patch Changes

- bb47b90: fix: invalid JSON in argsText should be gracefully handled

## 0.7.32

### Patch Changes

- feat: MessagePrimitive.tools.Override

## 0.7.31

### Patch Changes

- fix: data results should be forwarded via LocalThreadRuntime

## 0.7.30

### Patch Changes

- 982a6a2: chore: update dependencies

## 0.7.29

### Patch Changes

- 75a274f: feat: AssistantRuntimeCore.RenderComponent
- dcf51cb: fix: do not throw on AI SDK annotation packets
- 9ad9e75: fix: mark arrays in message types as readonly
- 75a274f: refactor: drop AssistantRuntimeCore.Provider due to causing app rerenders on runtime switch
- 65de5d6: feat: message.metadata.unstable_data

## 0.7.28

### Patch Changes

- a8ac203: feat: export useThreadListItemRuntime

## 0.7.27

### Patch Changes

- 528cfd3: feat: ExternalStoreAdapter.unstable_Provider
- 3c70ea1: feat: allow customizing thread max width

## 0.7.26

### Patch Changes

- 6a17ec2: feat: useAssistantInstructions disable support

## 0.7.25

### Patch Changes

- 798e9f3: fix: AttachmentRemove should not trigger AttachmentPreviewDialog
- 37e1abc: feat: ComposerRuntime.clearAttachments
- d6b3b79: feat: useRemoteThreadListRuntime

## 0.7.24

### Patch Changes

- fix: ComposerRuntime.send() should not reset role or runConfig

## 0.7.23

### Patch Changes

- feat(edge-runtime): pass RunConfig to backend

## 0.7.22

### Patch Changes

- feat: RunConfig

## 0.7.21

### Patch Changes

- feat: Composer.unstable_on("send", callback)

## 0.7.20

### Patch Changes

- 2c7dec0: feat: useAssistantTool allow disabling tools

## 0.7.19

### Patch Changes

- ec3b8cc: chore: update dependencies

## 0.7.18

### Patch Changes

- 1b16dce: fix: thread initialization
- b0f309a: feat: allow specifying Empty component in thread-config

## 0.7.17

### Patch Changes

- fix: toLanguageModelMessages should include attachments

## 0.7.16

### Patch Changes

- fix: ensure message status is set on runResultStream flush

## 0.7.15

### Patch Changes

- fix: toolResultStream should support JSONSchema params

## 0.7.14

### Patch Changes

- fix: assistantDecoderStream should end current tool call on flush

## 0.7.12

### Patch Changes

- 4c54273: chore: update dependencies
- 4c54273: fix: initialize thread on import

## 0.7.11

### Patch Changes

- 0f88efb: fix: external store thread list should not crash

## 0.7.10

### Patch Changes

- 1eab7b4: refactor: ThreadList

## 0.7.9

### Patch Changes

- 2276e57: fix: cjs builds
- e8752ac: fix: ThreadList a11y improvements

## 0.7.8

### Patch Changes

- 589d37b: feat: ThreadList / ThreadListItem UI
- 2112ce8: chore: update dependencies

## 0.7.7

### Patch Changes

- 10d70db: fix: remove console.log
- c3027a0: fix: disallow nested ThreadConfigs

## 0.7.6

### Patch Changes

- 933b8c0: chore: update deps
- 09a2a38: fix: TextMessagePartProvider should support MessagePartRuntime.getState()

## 0.7.5

### Patch Changes

- c59d8b5: chore: update dependencies

## 0.7.4

### Patch Changes

- 5462390: fix: Thread.Messages AssistantEditComposer support
- 0fb80c1: feat: ThreadConfig.UserMessage / AssistantMessage / EditComposer

## 0.7.3

### Patch Changes

- 0dcd9cf: feat: mark message types as readonly

## 0.7.2

### Patch Changes

- 7fa9a1b: feat: ThreadMessageLike metadata support
- 1a1f4a5: feat: message metadata for all message types

## 0.7.1

### Patch Changes

- c2f75e5: feat: ThreadListRuntime API types

## 0.7.0

### Breaking Changes

- c6e886b: refactor!: drop deprecated features

### Patch Changes

- 2912fda: feat: ThreadListItemPrimitive

## 0.5.100

### Patch Changes

- b5f92fe: fix(external-store): crash on cancel when using separate converter, fix branching

## 0.5.99

### Patch Changes

- cdcfe1e: feat: ThreadListItemPrimitive (wip)
- cdcfe1e: fix: add React 19 RC to peerDeps
- 94feab2: feat: ComposerState.role / ComposerRuntime.setRole
- 472c548: feat: ThreadListPrimitive
- 14da684: feat: AppendMessage.startRun flag
- 1ada091: chore: update deps

## 0.5.98

### Patch Changes

- ff5b86c: build: refactor build script into @assistant-ui/tsbuildutils
- ff5b86c: fix: better ESM compatibility
- ff5b86c: chore: update deps

## 0.5.97

### Patch Changes

- 9a9c01d: feat(edge-runtime): add unstable_AISDKInterop flag

## 0.5.96

### Patch Changes

- fix: properly pass initialMessages to LocalRuntime

## 0.5.95

### Patch Changes

- fix: include generated css files in bundle

## 0.5.94

### Patch Changes

- fix: toMessagePartStatus support for parallel tool calls

## 0.5.93

### Patch Changes

- d2375cd: build: disable bundling in UI package releases

## 0.5.92

### Patch Changes

- f6d197a: feat: Edge Runtime Server Accessible Ids (temp)

## 0.5.91

### Patch Changes

- 56f80fa: fix: tailwind plugin turbopack interop

## 0.5.90

### Patch Changes

- 2090544: fix: attachments infinite rerender bug
- be04b5b: feat: Unstable_AudioMessagePart (wip)
- 2090544: fix: Attachment preview accessibility
- fb32e61: chore: update deps
- fb32e61: feat: react-19 support

## 0.5.89

### Patch Changes

- fd9ff67: fix(local-runtime): update capabilities on initial render

## 0.5.88

### Patch Changes

- 0afecda: fix(ai-sdk): server-side maxSteps interop

## 0.5.87

### Patch Changes

- b38165d: feat: export useAttachmentRuntime, useAttachment, FeedbackAdapter
- a1bfd26: fix(ai-sdk): DataStream interop without tool call streaming
- b38165d: feat(ai-sdk): Adapters support (attachment, feedback, speech, threadManager)

## 0.5.86

### Patch Changes

- fix: do not cache adapter in useEdgeRuntime

## 0.5.85

### Patch Changes

- 3a602b9: fix: correctly handle new thread creation

## 0.5.84

### Patch Changes

- ba5116f: feat: useInlineRender hook

## 0.5.83

### Patch Changes

- c38a018: feat: ThreadListRuntime

## 0.5.82

### Patch Changes

- 0edadd1: feat: useThreadModelConfig API
- 1aeda53: feat: Runtime.path API
- 0c8277e: feat: MessageRuntime.unstable_getCopyText API
- 91d3951: feat: MessageRuntime.getMessagePartByToolCallId
- cf6861c: refactor!: simplify SpeechSynthesisAdapter to accept a text string
- 7c76939: feat: ThreadRuntime.getMesssageById

## 0.5.79

### Patch Changes

- feat: allow out of order tool args streaming

## 0.5.78

### Patch Changes

- dba0082: fix: border should apply to all aui-root children
- b182ea5: feat: Events API (experimental)

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

- 55942d8: fix: useMessagePartText backwards compat type
- e455aff: feat: FollowupSuggestions
- f7c156b: feat: mark new runtime API methods as stable
- f6a832e: chore: update dependencies
- 2b7c6fe: refactor: define interface types for the new runtime API

## 0.5.70

### Patch Changes

- 3df0061: fix: TextMessagePartProvider missing fields

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

- 0f547a9: fix: useSmooth should work inside TextMessagePartProvider

## 0.5.58

### Patch Changes

- 6507071: fix: TextMessagePartProvider text streaming support
- 6507071: feat: TextMessagePartProvider isRunning

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

- c0f975a: feat: TextMessagePartProvider

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
- 2d7a8bd: fix: text message part data-status field

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

- de20b1c: feat!: MessagePartText is now a <p> element
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

- a6769d5: feat: MessagePartComponent types
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
