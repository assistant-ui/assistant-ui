// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import type { FC } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuiProvider, useAui } from "@assistant-ui/store";
import type {
  ExternalThreadMessage,
  ExternalThreadProps,
} from "../client/ExternalThread";
import { ExternalThread } from "../client/ExternalThread";

const renderThreadWithProps = (props: Partial<ExternalThreadProps>) => {
  const captured: { aui?: ReturnType<typeof useAui> } = {};
  const Capture: FC = () => {
    captured.aui = useAui();
    return null;
  };
  const App: FC = () => {
    const aui = useAui({
      thread: ExternalThread({ messages: [], isRunning: false, ...props }),
    });
    return (
      <AuiProvider value={aui}>
        <Capture />
      </AuiProvider>
    );
  };

  render(<App />);
  return () => captured.aui!;
};

const renderThread = () => {
  const captured: { aui?: ReturnType<typeof useAui> } = {};
  const Capture: FC = () => {
    captured.aui = useAui();
    return null;
  };
  const App: FC = () => {
    const aui = useAui({
      thread: ExternalThread({ messages: [], isRunning: false }),
    });
    return (
      <AuiProvider value={aui}>
        <Capture />
      </AuiProvider>
    );
  };

  render(<App />);
  return () => captured.aui!;
};

describe("ExternalThread attachments", () => {
  it("adds prepared attachments when File is unavailable", async () => {
    const aui = renderThread();
    const fileConstructor = globalThis.File;
    vi.stubGlobal("File", undefined);

    try {
      await act(async () => {
        await aui()
          .thread()
          .composer()
          .addAttachment({
            name: "notes.txt",
            contentType: "text/plain",
            content: [{ type: "text", text: "hello" }],
          });
      });
    } finally {
      vi.stubGlobal("File", fileConstructor);
    }

    await waitFor(() => {
      expect(aui().thread.composer().getState().attachments[0]).toMatchObject({
        type: "document",
        name: "notes.txt",
        contentType: "text/plain",
        content: [{ type: "text", text: "hello" }],
      });
    });
  });

  it("preserves foreign files that expose content", async () => {
    const aui = renderThread();
    const foreignFile = {
      name: "photo.png",
      type: "image/png",
      lastModified: 0,
      content: [{ type: "text", text: "implementation detail" }],
    } as File;

    await act(() => aui().thread.composer().addAttachment(foreignFile));

    expect(aui().thread.composer().getState().attachments[0]).toMatchObject({
      type: "file",
      name: "photo.png",
      contentType: "image/png",
      file: foreignFile,
    });
  });

  it("rejects files that do not match the adapter accept string", async () => {
    const add = vi.fn(async () => ({}) as never);
    const aui = renderThreadWithProps({
      attachmentAdapter: {
        accept: "image/*",
        add,
        send: async () => ({}) as never,
        remove: async () => {},
      },
    });

    await expect(
      aui()
        .thread()
        .composer()
        .addAttachment(
          new File(["data"], "archive.zip", { type: "application/zip" }),
        ),
    ).rejects.toThrow(
      "File type application/zip is not accepted. Accepted types: image/*",
    );
    expect(add).not.toHaveBeenCalled();
    expect(aui().thread.composer().getState().attachments).toHaveLength(0);
  });

  it("rejects prepared attachments that do not match the adapter accept string", async () => {
    const aui = renderThreadWithProps({
      attachmentAdapter: {
        accept: ".pdf",
        add: async () => ({}) as never,
        send: async () => ({}) as never,
        remove: async () => {},
      },
    });

    await expect(
      aui()
        .thread()
        .composer()
        .addAttachment({
          name: "notes.txt",
          contentType: "text/plain",
          content: [{ type: "text", text: "hello" }],
        }),
    ).rejects.toThrow(
      "File type text/plain is not accepted. Accepted types: .pdf",
    );
    expect(aui().thread.composer().getState().attachments).toHaveLength(0);
  });

  it("restores the draft when an attachment upload fails on send", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const sent: unknown[] = [];
    let rejectSend!: (reason: unknown) => void;
    const adapter = {
      accept: "*",
      add: async ({ file }: { file: File }) => ({
        id: "att-1",
        type: "file" as const,
        name: file.name,
        contentType: file.type,
        file,
        status: {
          type: "requires-action" as const,
          reason: "composer-send" as const,
        },
      }),
      send: () =>
        new Promise((_resolve, reject) => {
          rejectSend = reject;
        }) as never,
      remove: async () => {},
    };

    const aui = renderThreadWithProps({
      attachmentAdapter: adapter,
      onNew: (message) => sent.push(message),
    });

    await act(() =>
      aui()
        .thread()
        .composer()
        .addAttachment(new File(["data"], "notes.txt", { type: "text/plain" })),
    );
    await act(async () => {
      aui().thread.composer().setText("hello");
    });
    await act(async () => {
      aui().thread.composer().send();
    });

    // The draft is cleared optimistically while the upload runs.
    expect(aui().thread.composer().getState().text).toBe("");

    await act(async () => {
      rejectSend(new Error("upload failed"));
    });

    await waitFor(() => {
      const state = aui().thread.composer().getState();
      expect(state.text).toBe("hello");
      expect(state.attachments).toHaveLength(1);
    });
    expect(sent).toHaveLength(0);
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to send attachments",
      expect.any(Error),
    );
  });

  it.each([
    [
      "clearAttachments",
      (c: { clearAttachments(): Promise<void> }) => c.clearAttachments(),
    ],
    ["reset", (c: { reset(): Promise<void> }) => c.reset()],
  ] as const)(
    "calls adapter.remove for pending attachments on %s",
    async (_name, invoke) => {
      const remove = vi.fn(async () => {});
      const adapter = {
        accept: "*",
        add: async ({ file }: { file: File }) => ({
          id: "att-1",
          type: "file" as const,
          name: file.name,
          contentType: file.type,
          file,
          status: {
            type: "requires-action" as const,
            reason: "composer-send" as const,
          },
        }),
        send: async () => ({}) as never,
        remove,
      };

      const aui = renderThreadWithProps({ attachmentAdapter: adapter });

      await act(() =>
        aui()
          .thread()
          .composer()
          .addAttachment(
            new File(["data"], "notes.txt", { type: "text/plain" }),
          ),
      );

      await act(() => invoke(aui().thread.composer()));

      expect(remove).toHaveBeenCalledTimes(1);
      expect(remove).toHaveBeenCalledWith(
        expect.objectContaining({ id: "att-1" }),
      );
      expect(aui().thread.composer().getState().attachments).toHaveLength(0);
    },
  );

  it("routes edit-composer attachments through the adapter", async () => {
    const add = vi.fn(async ({ file }: { file: File }) => ({
      id: "att-edit",
      type: "file" as const,
      name: file.name,
      contentType: file.type,
      file,
      status: {
        type: "requires-action" as const,
        reason: "composer-send" as const,
      },
    }));
    const aui = renderThreadWithProps({
      messages: [
        {
          id: "u1",
          role: "user",
          content: [{ type: "text", text: "hi" }],
          createdAt: new Date(0),
          attachments: [],
          metadata: { custom: {} },
        } as unknown as ExternalThreadMessage,
      ],
      onEdit: () => {},
      attachmentAdapter: {
        accept: "*",
        add,
        send: async () => ({}) as never,
        remove: async () => {},
      },
    });

    const composer = () => aui().thread.message({ id: "u1" }).composer();
    await act(async () => {
      composer().beginEdit();
    });
    await act(() =>
      composer().addAttachment(
        new File(["data"], "notes.txt", { type: "text/plain" }),
      ),
    );

    expect(add).toHaveBeenCalledTimes(1);
    expect(composer().getState().attachments[0]).toMatchObject({
      id: "att-edit",
      name: "notes.txt",
    });
  });

  it("merges the failed send into a draft the user already modified", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let rejectSend!: (reason: unknown) => void;
    const adapter = {
      accept: "*",
      add: async ({ file }: { file: File }) => ({
        id: "att-1",
        type: "file" as const,
        name: file.name,
        contentType: file.type,
        file,
        status: {
          type: "requires-action" as const,
          reason: "composer-send" as const,
        },
      }),
      send: () =>
        new Promise((_resolve, reject) => {
          rejectSend = reject;
        }) as never,
      remove: async () => {},
    };

    const aui = renderThreadWithProps({
      attachmentAdapter: adapter,
      onNew: () => {},
    });

    await act(() =>
      aui()
        .thread()
        .composer()
        .addAttachment(new File(["data"], "notes.txt", { type: "text/plain" })),
    );
    await act(async () => {
      aui().thread.composer().setText("hello");
      aui().thread.composer().send();
    });
    await act(async () => {
      aui().thread.composer().setText("meanwhile");
    });

    await act(async () => {
      rejectSend(new Error("upload failed"));
    });

    const state = aui().thread.composer().getState();
    expect(state.text).toBe("hello\nmeanwhile");
    expect(state.attachments).toHaveLength(1);
    expect(state.attachments[0]).toMatchObject({ id: "att-1" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
});
