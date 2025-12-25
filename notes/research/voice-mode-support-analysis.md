---
date: 2025-11-05T00:00:00Z
researcher: Claude
git_commit: 9d026d09f168cfb6df250670c5504d8d04a629fe
branch: aui-19-voice-mode
repository: aui-19-voice-mode
topic: "Voice Mode Support Analysis"
tags: [research, codebase, voice-mode, speech, tts, speech-recognition, adapters]
status: complete
last_updated: 2025-11-05
last_updated_by: Claude
---

# Research: Voice Mode Support Analysis

**Date**: 2025-11-05T00:00:00Z
**Researcher**: Claude
**Git Commit**: 9d026d09f168cfb6df250670c5504d8d04a629fe
**Branch**: aui-19-voice-mode
**Repository**: aui-19-voice-mode

## Research Question

Is there any support for voice mode in the codebase?

## Summary

**Short Answer**: The codebase has **partial** voice support. **Text-to-speech (TTS)** is fully implemented, but **voice input/voice mode** is not yet implemented.

**Current State**:
- ✅ **Text-to-Speech (Output)**: Fully functional using Web Speech API
- ❌ **Speech Recognition (Input)**: Interface defined but not implemented
- ❌ **Voice Mode (Bidirectional)**: No real-time voice conversation support

**Architecture**: The speech functionality uses an adapter pattern with excellent separation of concerns. The `SpeechSynthesisAdapter` is implemented via `WebSpeechSynthesisAdapter`, while `SpeechRecognitionAdapter` has type definitions but no concrete implementation.

**Branch Context**: The current branch name `aui-19-voice-mode` suggests voice mode is under active development, but no ticket documentation was found for AUI-19.

## Detailed Findings

### 1. Text-to-Speech (Fully Implemented)

The codebase has a complete TTS implementation using the browser's Web Speech API.

#### Core Interface
**File**: `packages/react/src/legacy-runtime/runtime-cores/adapters/speech/SpeechAdapterTypes.ts:6-70`

```typescript
export type SpeechSynthesisAdapter = {
  speak: (text: string) => SpeechSynthesisAdapter.Utterance;
};

export namespace SpeechSynthesisAdapter {
  export type Status =
    | { type: "starting" | "running" }
    | { type: "ended"; reason: "finished" | "cancelled" | "error"; error?: unknown };

  export type Utterance = {
    status: Status;
    cancel: () => void;
    subscribe: (callback: () => void) => Unsubscribe;
  };
}
```

**Key Design**:
- Stateful `Utterance` objects with observable status
- Status follows state machine: `starting` → `running` → `ended`
- Built-in cancellation and subscription for status updates

#### Implementation
**File**: `packages/react/src/legacy-runtime/runtime-cores/adapters/speech/WebSpeechSynthesisAdapter.ts:3-48`

```typescript
export class WebSpeechSynthesisAdapter implements SpeechSynthesisAdapter {
  speak(text: string): SpeechSynthesisAdapter.Utterance {
    const utterance = new SpeechSynthesisUtterance(text);
    // ... event handling, subscriber management ...
    window.speechSynthesis.speak(utterance);
    return res; // Utterance object with status, cancel, subscribe
  }
}
```

**Implementation Details**:
- Wraps browser `SpeechSynthesisUtterance` API
- Uses closure-based subscriber set for reactive updates
- Handles late subscriptions via microtask pattern
- Maps browser events to adapter status changes

#### State Management
**File**: `packages/react/src/legacy-runtime/runtime-cores/core/BaseThreadRuntimeCore.tsx:151-188`

Speech state is managed at the **thread level**, not per-message:

```typescript
export abstract class BaseThreadRuntimeCore implements ThreadRuntimeCore {
  private _stopSpeaking: Unsubscribe | undefined;
  public speech: SpeechState | undefined;

  public speak(messageId: string) {
    const adapter = this.adapters?.speech;
    if (!adapter) throw new Error("Speech adapter not configured");

    const { message } = this.repository.getMessage(messageId);
    this._stopSpeaking?.(); // Stop any current speech

    const utterance = adapter.speak(getThreadMessageText(message));
    // ... subscription handling, state updates ...
  }

  public stopSpeaking() {
    if (!this._stopSpeaking) throw new Error("No message is being spoken");
    this._stopSpeaking();
    this._notifySubscribers();
  }
}
```

**State Architecture**:
- Single active speech at a time (calling `speak()` cancels previous)
- `SpeechState` type: `{ messageId: string, status: SpeechSynthesisAdapter.Status }`
- Message-level state is derived from thread state (computed property pattern)
- Only message with matching `messageId` shows speech state

