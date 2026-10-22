// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import type { FC } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { resource, useResource } from "@assistant-ui/tap";
import {
  AuiConfig,
  AuiProvider,
  Derived,
  useAui,
  useAuiEvent,
} from "@assistant-ui/store";
import type { AssistantClient } from "@assistant-ui/store";
import type { AttachmentAdapter } from "../../adapters/attachment";
import type { PendingAttachment } from "../../types/attachment";
import { InMemoryThreadList } from "../../react/client/InMemoryThreadList";
import type {
  ExternalThreadMessage,
  ExternalThreadProps,
} from "./external-thread";
import { ExternalThread } from "./external-thread";

let aui!: AssistantClient;
const onNew = vi.fn();
const onEdit = vi.fn();
const onSend = vi.fn();
const onAnySend = vi.fn();
const onAttachmentAdd = vi.fn();
const onAttachmentAddError = vi.fn();
const onTextChange = vi.fn();
const onAnyTextChange = vi.fn();
const onComposerCancel = vi.fn();
const onAnyAttachmentAdd = vi.fn();

const Capture: FC = () => {
  aui = useAui();
  useAuiEvent("composer.send", onSend);
  useAuiEvent({ scope: "*", event: "composer.send" }, onAnySend);
  useAuiEvent("composer.attachmentAdd", onAttachmentAdd);
  useAuiEvent("composer.attachmentAddError", onAttachmentAddError);
  useAuiEvent("composer.textChange", onTextChange);
  useAuiEvent({ scope: "*", event: "composer.textChange" }, onAnyTextChange);
  useAuiEvent("composer.cancel", onComposerCancel);
  useAuiEvent(
    { scope: "*", event: "composer.attachmentAdd" },
    onAnyAttachmentAdd,
  );
  return null;
};

const Harness: FC<{ props: ExternalThreadProps }> = ({ props }) => {
  const client = useAui({
    thread: ExternalThread(props),
  });
  return (
    <AuiProvider value={client}>
      <Capture />
    </AuiProvider>
  );
};

const renderThread = (props: Partial<ExternalThreadProps> = {}) => {
  render(
    <Harness
      props={{
        messages: [],
        onNew,
        onEdit,
        ...props,
      }}
    />,
  );
  return () => aui;
};

afterEach(() => {
  cleanup();
  onNew.mockClear();
  onEdit.mockClear();
  onSend.mockClear();
  onAnySend.mockClear();
  onAttachmentAdd.mockClear();
  onAttachmentAddError.mockClear();
  onTextChange.mockClear();
  onAnyTextChange.mockClear();
  onComposerCancel.mockClear();
  onAnyAttachmentAdd.mockClear();
  vi.restoreAllMocks();
});

it("forwards send and text changes from the ExternalThread composer", async () => {
  const getAui = renderThread();

  await act(async () => {
    getAui().thread.composer().setText("hello", { origin: "user" });
    getAui().thread.composer().send();
  });

  expect(onTextChange.mock.calls).toEqual([
    [{ threadId: "default", text: "hello", origin: "user" }],
    [{ threadId: "default", text: "", origin: "send" }],
  ]);
  expect(onSend).toHaveBeenCalledExactlyOnceWith({
    threadId: "default",
    chars: 5,
    attachments: 0,
  });
  expect(onNew).toHaveBeenCalledOnce();
});

