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

const createTestRuntime = () =>
  new AssistantRuntimeImpl(
    new ExternalStoreRuntimeCore({
      messages: [],
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

const installResizeObserver = () => {
  const observers = new Set<ResizeObserverMock>();
  class ResizeObserverMock {
    element: Element | null = null;

    constructor(private readonly callback: ResizeObserverCallback) {
      observers.add(this);
    }

    observe(element: Element) {
      this.element = element;
    }

    unobserve() {}

    disconnect() {
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
        if (observer.element === element) observer.trigger();
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

    el.querySelector<HTMLButtonElement>("button.jump")!.click();
    expect(geometry.scrollTo).toHaveBeenLastCalledWith({
      top: 450,
      behavior: "auto",
    });

    showFooter.value = false;
    await nextTick();
    geometry.setScrollTop(0);
    div.dispatchEvent(new Event("scroll"));
    await nextTick();

    el.querySelector<HTMLButtonElement>("button.jump")!.click();
    expect(geometry.scrollTo).toHaveBeenLastCalledWith({
      top: 500,
      behavior: "auto",
    });

    Reflect.deleteProperty(footer, "offsetHeight");
    unmount();
  });

  it("sums the heights of multiple footers", async () => {
    const observers = installResizeObserver();
    const View = defineComponent({
      setup: () => () =>
        h(
          ThreadPrimitiveViewport,
          { class: "viewport" },
          {
            default: () => [
              h(ThreadPrimitiveViewportFooter, { class: "first-footer" }),
              h(ThreadPrimitiveViewportFooter, { class: "second-footer" }),
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

    el.querySelector<HTMLButtonElement>("button.jump")!.click();
    expect(geometry.scrollTo).toHaveBeenLastCalledWith({
      top: 450,
      behavior: "auto",
    });

    Reflect.deleteProperty(firstFooter, "offsetHeight");
    Reflect.deleteProperty(secondFooter, "offsetHeight");
    unmount();
  });
});
