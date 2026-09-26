// @vitest-environment jsdom

import { getEventListeners } from "node:events";
import { act, render, waitFor } from "@testing-library/react";
import { Activity, type FC } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuiConfig, AuiProvider, useAui } from "@assistant-ui/store";
import { useAssistantClientDestroySignal } from "@assistant-ui/store/internal";
import {
  type AttachmentAdapter,
  CompositeAttachmentAdapter,
} from "../adapters/attachment";
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

const deferred = () => Promise.withResolvers<void>();

const setupPartialSend = (type: "thread" | "edit" = "thread") => {
  const successfulUpload = deferred();
  const failedUpload = deferred();
  const remove = vi.fn(async () => {});
  const onNew = vi.fn();
  const send = vi.fn(async (attachment: PendingAttachment) => {
    await (attachment.name === "a" ? successfulUpload : failedUpload).promise;
    return {
      ...attachment,
      status: { type: "complete" as const },
      content: [{ type: "text" as const, text: attachment.name }],
    };
  });
  const aui = renderThreadWithProps({
    onNew,
    onEdit: onNew,
    messages:
      type === "edit"
        ? [
            {
              id: "u1",
              role: "user",
              content: [{ type: "text", text: "original" }],
              attachments: [],
              createdAt: new Date(0),
              metadata: { custom: {} },
            },
          ]
        : [],
    attachmentAdapter: {
      accept: "*",
      add: async ({ file }) => ({
        id: file.name,
        type: "file",
        name: file.name,
        file,
        status: { type: "requires-action", reason: "composer-send" },
      }),
      remove,
      send,
    },
  });
  return {
    aui,
    composer: () =>
      type === "edit"
        ? aui().thread.message({ id: "u1" }).composer()
        : aui().thread.composer(),
    successfulUpload,
    failedUpload,
    send,
    remove,
    onNew,
  };
};

