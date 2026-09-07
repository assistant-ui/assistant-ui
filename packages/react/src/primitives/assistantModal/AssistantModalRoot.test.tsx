// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AssistantRuntimeProvider } from "../../context";
import { useLocalRuntime } from "../../legacy-runtime/runtime-cores/local/useLocalRuntime";
import { AssistantModalPrimitiveContent } from "./AssistantModalContent";
import { AssistantModalPrimitiveRoot } from "./AssistantModalRoot";
import { AssistantModalPrimitiveTrigger } from "./AssistantModalTrigger";

const adapter = {
  async *run() {
    yield { content: [{ type: "text" as const, text: "Hello" }] };
  },
};

const Modal = ({
  controlled = true,
  ...props
}: AssistantModalPrimitiveRoot.Props & { controlled?: boolean }) => {
  const runtime = useLocalRuntime(adapter);
  const [open, setOpen] = useState(false);
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <button onClick={() => runtime.thread.append("Hello")}>Start run</button>
      <AssistantModalPrimitiveRoot
        {...(controlled ? { open } : {})}
        onOpenChange={setOpen}
        {...props}
      >
        <AssistantModalPrimitiveTrigger>
          Toggle chat
        </AssistantModalPrimitiveTrigger>
        <AssistantModalPrimitiveContent aria-label="Chat">
          Response
        </AssistantModalPrimitiveContent>
      </AssistantModalPrimitiveRoot>
    </AssistantRuntimeProvider>
  );
};

afterEach(cleanup);

describe("AssistantModalPrimitiveRoot run start", () => {
  it.each([true, false])(
    "opens on run start and closes through the trigger (controlled: %s)",
    async (controlled) => {
      render(<Modal controlled={controlled} />);
      expect(screen.queryByRole("dialog")).toBeNull();

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Start run" }));
      });
      expect(await screen.findByRole("dialog", { name: "Chat" })).toBeDefined();

      fireEvent.click(screen.getByRole("button", { name: "Toggle chat" }));
      expect(screen.queryByRole("dialog")).toBeNull();
    },
  );

  it("notifies the current owner without overriding its controlled value", async () => {
    const previous = vi.fn();
    const current = vi.fn();
    const view = render(<Modal open={false} onOpenChange={previous} />);
    view.rerender(<Modal open={false} onOpenChange={current} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Start run" }));
    });

    expect(current).toHaveBeenCalledExactlyOnceWith(true);
    expect(previous).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("does not request opening when auto-open is disabled", async () => {
    const onOpenChange = vi.fn();
    render(
      <Modal unstable_openOnRunStart={false} onOpenChange={onOpenChange} />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Start run" }));
    });

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
