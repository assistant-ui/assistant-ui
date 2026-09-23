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

const TestThread = ({
  adapter = attachments,
}: {
  adapter?: AttachmentAdapter;
}) => {
  const runtime = useLocalRuntime(chatModel, {
    adapters: { attachments: adapter },
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <CaptureAui />
      <Thread autoFocus={false} />
    </AssistantRuntimeProvider>
  );
};

beforeAll(() => {
  HTMLElement.prototype.scrollTo ??= () => {};
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
    expect(screen.getByLabelText("Cancel sending")).toBeTruthy();

    await act(async () => {
      upload.resolve();
    });

    await waitFor(() =>
      expect(screen.queryByLabelText("Image attachment, uploading")).toBeNull(),
    );
    expect(screen.getByText("look at this")).toBeTruthy();
    await waitFor(() => {
      expect(screen.queryByLabelText("Cancel sending")).toBeNull();
      expect(screen.queryByLabelText("Stop generating")).toBeNull();
    });
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("");
  });

  it("shows an attachment whose upload fails while it is sent as failed", async () => {
    const failure = { fail: () => {} };
    const failed = new Promise<void>((resolve) => {
      failure.fail = resolve;
    });
    const failingAdapter: AttachmentAdapter = {
      accept: "*",
      async *add({ file }) {
        const attachment = {
          id: "att-2",
          type: "image" as const,
          name: file.name,
          contentType: file.type,
          file,
        };
        yield {
          ...attachment,
          status: { type: "running", reason: "uploading", progress: 0.5 },
        };
        await failed;
        yield {
          ...attachment,
          status: { type: "incomplete", reason: "error" },
        };
      },
      remove: async () => {},
      send: () => new Promise(() => {}),
    };
    render(<TestThread adapter={failingAdapter} />);
    const aui = () => composerApi!;

    await act(async () => {
      void aui()
        .thread.composer()
        .addAttachment(new File(["img"], "photo.png", { type: "image/png" }));
    });
    await act(async () => {
      aui().thread.composer().setText("look at this");
      aui().thread.composer().send();
    });
    await waitFor(() =>
      expect(screen.getByLabelText("Image attachment, uploading")).toBeTruthy(),
    );

    await act(async () => {
      failure.fail();
    });

    await waitFor(() =>
      expect(
        screen.getByLabelText("Image attachment, upload failed"),
      ).toBeTruthy(),
    );
    expect(screen.queryByLabelText("Image attachment, uploading")).toBeNull();
  });
});