describe("ExternalThread attachments", () => {
  it.each([
    ["thread", "before"],
    ["thread", "after"],
    ["edit", "before"],
    ["edit", "after"],
  ] as const)(
    "%s reuses successful uploads when a sibling fails %s they finish",
    async (type, order) => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const { composer, successfulUpload, failedUpload, send, remove, onNew } =
        setupPartialSend(type);
      await act(async () => {
        if (type === "edit") composer().beginEdit();
        await composer().addAttachment(new File(["a"], "a"));
        await composer().addAttachment(new File(["b"], "b"));
        composer().setText("hello");
        composer().send();
      });
      if (order === "after") await act(async () => successfulUpload.resolve());
      await act(async () => failedUpload.reject(new Error("upload failed")));
      expect(composer().getState().text).toBe(
        type === "edit" || order === "after" ? "hello" : "",
      );
      if (order === "before") {
        expect(composer().getState().canSend).toBe(false);
        act(() => composer().send());
        expect(send).toHaveBeenCalledTimes(2);
        await act(async () => successfulUpload.resolve());
      }
      await waitFor(() => expect(composer().getState().canSend).toBe(true));
      expect(consoleError).toHaveBeenCalled();
      send.mockImplementation(async (attachment) => {
        if (attachment.name === "a") throw new Error("Already consumed");
        return { ...attachment, status: { type: "complete" }, content: [] };
      });
      await act(async () => composer().send());

      expect(send.mock.calls.map(([attachment]) => attachment.name)).toEqual([
        "a",
        "b",
        "b",
      ]);
      expect(onNew).toHaveBeenCalledOnce();
      expect(onNew.mock.calls[0]![0]).toMatchObject({
        content: [{ type: "text", text: "hello" }],
        attachments: [
          {
            id: "a",
            status: { type: "complete" },
            content: [{ type: "text", text: "a" }],
          },
          { id: "b", status: { type: "complete" } },
        ],
      });
      expect(composer().getState().attachments).toEqual(
        type === "thread"
          ? []
          : expect.arrayContaining([
              expect.objectContaining({ id: "a" }),
              expect.objectContaining({ id: "b" }),
            ]),
      );
      expect(remove).not.toHaveBeenCalled();
    },
  );

  it.each(["remove", "clearAttachments", "reset"] as const)(
    "keeps retained uploads removable after failure with %s",
    async (action) => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const { composer, successfulUpload, failedUpload, remove, onNew } =
        setupPartialSend();
      await act(async () => {
        await composer().addAttachment(new File(["a"], "a"));
        await composer().addAttachment(new File(["b"], "b"));
        composer().send();
        successfulUpload.resolve();
        failedUpload.reject(new Error("upload failed"));
      });
      await waitFor(() => expect(composer().getState().canSend).toBe(true));
      await act(async () => {
        if (action === "remove")
          await composer().attachment({ id: "a" }).remove();
        else await composer()[action]();
      });
      expect(remove).toHaveBeenCalledWith(expect.objectContaining({ id: "a" }));
      expect(onNew).not.toHaveBeenCalled();
    },
  );

  it.each(["before", "after"])(
    "reuses a retained upload when a sibling fails %s it finishes and removal fails",
    async (order) => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const { composer, successfulUpload, failedUpload, send, remove, onNew } =
        setupPartialSend();
      remove.mockRejectedValue(new Error("remove failed"));
      await act(async () => {
        await composer().addAttachment(new File(["a"], "a"));
        await composer().addAttachment(new File(["b"], "b"));
        composer().send();
        if (order === "after") successfulUpload.resolve();
        failedUpload.reject(new Error("upload failed"));
      });
      if (order === "before") {
        await act(async () => successfulUpload.resolve());
      }
      await waitFor(() => expect(composer().getState().canSend).toBe(true));
      await act(async () => {
        await expect(
          composer().attachment({ id: "a" }).remove(),
        ).rejects.toThrow("remove failed");
      });
      send.mockImplementation(async (attachment) => {
        if (attachment.name === "a") throw new Error("Already consumed");
        return { ...attachment, status: { type: "complete" }, content: [] };
      });
      await act(async () => composer().send());
      expect(send.mock.calls.map(([attachment]) => attachment.name)).toEqual([
        "a",
        "b",
        "b",
      ]);
      expect(onNew).toHaveBeenCalledOnce();
      expect(onNew.mock.calls[0]![0].attachments).toHaveLength(2);
    },
  );

  it("does not dispatch an attachment whose removal is still pending", async () => {
    const removal = deferred();
    const { composer, successfulUpload, failedUpload, remove, onNew } =
      setupPartialSend();
    remove.mockReturnValue(removal.promise);
    await act(async () => {
      await composer().addAttachment(new File(["a"], "a"));
      await composer().addAttachment(new File(["b"], "b"));
      composer().send();
    });
    let removing!: Promise<void>;
    await act(async () => {
      removing = composer().attachment({ id: "a" }).remove();
      successfulUpload.resolve();
      failedUpload.resolve();
    });
    expect(onNew).toHaveBeenCalledOnce();
    expect(onNew.mock.calls[0]![0].attachments).toMatchObject([{ id: "b" }]);
    await act(async () => {
      removal.resolve();
      await removing;
    });
  });

  it("renders in-flight submission attachments as a thread message", async () => {
    const { aui, composer, successfulUpload, failedUpload, onNew } =
      setupPartialSend();
    await act(async () => {
      await composer().addAttachment(new File(["a"], "a"));
      await composer().addAttachment(new File(["b"], "b"));
      composer().setText("hello");
      composer().send();
    });
    expect(aui().thread().getState().messages).toMatchObject([
      {
        attachments: [],
        content: [{ type: "text", text: "hello" }],
        submission: {
          text: "hello",
          attachments: [{ id: "a" }, { id: "b" }],
        },
      },
    ]);
    expect(
      aui().thread().message({ index: 0 }).attachment({ id: "a" }).getState(),
    ).toMatchObject({ id: "a" });
    await act(async () => {
      successfulUpload.resolve();
      failedUpload.resolve();
    });
    expect(onNew).toHaveBeenCalledOnce();
    expect(onNew.mock.calls[0]![0].attachments).toMatchObject([
      { id: "a" },
      { id: "b" },
    ]);
  });

  it("does not dispatch an attachment whose removal was pending when send started", async () => {
    const removal = deferred();
    const { composer, successfulUpload, failedUpload, send, remove, onNew } =
      setupPartialSend();
    remove.mockReturnValue(removal.promise);
    await act(async () => {
      await composer().addAttachment(new File(["a"], "a"));
      await composer().addAttachment(new File(["b"], "b"));
    });
    let removing!: Promise<void>;
    await act(async () => {
      removing = composer().attachment({ id: "a" }).remove();
    });
    await act(async () => {
      composer().send();
      successfulUpload.resolve();
      failedUpload.resolve();
    });
    expect(send.mock.calls.map(([attachment]) => attachment.name)).toEqual([
      "b",
    ]);
    expect(onNew).toHaveBeenCalledOnce();
    expect(onNew.mock.calls[0]![0].attachments).toMatchObject([{ id: "b" }]);
    await act(async () => {
      removal.resolve();
      await removing;
    });
    expect(composer().getState().attachments).toEqual([]);
  });

  it.each(["reset", "cancel"] as const)(
    "does not dispatch an old edit or unlock a newer send after %s",
    async (action) => {
      const { composer, successfulUpload, failedUpload, send, onNew } =
        setupPartialSend("edit");
      await act(async () => {
        composer().beginEdit();
        await composer().addAttachment(new File(["a"], "a"));
        composer().send();
        await composer()[action]();
        if (action === "cancel") composer().beginEdit();
        await composer().addAttachment(new File(["b"], "b"));
        composer().send();
        successfulUpload.resolve();
      });
      expect(composer().getState().canSend).toBe(false);
      expect(onNew).not.toHaveBeenCalled();
      expect(send).toHaveBeenCalledTimes(2);
      await act(async () => failedUpload.resolve());
      expect(onNew).toHaveBeenCalledOnce();
      expect(onNew.mock.calls[0]![0].attachments).toMatchObject([{ id: "b" }]);
    },
  );

  it.each(["clearAttachments", "reset"] as const)(
    "handles an attachment replaced with the same ID after %s",
    async (action) => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const { composer, successfulUpload, failedUpload, send, onNew } =
        setupPartialSend();
      await act(async () => {
        await composer().addAttachment(new File(["old"], "a"));
        await composer().addAttachment(new File(["b"], "b"));
        composer().send();
        failedUpload.reject(new Error("upload failed"));
      });
      await act(async () => {
        await composer()[action]();
        await composer().addAttachment(new File(["replacement"], "a"));
        successfulUpload.resolve();
      });
      await waitFor(() => expect(composer().getState().canSend).toBe(true));
      if (action === "clearAttachments") {
        send.mockImplementation(async (attachment) => {
          if (attachment.name === "a") throw new Error("Already consumed");
          return { ...attachment, status: { type: "complete" }, content: [] };
        });
      }
      await act(async () => composer().send());
      expect(send.mock.calls.map(([attachment]) => attachment.name)).toEqual([
        "a",
        "b",
        action === "clearAttachments" ? "b" : "a",
      ]);
      expect(onNew).toHaveBeenCalledOnce();
      expect(onNew.mock.calls[0]![0].attachments).toHaveLength(
        action === "clearAttachments" ? 2 : 1,
      );
    },
  );

  describe.each(["clearAttachments", "reset"] as const)(
    "%s cleanup",
    (method) => {
      it.each(["first throw", "later throw", "rejection", "multiple failures"])(
        "attempts all pending removals after %s and still rejects",
        async (failure) => {
          const error = new Error("removal failed");
          const remove = vi.fn((attachment: PendingAttachment) => {
            const fails =
              attachment.id === (failure === "later throw" ? "two" : "one");
            if (fails) {
              if (failure === "rejection") return Promise.reject(error);
              throw error;
            }
            if (failure === "multiple failures" && attachment.id === "two") {
              return Promise.reject(new Error("another failure"));
            }
            return Promise.resolve();
          });
          const aui = renderThreadWithProps({
            attachmentAdapter: {
              accept: "*",
              add: async ({ file }) => ({
                id: file.name,
                type: "file",
                name: file.name,
                contentType: "text/plain",
                file,
                status: { type: "requires-action", reason: "composer-send" },
              }),
              send: vi.fn(),
              remove,
            },
          });
          const composer = () => aui().thread().composer();
          await act(async () => {
            await composer().addAttachment(
              new File(["data"], "one", { type: "text/plain" }),
            );
            await composer().addAttachment({
              id: "complete",
              name: "saved.txt",
              contentType: "text/plain",
              content: [],
            });
            await composer().addAttachment(
              new File(["data"], "two", { type: "text/plain" }),
            );
            await composer().addAttachment(
              new File(["data"], "three", { type: "text/plain" }),
            );
          });
          await waitFor(() =>
            expect(composer().getState().attachments).toHaveLength(4),
          );

          await act(async () => {
            await expect(composer()[method]()).rejects.toBe(error);
          });

          expect(
            remove.mock.calls.map(([attachment]) => attachment.id),
          ).toEqual(["one", "two", "three"]);
          expect(composer().getState().attachments).toEqual([]);
        },
      );
    },
  );

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
    const foreignFile = Object.assign(
      new File([""], "photo.png", { type: "image/png" }),
      {
        content: [{ type: "text", text: "implementation detail" }],
      },
    );

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
    const onNew = vi.fn<NonNullable<ExternalThreadProps["onNew"]>>();
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
      composer().setRunConfig({ custom: { model: "model-a" } });
      composer().send();
      composer().setRole("system");
      composer().setRunConfig({ custom: { model: "model-b" } });
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
      runConfig: { custom: { model: "model-a" } },
    });
  });

  it.each([
    ["remove", "pending", 1],
    ["reset", "pending", 1],
    ["reset", "failed", 2],
    ["reset", "pending-then-failed", 1],
    ["clearAttachments", "pending", 1],
    ["clearAttachments", "failed", 2],
    ["clearAttachments", "pending-then-failed", 1],
  ] as const)(
    "removes a draft attachment on %s unless its removal is in flight (%s)",
    async (action, state, removals) => {
      const removal = deferred();
      const remove = vi
        .fn<AttachmentAdapter["remove"]>()
        .mockReturnValueOnce(removal.promise)
        .mockResolvedValue(undefined);
      const aui = renderThreadWithProps({
        attachmentAdapter: {
          accept: "*",
          add: async ({ file }) => ({
            id: "att-1",
            type: "file",
            name: file.name,
            contentType: file.type,
            file,
            status: { type: "requires-action", reason: "composer-send" },
          }),
          send: async () => ({}) as never,
          remove,
        },
      });
      const composer = () => aui().thread.composer();

      await act(() =>
        composer().addAttachment(
          new File(["data"], "notes.txt", { type: "text/plain" }),
        ),
      );
      let removing!: Promise<unknown>;
      act(() => {
        removing = composer()
          .attachment({ id: "att-1" })
          .remove()
          .then(
            () => undefined,
            (error: unknown) => error,
          );
      });
      if (state === "failed")
        await act(async () => {
          removal.reject(new Error("remove failed"));
          await removing;
        });
      await act(() =>
        action === "remove"
          ? composer().attachment({ id: "att-1" }).remove()
          : composer()[action](),
      );
      let outcome: unknown;
      await act(async () => {
        if (state === "pending") removal.resolve();
        if (state === "pending-then-failed")
          removal.reject(new Error("remove failed"));
        outcome = await removing;
      });

      expect(outcome).toEqual(
        state === "pending" ? undefined : new Error("remove failed"),
      );
      expect(remove).toHaveBeenCalledTimes(removals);
      expect(composer().getState().attachments).toEqual([]);
    },
  );

  it.each([
    ["failed", "b", 2],
    ["pending", "a", 1],
  ] as const)(
    "removes an edit's attachment again after its removal %s and the upload of %s failed the send",
    async (state, failing, removals) => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const { composer, successfulUpload, failedUpload, remove } =
        setupPartialSend("edit");
      const removal = deferred();
      remove.mockReturnValueOnce(removal.promise);
      await act(async () => composer().beginEdit());
      await act(async () => {
        await composer().addAttachment(new File(["a"], "a"));
        await composer().addAttachment(new File(["b"], "b"));
        composer().send();
      });
      let removing!: Promise<unknown>;
      act(() => {
        removing = composer()
          .attachment({ id: "a" })
          .remove()
          .then(
            () => undefined,
            (error: unknown) => error,
          );
      });
      if (state === "failed")
        await act(async () => {
          removal.reject(new Error("remove failed"));
          await removing;
        });
      await act(async () => {
        if (failing === "a") {
          successfulUpload.reject(new Error("upload failed"));
          failedUpload.resolve();
        } else {
          successfulUpload.resolve();
          failedUpload.reject(new Error("upload failed"));
        }
      });
      await act(() => composer().attachment({ id: "a" }).remove());
      let outcome: unknown;
      await act(async () => {
        if (state === "pending") removal.resolve();
        outcome = await removing;
      });

      expect(outcome).toEqual(
        state === "failed" ? new Error("remove failed") : undefined,
      );
      expect(remove).toHaveBeenCalledTimes(removals);
      expect(
        composer()
          .getState()
          .attachments.map(({ id }) => id),
      ).toEqual(["b"]);
    },
  );

  it("removes a file added during a send when the draft is cleared", async () => {
    const upload = deferred();
    const remove = vi.fn<AttachmentAdapter["remove"]>(async () => {});
    const aui = renderThreadWithProps({
      attachmentAdapter: {
        accept: "*",
        add: async ({ file }) => ({
          id: file.name,
          type: "file",
          name: file.name,
          contentType: file.type,
          file,
          status: { type: "requires-action", reason: "composer-send" },
        }),
        send: async (attachment) => {
          await upload.promise;
          return { ...attachment, status: { type: "complete" }, content: [] };
        },
        remove,
      },
      onNew: vi.fn(),
    });
    const composer = () => aui().thread.composer();

    await act(() =>
      composer().addAttachment(
        new File(["a"], "a.txt", { type: "text/plain" }),
      ),
    );
    await act(async () => {
      composer().send();
    });
    await act(() =>
      composer().addAttachment(
        new File(["b"], "b.txt", { type: "text/plain" }),
      ),
    );
    await act(() => composer().clearAttachments());

    expect(remove.mock.calls.map(([attachment]) => attachment.id)).toEqual([
      "b.txt",
    ]);
    expect(composer().getState().attachments).toEqual([]);
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

  it("preserves pending attachments when adapter removal fails", async () => {
    const error = new Error("remove failed");
    const remove = vi.fn(async () => {
      throw error;
    });
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
      send: async () => ({}) as never,
      remove,
    };
    const aui = renderThreadWithProps({ attachmentAdapter: adapter });
    const composer = () => aui().thread.composer();

    await act(() => composer().addAttachment(file));
    await waitFor(() =>
      expect(composer().getState().attachments).toHaveLength(1),
    );

    await expect(
      act(() => composer().attachment({ id: "att-1" }).remove()),
    ).rejects.toBe(error);

    expect(remove).toHaveBeenCalledWith(
      expect.objectContaining({ id: "att-1" }),
    );
    expect(composer().getState().attachments).toHaveLength(1);
    await waitFor(() =>
      expect(composer().getState().attachments[0]?.status).toEqual({
        type: "incomplete",
        reason: "error",
        message: "remove failed",
      }),
    );
  });

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

  it("waits for an attachment still uploading in add() before sending it", async () => {
    let finishUpload!: () => void;
    const onNew = vi.fn();
    const file = new File(["data"], "notes.txt", { type: "text/plain" });
    const attachment = {
      id: "att-1",
      type: "file",
      name: file.name,
      contentType: file.type,
      file,
    };
    const send = vi.fn(async (pending: PendingAttachment) => ({
      ...pending,
      status: { type: "complete" as const },
      content: [],
    }));
    const aui = renderThreadWithProps({
      attachmentAdapter: {
        accept: "*",
        async *add() {
          yield {
            ...attachment,
            status: { type: "running", reason: "uploading", progress: 0 },
          } satisfies PendingAttachment;
          await new Promise<void>((resolve) => {
            finishUpload = resolve;
          });
          yield {
            ...attachment,
            status: { type: "requires-action", reason: "composer-send" },
          } satisfies PendingAttachment;
        },
        send,
        remove: async () => {},
      },
      onNew,
    });
    const composer = () => aui().thread.composer();

    let adding!: Promise<void>;
    act(() => {
      adding = composer().addAttachment(file);
    });
    await waitFor(() =>
      expect(composer().getState().attachments[0]?.status.type).toBe("running"),
    );

    await act(async () => {
      composer().setText("hello");
      composer().send();
    });
    expect(send).not.toHaveBeenCalled();
    expect(onNew).not.toHaveBeenCalled();

    await act(async () => {
      finishUpload();
      await adding;
    });
    await waitFor(() => expect(onNew).toHaveBeenCalledTimes(1));

    expect(send.mock.calls[0]![0].status).toEqual({
      type: "requires-action",
      reason: "composer-send",
    });
    expect(onNew.mock.calls[0]![0]).toMatchObject({
      content: [{ type: "text", text: "hello" }],
      attachments: [{ id: "att-1", status: { type: "complete" } }],
    });
    expect(composer().getState().attachments).toHaveLength(0);
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
  it("sends a prefilled attachment again after cancelling its removal in an earlier edit", async () => {
    const attachment: CompleteAttachment = {
      id: "saved",
      type: "file",
      name: "saved.txt",
      content: [],
      status: { type: "complete" },
    };
    const onEdit = vi.fn();
    const send = vi.fn();
    const aui = renderThreadWithProps({
      messages: [
        {
          id: "u1",
          role: "user",
          createdAt: new Date(0),
          content: [{ type: "text", text: "hello" }],
          attachments: [attachment],
          metadata: { custom: {} },
        },
      ],
      onEdit,
      attachmentAdapter: { accept: "*", add: vi.fn(), send, remove: vi.fn() },
    });
    const composer = () => aui().thread.message({ id: "u1" }).composer();
    await act(async () => {
      composer().beginEdit();
    });
    await act(async () => {
      await composer().attachment({ id: "saved" }).remove();
      composer().cancel();
      composer().beginEdit();
      composer().send();
    });
    expect(onEdit).toHaveBeenCalledOnce();
    expect(onEdit.mock.calls[0]![0].attachments).toEqual([attachment]);
    expect(send).not.toHaveBeenCalled();
  });

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
        status: { type: "running", reason: "uploading", progress: 0 },
      });
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
        add: async ({ file }: { file: File }) => ({
          id: "pending-1",
          type: "document",
          name: file.name,
          contentType: file.type,
          file,
          status: { type: "running", reason: "uploading", progress: 0 },
        }),
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

  it("removes an edit's attachment once when the edit is cancelled while its removal is pending", async () => {
    let finish!: () => void;
    const remove = vi
      .fn(async () => {})
      .mockImplementationOnce(
        () =>
          new Promise<void>((r) => {
            finish = r;
          }),
      );
    const aui = renderThreadWithProps({
      messages: [
        {
          id: "u1",
          role: "user",
          content: [{ type: "text", text: "hi" }],
          createdAt: new Date(0),
          metadata: { custom: {} },
        } as unknown as ExternalThreadMessage,
      ],
      onEdit: () => {},
      attachmentAdapter: {
        accept: "*",
        add: async ({ file }: { file: File }) => ({
          id: "pending-1",
          type: "document",
          name: file.name,
          contentType: file.type,
          file,
          status: { type: "running", reason: "uploading", progress: 0 },
        }),
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
    let removing!: Promise<void>;
    act(() => {
      removing = composer().attachment({ id: "pending-1" }).remove();
    });
    await act(async () => {
      composer().cancel();
    });
    await act(async () => {
      finish();
      await removing;
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
        status: { type: "running", reason: "uploading", progress: 0 },
      });
      await addPromise;
    });

    expect(composer().getState().attachments).toMatchObject([
      { id: "draft-1" },
    ]);
  });
});

