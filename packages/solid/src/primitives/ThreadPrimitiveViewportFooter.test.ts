import { afterEach, describe, expect, it, vi } from "vitest";
import { createComponent, createSignal, Show, type Component } from "solid-js";
import { Dynamic, render } from "solid-js/web";
import { AuiConfig } from "@assistant-ui/store/client";
import { RuntimeAdapter } from "@assistant-ui/core/store";
import {
  AssistantRuntimeImpl,
  ExternalStoreRuntimeCore,
} from "@assistant-ui/core/internal";
import { AuiProvider } from "../AuiProvider";
import { ThreadPrimitiveScrollToBottom } from "./ThreadPrimitiveScrollToBottom";
import { ThreadPrimitiveViewport } from "./ThreadPrimitiveViewport";
import { ThreadPrimitiveViewportFooter } from "./ThreadPrimitiveViewportFooter";

const geometryElements = new Set<HTMLElement>();

const createTestRuntime = (withHistory = false) =>
  new AssistantRuntimeImpl(
    new ExternalStoreRuntimeCore({
      messages: withHistory
        ? [
            {
              role: "user" as const,
              content: [{ type: "text" as const, text: "history" }],
            },
          ]
        : [],
      convertMessage: () => ({ role: "user", content: [] }),
      onNew: async () => {},
    }),
  );

const unmounts: (() => void)[] = [];

const mountChat = (runtime: AssistantRuntimeImpl, view: Component) => {
  const el = document.createElement("div");
  document.body.append(el);
  const dispose = render(
    () =>
      createComponent(AuiProvider, {
        config: AuiConfig({ threads: RuntimeAdapter(runtime) }),
        get children() {
          return createComponent(view, {});
        },
      }),
    el,
  );
  const unmount = () => {
    dispose();
    el.remove();
  };
  unmounts.push(unmount);
  return { el, unmount };
};

const installViewportGeometry = (div: HTMLElement) => {
  let scrollHeight = 500;
  let scrollTop = 0;
  const clientHeight = 100;
  geometryElements.add(div);
  Object.defineProperty(div, "scrollHeight", {
    get: () => scrollHeight,
    configurable: true,
  });
  Object.defineProperty(div, "clientHeight", {
    get: () => clientHeight,
    configurable: true,
  });
  Object.defineProperty(div, "scrollTop", {
    get: () => scrollTop,
    set: (value: number) => {
      scrollTop = value;
    },
    configurable: true,
  });
  const scrollTo = vi.fn(({ top }: ScrollToOptions) => {
    scrollTop = Math.max(0, Math.min(top ?? 0, scrollHeight - clientHeight));
    div.dispatchEvent(new Event("scroll"));
  });
  Object.defineProperty(div, "scrollTo", {
    value: scrollTo,
    configurable: true,
  });
  return {
    scrollTo,
    setScrollHeight: (value: number) => {
      scrollHeight = value;
    },
    setScrollTop: (value: number) => {
      scrollTop = value;
    },
  };
};

const mountChatWithViewportGeometry = (
  runtime: AssistantRuntimeImpl,
  view: Component,
) => {
  const geometries = new WeakMap<
    HTMLElement,
    ReturnType<typeof installViewportGeometry>
  >();
  const createElement = document.createElement.bind(document);
  vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
    const element = createElement(tagName);
    if (tagName === "div") {
      geometries.set(element, installViewportGeometry(element));
    }
    return element;
  });
  const mounted = mountChat(runtime, view);
  const viewport = mounted.el.querySelector<HTMLElement>("div.viewport")!;
  return { ...mounted, viewport, geometry: geometries.get(viewport)! };
};

const installResizeObserver = () => {
  const observers = new Set<ResizeObserverMock>();
  class ResizeObserverMock {
    readonly elements = new Set<Element>();
    readonly callback: ResizeObserverCallback;

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
      observers.add(this);
    }

    observe(element: Element) {
      this.elements.add(element);
    }

    unobserve(element: Element) {
      this.elements.delete(element);
    }

    disconnect() {
      this.elements.clear();
      observers.delete(this);
    }

    takeRecords() {
      return [];
    }

    trigger() {
      this.callback([], this);
    }
  }
  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  return {
    trigger: (element: Element) => {
      for (const observer of observers) {
        if (observer.elements.has(element)) observer.trigger();
      }
    },
  };
};

afterEach(() => {
  unmounts.splice(0).forEach((unmount) => unmount());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  for (const element of geometryElements) {
    Reflect.deleteProperty(element, "scrollHeight");
    Reflect.deleteProperty(element, "clientHeight");
    Reflect.deleteProperty(element, "scrollTop");
    Reflect.deleteProperty(element, "scrollTo");
  }
  geometryElements.clear();
});