it("tags reset, returned-send, and edit-seed text writes with their origins", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  onNew.mockImplementation(() => {
    throw new Error("send failed");
  });
  const message = {
    id: "message-1",
    role: "user",
    content: [{ type: "text", text: "seed" }],
    createdAt: new Date(0),
    metadata: { custom: {} },
  } as unknown as ExternalThreadMessage;
  const getAui = renderThread({ messages: [message] });
  const composer = getAui().thread.composer();

  await act(async () => {
    composer.setText("draft");
    await composer.reset();
    composer.setText("return me");
    composer.send();
  });

  expect(onTextChange.mock.calls).toEqual([
    [{ threadId: "default", text: "draft", origin: "external" }],
    [{ threadId: "default", text: "", origin: "reset" }],
    [{ threadId: "default", text: "return me", origin: "external" }],
    [{ threadId: "default", text: "", origin: "send" }],
    [{ threadId: "default", text: "return me", origin: "return" }],
  ]);
  expect(onSend).not.toHaveBeenCalled();

  onTextChange.mockClear();
  onAnyTextChange.mockClear();
  await act(async () => {
    getAui().thread.message({ id: "message-1" }).composer().beginEdit();
  });

  expect(onAnyTextChange).toHaveBeenCalledExactlyOnceWith({
    threadId: "default",
    messageId: "message-1",
    text: "seed",
    origin: "external",
  });

  onAnySend.mockClear();
  await act(async () => {
    const editComposer = getAui()
      .thread.message({ id: "message-1" })
      .composer();
    editComposer.setText("updated", { origin: "user" });
    editComposer.send();
  });

  expect(onAnySend).toHaveBeenCalledExactlyOnceWith({
    threadId: "default",
    messageId: "message-1",
    chars: 7,
    attachments: 0,
  });
});

it("forwards cancel only while the thread composer can cancel", async () => {
  const onCancel = vi.fn();
  const getAui = renderThread({ isRunning: true, onCancel });

  await act(async () => {
    getAui().thread.composer().cancel();
  });

  expect(onComposerCancel).toHaveBeenCalledExactlyOnceWith({
    threadId: "default",
  });
  expect(onCancel).toHaveBeenCalledOnce();

  cleanup();
  onComposerCancel.mockClear();
  const getIdle = renderThread({ onCancel });
  await act(async () => {
    getIdle().thread.composer().cancel();
  });

  expect(onComposerCancel).not.toHaveBeenCalled();
});

it("forwards cancel for a send still being prepared", async () => {
  const attachmentAdapter: AttachmentAdapter = {
    accept: "*",
    add: async ({ file }) => ({
      id: "attachment-1",
      type: "file",
      name: file.name,
      contentType: file.type,
      file,
      status: { type: "requires-action", reason: "composer-send" },
    }),
    remove: async () => {},
    send: () => new Promise(() => {}),
  };
  const getAui = renderThread({ attachmentAdapter });
  const composer = getAui().thread.composer();

  await act(async () => {
    await composer.addAttachment(
      new File(["notes"], "notes.txt", { type: "text/plain" }),
    );
    composer.setText("with file");
    composer.send();
  });
  expect(getAui().thread.composer().getState().canCancel).toBe(true);

  await act(async () => {
    getAui().thread.composer().cancel();
  });

  expect(onComposerCancel).toHaveBeenCalledExactlyOnceWith({
    threadId: "default",
  });
  expect(getAui().thread.composer().getState().canCancel).toBe(false);
  expect(onNew).not.toHaveBeenCalled();
});

it("reports a late attachment add under the thread it started on", async () => {
  let resolveAdd!: (attachment: PendingAttachment) => void;
  const attachmentAdapter: AttachmentAdapter = {
    accept: "*",
    add: () =>
      new Promise<PendingAttachment>((resolve) => {
        resolveAdd = resolve;
      }),
    remove: async () => {},
    send: async (attachment) => ({
      ...attachment,
      status: { type: "complete" },
      content: [],
    }),
  };
  const App: FC = () => {
    const client = useAui({
      threads: InMemoryThreadList({
        thread: () => ExternalThread({ messages: [], attachmentAdapter }),
      }),
    });
    return (
      <AuiProvider value={client}>
        <Capture />
      </AuiProvider>
    );
  };
  render(<App />);
  const startedOn = aui.threads.getState().mainThreadId;
  const file = new File(["notes"], "notes.txt", { type: "text/plain" });

  let adding!: Promise<void>;
  await act(async () => {
    adding = aui.composer().addAttachment(file);
  });
  await act(async () => {
    aui.threads.switchToNewThread();
  });
  expect(aui.threads.getState().mainThreadId).not.toBe(startedOn);

  await act(async () => {
    resolveAdd({
      id: "attachment-1",
      type: "file",
      name: file.name,
      contentType: file.type,
      file,
      status: { type: "requires-action", reason: "composer-send" },
    });
    await adding;
  });

  expect(onAnyAttachmentAdd).toHaveBeenCalledExactlyOnceWith({
    threadId: startedOn,
    contentType: "text/plain",
  });
});

