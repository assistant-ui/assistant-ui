import { afterEach, describe, expect, it, vi } from "vitest";
import { createComponent, createSignal, Show } from "solid-js";
import { Dynamic, render } from "solid-js/web";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig, type AssistantClient } from "@assistant-ui/store/client";
import { RuntimeAdapter } from "@assistant-ui/core/store";
import {
  AssistantRuntimeImpl,
  ExternalStoreRuntimeCore,
} from "@assistant-ui/core/internal";
import { AuiProvider } from "../AuiProvider";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";
import { MessageByIdProvider } from "./MessageByIdProvider";
import { MessagePrimitiveRoot } from "./message";

const disposers: (() => void)[] = [];
afterEach(() => {
  disposers.splice(0).forEach((dispose) => dispose());
  vi.restoreAllMocks();
});
const mount = (
  props: Parameters<typeof MessagePrimitiveRoot>[0] = {},
  visible: () => boolean = () => true,
) => {
  const runtime = new AssistantRuntimeImpl(
    new ExternalStoreRuntimeCore({
      messages: [{ id: "message-id", role: "assistant", content: "Hello" }],
      convertMessage: (message: {
        id: string;
        role: "assistant";
        content: string;
      }) => message,
      onNew: async () => {},
    }),
  );
  let client!: AssistantClient;
  const Hover = () => {
    client = useAui();
    const hovering = useAuiState((s) => s.message.isHovering);
    return createComponent(Dynamic, {
      component: "span",
      class: "hover",
      get "data-hovering"() {
        return String(hovering());
      },
    });
  };
  const el = document.createElement("div");
  document.body.append(el);
  const dispose = render(
    () =>
      createComponent(AuiProvider, {
        config: AuiConfig({ threads: RuntimeAdapter(runtime) }),
        get children() {
          return createComponent(MessageByIdProvider, {
            id: "message-id",
            get children() {
              return [
                createComponent(Show, {
                  keyed: true,
                  get when() {
                    return visible();
                  },
                  get children() {
                    return createComponent(MessagePrimitiveRoot, props);
                  },
                }),
                createComponent(Hover, {}),
              ];
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
  return { el, client: () => client };
};
const mockHoveredElement = () => {
  const matches = HTMLElement.prototype.matches;
  vi.spyOn(HTMLElement.prototype, "matches").mockImplementation(function (
    this: HTMLElement,
    selector,
  ) {
    return selector === ":hover" || matches.call(this, selector);
  });
};

describe("MessagePrimitiveRoot", () => {
  it("adds the current message id and tracks message hover state", () => {
    const { el } = mount({ class: "message" });
    const root = el.querySelector<HTMLDivElement>("div.message")!;
    const hover = el.querySelector("span.hover")!;
    expect(root.getAttribute("data-message-id")).toBe("message-id");
    expect(hover.getAttribute("data-hovering")).toBe("false");
    flushTapSync(() => root.dispatchEvent(new MouseEvent("mouseenter")));
    expect(hover.getAttribute("data-hovering")).toBe("true");
    flushTapSync(() => root.dispatchEvent(new MouseEvent("mouseleave")));
    expect(hover.getAttribute("data-hovering")).toBe("false");
  });

  it("synchronizes message hover state when already hovered on mount", async () => {
    mockHoveredElement();
    const { el } = mount();
    await vi.waitFor(() =>
      expect(el.querySelector(".hover")?.getAttribute("data-hovering")).toBe(
        "true",
      ),
    );
  });

  it("does not restore message hover state after unmount", () => {
    mockHoveredElement();
    const [visible, setVisible] = createSignal(true);
    const queued: (() => void)[] = [];
    const queue = vi
      .spyOn(globalThis, "queueMicrotask")
      .mockImplementation((callback) => {
        queued.push(callback);
      });
    const { el } = mount({}, visible);
    queue.mockRestore();
    flushTapSync(() => setVisible(false));
    expect(queued.length).toBeGreaterThan(0);
    flushTapSync(() => queued.forEach((callback) => callback()));
    expect(el.querySelector(".hover")?.getAttribute("data-hovering")).toBe(
      "false",
    );
  });

  it("runs caller handlers first and honors preventDefault for enter and leave", () => {
    const [veto, setVeto] = createSignal(true);
    const onMouseEnter = vi.fn((data: string, event: MouseEvent) => {
      expect(data).toBe("enter");
      expect(client().message.getState().isHovering).toBe(false);
      if (veto()) event.preventDefault();
    });
    const onMouseLeave = vi.fn((event: MouseEvent) => {
      if (veto()) event.preventDefault();
    });
    const { el, client } = mount({
      onMouseEnter: [onMouseEnter, "enter"],
      onMouseLeave,
    });
    const root = el.querySelector("div")!;
    flushTapSync(() =>
      root.dispatchEvent(new MouseEvent("mouseenter", { cancelable: true })),
    );
    expect(client().message.getState().isHovering).toBe(false);
    setVeto(false);
    flushTapSync(() =>
      root.dispatchEvent(new MouseEvent("mouseenter", { cancelable: true })),
    );
    expect(client().message.getState().isHovering).toBe(true);
    setVeto(true);
    flushTapSync(() =>
      root.dispatchEvent(new MouseEvent("mouseleave", { cancelable: true })),
    );
    expect(client().message.getState().isHovering).toBe(true);
    setVeto(false);
    flushTapSync(() =>
      root.dispatchEvent(new MouseEvent("mouseleave", { cancelable: true })),
    );
    expect(client().message.getState().isHovering).toBe(false);
    expect(onMouseEnter).toHaveBeenCalledTimes(2);
    expect(onMouseLeave).toHaveBeenCalledTimes(2);
  });

  it("forwards refs, reactive attributes and children, and resets hover on disposal", () => {
    const ref = vi.fn();
    const [label, setLabel] = createSignal("Hello");
    const [visible, setVisible] = createSignal(true);
    const { el, client } = mount(
      {
        ref,
        get "aria-label"() {
          return label();
        },
        get children() {
          return label();
        },
      },
      visible,
    );
    const root = el.querySelector("div")!;
    expect(ref).toHaveBeenCalledWith(root);
    expect(root.textContent).toBe("Hello");
    setLabel("Updated");
    expect(root.getAttribute("aria-label")).toBe("Updated");
    expect(root.textContent).toBe("Updated");
    flushTapSync(() => root.dispatchEvent(new MouseEvent("mouseenter")));
    expect(client().message.getState().isHovering).toBe(true);
    flushTapSync(() => setVisible(false));
    expect(client().message.getState().isHovering).toBe(false);
  });
});
