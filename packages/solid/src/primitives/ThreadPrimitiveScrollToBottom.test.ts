import { afterEach, describe, expect, it, vi } from "vitest";
import { createComponent, createSignal, mergeProps } from "solid-js";
import { render } from "solid-js/web";
import { AuiConfig } from "@assistant-ui/store/client";
import { RuntimeAdapter } from "@assistant-ui/core/store";
import {
  AssistantRuntimeImpl,
  ExternalStoreRuntimeCore,
} from "@assistant-ui/core/internal";
import { AuiProvider } from "../AuiProvider";
import { ThreadPrimitiveViewport } from "./ThreadPrimitiveViewport";
import { ThreadPrimitiveScrollToBottom } from "./ThreadPrimitiveScrollToBottom";
import { ViewportContext } from "./viewportContext";

const unmounts: (() => void)[] = [];

afterEach(() => {
  unmounts.splice(0).forEach((unmount) => unmount());
  vi.restoreAllMocks();
});

const mountButton = (
  props: Parameters<typeof ThreadPrimitiveScrollToBottom>[0] = {},
) => {
  const scrollToBottom = vi.fn();
  const [isAtBottom, setIsAtBottom] = createSignal(false);
  const el = document.createElement("div");
  document.body.append(el);
  const dispose = render(
    () =>
      createComponent(ViewportContext.Provider, {
        value: { isAtBottom, scrollToBottom, registerContentInset: vi.fn() },
        get children() {
          return createComponent(
            ThreadPrimitiveScrollToBottom,
            mergeProps({ children: "Jump" }, props),
          );
        },
      }),
    el,
  );
  unmounts.push(() => {
    dispose();
    el.remove();
  });
  return { button: el.querySelector("button")!, scrollToBottom, setIsAtBottom };
};

describe("ThreadPrimitiveScrollToBottom", () => {
  it("enables only while scrolled up and scrolls the viewport on click", () => {
    const runtime = new AssistantRuntimeImpl(
      new ExternalStoreRuntimeCore({
        messages: [],
        convertMessage: () => ({ role: "user", content: [] }),
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
            return createComponent(ThreadPrimitiveViewport, {
              class: "viewport",
              get children() {
                return createComponent(ThreadPrimitiveScrollToBottom, {
                  class: "jump",
                  children: "Jump",
                });
              },
            });
          },
        }),
      el,
    );
    unmounts.push(() => {
      dispose();
      el.remove();
    });
    const div = el.querySelector<HTMLElement>("div.viewport")!;
    let scrollTop = 400;
    Object.defineProperties(div, {
      scrollHeight: { get: () => 500, configurable: true },
      clientHeight: { get: () => 100, configurable: true },
      scrollTop: {
        get: () => scrollTop,
        set: (value: number) => {
          scrollTop = value;
        },
        configurable: true,
      },
    });
    const scrollTo = vi.fn(({ top }: { top: number }) => {
      scrollTop = Math.max(0, Math.min(top, 400));
    });
    Object.defineProperty(div, "scrollTo", {
      value: scrollTo,
      configurable: true,
    });
    const button = el.querySelector<HTMLButtonElement>("button.jump")!;
    expect(button.type).toBe("button");
    expect(button.textContent).toBe("Jump");
    div.dispatchEvent(new Event("scroll"));
    expect(button.disabled).toBe(true);

    scrollTop = 50;
    div.dispatchEvent(new Event("scroll"));
    expect(button.disabled).toBe(false);
    button.click();
    expect(scrollTo).toHaveBeenCalledWith({ top: 500, behavior: "auto" });
    div.dispatchEvent(new Event("scroll"));
    expect(button.disabled).toBe(true);
  });

  it("disables outside a viewport and warns once across instances and remounts", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    for (let mount = 0; mount < 2; mount++) {
      const el = document.createElement("div");
      document.body.append(el);
      const dispose = render(
        () =>
          [0, 1].map(() =>
            createComponent(ThreadPrimitiveScrollToBottom, {
              children: "Jump",
            }),
          ),
        el,
      );
      try {
        expect(
          [...el.querySelectorAll("button")].map((button) => button.disabled),
        ).toEqual([true, true]);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn.mock.calls[0]![0]).toContain("no surrounding");
        const button = el.querySelector("button")!;
        button.disabled = false;
        expect(() => button.click()).not.toThrow();
      } finally {
        dispose();
        el.remove();
      }
    }
  });

  it("runs the caller's handler before scrolling and honors preventDefault", () => {
    const onClick = vi.fn((event: MouseEvent) => event.preventDefault());
    const { button, scrollToBottom } = mountButton({ onClick });
    button.click();
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(scrollToBottom).not.toHaveBeenCalled();
  });

  it("supports bound handlers and reacts to behavior and attribute changes", () => {
    const onClick = vi.fn(() => expect(scrollToBottom).not.toHaveBeenCalled());
    const [behavior, setBehavior] = createSignal<ScrollBehavior>("smooth");
    const [label, setLabel] = createSignal("Jump");
    const { button, scrollToBottom } = mountButton({
      onClick: [onClick, "data"],
      get behavior() {
        return behavior();
      },
      get "aria-label"() {
        return label();
      },
      get children() {
        return label();
      },
    });
    button.click();
    expect(onClick).toHaveBeenCalledWith("data", expect.any(MouseEvent));
    expect(scrollToBottom).toHaveBeenCalledWith("smooth");

    scrollToBottom.mockClear();
    setBehavior("instant");
    setLabel("Latest message");
    expect(button.getAttribute("aria-label")).toBe("Latest message");
    expect(button.textContent).toBe("Latest message");
    button.click();
    expect(scrollToBottom).toHaveBeenCalledWith("instant");
    expect(button.hasAttribute("behavior")).toBe(false);
  });

  it("honors caller disabled state and at-bottom state even on synthetic clicks", () => {
    const [disabled, setDisabled] = createSignal(true);
    const { button, scrollToBottom, setIsAtBottom } = mountButton({
      get disabled() {
        return disabled();
      },
    });
    expect(button.disabled).toBe(true);
    button.disabled = false;
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(scrollToBottom).not.toHaveBeenCalled();

    setDisabled(false);
    expect(button.disabled).toBe(false);
    button.click();
    expect(scrollToBottom).toHaveBeenCalledWith("auto");
    scrollToBottom.mockClear();

    setIsAtBottom(true);
    expect(button.disabled).toBe(true);
    button.disabled = false;
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(scrollToBottom).not.toHaveBeenCalled();
    setIsAtBottom(false);
    expect(button.disabled).toBe(false);
  });
});
