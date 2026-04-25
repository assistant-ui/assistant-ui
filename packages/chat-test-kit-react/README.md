# @assistant-ui/chat-test-kit-react

React harness and chat-aware matchers for transcript-driven AI chat UI tests,
with [@assistant-ui/chat-test-kit-core](../chat-test-kit-core/README.md)
re-exported from this package.

## Install

```bash
pnpm add -D @assistant-ui/chat-test-kit-react
```

## Setup

```ts
// vitest.setup.ts
import { setupChatTestKit } from "@assistant-ui/chat-test-kit-react";

setupChatTestKit();
```

`setupChatTestKit()` registers seven matchers on Vitest's global `expect`.
Calling it more than once is a no-op.

## A-tier example

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  createChatTestHarness,
  message,
  transcript,
  thread,
} from "@assistant-ui/chat-test-kit-react";

const t = transcript()
  .user("Check AAPL")
  .assistantStream("AAPL is at $212.44.", {
    chunks: ["AAPL is ", "at $212.44."],
    finish: { reason: "stop" },
  })
  .toJSON();

const harness = createChatTestHarness({ transcript: t });
const user = userEvent.setup();

render(<MyChatApp />, { wrapper: harness.wrapper });
await user.type(screen.getByRole("textbox"), "Check AAPL");
await user.click(screen.getByRole("button", { name: /send/i }));
await harness.waitForIdle();

expect(thread().on(harness)).toHaveAssistantText(/AAPL is at/);
expect(message(1).on(harness)).toStreamCompletely();
```

## C-tier (escape hatches)

```ts
await harness.advanceChunk();
await harness.advanceToolCall();
await harness.inject.disconnect();
await harness.inject.transportError({ code: 500, message: "boom" });
await harness.cancel();
```

## Diagnostics

```ts
harness.getReplayState();
harness.timeline();
harness.getRuntimeSnapshot();
harness.getRuntime();
```

## Matchers

| Target | Matcher | Notes |
|---|---|---|
| `thread().on(harness)` | `toHaveAssistantText(text \| RegExp)` | Cumulative assistant text |
| `thread()` | `toShowError(match?)` | Asserts an error surface |
| `message(n)` | `toHaveText(string)` | n is 0-indexed across rendered messages |
| `message(n).on(harness)` | `toStreamCompletely()` | Stream reached complete |
| `message(n).on(harness)` | `toBeInterrupted()` | Stream was interrupted/error/cancelled |
| `toolCall(name)` | `toRenderResult()` | Tool UI rendered a result |
| `toolCall(name).on(harness)` | `toHaveReceivedArgs(args)` | Args seen by runtime |

## Matcher DOM Contracts

- `toolCall(name).toRenderResult()` looks for `[data-tool-name="<name>"]`.
- `thread().toShowError()` looks for `[data-testid="aui-error"]`.

If your app uses different attributes, render equivalent test-only wrappers so these matchers can resolve deterministic targets.

## jsdom Caveats

Some UI trees require browser APIs that jsdom does not fully emulate. Add these shims in your test setup when needed:

```ts
class ResizeObserverMock {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;
}

if (!Element.prototype.scrollTo) {
  Element.prototype.scrollTo = () => {};
}
```

When full page composition is brittle under jsdom, prefer a minimal primitive-first harness that isolates only the behavior you are asserting.

## Notes

- Tool results are delivered through yielded `tool-call` content parts with
  `result` populated, bypassing `useAssistantTool({ execute })`.
- `harness.cancel()` aborts the in-flight run via the runtime cancel API.
- The harness uses `@assistant-ui/chat-test-kit-core`'s `VirtualClock` for
  deterministic transcript replay.
