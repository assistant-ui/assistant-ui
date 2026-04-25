import { transcript } from "@assistant-ui/chat-test-kit-core";
import { MessagePrimitive, ThreadPrimitive } from "@assistant-ui/react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createChatTestHarness } from "../harness/harness";

function MinimalApp() {
  return (
    <ThreadPrimitive.Root>
      <ThreadPrimitive.Messages>
        {() => (
          <MessagePrimitive.Root>
            <MessagePrimitive.Parts />
          </MessagePrimitive.Root>
        )}
      </ThreadPrimitive.Messages>
    </ThreadPrimitive.Root>
  );
}

describe("createChatTestHarness — render", () => {
  it("renders a runtime-backed app via wrapper without throwing", () => {
    const harness = createChatTestHarness({
      transcript: transcript().user("hi").toJSON(),
    });

    render(<MinimalApp />, { wrapper: harness.wrapper });

    expect(screen.queryByText("hi")).toBeNull();
  });

  it("exposes the documented harness shape", () => {
    const harness = createChatTestHarness({
      transcript: transcript().toJSON(),
    });

    expect(typeof harness.wrapper).toBe("function");
    expect(typeof harness.waitForIdle).toBe("function");
    expect(typeof harness.cancel).toBe("function");
    expect(typeof harness.advanceChunk).toBe("function");
    expect(typeof harness.advanceToolCall).toBe("function");
    expect(typeof harness.inject.disconnect).toBe("function");
    expect(typeof harness.inject.transportError).toBe("function");
    expect(typeof harness.getReplayState).toBe("function");
    expect(typeof harness.timeline).toBe("function");
    expect(typeof harness.getRuntimeSnapshot).toBe("function");
    expect(typeof harness.getRuntime).toBe("function");
  });
});