#### UI Components
**Files**:
- `packages/react/src/primitives/actionBar/ActionBarSpeak.tsx:11-36`
- `packages/react/src/primitives/actionBar/ActionBarStopSpeaking.tsx:11-56`

**ActionBarSpeak**:
```typescript
const useActionBarSpeak = () => {
  const api = useAssistantApi();
  const callback = useCallback(async () => {
    api.message().speak();
  }, [api]);

  const hasSpeakableContent = useAssistantState(({ message }) => {
    return (
      (message.role !== "assistant" || message.status?.type !== "running") &&
      message.parts.some((c) => c.type === "text" && c.text.length > 0)
    );
  });

  if (!hasSpeakableContent) return null;
  return callback;
};
```

**ActionBarStopSpeaking**:
- Shows only when message is being spoken
- Includes Escape key handler for accessibility
- Calls `api.message().stopSpeaking()`

#### Configuration
**File**: `packages/react/src/legacy-runtime/runtime-cores/local/LocalRuntimeOptions.tsx:10-32`

```typescript
export type LocalRuntimeOptionsBase = {
  adapters: {
    chatModel: ChatModelAdapter;
    speech?: SpeechSynthesisAdapter | undefined; // Optional
    // ... other adapters
  };
};
```

**Usage Example** (from `apps/docs/content/docs/guides/Speech.mdx:34-43`):
```tsx
import { WebSpeechSynthesisAdapter } from "@assistant-ui/react";

const runtime = useChatRuntime({
  api: "/api/chat",
  adapters: {
    speech: new WebSpeechSynthesisAdapter(),
  },
});
```

#### Capability Detection
**File**: `packages/react/src/legacy-runtime/runtime-cores/local/LocalThreadRuntimeCore.tsx:86-89`

```typescript
const canSpeak = options.adapters?.speech !== undefined;
if (this.capabilities.speech !== canSpeak) {
  this.capabilities.speech = canSpeak;
  hasUpdates = true;
}
```

UI conditionally renders speech buttons based on `capabilities.speech`.

### 2. Speech Recognition (Interface Only, Not Implemented)

The codebase defines a `SpeechRecognitionAdapter` interface but has **no implementation**.

#### Interface Definition
**File**: `packages/react/src/legacy-runtime/runtime-cores/adapters/speech/SpeechAdapterTypes.ts:72-98`

```typescript
export namespace SpeechRecognitionAdapter {
  export type Status =
    | { type: "starting" | "running" }
    | { type: "ended"; reason: "stopped" | "cancelled" | "error" };

  export type Result = {
    transcript: string;
  };

  export type Session = {
    status: Status;
    stop: () => Promise<void>;     // Async stop
    cancel: () => void;             // Sync cancel
    onSpeechStart: (callback: () => void) => Unsubscribe;
    onSpeechEnd: (callback: (result: Result) => void) => Unsubscribe;
    onSpeech: (callback: (result: Result) => void) => Unsubscribe; // Interim results
  };
}

export type SpeechRecognitionAdapter = {
  listen: () => SpeechRecognitionAdapter.Session;
};
```

**Key Differences from Synthesis**:
- Session-based (continuous listening) vs single utterance
- Three event hooks: `onSpeechStart`, `onSpeechEnd`, `onSpeech` (for interim results)
- Both async `stop()` and sync `cancel()` methods
- Returns `Result` objects with transcript text

**Missing Implementation**:
- No `WebSpeechRecognitionAdapter` class found
- No usage in runtime configurations
- No UI components for microphone/recording
- No integration with Web Speech API's `SpeechRecognition`

### 3. Voice Mode (Not Implemented)

No true "voice mode" (bidirectional real-time voice conversation) exists.

**What's Missing**:
- ❌ No OpenAI Realtime API integration
- ❌ No WebSocket-based audio streaming
- ❌ No `MediaRecorder` or `getUserMedia` implementations
- ❌ No microphone capture components
- ❌ No audio input preprocessing
- ❌ No real-time transcription UI
- ❌ No voice activity detection (VAD)
- ❌ No duplex audio communication

**What Exists Instead**:
- ✅ Text-to-speech for reading assistant responses
- ✅ Speak/stop buttons for manual TTS control
- ✅ Architecture ready for speech recognition adapter

## Code References

### Core Speech Adapter Files
- `packages/react/src/legacy-runtime/runtime-cores/adapters/speech/SpeechAdapterTypes.ts:6-98` - Interface definitions
- `packages/react/src/legacy-runtime/runtime-cores/adapters/speech/WebSpeechSynthesisAdapter.ts:3-48` - TTS implementation
- `packages/react/src/legacy-runtime/runtime-cores/adapters/speech/index.ts` - Exports

