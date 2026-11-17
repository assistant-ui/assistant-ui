import { afterEach, describe, expect, it, vi } from "vitest";
import { createComponent, createSignal, mergeProps, type JSX } from "solid-js";
import { Dynamic, render } from "solid-js/web";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig, type AssistantClient } from "@assistant-ui/store/client";
import {
  ExternalThread,
  InMemoryThreadList,
  RuntimeAdapter,
} from "@assistant-ui/core/store";
import type {
  AttachmentAdapter,
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
import { MessageByIdProvider } from "./MessageByIdProvider";
import {
  AttachmentPrimitiveName,
  AttachmentPrimitiveRemove,
  AttachmentPrimitiveThumb,
} from "./attachment";
import {
  ComposerPrimitiveAddAttachment,
  ComposerPrimitiveAttachmentDropzone,
  ComposerPrimitiveAttachments,
} from "./composerAttachments";

const file = (name: string) => new File(["data"], name, { type: "text/plain" });
const createAttachmentAdapter = (accept = "*") => {
  const added: File[] = [];
  const removed: string[] = [];
  const adapter: AttachmentAdapter = {
    accept,
    async add({ file }) {
      added.push(file);
      return {
        id: `att-${added.length}`,
        type: "file",
        name: file.name,
        contentType: file.type,
        file,
        status: { type: "requires-action", reason: "composer-send" },
      };
    },
    async send(attachment) {
      return { ...attachment, status: { type: "complete" }, content: [] };
    },
    async remove(attachment) {
      removed.push(attachment.id);
    },
  };
  return { adapter, added, removed };
};
const createRuntime = ({
  withAttachments = true,
  accept = "*",
  isDisabled = false,
} = {}) => {
  const attachments = createAttachmentAdapter(accept);
  const makeAdapter = (): ExternalStoreAdapter<ThreadMessageLike> => ({
    messages: [{ id: "m1", role: "user", content: "original" }],
    convertMessage: (message) => message,
    onNew: async () => {},
    onEdit: async () => {},
    isDisabled,
    ...(withAttachments && { adapters: { attachments: attachments.adapter } }),
  });
  const core = new ExternalStoreRuntimeCore(makeAdapter());
  return {
    runtime: new AssistantRuntimeImpl(core),
    ...attachments,
    setDisabled: (value: boolean) => {
      isDisabled = value;
      flushTapSync(() => core.setAdapter(makeAdapter()));
    },
    setSupported: (value: boolean) => {
      withAttachments = value;
      flushTapSync(() => core.setAdapter(makeAdapter()));
    },
  };
};
const disposers: (() => void)[] = [];
afterEach(() => {
  disposers.splice(0).forEach((dispose) => dispose());
  document
    .querySelectorAll('input[type="file"]')
    .forEach((input) => input.remove());
  vi.restoreAllMocks();
});
const mountConfig = (config: AuiConfig, view: () => JSX.Element) => {
  let client!: AssistantClient;
  const Capture = () => {
    client = useAui();
    return createComponent(view, {});
  };
  const el = document.createElement("div");
  document.body.append(el);
  const dispose = render(
    () =>
      createComponent(AuiProvider, {
        config,
        get children() {
          return createComponent(Capture, {});
        },
      }),
    el,
  );
  const unmount = () => {
    dispose();
    el.remove();
  };
  disposers.push(unmount);
  return { el, client: () => client, unmount };
};
const mount = (runtime: AssistantRuntimeImpl, view: () => JSX.Element) =>
  mountConfig(AuiConfig({ threads: RuntimeAdapter(runtime) }), view);
const Row = () =>
  createComponent(Dynamic, {
    component: "span",
    class: "att",
    get children() {
      return [
        createComponent(AttachmentPrimitiveName, {}),
        createComponent(AttachmentPrimitiveThumb, { class: "thumb" }),
        createComponent(AttachmentPrimitiveRemove, { children: "x" }),
      ];
    },
  });
const rows = () =>
  createComponent(ComposerPrimitiveAttachments, {
    get children() {
      return createComponent(Row, {});
    },
  });
const picker = () =>
  document.querySelector<HTMLInputElement>('input[type="file"]')!;
const select = (input: HTMLInputElement, files: File[] | null) => {
  Object.defineProperty(input, "files", { configurable: true, value: files });
  input.dispatchEvent(new Event("change", { bubbles: true }));
};
const drag = (
  type: string,
  files: File[] = [],
  types = ["Files"],
  relatedTarget?: Node,
) => {
  const event = new Event(type, {
    bubbles: true,
    cancelable: type !== "dragleave",
  });
  Object.defineProperties(event, {
    dataTransfer: { value: { types, files, dropEffect: "" } },
    relatedTarget: { value: relatedTarget ?? null },
  });
  return event as DragEvent;
};

describe("ComposerPrimitiveAttachments", () => {
  it("iterates pending attachments with their names and thumb labels", async () => {
    const { runtime } = createRuntime();
    const { el, client } = mount(runtime, rows);
    expect(el.textContent).toBe("");
    await client().composer.addAttachment(file("report.pdf"));
    await client().composer.addAttachment(file("noext"));
    await vi.waitFor(() => expect(el.querySelectorAll(".att")).toHaveLength(2));
    expect(
      [...el.querySelectorAll(".thumb")].map((node) => node.textContent),
    ).toEqual([".pdf", "file"]);
    expect(el.textContent).toContain("report.pdf");
  });

  it("removes an attachment through its remove button", async () => {
    const { runtime, removed } = createRuntime();
    const { el, client } = mount(runtime, rows);
    await client().composer.addAttachment(file("a.txt"));
    await vi.waitFor(() => expect(el.querySelector("button")).not.toBeNull());
    el.querySelector("button")!.click();
    await vi.waitFor(() => expect(el.querySelectorAll(".att")).toHaveLength(0));
    expect(removed).toEqual(["att-1"]);
  });

  it("keeps row state and its live scope after an earlier attachment is removed", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { runtime } = createRuntime();
    const Stateful = () => {
      const name = useAuiState((s) => s.attachment.name);
      const initialName = name();
      return createComponent(Dynamic, {
        component: "span",
        class: "stateful",
        get children() {
          return `${initialName}:${name()}`;
        },
      });
    };
    const { el, client } = mount(runtime, () =>
      createComponent(ComposerPrimitiveAttachments, {
        get children() {
          return createComponent(Stateful, {});
        },
      }),
    );
    await client().composer.addAttachment(file("first.txt"));
    await client().composer.addAttachment(file("second.txt"));
    await vi.waitFor(() =>
      expect(el.querySelectorAll(".stateful")).toHaveLength(2),
    );
    const second = el.querySelectorAll(".stateful")[1];
    await client().composer.attachment({ index: 0 }).remove();
    await vi.waitFor(() =>
      expect([...el.querySelectorAll(".stateful")]).toEqual([second]),
    );
    expect(second?.textContent).toBe("second.txt:second.txt");
    await Promise.resolve();
    expect(error).not.toHaveBeenCalled();
  });
});

