import { afterEach, describe, expect, it, vi } from "vitest";
import { createComponent, createSignal, type JSX } from "solid-js";
import { render } from "solid-js/web";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig } from "@assistant-ui/store/client";
import { RuntimeAdapter } from "@assistant-ui/core/store";
import {
  AssistantRuntimeImpl,
  ExternalStoreRuntimeCore,
} from "@assistant-ui/core/internal";
import { AuiProvider } from "../AuiProvider";
import { AttachmentByIndexProvider } from "./AttachmentByIndexProvider";
import { MessageByIdProvider } from "./MessageByIdProvider";
import { ComposerPrimitiveAttachments } from "./composerAttachments";
import {
  AttachmentPrimitiveRoot,
  AttachmentPrimitiveName,
  AttachmentPrimitiveThumb,
  AttachmentPrimitiveRemove,
} from "./attachment";

const disposers: (() => void)[] = [];
afterEach(() => {
  disposers.splice(0).forEach((dispose) => dispose());
});
const mount = (view: () => JSX.Element, name = "notes.md", type = "file") => {
  const runtime = new AssistantRuntimeImpl(
    new ExternalStoreRuntimeCore({
      messages: [
        {
          id: "m1",
          role: "user",
          content: "files",
          attachments: [
            { id: "a", name, type, status: { type: "complete" }, content: [] },
          ],
        },
      ],
      convertMessage: (message) => message,
      onNew: async () => {},
    }),
  );
  const el = document.createElement("div");
  document.body.append(el);
  const dispose = render(
    () =>
      createComponent(AuiProvider, {
        config: AuiConfig({ threads: RuntimeAdapter(runtime) }),
        get children() {
          return createComponent(MessageByIdProvider, {
            id: "m1",
            get children() {
              return createComponent(AttachmentByIndexProvider, {
                source: "message",
                index: 0,
                get children() {
                  return createComponent(view, {});
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
  return el;
};

describe("attachment display primitives", () => {
  it.each([
    ["report.pdf", ".pdf"],
    ["noext", "file"],
    [".env", "file"],
    ["trailing.", "file"],
    ["archive.tar.gz", ".gz"],
  ])("renders the name and thumb for %s", (name, label) => {
    const el = mount(
      () => [
        createComponent(AttachmentPrimitiveName, {}),
        createComponent(AttachmentPrimitiveThumb, { class: "thumb" }),
      ],
      name,
    );
    expect(el.childNodes[0]?.textContent).toBe(name);
    expect(el.querySelector(".thumb")?.textContent).toBe(label);
  });

  it("uses the attachment type for an extensionless thumb", () => {
    const el = mount(
      () => createComponent(AttachmentPrimitiveThumb, {}),
      "photo",
      "image",
    );
    expect(el.textContent).toBe("image");
  });

  it("forwards refs and reactive attributes and renders children overrides", () => {
    const ref = vi.fn();
    const [label, setLabel] = createSignal("custom");
    const el = mount(() =>
      createComponent(AttachmentPrimitiveRoot, {
        ref,
        class: "root",
        get "aria-label"() {
          return label();
        },
        get children() {
          return [
            createComponent(AttachmentPrimitiveName, {
              get children() {
                return label();
              },
            }),
            createComponent(AttachmentPrimitiveThumb, {
              class: "thumb",
              get children() {
                return label();
              },
            }),
          ];
        },
      }),
    );
    const root = el.querySelector(".root")!;
    expect(root.tagName).toBe("DIV");
    expect(ref.mock.calls[0]?.[0]).toBe(root);
    expect(root.textContent).toBe("customcustom");
    setLabel("updated");
    expect(root.textContent).toBe("updatedupdated");
    expect(root.getAttribute("aria-label")).toBe("updated");
  });

  it("honors explicitly empty children for name and thumb", () => {
    const el = mount(() => [
      createComponent(AttachmentPrimitiveName, { children: null }),
      createComponent(AttachmentPrimitiveThumb, { children: "" }),
    ]);
    expect(el.textContent).toBe("");
  });
});

describe("AttachmentPrimitiveRemove", () => {
  it.each([false, true])(
    "runs the caller handler before removal and honors its veto (bound=%s)",
    async (bound) => {
      const runtime = new AssistantRuntimeImpl(
        new ExternalStoreRuntimeCore({ messages: [], onNew: async () => {} }),
      );
      await runtime.thread.composer.addAttachment({
        name: "a.txt",
        content: [],
      });
      const [disabled, setDisabled] = createSignal(true);
      const [veto, setVeto] = createSignal(true);
      const ref = vi.fn();
      const handler = vi.fn((event: MouseEvent) => {
        expect(runtime.thread.composer.getState().attachments).toHaveLength(1);
        if (veto()) event.preventDefault();
      });
      const tuple = vi.fn((data: string, event: MouseEvent) => {
        expect(data).toBe("caller");
        handler(event);
      });
      const el = document.createElement("div");
      document.body.append(el);
      const dispose = render(
        () =>
          createComponent(AuiProvider, {
            config: AuiConfig({ threads: RuntimeAdapter(runtime) }),
            get children() {
              return createComponent(ComposerPrimitiveAttachments, {
                get children() {
                  return createComponent(AttachmentPrimitiveRemove, {
                    ref,
                    class: "remove",
                    get disabled() {
                      return disabled();
                    },
                    onClick: bound ? [tuple, "caller"] : handler,
                    children: "Remove",
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
      const button = el.querySelector("button")!;
      expect(ref.mock.calls[0]?.[0]).toBe(button);
      expect(button.type).toBe("button");
      expect(button.className).toBe("remove");
      expect(button.textContent).toBe("Remove");
      expect(button.disabled).toBe(true);
      button.disabled = false;
      button.click();
      expect(runtime.thread.composer.getState().attachments).toHaveLength(1);
      setDisabled(false);
      button.click();
      expect(handler).toHaveBeenCalledTimes(2);
      expect(runtime.thread.composer.getState().attachments).toHaveLength(1);
      setVeto(false);
      flushTapSync(() => button.click());
      await vi.waitFor(() =>
        expect(runtime.thread.composer.getState().attachments).toHaveLength(0),
      );
    },
  );
});