### State Management
- `packages/react/src/legacy-runtime/runtime-cores/core/BaseThreadRuntimeCore.tsx:151-188` - Core speech control methods
- `packages/react/src/legacy-runtime/runtime-cores/core/ThreadRuntimeCore.tsx:50-53` - SpeechState type
- `packages/react/src/legacy-runtime/runtime/ThreadRuntime.ts:480-509` - Message-level state derivation
- `packages/react/src/legacy-runtime/runtime/MessageRuntime.ts:207-220` - Message API (speak, stopSpeaking)

### UI Primitives
- `packages/react/src/primitives/actionBar/ActionBarSpeak.tsx:11-36` - Speak button component
- `packages/react/src/primitives/actionBar/ActionBarStopSpeaking.tsx:11-56` - Stop speaking button component
- `packages/react/src/primitives/actionBar/index.ts` - Primitive exports
- `packages/react/src/primitives/message/MessageIf.tsx:15,47-48` - Conditional rendering for speech state

### Configuration & Runtime
- `packages/react/src/legacy-runtime/runtime-cores/local/LocalRuntimeOptions.tsx:16` - Speech adapter option
- `packages/react/src/legacy-runtime/runtime-cores/local/LocalThreadRuntimeCore.tsx:86-89` - Capability detection
- `packages/react/src/legacy-runtime/client/MessageRuntimeClient.ts` - Client implementation
- `packages/react/src/legacy-runtime/client/ThreadRuntimeClient.ts` - Thread client

### Context & Hooks
- `packages/react/src/context/react/hooks/useAssistantState.tsx:47-65` - State access hook
- `packages/react/src/context/react/AssistantApiContext.tsx` - API context provider

### Client Types
- `packages/react/src/client/types/Message.ts` - Message interface with speech methods
- `packages/react/src/client/types/Thread.ts` - Thread interface with speech state

### Documentation & Examples
- `apps/docs/content/docs/guides/Speech.mdx` - User-facing TTS documentation
- `apps/docs/content/docs/api-reference/primitives/ActionBar.mdx` - ActionBar API reference
- `apps/docs/components/samples/speech-sample.tsx` - Interactive sample
- `apps/docs/content/docs/runtimes/custom/local.mdx` - Local runtime configuration
- `apps/docs/content/docs/runtimes/custom/external-store.mdx` - External store runtime

### Integration Files
- `packages/react-langgraph/src/useLangGraphRuntime.ts` - LangGraph integration with speech

### Related (Audio Handling, Not Speech)
- `examples/with-ffmpeg/` - Attachment handling for audio/video files

## Architecture Insights

### Design Patterns

1. **Adapter Pattern**
   - Interface: `SpeechSynthesisAdapter` defines contract
   - Implementation: `WebSpeechSynthesisAdapter` wraps browser API
   - Benefits: Easy to swap implementations (cloud TTS, custom providers)

2. **Observer Pattern**
   - `Utterance` object with `subscribe()` method
   - Thread runtime subscribes to status changes
   - Set-based subscription management

3. **State Machine**
   - States: `starting` | `running` | `ended`
   - Unidirectional transitions enforced by type system
   - Idempotency guards prevent duplicate state changes

4. **Single Responsibility**
   - Adapter: Only wraps browser API
   - Runtime Core: Manages state and lifecycle
   - Message Runtime: Delegates to thread, validates context
   - Primitives: UI concerns only, stateless

5. **Reactive State Management**
   - Central store: Thread runtime holds single `speech` state
   - Derived state: Message computes `speech` from thread state
   - Change propagation: `_notifySubscribers()` → `useSyncExternalStore` → React render

6. **Capability-Based UI**
   - `capabilities.speech` set based on adapter presence
   - Primitives return `null` when not applicable
   - Runtime switching: Capabilities update when options change

### Key Technical Decisions

1. **Thread-level speech state** (not message-level)
   - Only one message speaks at a time
   - Simplifies state management (single source of truth)
   - Prevents race conditions with concurrent playback

2. **Stateful Utterance objects** (not event emitters)
   - Simpler API (no manual event listener management)
   - Status always accessible
   - Late subscribers handled gracefully

3. **Text extraction** (not streaming)
   - Web Speech API requires full text upfront
   - Simple implementation: filter text parts, join with `\n\n`

4. **Separate Speak/StopSpeaking primitives**
   - Different rendering conditions
   - Different keyboard handlers (stop has Escape key)
   - Clearer component API

5. **SpeechRecognitionAdapter defined but not implemented**
   - Future-proofing: API designed ahead of implementation
   - Shows architectural intent for voice input
   - Allows discussion/feedback before building

### Data Flow: User Clicks "Read Aloud"

