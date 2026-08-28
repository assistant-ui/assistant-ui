import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
});
import { createApp, defineComponent, h, nextTick, type Component } from "vue";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig } from "@assistant-ui/store/client";
import { RuntimeAdapter } from "@assistant-ui/core/store";
import type {
  AttachmentAdapter,
  ExternalStoreAdapter,
  PendingAttachment,
  ThreadMessageLike,
} from "@assistant-ui/core";
import {
  AssistantRuntimeImpl,
  ExternalStoreRuntimeCore,
} from "@assistant-ui/core/internal";
import { AuiProvider } from "../AuiProvider";
import { useAui } from "../useAui";
import { ThreadPrimitiveMessages } from "../primitives/ThreadPrimitiveMessages";
import {
  AttachmentPrimitiveName,
  AttachmentPrimitiveRemove,
  AttachmentPrimitiveThumb,
} from "../primitives/attachment";
import {
  ComposerPrimitiveAddAttachment,
  ComposerPrimitiveAttachmentDropzone,
  ComposerPrimitiveAttachments,
} from "../primitives/composerAttachments";
import { MessagePrimitiveAttachments } from "../primitives/messageAttachments";

type DemoMessage = {
  role: "user" | "assistant";
  content: ThreadMessageLike["content"];
  attachments?: ThreadMessageLike["attachments"];
};

const createTestAttachmentAdapter = (
  accept = "*",
): AttachmentAdapter & {
  added: File[];
  removed: string[];
} => {
  const added: File[] = [];
  const removed: string[] = [];
  let nextId = 0;
  return {
    accept,
    added,
    removed,
    async add({ file }): Promise<PendingAttachment> {
      added.push(file);
      return {
        id: `att-${nextId++}`,
        type: "file",
        name: file.name,
        contentType: file.type,
        file,
        status: { type: "requires-action", reason: "composer-send" },
      };
    },
    async send(attachment) {
      return {
        ...attachment,
        status: { type: "complete" },
        content: [],
      };
    },
    async remove(attachment) {
      removed.push(attachment.id);
    },
  };
};

const createTestRuntime = ({
  withAttachments = true,
  accept = "*",
}: { withAttachments?: boolean; accept?: string } = {}) => {
  let messages: DemoMessage[] = [];
  const attachmentAdapter = createTestAttachmentAdapter(accept);
  const makeAdapter = (): ExternalStoreAdapter<DemoMessage> => ({
    messages,
    isRunning: false,
    convertMessage: (message) => ({
      role: message.role,
      content: message.content,
      attachments: message.attachments,
    }),
    onNew: async () => {},
    ...(withAttachments && { adapters: { attachments: attachmentAdapter } }),
  });
  const core = new ExternalStoreRuntimeCore(makeAdapter());
  const runtime = new AssistantRuntimeImpl(core);
  const append = (message: DemoMessage) => {
    messages = [...messages, message];
    core.setAdapter(makeAdapter());
  };
  return { runtime, append, attachmentAdapter };
};

const mountChat = (runtime: AssistantRuntimeImpl, view: Component) => {
  let client: any;
  const CaptureClient = defineComponent({
    setup() {
      client = useAui();
      return () => null;
    },
  });
  const app = createApp(
    defineComponent({
      setup: () => () =>
        h(
          AuiProvider,
          { config: AuiConfig({ threads: RuntimeAdapter(runtime) }) },
          { default: () => [h(CaptureClient), h(view)] },
        ),
    }),
  );
  const el = document.createElement("div");
  app.mount(el);
  return { el, client: () => client, unmount: () => app.unmount() };
};

const makeFile = (name: string, type = "text/plain") =>
  new File(["data"], name, { type });

const ComposerAttachmentsView = defineComponent({
  setup: () => () =>
    h("div", null, [
      h(ComposerPrimitiveAttachments, null, {
        default: () =>
          h("span", { class: "att" }, [
            h(AttachmentPrimitiveName),
            h(AttachmentPrimitiveThumb, { class: "thumb" }),
            h(
              AttachmentPrimitiveRemove,
              { class: "remove" },
              {
                default: () => "x",
              },
            ),
          ]),
      }),
    ]),
});

describe("composer attachment primitives", () => {
  it("iterates composer attachments with name and thumb labels", async () => {
    const { runtime } = createTestRuntime();
    const { el, client, unmount } = mountChat(runtime, ComposerAttachmentsView);

    await client().composer.addAttachment(makeFile("report.pdf"));
    await client().composer.addAttachment(makeFile("noext", "text/plain"));
    flushTapSync(() => {});

    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelectorAll("span.att")).toHaveLength(2);
    });
    const thumbs = [...el.querySelectorAll(".thumb")].map((n) => n.textContent);
    expect(el.textContent).toContain("report.pdf");
    expect(thumbs[0]).toBe(".pdf");
    expect(thumbs[1]).toBe("file");

    unmount();
  });

  it("removes an attachment through the remove button", async () => {
    const { runtime, attachmentAdapter } = createTestRuntime();
    const { el, client, unmount } = mountChat(runtime, ComposerAttachmentsView);

    await client().composer.addAttachment(makeFile("a.txt"));
    flushTapSync(() => {});
    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelector("button.remove")).not.toBeNull();
    });

    (el.querySelector("button.remove") as HTMLButtonElement).click();
    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelectorAll("span.att")).toHaveLength(0);
    });
    expect(attachmentAdapter.removed).toHaveLength(1);

    unmount();
  });

  it("opens a file picker with the composer's accept filter and cleans it up", async () => {
    const { runtime } = createTestRuntime();
    const view = defineComponent({
      setup: () => () =>
        h(
          ComposerPrimitiveAddAttachment,
          { class: "add" },
          {
            default: () => "+",
          },
        ),
    });
    const { el, unmount } = mountChat(runtime, view);
    await nextTick();

    const button = el.querySelector("button.add") as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    button.click();

    const input = document.body.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.multiple).toBe(true);
    expect(input.accept).toBe("");

    input.dispatchEvent(new Event("change"));
    expect(document.body.querySelector('input[type="file"]')).toBeNull();

    unmount();
  });

  it("applies a non-wildcard adapter accept to the file picker", async () => {
    const { runtime } = createTestRuntime({ accept: "image/*" });
    const view = defineComponent({
      setup: () => () =>
        h(
          ComposerPrimitiveAddAttachment,
          { class: "add" },
          {
            default: () => "+",
          },
        ),
    });
    const { el, unmount } = mountChat(runtime, view);
    await nextTick();

    (el.querySelector("button.add") as HTMLButtonElement).click();
    const input = document.body.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    expect(input.accept).toBe("image/*");
    input.remove();

    unmount();
  });
});

