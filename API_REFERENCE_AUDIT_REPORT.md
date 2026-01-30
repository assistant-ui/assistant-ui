# API Reference Documentation Audit Report
**Date:** 2026-01-30
**File Audited:** `apps/docs/content/docs/(reference)/api-reference/overview.mdx`
**Status:** ⚠️ OUTDATED - Significant gaps identified

## Executive Summary

The API reference overview documentation is significantly outdated. The codebase has evolved substantially, particularly with the introduction of the new `@assistant-ui/store` package and numerous new adapters, primitives, and utilities that are not documented.

**Critical Missing Items:**
- 🚨 NEW: `@assistant-ui/store` package exports (`useAui`, `AuiProvider`, `useAuiState`, `useAuiEvent`, `AuiIf`)
- Multiple new adapters (5+)
- Many new primitive components (~30+)
- Numerous utility hooks
- Extended LangGraph integration hooks

---

## 1. CRITICAL: New Store-Based Architecture (Missing Entirely)

### `@assistant-ui/store` Package
The new centralized state management system is **not documented at all**:

**Missing Exports:**
- `useAui()` - Main hook to access the assistant client and runtime
- `AuiProvider` - New context provider for centralized state (alternative/replacement for AssistantRuntimeProvider)
- `useAuiState(selector)` - Access assistant state with selectors (replaces many deprecated `use*` hooks)
- `useAuiEvent(event, callback)` - Subscribe to assistant events
- `AuiIf` - Conditional rendering component (replaces `AssistantIf`)

**Deprecated Aliases (v0.12 → v0.13):**
- `useAssistantApi` → `useAui`
- `useAssistantState` → `useAuiState`
- `useAssistantEvent` → `useAuiEvent`
- `AssistantIf` → `AuiIf`

**Impact:** HIGH - This is the new recommended architecture

---

## 2. Missing Runtime APIs

### AI SDK Integration (`@assistant-ui/react-ai-sdk`)
**Missing:**
- `frontendTools` - Tool utilities for AI SDK

### LangGraph Integration (`@assistant-ui/react-langgraph`)
**Currently Documented:** `useLangGraphRuntime`

**Missing:**
- `useLangGraphMessages()` - Message management for LangGraph
- `useLangGraphSend()` - Send messages to LangGraph
- `useLangGraphSendCommand()` - Send commands to LangGraph
- `useLangGraphInterruptState()` - Get interrupt state for LangGraph
- `convertLangChainMessages()` - Convert LangChain messages
- `LangGraphMessageAccumulator` - Accumulate LangGraph messages
- `appendLangChainChunk()` - Append LangChain chunks

### External Store Runtime
**Currently Documented:** `useExternalStoreRuntime`, `createMessageConverter`

**Missing:**
- `useExternalMessageConverter()` - Hook version of message converter
- `getExternalStoreMessage()` - Get single converted message
- `getExternalStoreMessages()` - Get multiple converted messages
- `unstable_convertExternalMessages()` - Convert external messages

### Thread List Runtime
**Currently Documented:** `useRemoteThreadListRuntime`, `useCloudThreadListRuntime`

**Missing:**
- `unstable_useRemoteThreadListRuntime()` - Properly prefixed as unstable
- `unstable_useCloudThreadListAdapter()` - Cloud adapter for thread list

### Transport Runtime (Not Documented)
**Missing:**
- `useAssistantTransportRuntime()` - Runtime for custom transport protocol
- `useAssistantTransportSendCommand()` - Send commands via transport
- `useAssistantTransportState()` - Access transport state

---

## 3. Missing Runtime Adapters

### Currently Documented
✅ AttachmentAdapter (type)
✅ SimpleImageAttachmentAdapter
✅ SimpleTextAttachmentAdapter
✅ CompositeAttachmentAdapter
✅ FeedbackAdapter (type)
✅ SpeechSynthesisAdapter (type)
✅ WebSpeechSynthesisAdapter