1. **User Action** → `ActionBarPrimitiveSpeak` button clicked
2. **API Call** → `api.message().speak()` invoked
3. **Message Runtime** → `MessageRuntimeImpl.speak()` delegates to thread
4. **Thread Runtime** → `BaseThreadRuntimeCore.speak(messageId)` called
5. **Text Extraction** → `getThreadMessageText(message)` filters text parts, joins with `\n\n`
6. **Adapter Invocation** → `adapter.speak(text)` creates utterance
7. **Web API** → `window.speechSynthesis.speak(utterance)` starts playback
8. **State Update** → Thread sets `this.speech = { messageId, status }`
9. **Notification** → `this._notifySubscribers()` triggers React updates
10. **React Update** → `useSyncExternalStore` re-runs selector
11. **State Derivation** → Message state recomputes, includes speech if `speechState.messageId === message.id`
12. **UI Update** → Speak button hidden, stop button shown

### Extensibility

The adapter pattern allows for future implementations:
- **Cloud TTS Services**: Google Cloud TTS, Amazon Polly, ElevenLabs
- **Custom Voices**: Character voices, multilingual support
- **Voice Configuration**: Rate, pitch, volume controls
- **Speech Recognition**: Browser API, cloud services, local models
- **Voice Mode**: OpenAI Realtime API, custom WebSocket streaming

## Historical Context (from notes/)

No dedicated voice mode documentation was found in `notes/`. Six files contain peripheral mentions:

### Research Documents
- `notes/research/branch-picker-error-missing-capability-check.md` - Mentions speech capability check in adapter configuration
- `notes/research/2025-09-25_12-16-43_manual-testing-workflows.md` - References "with-ffmpeg" example for audio/video processing
- `notes/research/mastra_integration_requirements.md` - Mentions SpeechSynthesisAdapter in adapter types

### Implementation Plans
- `notes/plans/fix-18-mastra-code-violations.md` - Contains speech adapter testing notes
- `notes/plans/mastra_mock_replacement_implementation.md` - Mentions speech adapter in configuration
- `notes/plans/phase_1_foundation_package_infrastructure.md` - References speech adapter in type definitions

### Missing Documentation
- No ticket file for AUI-19 in `notes/tickets/`
- No voice mode implementation plan in `notes/plans/`
- No voice mode research documents

The branch name `aui-19-voice-mode` suggests this is a work-in-progress feature, but no ticket documentation exists yet.

## Related Research

No existing research documents on voice mode were found.

## Open Questions

1. **What is the scope of AUI-19?**
   - Is it just speech recognition, or full voice mode?
   - Is there a Linear ticket or requirement document?

2. **Which speech recognition approach?**
   - Browser Web Speech API (simple, limited)
   - OpenAI Whisper (cloud-based, accurate)
   - Local models (privacy, offline support)
   - OpenAI Realtime API (true voice mode)

3. **What does "voice mode" mean for this project?**
   - Text-to-speech + speech-to-text (turn-taking)
   - Real-time bidirectional voice (like OpenAI voice mode)
   - Voice commands only
   - Full voice conversation

4. **Missing TTS features:**
   - Voice selection (male/female, accents)
   - Playback controls (pause, resume, speed)
   - Progress tracking (current word/character)
   - Queue management (speak multiple messages)

5. **Speech recognition requirements:**
   - Continuous listening vs push-to-talk
   - Interim results display
   - Voice activity detection
   - Noise cancellation
   - Language/accent support

6. **Integration questions:**
   - How does voice input affect message submission flow?
   - Should voice and text input be mutually exclusive?
   - How to handle errors/corrections in voice transcription?
   - Mobile support (different permissions, APIs)

7. **Performance considerations:**
   - Browser compatibility (Web Speech API support varies)
   - Network latency for cloud services
   - Audio encoding/streaming overhead
   - Battery impact on mobile devices

## Next Steps for Voice Mode Implementation

If implementing full voice mode, consider:

1. **Define Requirements**
   - Create AUI-19 ticket with detailed specs
   - Choose speech recognition approach
   - Define UX for voice interactions

2. **Implement Speech Recognition Adapter**
   - Create `WebSpeechRecognitionAdapter` (simplest start)
   - Or integrate cloud service (Whisper, Google STT)
   - Follow existing adapter pattern

3. **Build UI Components**
   - Microphone button primitive
   - Recording indicator
   - Interim transcript display
   - Error/retry handling

4. **Handle State Management**
   - Add `recognition` state to thread runtime
   - Manage recording/listening lifecycle
   - Handle transcript → message conversion

5. **Consider Advanced Features**
   - OpenAI Realtime API for true voice mode
   - Voice activity detection (VAD)
   - Duplex audio communication
   - Custom voice profiles

6. **Testing & Documentation**
   - Browser compatibility testing
   - Mobile device testing
   - Update docs with speech recognition guide
   - Create interactive samples