it("reports an unknown thread when no thread list is in scope", async () => {
  const StandaloneThread = resource(function useStandaloneThread() {
    return useResource(ExternalThread({ messages: [], onNew }));
  });
  const StandaloneApp: FC = () => (
    <AuiProvider
      config={AuiConfig({
        thread: StandaloneThread(),
        composer: Derived({
          source: "thread",
          query: {},
          get: (client) => client.thread.composer(),
        }),
      })}
    >
      <Capture />
    </AuiProvider>
  );
  render(<StandaloneApp />);

  await act(async () => {
    aui.composer().setText("hello", { origin: "user" });
  });

  expect(onTextChange).toHaveBeenCalledExactlyOnceWith({
    threadId: "unknown",
    text: "hello",
    origin: "user",
  });
});

it("forwards attachment success and serializable adapter errors", async () => {
  const add = vi
    .fn<AttachmentAdapter["add"]>()
    .mockResolvedValueOnce({
      id: "attachment-1",
      type: "file",
      name: "notes.txt",
      contentType: "text/plain",
      file: new File(["notes"], "notes.txt", { type: "text/plain" }),
      status: { type: "requires-action", reason: "composer-send" },
    })
    .mockRejectedValueOnce(new Error("upload failed"));
  const attachmentAdapter: AttachmentAdapter = {
    accept: "*",
    add,
    remove: async () => {},
    send: async (attachment) => ({
      ...attachment,
      status: { type: "complete" },
      content: [],
    }),
  };
  const getAui = renderThread({ attachmentAdapter });
  const composer = getAui().thread.composer();

  await act(async () => {
    await composer.addAttachment(
      new File(["notes"], "notes.txt", { type: "text/plain" }),
    );
  });
  await act(async () => {
    await expect(
      composer.addAttachment(
        new File(["more"], "more.txt", { type: "text/plain" }),
      ),
    ).rejects.toThrow("upload failed");
  });

  expect(onAttachmentAdd).toHaveBeenCalledExactlyOnceWith({
    threadId: "default",
    contentType: "text/plain",
  });
  expect(onAttachmentAddError).toHaveBeenCalledExactlyOnceWith({
    threadId: "default",
    reason: "adapter-error",
    message: "upload failed",
    contentType: "text/plain",
  });
});

it("forwards accepted local attachments and rejected file types", async () => {
  const getAui = renderThread();
  const composer = getAui().thread.composer();

  await act(async () => {
    await composer.addAttachment(
      new File(["notes"], "notes.txt", { type: "text/plain" }),
    );
    await composer.addAttachment({
      id: "attachment-2",
      name: "data.json",
      contentType: "application/json",
      content: [],
    });
  });

  expect(onAttachmentAdd.mock.calls).toEqual([
    [{ threadId: "default", contentType: "text/plain" }],
    [{ threadId: "default", contentType: "application/json" }],
  ]);

  const add = vi.fn<AttachmentAdapter["add"]>();
  const attachmentAdapter: AttachmentAdapter = {
    accept: "image/*",
    add,
    remove: async () => {},
    send: async (attachment) => ({
      ...attachment,
      status: { type: "complete" },
      content: [],
    }),
  };
  cleanup();
  renderThread({ attachmentAdapter });
  const imageOnlyComposer = aui.thread.composer();

  await act(async () => {
    await expect(
      imageOnlyComposer.addAttachment(
        new File(["notes"], "notes.txt", { type: "text/plain" }),
      ),
    ).rejects.toThrow(
      "File type text/plain is not accepted. Accepted types: image/*",
    );
  });

  expect(add).not.toHaveBeenCalled();
  expect(onAttachmentAddError).toHaveBeenCalledExactlyOnceWith({
    threadId: "default",
    reason: "not-accepted",
    message: "File type text/plain is not accepted. Accepted types: image/*",
    contentType: "text/plain",
  });
});