### Missing Adapters
❌ **CloudFileAttachmentAdapter** - Cloud file attachment handling
❌ **DictationAdapter (type)** - Dictation interface
❌ **WebSpeechDictationAdapter** - Browser Web Speech API dictation
❌ **MessageFormatAdapter** - Convert message formats
❌ **ThreadHistoryAdapter** - Manage thread history
❌ **SuggestionAdapter (type)** - Provide suggestions

### Missing Adapter-Related APIs
❌ **useAssistantCloudThreadHistoryAdapter()** - Adapter for cloud thread history
❌ **useRuntimeAdapters()** - Access registered runtime adapters
❌ **RuntimeAdapterProvider** - Context provider for adapters

---

## 4. Missing Context Hooks & Utilities

### Message Part Utilities (Mostly Missing)
**Currently Documented:**
- `useMessagePart` (documented as `useContentPart`)
- `useMessagePartText` (documented as `useContentPartText`)
- `useMessagePartReasoning` (documented as `useContentPartReasoning`)
- `useMessagePartRuntime` (documented as `useContentPartRuntime`)

**Missing:**
- `useMessagePartSource()` - Access source message part
- `useMessagePartFile()` - Access file message part
- `useMessagePartImage()` - Access image message part
- `useMessagePartData()` - Access custom data message parts
- `useScrollLock()` - Lock scroll on reasoning parts

### Attachment Hooks (Missing Granular Versions)
**Currently Documented:** `useAttachment`, `useAttachmentRuntime`

**Missing:**
- `useThreadComposerAttachmentRuntime()` - Thread composer attachment runtime
- `useEditComposerAttachmentRuntime()` - Edit composer attachment runtime
- `useMessageAttachmentRuntime()` - Message attachment runtime
- `useThreadComposerAttachment()` - Thread composer attachment state
- `useEditComposerAttachment()` - Edit composer attachment state
- `useMessageAttachment()` - Message attachment state

### Viewport & Layout Utilities
**Currently Documented:** `useThreadViewport`, `useThreadViewportStore`

**Documentation Issue:** `useThreadViewportAutoscroll` should be `useThreadViewportAutoScroll` (capital S)

**Missing:**
- `useActionBarFloatStatus()` - Determine if action bar should float
- `useOnScrollToBottom()` - Detect scroll to bottom
- `useOnResizeContent()` - Handle content resize

### Composer Utilities
**Missing:**
- `useComposerSend()` - Access composer send functionality

### Model Context & Tools
**Currently Documented:** `useAssistantInstructions`, `useAssistantTool`, `useAssistantToolUI`

**Missing:**
- `makeAssistantTool()` - Create assistant tool
- `makeAssistantToolUI()` - Create assistant tool UI
- `useToolUIs()` - Programmatically access registered tool UIs (Experimental)
- `useToolUIsStore()` - Tool UIs store access (Experimental)
- `ModelContextRegistry` - Registry for tool UIs
- `ModelContextRegistryHandles` - Handles for registry operations
- `useToolArgsFieldStatus()` - Get tool argument field status

### Smooth Animation System (Not Documented)
**Missing:**
- `useSmooth()` - Smooth value transitions
- `useSmoothStatus()` - Smooth status transitions
- `withSmoothContextProvider()` - Wrap with smooth context
- `SmoothContextProvider` - Context provider for smooth animations

### Other Missing Utilities
**Currently Documented:** `useInlineRender`

**Missing:**
- `useAssistantFrameHost()` - Host for assistant frames
- `useMessageUtils()` - Message utility functions
- `useMessageUtilsStore()` - Message utils store access
- `usePopoverScope()` - Popover scope (AssistantModal)
- `useDropdownMenuScope()` - Dropdown menu scope
- `useManagedRef()` - Managed ref hook
- `useSizeHandle()` - Handle size changes
- `useRunManager()` - Manage run execution
- `useToolInvocations()` - Handle tool invocations
- `useCommandQueue()` - Queue commands for execution
- `useConvertedState()` - Convert state from one format to another
- `useLatestRef()` - Get latest ref value in effects

