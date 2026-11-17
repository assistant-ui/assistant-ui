import { afterEach, describe, expect, it, vi } from "vitest";
import { createComponent, createSignal, Show } from "solid-js";
import { Dynamic, render } from "solid-js/web";
import { flushTapSync } from "@assistant-ui/tap";
import {
  AuiConfig,
  Derived,
  type AssistantClient,
} from "@assistant-ui/store/client";
import { RuntimeAdapter } from "@assistant-ui/core/store";
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
import { AttachmentByIndexProvider } from "./AttachmentByIndexProvider";

const attachment = (id: string): CompleteAttachment => ({
  id,
  name: id,
  type: "file",
  content: [],
  status: { type: "complete" },
});
const disposers: (() => void)[] = [];
afterEach(() => {
  disposers.splice(0).forEach((dispose) => dispose());
  vi.restoreAllMocks();
});
const mount = (
  props: Omit<Parameters<typeof AttachmentByIndexProvider>[0], "children"> = {
    source: "message",
    index: 0,
  },
  visible: () => boolean = () => true,
) => {
  let attachments = [attachment("first"), attachment("second")];
  const makeAdapter = (): ExternalStoreAdapter<ThreadMessageLike> => ({
    messages: [{ id: "m1", role: "user", content: "files", attachments }],
    convertMessage: (message) => message,
    onNew: async () => {},
    onEdit: async () => {},
  });
  const core = new ExternalStoreRuntimeCore(makeAdapter());
  const runtime = new AssistantRuntimeImpl(core);
  let scoped!: AssistantClient;
  const Probe = () => {
    scoped = useAui();
    const name = useAuiState((s) => s.attachment.name);
    return createComponent(Dynamic, {
      component: "span",
      get children() {
        return name();
      },
    });
  };
  const el = document.createElement("div");
  document.body.append(el);
  const dispose = render(
    () =>
      createComponent(AuiProvider, {
        config: AuiConfig({
          threads: RuntimeAdapter(runtime),
          message: Derived({
            source: "thread",
            query: { type: "id", id: "m1" },
            get: (aui) => aui.threads.thread("main").message({ id: "m1" }),
          }),
        }),
        get children() {
          return createComponent(Show, {
            keyed: true,
            get when() {
              return visible();
            },
            get children() {
              return createComponent(AttachmentByIndexProvider, {
                get source() {
                  return props.source;
                },
                get index() {
                  return props.index;
                },
                get children() {
                  return createComponent(Probe, {});
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
    runtime,
    client: () => scoped,
    setAttachments: (next: CompleteAttachment[]) => {
      attachments = next;
      flushTapSync(() => core.setAdapter(makeAdapter()));
    },
  };
};

describe("AttachmentByIndexProvider", () => {
  it("follows live index and source props", async () => {
    const [index, setIndex] = createSignal(1);
    const [source, setSource] = createSignal<"composer" | "message">("message");
    const { el, runtime, setAttachments } = mount({
      get index() {
        return index();
      },
      get source() {
        return source();
      },
    });
    expect(el.textContent).toBe("second");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    setAttachments([attachment("first")]);
    setIndex(0);
    await vi.waitFor(() => expect(el.textContent).toBe("first"));
    await runtime.thread.composer.addAttachment({
      name: "draft.txt",
      content: [],
    });
    flushTapSync(() => {});
    setSource("composer");
    await vi.waitFor(() => expect(el.textContent).toBe("draft.txt"));
    expect(error).not.toHaveBeenCalled();
  });

  it("reports a provider still out of bounds after microtask expiry", async () => {
    const { el, setAttachments } = mount();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    setAttachments([]);
    expect(el.textContent).toBe("first");
    expect(error).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining(
        "AttachmentByIndexProvider: index 0 is still out of bounds",
      ),
    );
  });

  it("keeps a recovered cache through expiry and expires a later shrink", async () => {
    const { el, setAttachments } = mount();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    setAttachments([]);
    setAttachments([attachment("restored")]);
    await Promise.resolve();
    expect(el.textContent).toBe("restored");
    expect(error).not.toHaveBeenCalled();
    setAttachments([]);
    await Promise.resolve();
    expect(error).toHaveBeenCalledTimes(1);
    setAttachments([attachment("again")]);
    expect(el.textContent).toBe("again");
  });

  it("does not report a removed provider", async () => {
    const [visible, setVisible] = createSignal(true);
    const { el, setAttachments } = mount(undefined, visible);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    setAttachments([]);
    setVisible(false);
    await Promise.resolve();
    expect(el.textContent).toBe("");
    expect(error).not.toHaveBeenCalled();
  });

  it("throws for an index that was never valid", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => mount({ source: "message", index: 99 })).toThrow(
      /out of bounds/,
    );
  });
});
