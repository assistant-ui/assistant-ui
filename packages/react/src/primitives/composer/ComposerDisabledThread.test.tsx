/** @vitest-environment jsdom */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
} from "@assistant-ui/core/react";
import type { AttachmentAdapter, ThreadMessage } from "@assistant-ui/core";
import { ComposerPrimitiveAddAttachment } from "./ComposerAddAttachment";
import { ComposerPrimitiveInput } from "./ComposerInput";
import { ComposerPrimitiveRoot } from "./ComposerRoot";
import { ComposerPrimitiveSend } from "./ComposerSend";
import { ThreadPrimitiveViewportProvider } from "../../context/providers/ThreadViewportProvider";

const makeAttachmentAdapter = () => {
  const add = vi.fn(async ({ file }: { file: File }) => ({
    id: file.name,
    type: "file" as const,
    name: file.name,
    contentType: file.type,
    file,
    status: {
      type: "requires-action" as const,
      reason: "composer-send" as const,
    },
  }));
  const adapter: AttachmentAdapter = {
    accept: "*",
    add,
    remove: async () => {},
    send: async (attachment) => ({
      ...attachment,
      status: { type: "complete" },
      content: [{ type: "text", text: "file body" }],
    }),
  };
  return { adapter, add };
};

const App = ({
  isDisabled,
  onNew,
  attachments,
}: {
  isDisabled: boolean;
  onNew: () => Promise<void>;
  attachments: AttachmentAdapter;
}) => {
  const runtime = useExternalStoreRuntime<ThreadMessage>({
    messages: [],
    isDisabled,
    onNew,
    adapters: { attachments },
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadPrimitiveViewportProvider>
        <ComposerPrimitiveRoot>
          <ComposerPrimitiveInput aria-label="input" />
          <ComposerPrimitiveAddAttachment>
            attach
          </ComposerPrimitiveAddAttachment>
          <ComposerPrimitiveSend>send</ComposerPrimitiveSend>
        </ComposerPrimitiveRoot>
      </ThreadPrimitiveViewportProvider>
    </AssistantRuntimeProvider>
  );
};

const button = (name: string) =>
  screen.getByRole("button", { name }) as HTMLButtonElement;

const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

afterEach(() => {
  cleanup();
  document.body.querySelectorAll('input[type="file"]').forEach((input) => {
    input.remove();
  });
});

describe("composer on a disabled thread", () => {
  it("blocks sending a draft that was entered before the thread was disabled", async () => {
    const onNew = vi.fn(async () => {});
    const { adapter } = makeAttachmentAdapter();
    const view = render(
      <App isDisabled={false} onNew={onNew} attachments={adapter} />,
    );
    fireEvent.change(screen.getByRole("textbox", { name: "input" }), {
      target: { value: "hello" },
    });

    view.rerender(<App isDisabled onNew={onNew} attachments={adapter} />);
    await settle();

    expect(button("send").disabled).toBe(true);
    fireEvent.click(button("send"));
    await settle();
    expect(onNew).not.toHaveBeenCalled();
  });

  it("disables attachment selection", () => {
    const onNew = vi.fn(async () => {});
    const { adapter, add } = makeAttachmentAdapter();
    render(<App isDisabled onNew={onNew} attachments={adapter} />);

    expect(button("attach").disabled).toBe(true);
    fireEvent.click(button("attach"));
    expect(document.body.querySelector('input[type="file"]')).toBeNull();
    expect(add).not.toHaveBeenCalled();
  });
});