---

## 5. Missing Primitive Components

### ThreadPrimitive
**Currently Documented:** Root, Viewport, Messages, ScrollToBottom, Empty, Suggestion

**Missing:**
- `ThreadPrimitive.ViewportProvider` - Viewport state provider
- `ThreadPrimitive.MessageByIndex` - Render specific message
- `ThreadPrimitive.ViewportFooter` - Footer in viewport
- `ThreadPrimitive.ViewportSlack` - Slack space in viewport
- `ThreadPrimitive.Suggestions` - Container for suggestions
- `ThreadPrimitive.SuggestionByIndex` - Render specific suggestion
- `ThreadPrimitive.If` - Conditional rendering

### MessagePrimitive
**Currently Documented:** Root, Parts, Attachments

**Missing:**
- `MessagePrimitive.PartByIndex` - Render specific part
- `MessagePrimitive.Content` - Alias for Parts
- `MessagePrimitive.AttachmentByIndex` - Render specific attachment
- `MessagePrimitive.Error` - Error display
- `MessagePrimitive.Unstable_PartsGrouped` - Grouped parts (experimental)
- `MessagePrimitive.Unstable_PartsGroupedByParentId` - Parts grouped by parent (experimental)
- `MessagePrimitive.If` - Conditional rendering

### MessagePartPrimitive
**Currently Documented:** Text

**Missing:**
- `MessagePartPrimitive.Image` - Image message part
- `MessagePartPrimitive.InProgress` - In-progress indicator

### ComposerPrimitive
**Currently Documented:** Root, Input, Send, Cancel, Attachments, AddAttachment

**Missing:**
- `ComposerPrimitive.AttachmentByIndex` - Render specific attachment
- `ComposerPrimitive.AttachmentDropzone` - Drag & drop zone
- `ComposerPrimitive.Dictate` - Start dictation
- `ComposerPrimitive.StopDictation` - Stop dictation
- `ComposerPrimitive.DictationTranscript` - Show transcript
- `ComposerPrimitive.If` - Conditional rendering

### AttachmentPrimitive
**Currently Documented:** Root, Name, Delete (❌ INCORRECT - should be "Remove"), Thumb (marked as unstable)

**Corrections Needed:**
- ❌ `AttachmentPrimitive.Delete` → Should be `AttachmentPrimitive.Remove`
- ❌ `AttachmentPrimitive.Thumb` → Should be `AttachmentPrimitive.unstable_Thumb`

### ActionBarPrimitive
**Currently Documented:** Root, Copy, Edit, Reload, Speak, StopSpeaking, FeedbackPositive, FeedbackNegative

**Missing:**
- `ActionBarPrimitive.ExportMarkdown` - Export as markdown button

### ActionBarMorePrimitive (Not Documented)
**Entire namespace missing:**
- `ActionBarMorePrimitive.Root` - Main dropdown menu
- `ActionBarMorePrimitive.Trigger` - Menu trigger button
- `ActionBarMorePrimitive.Content` - Menu content
- `ActionBarMorePrimitive.Item` - Menu item
- `ActionBarMorePrimitive.Separator` - Menu separator

### BranchPickerPrimitive
**Currently Documented:** Root, Previous, Number, Next

**Missing:**
- `BranchPickerPrimitive.Count` - Total branches count

### ThreadListPrimitive
**Currently Documented:** Root, New, Items

**Missing:**
- `ThreadListPrimitive.ItemByIndex` - Render specific thread item

### ThreadListItemPrimitive
**Currently Documented:** Root, Trigger, Name (❌ INCORRECT), Archive, Unarchive, Delete, Rename (❌ DOES NOT EXIST)

**Corrections Needed:**
- ❌ `ThreadListItemPrimitive.Name` → Should be `ThreadListItemPrimitive.Title`
- ❌ `ThreadListItemPrimitive.Rename` → **Does not exist in codebase** (should be removed)

