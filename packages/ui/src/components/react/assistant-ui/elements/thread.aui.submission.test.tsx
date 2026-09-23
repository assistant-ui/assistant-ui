import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import {
  AssistantRuntimeProvider,
  type AttachmentAdapter,
  type ChatModelAdapter,
  useAui,
  useLocalRuntime,
} from "@assistant-ui/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { Thread } from "./thread.aui";

const chatModel: ChatModelAdapter = {
  async *run() {},
};

const upload = { resolve: () => {} };

const attachments: AttachmentAdapter = {
  accept: "*",
  add: async ({ file }) => ({
    id: "att-1",
    type: "image",
    name: file.name,
    contentType: file.type,
    file,
    status: { type: "requires-action", reason: "composer-send" },
  }),
  remove: async () => {},
  send: async (attachment) => {
    await new Promise<void>((resolve) => {
      upload.resolve = resolve;
    });
    return { ...attachment, status: { type: "complete" }, content: [] };
  },
};

let composerApi: ReturnType<typeof useAui> | undefined;

const CaptureAui = () => {
  composerApi = useAui();
  return null;
};

const TestThread = () => {
  const runtime = useLocalRuntime(chatModel, { adapters: { attachments } });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <CaptureAui />
      <Thread autoFocus={false} />
    </AssistantRuntimeProvider>
  );
};

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  globalThis.URL.createObjectURL ??= () => "blob:attachment";
  globalThis.URL.revokeObjectURL ??= () => {};
});

afterEach(() => {
  composerApi = undefined;
  cleanup();
  vi.restoreAllMocks();
});

describe("Thread with a message being sent", () => {
  it("shows the message with its uploading attachment and frees the composer", async () => {
    render(<TestThread />);
    const aui = () => composerApi!;

    await act(async () => {
      await aui()
        .thread.composer()
        .addAttachment(new File(["img"], "photo.png", { type: "image/png" }));
      aui().thread.composer().setText("look at this");
    });
    await act(async () => {
      aui().thread.composer().send();
    });

    await waitFor(() => expect(screen.getByText("look at this")).toBeTruthy());
    expect(screen.getByLabelText("Image attachment, uploading")).toBeTruthy();
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("");
    expect(screen.getByLabelText("Stop generating")).toBeTruthy();

    await act(async () => {
      upload.resolve();
    });

    await waitFor(() =>
      expect(screen.queryByLabelText("Image attachment, uploading")).toBeNull(),
    );
    expect(screen.getByText("look at this")).toBeTruthy();
  });
});
