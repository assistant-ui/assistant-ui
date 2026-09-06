// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import type { FC } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuiProvider, useAui } from "@assistant-ui/store";
import { CompositeAttachmentAdapter } from "../adapters/attachment";
import type {
  ExternalThreadMessage,
  ExternalThreadProps,
} from "../store/clients/external-thread";
import { ExternalThread } from "../store/clients/external-thread";
import type {
  CompleteAttachment,
  PendingAttachment,
} from "../types/attachment";

const { mockGenerateId, realGenerateId } = vi.hoisted(() => {
  const realGenerateId = { current: (): string => "" };
  return {
    realGenerateId,
    mockGenerateId: vi.fn(() => realGenerateId.current()),
  };
});

vi.mock("../utils/id", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils/id")>();
  realGenerateId.current = actual.generateId;
  return { ...actual, generateId: mockGenerateId };
});

beforeEach(() => {
  mockGenerateId.mockReset();
});

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
  it("uses generated IDs unless a prepared attachment supplies one", async () => {
    const aui = renderThread();
    mockGenerateId
      .mockReturnValueOnce("generated-file-id")
      .mockReturnValueOnce("generated-prepared-id");

    await act(async () => {
      await aui()
        .thread()
        .composer()
        .addAttachment(new File(["data"], "photo.png", { type: "image/png" }));
      await aui()
        .thread()
        .composer()
        .addAttachment({
          name: "notes.txt",
          contentType: "text/plain",
          content: [{ type: "text", text: "hello" }],
        });
      await aui().thread().composer().addAttachment({
        id: "provided-id",
        name: "report.pdf",
        contentType: "application/pdf",
        content: [],
      });
    });

    await waitFor(() => {
      expect(
        aui()
          .thread()
          .composer()
          .getState()
          .attachments.map((attachment) => attachment.id),
      ).toEqual(["generated-file-id", "generated-prepared-id", "provided-id"]);
    });
    expect(mockGenerateId).toHaveBeenCalledTimes(2);
  });

  it("generates distinct IDs for attachments without one", async () => {
    const aui = renderThread();

    await act(async () => {
      await aui()
        .thread.composer()
        .addAttachment(new File(["data"], "photo.png", { type: "image/png" }));
      await aui()
        .thread.composer()
        .addAttachment({
          name: "notes.txt",
          contentType: "text/plain",
          content: [{ type: "text", text: "hello" }],
        });
    });

    await waitFor(() =>
      expect(aui().thread.composer().getState().attachments).toHaveLength(2),
    );
    const ids = aui()
      .thread.composer()
      .getState()
      .attachments.map((attachment) => attachment.id);
    expect(ids.every((id) => id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(2);
  });

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

  it("preserves composer state while attachments are prepared for send", async () => {
    let resolveSend!: (attachment: CompleteAttachment) => void;
    const onNew = vi.fn();
    const file = new File(["data"], "notes.txt", { type: "text/plain" });
    const adapter = {
      accept: "*",
      add: async () => ({
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
        new Promise<CompleteAttachment>((resolve) => {
          resolveSend = resolve;
        }),
      remove: async () => {},
    };
    const aui = renderThreadWithProps({ attachmentAdapter: adapter, onNew });
    const composer = () => aui().thread.composer();

    await act(() => composer().addAttachment(file));
    act(() => {
      composer().setText("first message");
      composer().setRole("assistant");
      composer().setRunConfig({ model: "model-a" });
      composer().send();
      composer().setRole("system");
      composer().setRunConfig({ model: "model-b" });
    });
    await act(async () => {
      resolveSend({
        id: "att-1",
        type: "file",
        name: file.name,
        contentType: file.type,
        status: { type: "complete" },
        content: [],
      });
    });

    await waitFor(() => expect(onNew).toHaveBeenCalledTimes(1));
    expect(onNew.mock.calls[0]![0]).toMatchObject({
      role: "assistant",
      runConfig: { model: "model-a" },
    });
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

  it.each([
    [
      "clearAttachments",
      (c: { clearAttachments(): Promise<void> }) => c.clearAttachments(),
    ],
    ["reset", (c: { reset(): Promise<void> }) => c.reset()],
  ] as const)(
    "does not restore an attachment that resolves after %s",
    async (_name, invoke) => {
      let resolveAdd!: (attachment: PendingAttachment) => void;
      const add = vi.fn(
        () =>
          new Promise<PendingAttachment>((resolve) => {
            resolveAdd = resolve;
          }),
      );
      const aui = renderThreadWithProps({
        attachmentAdapter: {
          accept: "*",
          add,
          send: async () => ({}) as never,
          remove: async () => {},
        },
      });
      const file = new File(["data"], "notes.txt", { type: "text/plain" });

      let addPromise!: Promise<void>;
      act(() => {
        addPromise = aui().thread.composer().addAttachment(file);
      });
      await act(() => invoke(aui().thread.composer()));
      await act(async () => {
        resolveAdd({
          id: "att-1",
          type: "file",
          name: file.name,
          contentType: file.type,
          file,
          status: { type: "requires-action", reason: "composer-send" },
        });
        await addPromise;
      });

      expect(aui().thread.composer().getState().attachments).toHaveLength(0);
    },
  );

  it("stops attachment generator updates after removal", async () => {
    let resumeAdd!: () => void;
    const drainedAfterRemoval = vi.fn();
    const file = new File(["data"], "notes.txt", { type: "text/plain" });
    const pendingAttachment: PendingAttachment = {
      id: "att-1",
      type: "file",
      name: file.name,
      contentType: file.type,
      file,
      status: { type: "requires-action", reason: "composer-send" },
    };
    const add = vi.fn(async function* () {
      yield pendingAttachment;
      await new Promise<void>((resolve) => {
        resumeAdd = resolve;
      });
      yield {
        ...pendingAttachment,
        status: { type: "running", reason: "uploading", progress: 1 },
      } satisfies PendingAttachment;
      drainedAfterRemoval();
    });
    const aui = renderThreadWithProps({
      attachmentAdapter: {
        accept: "*",
        add,
        send: async () => ({}) as never,
        remove: async () => {},
      },
    });
    const composer = () => aui().thread.composer();

    let addPromise!: Promise<void>;
    act(() => {
      addPromise = composer().addAttachment(file);
    });
    await waitFor(() =>
      expect(composer().getState().attachments).toHaveLength(1),
    );
    await act(() => composer().attachment({ id: "att-1" }).remove());
    await act(async () => {
      resumeAdd();
      await addPromise;
    });

    expect(composer().getState().attachments).toHaveLength(0);
    expect(drainedAfterRemoval).not.toHaveBeenCalled();
  });

  it("does not restore attachment generator updates after send", async () => {
    let resumeAdd!: () => void;
    const drainedAfterSend = vi.fn();
    const onNew = vi.fn();
    const file = new File(["data"], "notes.txt", { type: "text/plain" });
    const pendingAttachment: PendingAttachment = {
      id: "att-1",
      type: "file",
      name: file.name,
      contentType: file.type,
      file,
      status: { type: "requires-action", reason: "composer-send" },
    };
    const add = vi.fn(async function* () {
      yield pendingAttachment;
      await new Promise<void>((resolve) => {
        resumeAdd = resolve;
      });
      yield {
        ...pendingAttachment,
        status: { type: "running", reason: "uploading", progress: 1 },
      } satisfies PendingAttachment;
      drainedAfterSend();
    });
    const aui = renderThreadWithProps({
      attachmentAdapter: {
        accept: "*",
        add,
        send: async (attachment) => ({
          ...attachment,
          status: { type: "complete" },
          content: [],
        }),
        remove: async () => {},
      },
      onNew,
    });
    const composer = () => aui().thread.composer();

    let addPromise!: Promise<void>;
    act(() => {
      addPromise = composer().addAttachment(file);
    });
    await waitFor(() =>
      expect(composer().getState().attachments).toHaveLength(1),
    );
    act(() => {
      composer().setText("hello");
      composer().send();
    });
    await waitFor(() => expect(onNew).toHaveBeenCalledTimes(1));
    await act(async () => {
      resumeAdd();
      await addPromise;
    });

    expect(composer().getState().attachments).toHaveLength(0);
    expect(drainedAfterSend).not.toHaveBeenCalled();
  });

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

  it("removes complete edit attachments without adapter cleanup", async () => {
    const remove = vi.fn(async () => {});
    const completeAttachment = {
      id: "image-1",
      type: "image",
      name: "image",
      content: [{ type: "image", image: "data:image/png;base64,data" }],
      status: { type: "complete" },
    } as unknown as CompleteAttachment;
    const aui = renderThreadWithProps({
      messages: [
        {
          id: "u1",
          role: "user",
          content: [{ type: "text", text: "hi" }],
          createdAt: new Date(0),
          attachments: [completeAttachment],
          metadata: { custom: {} },
        } as unknown as ExternalThreadMessage,
      ],
      onEdit: () => {},
      attachmentAdapter: new CompositeAttachmentAdapter([
        {
          accept: "image/*",
          add: async () => {
            throw new Error("not used");
          },
          send: async () => {
            throw new Error("not used");
          },
          remove,
        },
      ]),
    });
    const composer = () => aui().thread.message({ id: "u1" }).composer();

    await act(async () => composer().beginEdit());
    await waitFor(() =>
      expect(composer().getState().attachments).toHaveLength(1),
    );
    await act(() => composer().attachment({ id: "image-1" }).remove());

    expect(remove).not.toHaveBeenCalled();
    expect(composer().getState().attachments).toEqual([]);
  });

  it("calls adapter.remove for pending edit attachments", async () => {
    const remove = vi.fn(async () => {});
    const file = new File(["data"], "notes.txt", { type: "text/plain" });
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
        add: async () => ({
          id: "pending-1",
          type: "document" as const,
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
      },
    });
    const composer = () => aui().thread.message({ id: "u1" }).composer();

    await act(async () => composer().beginEdit());
    await act(() => composer().addAttachment(file));
    await act(() => composer().attachment({ id: "pending-1" }).remove());

    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith(
      expect.objectContaining({ id: "pending-1" }),
    );
    expect(composer().getState().attachments).toEqual([]);
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

describe("cancelled edit sessions", () => {
  const editSetup = (
    add: (arg: { file: File }) => Promise<PendingAttachment>,
  ) =>
    renderThreadWithProps({
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

  it("does not leak an in-flight add into the next edit session", async () => {
    let resolveAdd!: (attachment: PendingAttachment) => void;
    const aui = editSetup(
      () =>
        new Promise<PendingAttachment>((resolve) => {
          resolveAdd = resolve;
        }),
    );
    const composer = () => aui().thread.message({ id: "u1" }).composer();

    await act(async () => {
      composer().beginEdit();
    });
    let addPromise!: Promise<void>;
    await act(async () => {
      addPromise = composer().addAttachment(
        new File(["data"], "notes.txt", { type: "text/plain" }),
      );
    });
    await act(async () => {
      composer().cancel();
    });
    await act(async () => {
      composer().beginEdit();
    });
    await act(async () => {
      resolveAdd({
        id: "leak-1",
        type: "document",
        name: "notes.txt",
        contentType: "text/plain",
        file: new File(["data"], "notes.txt", { type: "text/plain" }),
        status: { type: "pending", reason: "uploading", progress: 0 },
      } as PendingAttachment);
      await addPromise.catch(() => {});
    });

    expect(composer().getState().attachments).toEqual([]);
  });

  it("adapter-removes the session's pending attachments on cancel, sparing prefilled ones", async () => {
    const remove = vi.fn(async () => {});
    const aui = renderThreadWithProps({
      messages: [
        {
          id: "u1",
          role: "user",
          content: [{ type: "text", text: "hi" }],
          createdAt: new Date(0),
          attachments: [
            {
              id: "prefilled-1",
              type: "document",
              name: "existing.txt",
              contentType: "text/plain",
              content: [],
              status: { type: "complete" },
            } as unknown as CompleteAttachment,
          ],
          metadata: { custom: {} },
        } as unknown as ExternalThreadMessage,
      ],
      onEdit: () => {},
      attachmentAdapter: {
        accept: "*",
        add: async ({ file }: { file: File }) =>
          ({
            id: "pending-1",
            type: "document",
            name: file.name,
            contentType: file.type,
            file,
            status: { type: "pending", reason: "uploading", progress: 0 },
          }) as PendingAttachment,
        send: async () => ({}) as never,
        remove,
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
    expect(composer().getState().attachments).toHaveLength(2);

    await act(async () => {
      composer().cancel();
    });

    await waitFor(() => expect(remove).toHaveBeenCalledTimes(1));
    expect(remove).toHaveBeenCalledWith(
      expect.objectContaining({ id: "pending-1" }),
    );

    await act(async () => {
      composer().cancel();
    });
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("keeps the thread composer's in-flight add across a run cancel", async () => {
    let resolveAdd!: (attachment: PendingAttachment) => void;
    const aui = renderThreadWithProps({
      onNew: () => {},
      onCancel: () => {},
      attachmentAdapter: {
        accept: "*",
        add: () =>
          new Promise<PendingAttachment>((resolve) => {
            resolveAdd = resolve;
          }),
        send: async () => ({}) as never,
        remove: async () => {},
      },
    });
    const composer = () => aui().thread().composer();

    let addPromise!: Promise<void>;
    await act(async () => {
      addPromise = composer().addAttachment(
        new File(["data"], "notes.txt", { type: "text/plain" }),
      );
    });
    await act(async () => {
      composer().cancel();
    });
    await act(async () => {
      resolveAdd({
        id: "draft-1",
        type: "document",
        name: "notes.txt",
        contentType: "text/plain",
        file: new File(["data"], "notes.txt", { type: "text/plain" }),
        status: { type: "pending", reason: "uploading", progress: 0 },
      } as PendingAttachment);
      await addPromise;
    });

    expect(composer().getState().attachments).toMatchObject([
      { id: "draft-1" },
    ]);
  });
});