const dragEvent = (type: string, files: File[] = [], kinds = ["Files"]) => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", {
    value: { types: kinds, files, dropEffect: "" },
    configurable: true,
  });
  return event as DragEvent;
};

describe("ComposerPrimitiveAttachmentDropzone", () => {
  const DropzoneView = defineComponent({
    setup: () => () =>
      h(
        ComposerPrimitiveAttachmentDropzone,
        { class: "dz" },
        {
          default: () => "drop here",
        },
      ),
  });

  it("flags data-dragging on file drag and adds dropped files", async () => {
    const { runtime, attachmentAdapter } = createTestRuntime();
    const { el, client, unmount } = mountChat(runtime, DropzoneView);
    await nextTick();
    const dz = el.querySelector(".dz") as HTMLElement;

    dz.dispatchEvent(dragEvent("dragenter"));
    await nextTick();
    expect(dz.dataset["dragging"]).toBe("true");

    dz.dispatchEvent(dragEvent("drop", [makeFile("dropped.txt")]));
    await vi.waitFor(async () => {
      await nextTick();
      expect(attachmentAdapter.added).toHaveLength(1);
    });
    expect(dz.dataset["dragging"]).toBeUndefined();
    await vi.waitFor(() => {
      flushTapSync(() => {});
      expect(client().composer.getState().attachments).toHaveLength(1);
    });

    unmount();
  });

  it("keeps data-dragging across descendant transitions and restores it on dragover", async () => {
    const { runtime } = createTestRuntime();
    const inner = defineComponent({
      setup: () => () => h("span", { class: "inner" }, "target"),
    });
    const view = defineComponent({
      setup: () => () =>
        h(
          ComposerPrimitiveAttachmentDropzone,
          { class: "dz" },
          {
            default: () => h(inner),
          },
        ),
    });
    const { el, unmount } = mountChat(runtime, view);
    await nextTick();
    const dz = el.querySelector(".dz") as HTMLElement;
    const child = el.querySelector(".inner") as HTMLElement;

    dz.dispatchEvent(dragEvent("dragenter"));
    await nextTick();
    expect(dz.dataset["dragging"]).toBe("true");

    const leaveToChild = dragEvent("dragleave");
    Object.defineProperty(leaveToChild, "relatedTarget", {
      value: child,
      configurable: true,
    });
    dz.dispatchEvent(leaveToChild);
    await nextTick();
    expect(dz.dataset["dragging"]).toBe("true");

    const leaveOutside = dragEvent("dragleave");
    Object.defineProperty(leaveOutside, "relatedTarget", {
      value: document.body,
      configurable: true,
    });
    dz.dispatchEvent(leaveOutside);
    await nextTick();
    expect(dz.dataset["dragging"]).toBeUndefined();

    dz.dispatchEvent(dragEvent("dragover"));
    await nextTick();
    expect(dz.dataset["dragging"]).toBe("true");

    unmount();
  });

  it("ignores non-file drags and rejects drops without attachment support", async () => {
    const { runtime, attachmentAdapter } = createTestRuntime({
      withAttachments: false,
    });
    const { el, unmount } = mountChat(runtime, DropzoneView);
    await nextTick();
    const dz = el.querySelector(".dz") as HTMLElement;

    dz.dispatchEvent(dragEvent("dragenter", [], ["text/plain"]));
    await nextTick();
    expect(dz.dataset["dragging"]).toBeUndefined();

    const enter = dragEvent("dragenter");
    dz.dispatchEvent(enter);
    await nextTick();
    expect(dz.dataset["dragging"]).toBeUndefined();
    expect((enter as any).dataTransfer.dropEffect).toBe("none");

    dz.dispatchEvent(dragEvent("drop", [makeFile("a.txt")]));
    await nextTick();
    expect(attachmentAdapter.added).toHaveLength(0);

    unmount();
  });
});

describe("MessagePrimitiveAttachments", () => {
  it("iterates the current message's attachments", async () => {
    const { runtime, append } = createTestRuntime();
    const view = defineComponent({
      setup: () => () =>
        h("li", null, [
          h(ThreadPrimitiveMessages, null, {
            default: () =>
              h(MessagePrimitiveAttachments, null, {
                default: () =>
                  h("span", { class: "matt" }, [h(AttachmentPrimitiveName)]),
              }),
          }),
        ]),
    });
    const { el, unmount } = mountChat(runtime, view);

    flushTapSync(() =>
      append({
        role: "user",
        content: [{ type: "text", text: "see attached" }],
        attachments: [
          {
            id: "att-a",
            type: "file",
            name: "notes.md",
            contentType: "text/markdown",
            status: { type: "complete" },
            content: [],
          },
        ],
      }),
    );

    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelector("span.matt")).not.toBeNull();
    });
    expect(el.textContent).toContain("notes.md");

    unmount();
  });
});