### ThreadListItemMorePrimitive (Not Documented)
**Entire namespace missing:**
- `ThreadListItemMorePrimitive.Root` - Main dropdown menu
- `ThreadListItemMorePrimitive.Trigger` - Menu trigger button
- `ThreadListItemMorePrimitive.Content` - Menu content
- `ThreadListItemMorePrimitive.Item` - Menu item
- `ThreadListItemMorePrimitive.Separator` - Menu separator

### SuggestionPrimitive (Not Documented)
**Entire namespace missing:**
- `SuggestionPrimitive.Trigger` - Suggestion clickable area
- `SuggestionPrimitive.Title` - Suggestion title
- `SuggestionPrimitive.Description` - Suggestion description

### ErrorPrimitive (Not Documented)
**Entire namespace missing:**
- `ErrorPrimitive.Root` - Main error component
- `ErrorPrimitive.Message` - Error message display

### MarkdownText
**Currently Documented:** MarkdownText

**Status:** ✅ Correctly documented

---

## 6. Cloud API Documentation Issues

### AssistantCloud
**Currently Documented:** Listed but not detailed

**Needs Expansion:**
The documentation should include:
- `AssistantCloud(config: AssistantCloudConfig)` constructor
- Properties: `threads`, `auth`, `runs`, `files`
- Nested classes:
  - `AssistantCloudAPI` - Base API client
  - `AssistantCloudAuthStrategy` - Authentication strategy handler
  - `AssistantCloudAuthTokens` - Token management
  - `AssistantCloudThreads` - Thread operations
  - `AssistantCloudRuns` - Run operations
  - `AssistantCloudFiles` - File operations
- Types: `CloudMessage`

---

## 7. Internal/Experimental APIs (Optional Documentation)

These exist in the codebase but may be intentionally undocumented:

### Internal Context Providers
- `MessageByIndexProvider`
- `PartByIndexProvider`
- `MessageAttachmentByIndexProvider`
- `ComposerAttachmentByIndexProvider`
- `SuggestionByIndexProvider`
- `ThreadListItemByIndexProvider`
- `ThreadListItemRuntimeProvider`
- `ThreadPrimitiveViewportProvider`

### Runtime Cores (Internal)
- `ComposerRuntimeCore`
- `ThreadRuntimeCore`
- `AddToolResultOptions`
- `SubmitFeedbackOptions`
- `ThreadSuggestion`

---

## 8. Documentation Naming & Link Issues

### Incorrect Names
1. ❌ `AttachmentPrimitive.Delete` → ✅ `AttachmentPrimitive.Remove`
2. ❌ `ThreadListItemPrimitive.Name` → ✅ `ThreadListItemPrimitive.Title`
3. ❌ `useThreadViewportAutoscroll` → ✅ `useThreadViewportAutoScroll`
4. ❌ `useContentPart` → ✅ `useMessagePart`
5. ❌ `useContentPartText` → ✅ `useMessagePartText`
6. ❌ `useContentPartReasoning` → ✅ `useMessagePartReasoning`
7. ❌ `useContentPartRuntime` → ✅ `useMessagePartRuntime`

### Non-Existent APIs
1. ❌ `ThreadListItemPrimitive.Rename` - Does not exist, should be removed

### "Work in Progress" Notice
The page has a callout stating "This page is under construction. Most links will not work yet." This should be updated or removed once the documentation is complete.

---

## 9. Recommendations

### Priority 1 (Critical) 🔴
1. **Document the new `@assistant-ui/store` architecture**
   - Add section for `AuiProvider`, `useAui`, `useAuiState`, `useAuiEvent`, `AuiIf`
   - Mark deprecated aliases
   - Explain migration path from old hooks