describe("ThreadPrimitiveViewport initial pinning", () => {
  it.each(["viewport", "content"])(
    "follows the first %s resize over overflowing history when initialization scroll is disabled",
    (target) => {
      const observers = installResizeObserver();
      const View = () =>
        createComponent(ThreadPrimitiveViewport, {
          class: "viewport",
          scrollToBottomOnInitialize: false,
          get children() {
            return createComponent(Dynamic, {
              component: "p",
              children: "history",
            });
          },
        });
      const { viewport, geometry } = mountChatWithViewportGeometry(
        createTestRuntime(true),
        View,
      );

      observers.trigger(
        target === "viewport" ? viewport : viewport.firstElementChild!,
      );
      expect(geometry.scrollTo).toHaveBeenCalledWith({
        top: 500,
        behavior: "instant",
      });
      expect(viewport.scrollTop).toBe(400);
    },
  );

  it("follows a footer height reported on mount", () => {
    installResizeObserver();
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(
      function (this: HTMLElement) {
        return this.classList.contains("footer") ? 50 : 0;
      },
    );
    const View = () =>
      createComponent(ThreadPrimitiveViewport, {
        class: "viewport",
        scrollToBottomOnInitialize: false,
        get children() {
          return [
            createComponent(Dynamic, { component: "p", children: "history" }),
            createComponent(ThreadPrimitiveViewportFooter, { class: "footer" }),
          ];
        },
      });
    const { viewport, geometry } = mountChatWithViewportGeometry(
      createTestRuntime(true),
      View,
    );

    expect(geometry.scrollTo).toHaveBeenCalledWith({
      top: 500,
      behavior: "instant",
    });
    expect(viewport.scrollTop).toBe(400);
  });
});