describe("ComposerPrimitiveAddAttachment", () => {
  const mountPicker = (
    options: Parameters<typeof createRuntime>[0] = {},
    props: Parameters<typeof ComposerPrimitiveAddAttachment>[0] = {},
  ) => {
    const test = createRuntime(options);
    return {
      ...test,
      ...mount(test.runtime, () =>
        createComponent(
          ComposerPrimitiveAddAttachment,
          mergeProps({ children: "+" }, props),
        ),
      ),
    };
  };

  it("opens a hidden multiple picker with wildcard accept and cleans up an empty selection", () => {
    const { el } = mountPicker({}, { class: "add" });
    const button = el.querySelector("button")!;
    expect(button.type).toBe("button");
    expect(button.disabled).toBe(false);
    expect(button.className).toBe("add");
    expect(button.textContent).toBe("+");
    button.click();
    expect(picker().hidden).toBe(true);
    expect(picker().multiple).toBe(true);
    expect(picker().accept).toBe("");
    picker().dispatchEvent(new Event("change"));
    expect(picker()).toBeNull();
  });

  it("applies the accept filter and live multiple prop and removes cancelled pickers", () => {
    const [multiple, setMultiple] = createSignal(false);
    const { el } = mountPicker(
      { accept: "image/*" },
      {
        get multiple() {
          return multiple();
        },
      },
    );
    el.querySelector("button")!.click();
    expect(picker().accept).toBe("image/*");
    expect(picker().multiple).toBe(false);
    picker().dispatchEvent(new Event("cancel"));
    expect(picker()).toBeNull();
    setMultiple(true);
    el.querySelector("button")!.click();
    expect(picker().multiple).toBe(true);
  });

  it("adds every selected file on a noncancelable change and cleans up", async () => {
    const { el, added, client } = mountPicker();
    el.querySelector("button")!.click();
    const input = picker();
    input.addEventListener("change", (event) => {
      expect(event.cancelable).toBe(false);
      event.preventDefault();
    });
    const files = [file("a.txt"), file("b.txt")];
    select(input, files);
    expect(picker()).toBeNull();
    await vi.waitFor(() =>
      expect(client().composer.getState().attachments).toHaveLength(2),
    );
    expect(added).toEqual(files);
  });

  it("disables on a disabled thread even when the DOM is forcibly enabled", () => {
    const { el } = mountPicker({ isDisabled: true });
    const button = el.querySelector("button")!;
    expect(button.disabled).toBe(true);
    button.disabled = false;
    button.click();
    expect(picker()).toBeNull();
  });

  it("honors live caller disabled state and forwards reactive children, attributes and refs", () => {
    const [disabled, setDisabled] = createSignal(true);
    const [label, setLabel] = createSignal("Add");
    const ref = vi.fn();
    const { el } = mountPicker(
      {},
      {
        ref,
        get disabled() {
          return disabled();
        },
        get "aria-label"() {
          return label();
        },
        get children() {
          return label();
        },
      },
    );
    const button = el.querySelector("button")!;
    expect(ref.mock.calls[0]?.[0]).toBe(button);
    expect(button.disabled).toBe(true);
    button.disabled = false;
    button.click();
    expect(picker()).toBeNull();
    setDisabled(false);
    setLabel("Upload");
    expect(button.textContent).toBe("Upload");
    expect(button.getAttribute("aria-label")).toBe("Upload");
    button.click();
    expect(picker()).not.toBeNull();
  });

  it.each([false, true])(
    "runs the caller handler first and honors a click veto (bound=%s)",
    (bound) => {
      const [veto, setVeto] = createSignal(true);
      const handler = vi.fn((event: MouseEvent) => {
        expect(picker()).toBeNull();
        if (veto()) event.preventDefault();
      });
      const tuple = vi.fn((data: string, event: MouseEvent) => {
        expect(data).toBe("caller");
        handler(event);
      });
      const { el } = mountPicker(
        {},
        { onClick: bound ? [tuple, "caller"] : handler },
      );
      el.querySelector("button")!.click();
      expect(handler).toHaveBeenCalledOnce();
      expect(picker()).toBeNull();
      setVeto(false);
      el.querySelector("button")!.click();
      expect(picker()).not.toBeNull();
    },
  );

  it("stays disabled in a message composer until editing starts", () => {
    const { runtime } = createRuntime();
    const { el } = mount(runtime, () =>
      createComponent(MessageByIdProvider, {
        id: "m1",
        get children() {
          return createComponent(ComposerPrimitiveAddAttachment, {});
        },
      }),
    );
    const button = el.querySelector("button")!;
    expect(button.disabled).toBe(true);
    button.disabled = false;
    button.click();
    expect(picker()).toBeNull();
    flushTapSync(() =>
      runtime.thread.getMessageById("m1").composer.beginEdit(),
    );
    expect(button.disabled).toBe(false);
    button.click();
    expect(picker()).not.toBeNull();
  });

  it("discards a selection delivered after the primitive unmounts", async () => {
    const { el, unmount, added } = mountPicker();
    el.querySelector("button")!.click();
    const input = picker();
    unmount();
    expect(input.isConnected).toBe(false);
    expect(picker()).toBeNull();
    select(input, [file("late.txt")]);
    await Promise.resolve();
    expect(added).toEqual([]);
    expect(picker()).toBeNull();
  });

  it("does not add an old picker's selection to a different thread or after switching back", async () => {
    const { adapter, added } = createAttachmentAdapter();
    const { el, client } = mountConfig(
      AuiConfig({
        threads: InMemoryThreadList({
          thread: () =>
            ExternalThread({ messages: [], attachmentAdapter: adapter }),
        }),
      }),
      () => createComponent(ComposerPrimitiveAddAttachment, {}),
    );
    vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {});
    const button = el.querySelector("button")!;
    button.click();
    const oldInput = picker();
    const originId = client().threads.getState().mainThreadId;
    flushTapSync(() => client().threads.switchToNewThread());
    await vi.waitFor(() =>
      expect(client().threads.getState().mainThreadId).not.toBe(originId),
    );
    select(oldInput, [file("thread-a.txt")]);
    expect(client().composer.getState().attachments).toHaveLength(0);
    expect(added).toEqual([]);
    button.click();
    select(picker(), [file("thread-b.txt")]);
    await vi.waitFor(() =>
      expect(
        client()
          .composer.getState()
          .attachments.map((item) => item.name),
      ).toEqual(["thread-b.txt"]),
    );
    button.click();
    const roundTripInput = picker();
    const secondId = client().threads.getState().mainThreadId;
    flushTapSync(() => client().threads.switchToThread(originId));
    await vi.waitFor(() =>
      expect(client().threads.getState().mainThreadId).toBe(originId),
    );
    flushTapSync(() => client().threads.switchToThread(secondId));
    await vi.waitFor(() =>
      expect(client().threads.getState().mainThreadId).toBe(secondId),
    );
    select(roundTripInput, [file("stale.txt")]);
    expect(added.map((item) => item.name)).toEqual(["thread-b.txt"]);
  });
});

