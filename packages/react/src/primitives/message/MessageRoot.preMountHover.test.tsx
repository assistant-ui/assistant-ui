// @vitest-environment jsdom

import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig, AuiProvider, useAuiState } from "@assistant-ui/store";
import {
  createAssistantClient,
  type AssistantClientHandle,
} from "@assistant-ui/store/client";
import { ThreadMessageClient } from "@assistant-ui/core/store";
import { ThreadPrimitiveViewportProvider } from "../../context/providers/ThreadViewportProvider";
import { MessagePrimitiveRoot } from "./MessageRoot";

const handles: AssistantClientHandle[] = [];

const createMessage = () => {
  const handle = createAssistantClient({
    message: ThreadMessageClient({
      message: {
        id: "message-1",
        role: "assistant",
        content: [{ type: "text", text: "Hello" }],
        createdAt: new Date(0),
        status: { type: "complete", reason: "stop" },
        metadata: {
          unstable_state: null,
          unstable_annotations: [],
          unstable_data: [],
          steps: [],
          custom: {},
        },
      },
      index: 0,
    }),
  });
  handles.push(handle);
  return handle;
};

const Message = () => {
  const isHovering = useAuiState((s) => s.message.isHovering);
  return (
    <MessagePrimitiveRoot data-testid="message" data-hovering={isHovering} />
  );
};

const Example = ({ handle }: { handle: AssistantClientHandle }) => (
  <AuiProvider extends={handle.getClient()} config={AuiConfig({})}>
    <ThreadPrimitiveViewportProvider>
      <Message />
    </ThreadPrimitiveViewportProvider>
  </AuiProvider>
);

afterEach(() => {
  cleanup();
  for (const handle of handles.splice(0)) handle.destroy();
  vi.restoreAllMocks();
});

describe("MessagePrimitiveRoot hover listeners", () => {
  it.each(["mouseenter", "mouseleave"] as const)(
    "ignores %s before commit and resumes hover updates after message recreation",
    async (eventType) => {
      const original = createMessage();
      original.subscribe(() => {});
      const view = render(<Example handle={original} />);
      const oldElement = view.getByTestId("message");
      act(() => flushTapSync(() => fireEvent.mouseEnter(oldElement)));
      await act(() => Promise.resolve());
      expect(oldElement.getAttribute("data-hovering")).toBe("true");

      const replacement = createMessage();
      const message = replacement.getClient().message;
      expect(() => message.setIsHovering(true)).toThrow(
        "Resource updated before mount",
      );
      flushTapSync(() =>
        view.rerender(<Example key="replacement" handle={replacement} />),
      );
      const element = view.getByTestId("message");
      expect(original.getClient().message.getState().isHovering).toBe(false);

      const errors: unknown[] = [];
      const onError = (event: ErrorEvent) => {
        errors.push(event.error);
        event.preventDefault();
      };
      window.addEventListener("error", onError);
      try {
        fireEvent(element, new MouseEvent(eventType));
      } finally {
        window.removeEventListener("error", onError);
      }
      expect(errors).toEqual([]);
      expect(message.getState().isHovering).toBe(false);

      act(() => {
        replacement.subscribe(() => {});
      });
      act(() => flushTapSync(() => fireEvent.mouseEnter(element)));
      await act(() => Promise.resolve());
      expect(element.getAttribute("data-hovering")).toBe("true");
      act(() => flushTapSync(() => fireEvent.mouseLeave(element)));
      await act(() => Promise.resolve());
      expect(element.getAttribute("data-hovering")).toBe("false");
      expect(original.getClient().message.getState().isHovering).toBe(false);
    },
  );

  it("ignores the initial hover check before the resource commits", async () => {
    const matches = HTMLElement.prototype.matches;
    vi.spyOn(HTMLElement.prototype, "matches").mockImplementation(function (
      this: HTMLElement,
      selector,
    ) {
      return selector === ":hover" || matches.call(this, selector);
    });
    const handle = createMessage();
    render(<Example handle={handle} />);
    await act(() => Promise.resolve());
    expect(handle.getClient().message.getState().isHovering).toBe(false);
  });

  it("can remove an uncommitted message and detaches its hover listeners", () => {
    const handle = createMessage();
    const view = render(<Example handle={handle} />);
    const element = view.getByTestId("message");
    expect(() => view.unmount()).not.toThrow();
    handle.subscribe(() => {});
    act(() => flushTapSync(() => fireEvent.mouseEnter(element)));
    expect(handle.getClient().message.getState().isHovering).toBe(false);
  });
});