describe("ThreadPrimitiveViewportFooter", () => {
  it("registers its height and unregisters it when removed", () => {
    const observers = installResizeObserver();
    const [showFooter, setShowFooter] = createSignal(true);
    const View = () =>
      createComponent(ThreadPrimitiveViewport, {
        class: "viewport",
        get children() {
          return [
            createComponent(Show, {
              keyed: true,
              get when() {
                return showFooter();
              },
              get children() {
                return createComponent(ThreadPrimitiveViewportFooter, {
                  class: "footer",
                });
              },
            }),
            createComponent(ThreadPrimitiveScrollToBottom, {
              class: "jump",
              children: "Jump",
            }),
          ];
        },
      });
    const { el } = mountChat(createTestRuntime(), View);
    const div = el.querySelector<HTMLElement>("div.viewport")!;
    const geometry = installViewportGeometry(div);
    const footer = el.querySelector<HTMLElement>("div.footer")!;
    Object.defineProperty(footer, "offsetHeight", {
      get: () => 50,
      configurable: true,
    });
    div.dispatchEvent(new Event("scroll"));
    observers.trigger(footer);

    geometry.setScrollTop(355);
    div.dispatchEvent(new Event("scroll"));
    expect(el.querySelector<HTMLButtonElement>("button.jump")!.disabled).toBe(
      true,
    );

    setShowFooter(false);
    div.dispatchEvent(new Event("scroll"));
    expect(el.querySelector<HTMLButtonElement>("button.jump")!.disabled).toBe(
      false,
    );
    Reflect.deleteProperty(footer, "offsetHeight");
  });

  it("sums the heights of multiple footers", () => {
    const observers = installResizeObserver();
    const [showSecond, setShowSecond] = createSignal(true);
    const View = () =>
      createComponent(ThreadPrimitiveViewport, {
        class: "viewport",
        get children() {
          return [
            createComponent(ThreadPrimitiveViewportFooter, {
              class: "first-footer",
            }),
            createComponent(Show, {
              keyed: true,
              get when() {
                return showSecond();
              },
              get children() {
                return createComponent(ThreadPrimitiveViewportFooter, {
                  class: "second-footer",
                });
              },
            }),
            createComponent(ThreadPrimitiveScrollToBottom, {
              class: "jump",
              children: "Jump",
            }),
          ];
        },
      });
    const { el } = mountChat(createTestRuntime(), View);
    const div = el.querySelector<HTMLElement>("div.viewport")!;
    const geometry = installViewportGeometry(div);
    const firstFooter = el.querySelector<HTMLElement>("div.first-footer")!;
    const secondFooter = el.querySelector<HTMLElement>("div.second-footer")!;
    Object.defineProperty(firstFooter, "offsetHeight", {
      get: () => 20,
      configurable: true,
    });
    Object.defineProperty(secondFooter, "offsetHeight", {
      get: () => 30,
      configurable: true,
    });
    div.dispatchEvent(new Event("scroll"));
    observers.trigger(firstFooter);
    observers.trigger(secondFooter);

    geometry.setScrollTop(355);
    div.dispatchEvent(new Event("scroll"));
    expect(el.querySelector<HTMLButtonElement>("button.jump")!.disabled).toBe(
      true,
    );

    setShowSecond(false);
    div.dispatchEvent(new Event("scroll"));
    expect(el.querySelector<HTMLButtonElement>("button.jump")!.disabled).toBe(
      false,
    );
    Reflect.deleteProperty(firstFooter, "offsetHeight");
    Reflect.deleteProperty(secondFooter, "offsetHeight");
  });

  it("follows a footer growth while pinned at the bottom", () => {
    const observers = installResizeObserver();
    let footerHeight = 50;
    const View = () =>
      createComponent(ThreadPrimitiveViewport, {
        class: "viewport",
        get children() {
          return [
            createComponent(ThreadPrimitiveViewportFooter, { class: "footer" }),
            createComponent(ThreadPrimitiveScrollToBottom, {
              class: "jump",
              children: "Jump",
            }),
          ];
        },
      });
    const { el } = mountChat(createTestRuntime(), View);
    const div = el.querySelector<HTMLElement>("div.viewport")!;
    const geometry = installViewportGeometry(div);
    const footer = el.querySelector<HTMLElement>("div.footer")!;
    Object.defineProperty(footer, "offsetHeight", {
      get: () => footerHeight,
      configurable: true,
    });
    geometry.setScrollTop(400);
    div.dispatchEvent(new Event("scroll"));
    observers.trigger(footer);
    expect(geometry.scrollTo).toHaveBeenCalledWith({
      top: 500,
      behavior: "instant",
    });

    geometry.scrollTo.mockClear();
    footerHeight = 80;
    observers.trigger(footer);
    expect(geometry.scrollTo).toHaveBeenCalledWith({
      top: 500,
      behavior: "instant",
    });
    expect(el.querySelector<HTMLButtonElement>("button.jump")!.disabled).toBe(
      true,
    );
    Reflect.deleteProperty(footer, "offsetHeight");
  });

  it("updates at-bottom state when a footer height changes", () => {
    const observers = installResizeObserver();
    const View = () =>
      createComponent(ThreadPrimitiveViewport, {
        class: "viewport",
        get children() {
          return [
            createComponent(ThreadPrimitiveViewportFooter, { class: "footer" }),
            createComponent(ThreadPrimitiveScrollToBottom, {
              class: "jump",
              children: "Jump",
            }),
          ];
        },
      });
    const { el } = mountChat(createTestRuntime(), View);
    const div = el.querySelector<HTMLElement>("div.viewport")!;
    const geometry = installViewportGeometry(div);
    const footer = el.querySelector<HTMLElement>("div.footer")!;
    const button = el.querySelector<HTMLButtonElement>("button.jump")!;
    let footerHeight = 0;
    Object.defineProperty(footer, "offsetHeight", {
      get: () => footerHeight,
      configurable: true,
    });
    geometry.setScrollTop(400);
    div.dispatchEvent(new Event("scroll"));
    geometry.setScrollTop(0);
    div.dispatchEvent(new Event("scroll"));
    geometry.setScrollTop(350);
    div.dispatchEvent(new Event("scroll"));
    expect(button.disabled).toBe(false);

    footerHeight = 50;
    expect(footer.offsetHeight).toBe(50);
    observers.trigger(footer);
    expect(button.disabled).toBe(true);

    footerHeight = 0;
    observers.trigger(footer);
    expect(button.disabled).toBe(false);
    Reflect.deleteProperty(footer, "offsetHeight");
  });

  it("includes the top margin and composes the caller's ref and attributes", () => {
    const observers = installResizeObserver();
    const ref = vi.fn();
    const [label, setLabel] = createSignal("Footer");
    const View = () =>
      createComponent(ThreadPrimitiveViewport, {
        class: "viewport",
        get children() {
          return [
            createComponent(ThreadPrimitiveViewportFooter, {
              class: "footer",
              style: { "margin-top": "10px" },
              ref,
              get "aria-label"() {
                return label();
              },
              get children() {
                return label();
              },
            }),
            createComponent(ThreadPrimitiveScrollToBottom, { class: "jump" }),
          ];
        },
      });
    const { el, unmount } = mountChat(createTestRuntime(), View);
    const div = el.querySelector<HTMLElement>("div.viewport")!;
    const geometry = installViewportGeometry(div);
    const footer = el.querySelector<HTMLElement>("div.footer")!;
    expect(ref).toHaveBeenCalledWith(footer);
    expect(footer.textContent).toBe("Footer");
    setLabel("Updated footer");
    expect(footer.getAttribute("aria-label")).toBe("Updated footer");
    expect(footer.textContent).toBe("Updated footer");
    Object.defineProperty(footer, "offsetHeight", {
      get: () => 40,
      configurable: true,
    });
    geometry.setScrollTop(0);
    div.dispatchEvent(new Event("scroll"));
    observers.trigger(footer);
    geometry.setScrollTop(355);
    div.dispatchEvent(new Event("scroll"));
    expect(el.querySelector<HTMLButtonElement>("button.jump")!.disabled).toBe(
      true,
    );

    unmount();
    geometry.scrollTo.mockClear();
    observers.trigger(footer);
    expect(geometry.scrollTo).not.toHaveBeenCalled();
  });

  it("renders outside a viewport without measuring or observing", () => {
    installResizeObserver();
    const observe = vi.spyOn(ResizeObserver.prototype, "observe");
    const el = document.createElement("div");
    document.body.append(el);
    const dispose = render(
      () =>
        createComponent(ThreadPrimitiveViewportFooter, {
          class: "standalone",
          children: "Footer",
        }),
      el,
    );
    unmounts.push(() => {
      dispose();
      el.remove();
    });

    expect(el.querySelector("div.standalone")!.textContent).toBe("Footer");
    expect(observe).not.toHaveBeenCalled();
  });
});
