import { afterEach, describe, expect, it, vi } from "vitest";
import { createComponent, onCleanup, type JSX } from "solid-js";
import { Dynamic, render } from "solid-js/web";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig } from "@assistant-ui/store/client";
import {
  ExternalThread,
  InMemoryThreadList,
  RuntimeAdapter,
} from "@assistant-ui/core/store";
import type {
  CompleteAttachment,
  ExternalStoreAdapter,
  ThreadMessageLike,
} from "@assistant-ui/core";
import {
  AssistantRuntimeImpl,
  ExternalStoreRuntimeCore,
} from "@assistant-ui/core/internal";
import { AuiProvider } from "../AuiProvider";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";
import { ThreadPrimitiveMessages } from "./ThreadPrimitiveMessages";
import { AttachmentPrimitiveName } from "./attachment";
import { MessagePrimitiveAttachments } from "./messageAttachments";

const attachment = (id: string, name: string): CompleteAttachment => ({
  id,
  type: "file",
  name,
  contentType: "text/plain",
  status: { type: "complete" },
  content: [],
});
const disposers: (() => void)[] = [];
afterEach(() => {
  disposers.splice(0).forEach((dispose) => dispose());
  vi.restoreAllMocks();
});
const mount = (row: () => JSX.Element) => {
  let messages: ThreadMessageLike[] = [];
  const makeAdapter = (): ExternalStoreAdapter<ThreadMessageLike> => ({
    messages,
    convertMessage: (message) => message,
    onNew: async () => {},
  });
  const core = new ExternalStoreRuntimeCore(makeAdapter());
  const runtime = new AssistantRuntimeImpl(core);
  const el = document.createElement("div");
  document.body.append(el);
  const dispose = render(
    () =>
      createComponent(AuiProvider, {
        config: AuiConfig({ threads: RuntimeAdapter(runtime) }),
        get children() {
          return createComponent(ThreadPrimitiveMessages, {
            get children() {
              return createComponent(MessagePrimitiveAttachments, {
                get children() {
                  return createComponent(row, {});
                },
              });
            },
          });
        },
      }),
    el,
  );
  disposers.push(() => {
    dispose();
    el.remove();
  });
  return {
    el,
    setMessages: (next: ThreadMessageLike[]) => {
      messages = next;
      flushTapSync(() => core.setAdapter(makeAdapter()));
    },
  };
};
const message = (
  attachments: CompleteAttachment[],
  content = "files",
): ThreadMessageLike => ({ id: "m1", role: "user", content, attachments });
const Row = () =>
  createComponent(Dynamic, {
    component: "li",
    get children() {
      return createComponent(AttachmentPrimitiveName, {});
    },
  });

describe("MessagePrimitiveAttachments", () => {
  it("renders submission attachments while the upload is in flight", async () => {
    let finish!: () => void;
    const upload = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const onNew = vi.fn(async () => {});
    let client!: ReturnType<typeof useAui>;
    const Capture = () => {
      client = useAui();
      return createComponent(ThreadPrimitiveMessages, {
        get children() {
          return createComponent(MessagePrimitiveAttachments, {
            get children() {
              return createComponent(Row, {});
            },
          });
        },
      });
    };
    const el = document.createElement("div");
    document.body.append(el);
    const dispose = render(
      () =>
        createComponent(AuiProvider, {
          config: AuiConfig({
            threads: InMemoryThreadList({
              thread: () =>
                ExternalThread({
                  messages: [],
                  onNew,
                  attachmentAdapter: {
                    accept: "*",
                    async remove() {},
                    async add({ file }) {
                      return {
                        id: "upload",
                        type: "file",
                        name: file.name,
                        file,
                        status: {
                          type: "requires-action",
                          reason: "composer-send",
                        },
                      };
                    },
                    async send(attachment) {
                      await upload;
                      return {
                        ...attachment,
                        status: { type: "complete" },
                        content: [],
                      };
                    },
                  },
                }),
            }),
          }),
          get children() {
            return createComponent(Capture, {});
          },
        }),
      el,
    );
    disposers.push(() => {
      dispose();
      el.remove();
    });
    await client.composer.addAttachment(new File(["data"], "upload.txt"));
    flushTapSync(() => {
      client.composer.setText("files");
      client.composer.send();
    });
    await vi.waitFor(() => expect(el.textContent).toBe("upload.txt"));
    expect(client.thread.getState().messages[0]?.attachments).toEqual([]);
    expect(
      client.thread.getState().messages[0]?.submission?.attachments[0]?.name,
    ).toBe("upload.txt");
    expect(onNew).not.toHaveBeenCalled();
    finish();
    await vi.waitFor(() => expect(onNew).toHaveBeenCalledOnce());
  });

  it("iterates the current message's attachments and leaves other messages empty", () => {
    const { el, setMessages } = mount(Row);
    expect(el.textContent).toBe("");
    setMessages([
      message([attachment("att-a", "notes.md")], "see attached"),
      { id: "m2", role: "user", content: "no attachments" },
      { id: "m3", role: "assistant", content: "reply" },
    ]);
    expect(
      [...el.querySelectorAll("li")].map((node) => node.textContent),
    ).toEqual(["notes.md"]);
  });

  it("keeps slot state and live scopes with attachments when they swap", async () => {
    const mounts = vi.fn();
    const Stateful = () => {
      mounts();
      const name = useAuiState((s) => s.attachment.name);
      const initialName = name();
      return createComponent(Dynamic, {
        component: "li",
        get children() {
          return `${initialName}:${name()}`;
        },
      });
    };
    const { el, setMessages } = mount(Stateful);
    const first = attachment("att-a", "alpha.txt");
    const second = attachment("att-b", "beta.txt");
    setMessages([message([first, second])]);
    const [a, b] = el.querySelectorAll("li");
    expect(el.textContent).toBe("alpha.txt:alpha.txtbeta.txt:beta.txt");
    setMessages([message([{ ...second, name: "updated.txt" }, first])]);
    await vi.waitFor(() =>
      expect([...el.querySelectorAll("li")]).toEqual([b, a]),
    );
    expect(el.textContent).toBe("beta.txt:updated.txtalpha.txt:alpha.txt");
    expect(mounts).toHaveBeenCalledTimes(2);
  });

  it("removes middle and tail rows without stale errors and remounts a replaced identity", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const mounted = vi.fn();
    const cleaned = vi.fn();
    const { el, setMessages } = mount(() => {
      mounted();
      onCleanup(cleaned);
      return createComponent(Row, {});
    });
    const first = attachment("a", "first.txt");
    const second = attachment("b", "second.txt");
    const third = attachment("c", "third.txt");
    setMessages([message([first, second, third])]);
    const [a, , c] = el.querySelectorAll("li");
    setMessages([message([first, third])]);
    await vi.waitFor(() =>
      expect([...el.querySelectorAll("li")]).toEqual([a, c]),
    );
    setMessages([
      message([first, { ...third, id: "d", name: "replacement.txt" }]),
    ]);
    expect(el.querySelectorAll("li")[1]).not.toBe(c);
    expect(el.textContent).toBe("first.txtreplacement.txt");
    setMessages([message([])]);
    await Promise.resolve();
    expect(el.querySelectorAll("li")).toHaveLength(0);
    expect(mounted).toHaveBeenCalledTimes(4);
    expect(cleaned).toHaveBeenCalledTimes(4);
    expect(error).not.toHaveBeenCalled();
  });
});