describe("ComposerPrimitiveAttachmentDropzone", () => {
  const mountDropzone = (
    options: Parameters<typeof createRuntime>[0] = {},
    props: Parameters<typeof ComposerPrimitiveAttachmentDropzone>[0] = {},
  ) => {
    const test = createRuntime(options);
    const view = mount(test.runtime, () =>
      createComponent(
        ComposerPrimitiveAttachmentDropzone,
        mergeProps({ class: "dz", children: "drop here" }, props),
      ),
    );
    return {
      ...test,
      ...view,
      dz: view.el.querySelector<HTMLDivElement>(".dz")!,
    };
  };

  it.each(["dragenter", "dragover"])(
    "keeps dragging when a child prevents %s",
    (type) => {
      const { dz } = mountDropzone(
        {},
        {
          get children() {
            return createComponent(Dynamic, {
              component: "span",
              children: "editor",
            });
          },
        },
      );
      const child = dz.querySelector("span")!;
      const handler = vi.fn((event: Event) => event.preventDefault());
      child.addEventListener(type, handler);
      child.dispatchEvent(drag(type));
      expect(handler).toHaveBeenCalledOnce();
      expect(dz.dataset.dragging).toBe("true");
    },
  );

  it("flags file drags and adds each dropped file once", async () => {
    const { dz, added, client } = mountDropzone();
    expect(dz.textContent).toBe("drop here");
    expect(dz.dispatchEvent(drag("dragenter"))).toBe(false);
    expect(dz.dataset.dragging).toBe("true");
    const files = [file("a.txt"), file("b.txt")];
    expect(dz.dispatchEvent(drag("drop", files))).toBe(false);
    expect(dz.hasAttribute("data-dragging")).toBe(false);
    await vi.waitFor(() =>
      expect(client().composer.getState().attachments).toHaveLength(2),
    );
    expect(added).toEqual(files);
  });

  it("keeps dragging across descendants, clears on exit, and restores on dragover", () => {
    const { dz } = mountDropzone(
      {},
      {
        get children() {
          return createComponent(Dynamic, {
            component: "span",
            children: "target",
          });
        },
      },
    );
    dz.dispatchEvent(drag("dragenter"));
    dz.dispatchEvent(
      drag("dragleave", [], ["Files"], dz.querySelector("span")!),
    );
    expect(dz.dataset.dragging).toBe("true");
    dz.dispatchEvent(drag("dragleave", [], ["Files"], document.body));
    expect(dz.hasAttribute("data-dragging")).toBe(false);
    expect(dz.dispatchEvent(drag("dragover"))).toBe(false);
    expect(dz.dataset.dragging).toBe("true");
  });

  it.each(["caller", "thread"] as const)(
    "clears dragging when %s disables the zone during a drag",
    (source) => {
      const [disabled, setDisabled] = createSignal(false);
      const {
        dz,
        added,
        setDisabled: disableThread,
      } = mountDropzone(
        {},
        {
          get disabled() {
            return disabled();
          },
        },
      );
      const disable = source === "caller" ? setDisabled : disableThread;
      dz.dispatchEvent(drag("dragenter"));
      expect(dz.dataset.dragging).toBe("true");
      disable(true);
      expect(dz.hasAttribute("data-dragging")).toBe(false);
      disable(false);
      expect(dz.hasAttribute("data-dragging")).toBe(false);
      disable(true);
      dz.dispatchEvent(drag("drop", [file("ignored.txt")]));
      expect(added).toEqual([]);
    },
  );

  it("clears dragging when attachment support is removed mid drag", () => {
    const { dz, added, setSupported } = mountDropzone();
    dz.dispatchEvent(drag("dragenter"));
    expect(dz.dataset.dragging).toBe("true");
    setSupported(false);
    expect(dz.hasAttribute("data-dragging")).toBe(false);
    setSupported(true);
    expect(dz.hasAttribute("data-dragging")).toBe(false);
    dz.dispatchEvent(drag("dragover"));
    expect(dz.dataset.dragging).toBe("true");
    setSupported(false);
    expect(dz.dispatchEvent(drag("drop", [file("ignored.txt")]))).toBe(false);
    expect(added).toEqual([]);
  });

  it.each([{ isDisabled: true }, { withAttachments: false }])(
    "claims file drops without adding when unavailable (%j)",
    (options) => {
      const { dz, added } = mountDropzone(options);
      for (const type of ["dragenter", "dragover"]) {
        const event = drag(type);
        expect(dz.dispatchEvent(event)).toBe(false);
        expect(event.dataTransfer!.dropEffect).toBe("none");
        expect(dz.hasAttribute("data-dragging")).toBe(false);
      }
      expect(dz.dispatchEvent(drag("drop", [file("ignored.txt")]))).toBe(false);
      expect(added).toEqual([]);
    },
  );

  it("leaves file drags to the parent when caller-disabled and preserves a passed attribute", () => {
    const { dz, added } = mountDropzone(
      {},
      { disabled: true, "data-dragging": "passed-through" },
    );
    for (const type of ["dragenter", "dragover", "dragleave", "drop"])
      expect(dz.dispatchEvent(drag(type, [file("ignored.txt")]))).toBe(true);
    expect(dz.dataset.dragging).toBe("passed-through");
    expect(added).toEqual([]);
  });

  it("ignores non-file and missing-transfer drags and empty file drops", () => {
    const { dz, added } = mountDropzone();
    for (const type of ["dragenter", "dragover", "dragleave", "drop"]) {
      const event = drag(type, [], ["text/plain"]);
      expect(dz.dispatchEvent(event)).toBe(true);
      expect(
        dz.dispatchEvent(
          new Event(type, { bubbles: true, cancelable: type !== "dragleave" }),
        ),
      ).toBe(true);
    }
    expect(dz.hasAttribute("data-dragging")).toBe(false);
    expect(dz.dispatchEvent(drag("drop"))).toBe(false);
    expect(added).toEqual([]);
  });

  it.each(["dragenter", "dragover", "drop"] as const)(
    "runs caller capture %s first and honors its veto",
    (type) => {
      const handler = vi.fn((event: DragEvent) => {
        expect(event.defaultPrevented).toBe(false);
        event.preventDefault();
      });
      const { dz, added } = mountDropzone(
        {},
        { [`oncapture:${type}`]: handler },
      );
      dz.dispatchEvent(drag(type, [file("veto.txt")]));
      expect(handler).toHaveBeenCalledOnce();
      expect(dz.hasAttribute("data-dragging")).toBe(false);
      expect(added).toEqual([]);
    },
  );

  it("clears dragging when the caller vetoes a file drop", () => {
    const handler = vi.fn((event: DragEvent) => {
      expect(dz.dataset.dragging).toBe("true");
      event.preventDefault();
    });
    const { dz, added } = mountDropzone({}, { "oncapture:drop": handler });
    dz.dispatchEvent(drag("dragenter"));
    expect(dz.dataset.dragging).toBe("true");
    expect(dz.dispatchEvent(drag("drop", [file("veto.txt")]))).toBe(false);
    expect(handler).toHaveBeenCalledOnce();
    expect(dz.hasAttribute("data-dragging")).toBe(false);
    expect(added).toEqual([]);
  });

  it("runs a noncancelable dragleave handler first and still clears dragging", () => {
    const handler = vi.fn((event: DragEvent) => {
      expect(event.cancelable).toBe(false);
      expect(dz.dataset.dragging).toBe("true");
      event.preventDefault();
    });
    const { dz } = mountDropzone({}, { "oncapture:dragleave": handler });
    dz.dispatchEvent(drag("dragenter"));
    dz.dispatchEvent(drag("dragleave"));
    expect(handler).toHaveBeenCalledOnce();
    expect(dz.hasAttribute("data-dragging")).toBe(false);
  });

  it.each([false, true])(
    "keeps bubbling caller handlers after capture and forwards reactive props (bound=%s)",
    (bound) => {
      const order: string[] = [];
      const ref = vi.fn();
      const [label, setLabel] = createSignal("Drop");
      const bubble = vi.fn((event: DragEvent) => {
        expect(event.defaultPrevented).toBe(true);
        expect(dz.dataset.dragging).toBe("true");
        order.push("zone");
      });
      const tuple = vi.fn((data: string, event: DragEvent) => {
        expect(data).toBe("caller");
        bubble(event);
      });
      const { dz } = mountDropzone(
        {},
        {
          ref,
          "oncapture:dragover": (event) => {
            expect(event.defaultPrevented).toBe(false);
            expect(dz.hasAttribute("data-dragging")).toBe(false);
            order.push("capture");
          },
          onDragOver: bound ? [tuple, "caller"] : bubble,
          get "aria-label"() {
            return label();
          },
          get children() {
            return createComponent(Dynamic, {
              component: "span",
              onDragOver: (event: DragEvent) => {
                expect(event.defaultPrevented).toBe(true);
                expect(dz.dataset.dragging).toBe("true");
                order.push("child");
              },
              get children() {
                return label();
              },
            });
          },
        },
      );
      expect(ref.mock.calls[0]?.[0]).toBe(dz);
      dz.querySelector("span")!.dispatchEvent(drag("dragover"));
      expect(order).toEqual(["capture", "child", "zone"]);
      expect(bubble).toHaveBeenCalledOnce();
      setLabel("Updated");
      expect(dz.getAttribute("aria-label")).toBe("Updated");
      expect(dz.textContent).toBe("Updated");
    },
  );
});