2. **Fix incorrect component names**
   - `AttachmentPrimitive.Remove` (not Delete)
   - `ThreadListItemPrimitive.Title` (not Name)
   - Remove `ThreadListItemPrimitive.Rename` (doesn't exist)

3. **Add missing adapter categories**
   - Dictation adapters
   - Cloud file adapter
   - Message format adapter
   - Thread history adapter
   - Suggestion adapter

### Priority 2 (High) 🟡
4. **Complete primitive documentation**
   - ActionBarMorePrimitive namespace
   - ThreadListItemMorePrimitive namespace
   - SuggestionPrimitive namespace
   - ErrorPrimitive namespace
   - Missing primitive children (ByIndex, If, etc.)

5. **Add missing LangGraph hooks**
   - All 4+ missing LangGraph integration hooks

6. **Document utility hooks**
   - Smooth animation system
   - Message part utilities
   - Viewport utilities

### Priority 3 (Medium) 🟢
7. **Expand Cloud API documentation**
   - Full AssistantCloud class structure
   - Properties and methods

8. **Add Transport Runtime section**
   - Transport runtime hooks

9. **Document experimental/unstable APIs**
   - Mark them clearly as experimental
   - Explain stability guarantees

### Priority 4 (Low) ⚪
10. **Consider documenting internal APIs**
    - If useful for advanced users
    - Clearly mark as internal/unsupported

---

## 10. Suggested Documentation Structure

```markdown
## Runtime API

### State Management (@assistant-ui/store) 🆕
- AuiProvider
- useAui
- useAuiState
- useAuiEvent
- AuiIf

### AI SDK (@assistant-ui/react-ai-sdk)
- useAISDKRuntime
- useChatRuntime
- frontendTools

### Data Stream (@assistant-ui/react-data-stream)
- useDataStreamRuntime
- useCloudRuntime
- toLanguageModelMessages

### LangGraph (@assistant-ui/react-langgraph)
- useLangGraphRuntime
- useLangGraphMessages
- useLangGraphSend
- useLangGraphSendCommand
- useLangGraphInterruptState
- convertLangChainMessages
- LangGraphMessageAccumulator
- appendLangChainChunk

### Local Runtime
- useLocalRuntime

### External Store Runtime
- useExternalStoreRuntime
- useExternalMessageConverter
- createMessageConverter

### Transport Runtime 🆕
- useAssistantTransportRuntime
- useAssistantTransportSendCommand
- useAssistantTransportState

### Thread List Runtime
- unstable_useRemoteThreadListRuntime
- useCloudThreadListRuntime

### Assistant Stream (Framework-Agnostic)
- toGenericMessages
- toToolsJSONSchema
- GenericMessage

## Runtime Adapters

### Attachment
- AttachmentAdapter
- SimpleImageAttachmentAdapter
- SimpleTextAttachmentAdapter
- CompositeAttachmentAdapter
- CloudFileAttachmentAdapter 🆕

### Feedback
- FeedbackAdapter

### Speech
- SpeechSynthesisAdapter
- WebSpeechSynthesisAdapter

### Dictation 🆕
- DictationAdapter
- WebSpeechDictationAdapter

### Message Format 🆕
- MessageFormatAdapter

### Thread History 🆕
- ThreadHistoryAdapter
- useAssistantCloudThreadHistoryAdapter

### Suggestions 🆕
- SuggestionAdapter

## Cloud API

### AssistantCloud
- Constructor & Configuration
- Properties (threads, auth, runs, files)
- Nested Classes

## Context Providers

### Highest Level
- AssistantRuntimeProvider (Legacy)
- AuiProvider (Recommended) 🆕

### Mid-Level
- TextMessagePartProvider
- SmoothContextProvider 🆕

## Context Hooks

### Assistant Context
- useAssistantRuntime
- useAssistantInstructions
- Tool APIs (makeAssistantTool, makeAssistantToolUI, useAssistantTool, useAssistantToolUI, useToolUIs, useToolUIsStore)

### Thread Context
- useThread (⚠️ deprecated - use useAuiState)
- useThreadRuntime
- useThreadComposer
- useThreadModelContext
- useThreadViewport
- useThreadViewportStore
- useThreadViewportAutoScroll

### Composer Context
- useComposer (⚠️ deprecated - use useAuiState)
- useComposerRuntime
- useComposerSend 🆕

### Message Context
- useMessage (⚠️ deprecated - use useAuiState)
- useMessageRuntime
- useEditComposer
- useMessageUtils 🆕
- useMessageUtilsStore 🆕

### MessagePart Context
- useMessagePart
- useMessagePartRuntime
- useMessagePartText
- useMessagePartReasoning
- useMessagePartSource 🆕
- useMessagePartFile 🆕
- useMessagePartImage 🆕
- useMessagePartData 🆕

### Attachment Context
- useAttachment
- useAttachmentRuntime
- useThreadComposerAttachment 🆕
- useEditComposerAttachment 🆕
- useMessageAttachment 🆕
- (and their Runtime variants)

### ThreadListItem Context
- useThreadListItem
- useThreadListItemRuntime

## Primitives

### ThreadPrimitive
- Root, Viewport, ViewportProvider 🆕, Messages, MessageByIndex 🆕
- ScrollToBottom, Empty, ViewportFooter 🆕, ViewportSlack 🆕
- Suggestion, Suggestions 🆕, SuggestionByIndex 🆕
- If 🆕

### MessagePrimitive
- Root, Parts, Content 🆕, PartByIndex 🆕
- Attachments, AttachmentByIndex 🆕
- Error 🆕
- Unstable_PartsGrouped 🆕, Unstable_PartsGroupedByParentId 🆕
- If 🆕

### MessagePartPrimitive
- Text, Image 🆕, InProgress 🆕

### ComposerPrimitive
- Root, Input, Send, Cancel
- Attachments, AttachmentByIndex 🆕, AddAttachment, AttachmentDropzone 🆕
- Dictate 🆕, StopDictation 🆕, DictationTranscript 🆕
- If 🆕

### AttachmentPrimitive
- Root, Name, Remove (not Delete!), unstable_Thumb

### ActionBarPrimitive
- Root, Copy, Edit, Reload, Speak, StopSpeaking
- FeedbackPositive, FeedbackNegative
- ExportMarkdown 🆕

### ActionBarMorePrimitive 🆕
- Root, Trigger, Content, Item, Separator

### BranchPickerPrimitive
- Root, Previous, Next, Number, Count 🆕

### ThreadListPrimitive
- Root, New, Items, ItemByIndex 🆕

### ThreadListItemPrimitive
- Root, Trigger, Title (not Name!), Archive, Unarchive, Delete
- (Remove Rename - doesn't exist)

### ThreadListItemMorePrimitive 🆕
- Root, Trigger, Content, Item, Separator

### SuggestionPrimitive 🆕
- Trigger, Title, Description

### ErrorPrimitive 🆕
- Root, Message

### AssistantModalPrimitive
- Root, Trigger, Anchor, Content

### MarkdownText
- MarkdownText

## Utilities

### Animation 🆕
- useSmooth
- useSmoothStatus
- withSmoothContextProvider

### Layout & Viewport
- useActionBarFloatStatus 🆕
- useOnScrollToBottom 🆕
- useOnResizeContent 🆕

### Other
- useInlineRender
- useAssistantFrameHost 🆕
- useManagedRef 🆕
- useSizeHandle 🆕
- ... (and others as needed)
```

---

## Conclusion

The API reference documentation requires substantial updates to reflect the current state of the codebase. The most critical items are:

1. ✅ Documenting the new `@assistant-ui/store` architecture
2. ✅ Fixing incorrect component names
3. ✅ Adding missing primitive namespaces (ActionBarMore, ThreadListItemMore, Suggestion, Error)
4. ✅ Documenting missing adapters (5+ adapters)
5. ✅ Adding LangGraph extended hooks
6. ✅ Documenting utility hooks

The page should have the "Work in progress" callout removed once these updates are complete.

**Estimated Documentation Gap:** ~150+ missing or incorrect API references
