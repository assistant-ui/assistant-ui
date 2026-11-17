import {
  createComponent,
  mergeProps,
  onCleanup,
  onMount,
  splitProps,
  type JSX,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import { isCompositionKey } from "@assistant-ui/core/internal";
import { useAui } from "../useAui";
import { callEventHandler } from "./callEventHandler";

// Native root handlers preserve the innermost root hidden by closed shadow trees.
const escapeEventThreadRoots = new WeakMap<Event, Element>();

/** A wrapper element for the thread. While mounted, an unhandled Escape inside this thread or outside every thread root stops its active speech synthesis run. Escape inside another thread or during IME composition is ignored. */
export const ThreadPrimitiveRoot = (
  props: JSX.HTMLAttributes<HTMLDivElement>,
): JSX.Element => {
  const [local, rest] = splitProps(props, ["ref", "onKeyDown"]);
  const aui = useAui();
  let div!: HTMLDivElement;
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || isCompositionKey(event)) return;
    if (event.defaultPrevented || aui.thread.source === null) return;
    const eventThreadRoot =
      escapeEventThreadRoots.get(event) ??
      event
        .composedPath()
        .find(
          (target) =>
            target instanceof Element &&
            target.hasAttribute("data-aui-thread-root"),
        );
    if (eventThreadRoot && eventThreadRoot !== div) return;
    if (aui.thread.getState().speech == null) return;
    event.preventDefault();
    try {
      aui.thread.stopSpeaking();
    } catch (error) {
      if (
        !(error instanceof Error) ||
        error.message !== "No message is being spoken"
      ) {
        throw error;
      }
    }
  };
  onMount(() => {
    // Document handlers, including Solid's delegated handlers, can veto Escape first.
    window.addEventListener("keydown", handleKeyDown);
    onCleanup(() => window.removeEventListener("keydown", handleKeyDown));
  });
  return createComponent(
    Dynamic,
    mergeProps(rest, {
      component: "div",
      "data-aui-thread-root": "",
      "on:keydown": (
        event: KeyboardEvent & {
          currentTarget: HTMLDivElement;
          target: Element;
        },
      ) => {
        callEventHandler(local.onKeyDown, event);
        if (event.key === "Escape" && !escapeEventThreadRoots.has(event))
          escapeEventThreadRoots.set(event, div);
      },
      ref: (element: HTMLDivElement) => {
        div = element;
        if (typeof local.ref === "function") local.ref(element);
      },
    }),
  );
};
