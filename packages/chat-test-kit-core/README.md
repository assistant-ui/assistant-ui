# @assistant-ui/chat-test-kit-core

Transcript-driven testing for AI chat UIs: format spec, replayer, runtime adapter interface.

This package defines a portable transcript format for AI chat conversations and a runtime-agnostic replayer that drives any adapter implementing `RuntimeAdapter`. It does not depend on React or any `@assistant-ui/*` package.

## Install

```bash
pnpm add -D @assistant-ui/chat-test-kit-core
```

## Grammar

| Category | Verb | Purpose |
|---|---|---|
| Turn | `user(content)` | A user message |
| Turn | `assistantStream(text, { chunks, interChunkDelayMs, finish })` | A streamed assistant text reply |
| Turn | `assistantToolCall(name, args, { toolCallId? })` | Assistant emits a tool call |
| Turn | `toolResult(value)` | The result of the most recent tool call |
| Failure | `inject.cancel()` | Simulate user pressing stop |
| Failure | `inject.interrupt(reason?)` | Generic interrupt |
| Failure | `inject.transportError({ code?, message })` | Transport layer error |
| Failure | `inject.disconnect({ afterChunk })` | Drop the connection mid-stream |
| Failure | `inject.abortAndRestart()` | Abort and restart the transcript |
| Timing | `delayMs(ms)` | Advance the virtual clock |
| Timing | implicit chunk boundary | Each entry of `chunks[]` is a boundary |
| Meta | `metadata(data)` | Arbitrary JSON object attached to the turn list |

## Canonical JSON

```json
{
  "version": "0",
  "turns": [
    { "kind": "user", "content": [{ "type": "text", "text": "Check AAPL" }] },
    {
      "kind": "assistantToolCall",
      "toolCallId": "tc_1",
      "name": "get_stock_price",
      "args": { "ticker": "AAPL" },
      "argsText": "{\"ticker\":\"AAPL\"}"
    },
    { "kind": "toolResult", "toolCallId": "tc_1", "value": { "price": 212.44 } },
    {
      "kind": "assistantStream",
      "text": "AAPL is at $212.44.",
      "chunks": ["AAPL is ", "at $212.44."],
      "interChunkDelayMs": 20,
      "finish": { "reason": "stop" }
    }
  ],
  "injections": [
    { "kind": "disconnect", "at": { "turnIndex": 3, "afterChunk": 1 } }
  ]
}
```

JSON Schema is published at `@assistant-ui/chat-test-kit-core/schema/transcript.schema.json`.

## RuntimeAdapter

```ts
interface RuntimeAdapter {
  sendUserMessage(content: ContentPart[]): Promise<void>;
  emit(event: AssistantEvent): Promise<void>;
  getSnapshot(): RuntimeSnapshot;
  abort(): Promise<void>;
}
```

## Replayer

```ts
const r = new Replayer({ transcript, adapter, clock: new VirtualClock() });
await r.tick();
await r.advanceToNextTurn();
await r.advanceToIdle();
await r.cancel();
r.state;
```

## Format Version

`version` is the grammar version, independent of the package version. Today it is `"0"`. While in `0.x`, breaking format changes are allowed; they bump `version` and are documented here.
