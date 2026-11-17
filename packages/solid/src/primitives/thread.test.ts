import { afterEach, describe, expect, it, vi } from "vitest";
import { createComponent, createSignal } from "solid-js";
import { clearDelegatedEvents, Dynamic, render } from "solid-js/web";
import { resource } from "@assistant-ui/tap";
import { AuiConfig } from "@assistant-ui/store/client";
import { RuntimeAdapter } from "@assistant-ui/core/store";
import {
  AssistantRuntimeImpl,
  ExternalStoreRuntimeCore,
} from "@assistant-ui/core/internal";
import { AuiProvider } from "../AuiProvider";
import { ThreadPrimitiveRoot } from "./thread";

const disposers: (() => void)[] = [];
afterEach(() => {
  disposers.splice(0).forEach((dispose) => dispose());
  vi.restoreAllMocks();
});
const mount = (
  config: AuiConfig,
  props: Parameters<typeof ThreadPrimitiveRoot>[0] = {},
  container: HTMLElement | ShadowRoot = document.body,
) => {
  const el = document.createElement("div");
  container.append(el);
  const dispose = render(
    () =>
      createComponent(AuiProvider, {
        config,
        get children() {
          return createComponent(ThreadPrimitiveRoot, props);
        },
      }),
    el,
  );
  const unmount = () => {
    dispose();
    el.remove();
  };
  disposers.push(unmount);
  return { el, unmount };
};
const speechConfig = (stopSpeaking: () => void) => {
  const Thread = resource(function useThread() {
    return { getState: () => ({ speech: {} }), stopSpeaking };
  });
  return AuiConfig({ thread: Thread() } as never);
};
const keydown = (
  target: EventTarget,
  key: string,
  options: KeyboardEventInit = {},
) =>
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      key,
      bubbles: true,
      cancelable: true,
      composed: true,
      ...options,
    }),
  );

describe("ThreadPrimitiveRoot", () => {
  it("renders the thread root and survives Escape without a thread scope", () => {
    const runtime = new AssistantRuntimeImpl(
      new ExternalStoreRuntimeCore({ messages: [], onNew: async () => {} }),
    );
    const { el } = mount(AuiConfig({ threads: RuntimeAdapter(runtime) }), {
      class: "thread-root",
      children: "content",
    });
    expect(el.querySelector("div.thread-root")?.textContent).toBe("content");
    expect(keydown(document, "Escape")).toBe(true);
    mount(AuiConfig({}), { children: "scopeless" });
    expect(() => keydown(document, "Escape")).not.toThrow();
  });

  it("stops active speech on Escape outside every thread root and removes its listener on disposal", () => {
    const stopSpeaking = vi.fn();
    const { unmount } = mount(speechConfig(stopSpeaking));
    expect(keydown(document, "Enter")).toBe(true);
    expect(stopSpeaking).not.toHaveBeenCalled();
    expect(keydown(document.body, "Escape")).toBe(false);
    expect(stopSpeaking).toHaveBeenCalledTimes(1);
    unmount();
    expect(keydown(document, "Escape")).toBe(true);
    expect(stopSpeaking).toHaveBeenCalledTimes(1);
  });

  it("honors the first delegated Escape veto from a child mounted after the root", () => {
    clearDelegatedEvents();
    const stopSpeaking = vi.fn();
    const { el } = mount(speechConfig(stopSpeaking));
    const handler = vi.fn((event: KeyboardEvent) => {
      if (event.key === "Escape") event.preventDefault();
    });
    disposers.push(
      render(
        () =>
          createComponent(Dynamic, {
            component: "input",
            onKeyDown: handler,
          }),
        el.firstElementChild!,
      ),
    );
    expect(keydown(el.querySelector("input")!, "Escape")).toBe(false);
    expect(handler).toHaveBeenCalledOnce();
    expect(stopSpeaking).not.toHaveBeenCalled();
  });

  it.each(["sibling", "nested", "shadow", "closed shadow"] as const)(
    "stops only the nearest thread's speech on Escape (%s)",
    (placement) => {
      const stopSpeaking = vi.fn();
      const stopOtherSpeaking = vi.fn();
      const { el } = mount(speechConfig(stopSpeaking));
      const root = el.firstElementChild as HTMLDivElement;
      let container: HTMLElement | ShadowRoot = document.body;
      if (placement === "nested") container = root;
      if (placement === "shadow" || placement === "closed shadow")
        container = root.attachShadow({
          mode: placement === "shadow" ? "open" : "closed",
        });
      const other = mount(
        speechConfig(stopOtherSpeaking),
        {
          get children() {
            return createComponent(Dynamic, { component: "input" });
          },
        },
        container,
      );
      expect(keydown(other.el.querySelector("input")!, "Escape")).toBe(false);
      expect(stopSpeaking).not.toHaveBeenCalled();
      expect(stopOtherSpeaking).toHaveBeenCalledOnce();
      expect(keydown(root, "Escape")).toBe(false);
      expect(stopSpeaking).toHaveBeenCalledOnce();
      expect(stopOtherSpeaking).toHaveBeenCalledOnce();
    },
  );

  it.each([{ isComposing: true }, { keyCode: 229, isComposing: false }])(
    "leaves Escape to IME composition (%j)",
    (options) => {
      const stopSpeaking = vi.fn();
      const { el } = mount(speechConfig(stopSpeaking), {
        get children() {
          return createComponent(Dynamic, { component: "input" });
        },
      });
      expect(keydown(el.querySelector("input")!, "Escape", options)).toBe(true);
      expect(stopSpeaking).not.toHaveBeenCalled();
      expect(keydown(el.querySelector("input")!, "Escape")).toBe(false);
      expect(stopSpeaking).toHaveBeenCalledOnce();
    },
  );

  it("honors the caller's keyboard veto and forwards refs and reactive children", () => {
    const stopSpeaking = vi.fn();
    const [label, setLabel] = createSignal("Thread");
    const ref = vi.fn();
    const handler = vi.fn((event: KeyboardEvent) => event.preventDefault());
    const { el } = mount(speechConfig(stopSpeaking), {
      ref,
      onKeyDown: handler,
      get "aria-label"() {
        return label();
      },
      get children() {
        return label();
      },
    });
    const root = el.querySelector("div")!;
    expect(ref.mock.calls[0]?.[0]).toBe(root);
    setLabel("Updated thread");
    expect(root.textContent).toBe("Updated thread");
    expect(root.getAttribute("aria-label")).toBe("Updated thread");
    expect(keydown(root, "Escape")).toBe(false);
    expect(handler).toHaveBeenCalledOnce();
    expect(stopSpeaking).not.toHaveBeenCalled();
  });

  it("tolerates a speech run ending before the Escape handler stops it", () => {
    const stopSpeaking = vi.fn(() => {
      throw new Error("No message is being spoken");
    });
    mount(speechConfig(stopSpeaking));
    expect(keydown(document, "Escape")).toBe(false);
    expect(stopSpeaking).toHaveBeenCalledOnce();
  });

  it.each([new Error("speech failed"), "speech failed"])(
    "surfaces unexpected stop failures (%s)",
    (failure) => {
      mount(
        speechConfig(() => {
          throw failure;
        }),
      );
      const errors: unknown[] = [];
      const onError = (event: ErrorEvent) => {
        errors.push(event.error);
        event.preventDefault();
      };
      window.addEventListener("error", onError);
      try {
        keydown(document, "Escape");
        expect(errors).toEqual([failure]);
      } finally {
        window.removeEventListener("error", onError);
      }
    },
  );
});
