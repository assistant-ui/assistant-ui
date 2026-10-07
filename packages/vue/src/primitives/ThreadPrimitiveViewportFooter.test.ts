import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  h,
  nextTick,
  ref,
  type Component,
} from "vue";
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

const mountChat = (runtime: AssistantRuntimeImpl, view: Component) => {
  const app = createApp(
    defineComponent({
      setup: () => () =>
        h(
          AuiProvider,
          { config: AuiConfig({ threads: RuntimeAdapter(runtime) }) },
          { default: () => h(view) },
        ),
    }),
  );
  const el = document.createElement("div");
  app.mount(el);
  return { el, unmount: () => app.unmount() };
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
      const View = defineComponent({
        setup: () => () =>
          h(
            ThreadPrimitiveViewport,
            { class: "viewport", scrollToBottomOnInitialize: false },
            { default: () => h("p", "history") },
          ),
      });
      const { viewport, geometry, unmount } = mountChatWithViewportGeometry(
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
      unmount();
    },
  );

  it("follows a footer height reported before the viewport attaches", () => {
    installResizeObserver();
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(
      function (this: HTMLElement) {
        return this.classList.contains("footer") ? 50 : 0;
      },
    );
    const View = defineComponent({
      setup: () => () =>
        h(
          ThreadPrimitiveViewport,
          { class: "viewport", scrollToBottomOnInitialize: false },
          {
            default: () => [
              h("p", "history"),
              h(ThreadPrimitiveViewportFooter, { class: "footer" }),
            ],
          },
        ),
    });
    const { viewport, geometry, unmount } = mountChatWithViewportGeometry(
      createTestRuntime(true),
      View,
    );

    expect(geometry.scrollTo).toHaveBeenCalledWith({
      top: 500,
      behavior: "instant",
    });
    expect(viewport.scrollTop).toBe(400);
    unmount();
  });
});

describe("ThreadPrimitiveViewportFooter", () => {
  it("registers its height and unregisters it when removed", async () => {
    const observers = installResizeObserver();
    const showFooter = ref(true);
    const View = defineComponent({
      setup: () => () =>
        h(
          ThreadPrimitiveViewport,
          { class: "viewport" },
          {
            default: () => [
              showFooter.value
                ? h(ThreadPrimitiveViewportFooter, { class: "footer" })
                : null,
              h(
                ThreadPrimitiveScrollToBottom,
                { class: "jump" },
                { default: () => "Jump" },
              ),
            ],
          },
        ),
    });
    const { el, unmount } = mountChat(createTestRuntime(), View);
    const div = el.querySelector<HTMLElement>("div.viewport")!;
    const geometry = installViewportGeometry(div);
    const footer = el.querySelector<HTMLElement>("div.footer")!;
    Object.defineProperty(footer, "offsetHeight", {
      get: () => 50,
      configurable: true,
    });
    div.dispatchEvent(new Event("scroll"));
    observers.trigger(footer);
    await nextTick();

    geometry.setScrollTop(355);
    div.dispatchEvent(new Event("scroll"));
    await nextTick();
    expect(el.querySelector<HTMLButtonElement>("button.jump")!.disabled).toBe(
      true,
    );

    showFooter.value = false;
    await nextTick();
    div.dispatchEvent(new Event("scroll"));
    await nextTick();
    expect(el.querySelector<HTMLButtonElement>("button.jump")!.disabled).toBe(
      false,
    );

    Reflect.deleteProperty(footer, "offsetHeight");
    unmount();
  });

  it("sums the heights of multiple footers", async () => {
    const observers = installResizeObserver();
    const showSecond = ref(true);
    const View = defineComponent({
      setup: () => () =>
        h(
          ThreadPrimitiveViewport,
          { class: "viewport" },
          {
            default: () => [
              h(ThreadPrimitiveViewportFooter, { class: "first-footer" }),
              showSecond.value
                ? h(ThreadPrimitiveViewportFooter, { class: "second-footer" })
                : null,
              h(
                ThreadPrimitiveScrollToBottom,
                { class: "jump" },
                { default: () => "Jump" },
              ),
            ],
          },
        ),
    });
    const { el, unmount } = mountChat(createTestRuntime(), View);
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
    await nextTick();

    geometry.setScrollTop(355);
    div.dispatchEvent(new Event("scroll"));
    await nextTick();
    expect(el.querySelector<HTMLButtonElement>("button.jump")!.disabled).toBe(
      true,
    );

    showSecond.value = false;
    await nextTick();
    div.dispatchEvent(new Event("scroll"));
    await nextTick();
    expect(el.querySelector<HTMLButtonElement>("button.jump")!.disabled).toBe(
      false,
    );

    Reflect.deleteProperty(firstFooter, "offsetHeight");
    Reflect.deleteProperty(secondFooter, "offsetHeight");
    unmount();
  });

  it("follows a footer growth while pinned at the bottom", async () => {
    const observers = installResizeObserver();
    let footerHeight = 50;
    const View = defineComponent({
      setup: () => () =>
        h(
          ThreadPrimitiveViewport,
          { class: "viewport" },
          {
            default: () => [
              h(ThreadPrimitiveViewportFooter, { class: "footer" }),
              h(
                ThreadPrimitiveScrollToBottom,
                { class: "jump" },
                { default: () => "Jump" },
              ),
            ],
          },
        ),
    });
    const { el, unmount } = mountChat(createTestRuntime(), View);
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
    await nextTick();
    expect(geometry.scrollTo).toHaveBeenCalledWith({
      top: 500,
      behavior: "instant",
    });

    geometry.scrollTo.mockClear();
    footerHeight = 80;
    observers.trigger(footer);
    await nextTick();
    expect(geometry.scrollTo).toHaveBeenCalledWith({
      top: 500,
      behavior: "instant",
    });
    expect(el.querySelector<HTMLButtonElement>("button.jump")!.disabled).toBe(
      true,
    );

    Reflect.deleteProperty(footer, "offsetHeight");
    unmount();
  });
});