describe("attachment sends and the client lifetime", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const userMessage: ExternalThreadMessage = {
    id: "u1",
    role: "user",
    content: [{ type: "text", text: "original" }],
    attachments: [],
    createdAt: new Date(0),
    metadata: { custom: {} },
  };

  const renderOwnedThread = (props: Partial<ExternalThreadProps>) => {
    const captured: {
      aui?: ReturnType<typeof useAui>;
      destroySignal?: AbortSignal | undefined;
    } = {};
    const Capture: FC = () => {
      captured.aui = useAui();
      captured.destroySignal = useAssistantClientDestroySignal();
      return null;
    };
    const Chat: FC = () => (
      <AuiProvider
        config={AuiConfig({
          thread: ExternalThread({ messages: [], isRunning: false, ...props }),
        })}
      >
        <Capture />
      </AuiProvider>
    );
    const App: FC<{ hidden: boolean }> = ({ hidden }) => (
      <Activity mode={hidden ? "hidden" : "visible"}>
        <Chat />
      </Activity>
    );
    const view = render(<App hidden={false} />);
    return {
      aui: () => captured.aui!,
      destroyListeners: () =>
        getEventListeners(captured.destroySignal!, "abort").length,
      hide: () => act(async () => view.rerender(<App hidden />)),
      reveal: () => act(async () => view.rerender(<App hidden={false} />)),
      destroy: async () => {
        view.unmount();
        // The owner's destroy signal aborts in a microtask after the unmount.
        await act(async () => {});
      },
    };
  };

  const slowAdapter = ({ honorsAbort = false } = {}) => {
    const upload = deferred();
    const signals: (AbortSignal | undefined)[] = [];
    const send = vi.fn(
      (attachment: PendingAttachment, options?: { signal?: AbortSignal }) =>
        new Promise<CompleteAttachment>((resolve, reject) => {
          const signal = options?.signal;
          signals.push(signal);
          if (honorsAbort)
            signal?.addEventListener("abort", () => reject(signal.reason));
          void upload.promise.then(() =>
            resolve({
              ...attachment,
              status: { type: "complete" },
              content: [],
            }),
          );
        }),
    );
    const adapter: AttachmentAdapter = {
      accept: "*",
      add: async ({ file }) => ({
        id: file.name,
        type: "file",
        name: file.name,
        file,
        status: { type: "requires-action", reason: "composer-send" },
      }),
      remove: async () => {},
      send,
    };
    return { adapter, upload, send, signals };
  };

  it.each([
    ["thread", "rejects on abort"],
    ["thread", "ignores the abort"],
    ["edit", "rejects on abort"],
    ["edit", "ignores the abort"],
  ] as const)(
    "aborts the %s composer's send and never dispatches it once the client is destroyed, when the adapter %s",
    async (type, behavior) => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const { adapter, upload, send, signals } = slowAdapter({
        honorsAbort: behavior === "rejects on abort",
      });
      const onNew = vi.fn();
      const onEdit = vi.fn();
      const thread = renderOwnedThread({
        messages: type === "edit" ? [userMessage] : [],
        onNew,
        onEdit,
        attachmentAdapter: adapter,
      });
      const composer = () =>
        type === "edit"
          ? thread.aui().thread.message({ id: "u1" }).composer()
          : thread.aui().thread.composer();
      await act(async () => {
        if (type === "edit") composer().beginEdit();
        await composer().addAttachment(new File(["a"], "a"));
        composer().setText("hello");
        composer().send();
      });
      expect(send).toHaveBeenCalledOnce();
      expect(signals[0]?.aborted).toBe(false);

      await thread.destroy();
      expect(signals[0]?.aborted).toBe(true);
      await act(async () => upload.resolve());

      expect(onNew).not.toHaveBeenCalled();
      expect(onEdit).not.toHaveBeenCalled();
      expect(consoleError).not.toHaveBeenCalled();
    },
  );

  it("finishes a send while the client is hidden", async () => {
    const { adapter, upload, signals } = slowAdapter();
    const onNew = vi.fn();
    const thread = renderOwnedThread({ onNew, attachmentAdapter: adapter });
    const composer = () => thread.aui().thread.composer();
    await act(async () => {
      await composer().addAttachment(new File(["a"], "a"));
      composer().setText("hello");
      composer().send();
    });

    await thread.hide();
    await act(async () => upload.resolve());
    expect(onNew).toHaveBeenCalledOnce();
    expect(signals[0]?.aborted).toBe(false);

    await thread.reveal();
    expect(onNew).toHaveBeenCalledOnce();
    expect(composer().getState().submission).toBeUndefined();
  });

  it("never calls send for an upload that finishes after the client is destroyed", async () => {
    const finishUpload = deferred();
    const onNew = vi.fn();
    const send = vi.fn();
    const file = new File(["data"], "notes.txt", { type: "text/plain" });
    const attachment = { id: "att-1", type: "file", name: file.name, file };
    const thread = renderOwnedThread({
      onNew,
      attachmentAdapter: {
        accept: "*",
        async *add() {
          yield {
            ...attachment,
            status: { type: "running", reason: "uploading", progress: 0 },
          } satisfies PendingAttachment;
          await finishUpload.promise;
          yield {
            ...attachment,
            status: { type: "requires-action", reason: "composer-send" },
          } satisfies PendingAttachment;
        },
        send,
        remove: async () => {},
      },
    });
    const composer = () => thread.aui().thread.composer();
    let adding!: Promise<void>;
    act(() => {
      adding = composer().addAttachment(file);
    });
    await waitFor(() =>
      expect(composer().getState().attachments[0]?.status.type).toBe("running"),
    );
    await act(async () => {
      composer().send();
    });

    await thread.destroy();
    await act(async () => {
      finishUpload.resolve();
      await adding;
    });

    expect(send).not.toHaveBeenCalled();
    expect(onNew).not.toHaveBeenCalled();
  });

  it("leaves a finished send's signal alone when the client is destroyed later", async () => {
    const { adapter, upload, signals } = slowAdapter();
    const onNew = vi.fn();
    const thread = renderOwnedThread({ onNew, attachmentAdapter: adapter });
    const composer = () => thread.aui().thread.composer();
    const listeners = thread.destroyListeners();
    await act(async () => {
      await composer().addAttachment(new File(["a"], "a"));
      composer().send();
    });
    await act(async () => upload.resolve());
    expect(onNew).toHaveBeenCalledOnce();
    expect(thread.destroyListeners()).toBe(listeners);

    await thread.destroy();
    expect(signals[0]?.aborted).toBe(false);
  });

  it("never calls the adapter for a send made after the client is destroyed", async () => {
    const { adapter, send } = slowAdapter();
    const onNew = vi.fn();
    const thread = renderOwnedThread({ onNew, attachmentAdapter: adapter });
    const composer = () => thread.aui().thread.composer();
    await act(async () => {
      await composer().addAttachment(new File(["a"], "a"));
      composer().setText("hello");
    });

    await thread.destroy();
    await act(async () => composer().send());

    expect(send).not.toHaveBeenCalled();
    expect(onNew).not.toHaveBeenCalled();
  });

  it.each(["the adapter's send", "an upload in add()"] as const)(
    "releases the destroy signal when a send stalled on %s is cancelled",
    async (stall) => {
      const { adapter } = slowAdapter();
      const file = new File(["a"], "a");
      const thread = renderOwnedThread({
        attachmentAdapter:
          stall === "the adapter's send"
            ? adapter
            : {
                ...adapter,
                async *add() {
                  yield {
                    id: file.name,
                    type: "file",
                    name: file.name,
                    file,
                    status: {
                      type: "running",
                      reason: "uploading",
                      progress: 0,
                    },
                  } satisfies PendingAttachment;
                  await new Promise<never>(() => {});
                },
              },
      });
      const composer = () => thread.aui().thread.composer();
      const listeners = thread.destroyListeners();
      act(() => {
        void composer().addAttachment(file);
      });
      await waitFor(() =>
        expect(composer().getState().attachments).toHaveLength(1),
      );

      for (let round = 0; round < 3; round++) {
        await act(async () => {
          composer().setText("hello");
          composer().send();
        });
        expect(composer().getState().submission).toBeDefined();
        expect(thread.destroyListeners()).toBe(listeners + 1);
        await act(async () => composer().cancel());
      }

      expect(composer().getState().submission).toBeUndefined();
      expect(thread.destroyListeners()).toBe(listeners);
    },
  );
});
