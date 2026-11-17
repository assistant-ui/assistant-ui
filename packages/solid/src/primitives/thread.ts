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

/** A wrapper element for the thread. While mounted, an unhandled Escape inside this thread or outside every thread root stops its active speech synthesis run. Escape inside another thread or during IME composition is ignored. */
export const ThreadPrimitiveRoot = (
  props: JSX.HTMLAttributes<HTMLDivElement>,
): JSX.Element => {
  const [local, rest] = splitProps(props, ["ref"]);
  const aui = useAui();
  let div!: HTMLDivElement;
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || isCompositionKey(event)) return;
    if (event.defaultPrevented || aui.thread.source === null) return;
    const eventThreadRoot = event
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
    document.addEventListener("keydown", handleKeyDown);
    onCleanup(() => document.removeEventListener("keydown", handleKeyDown));
  });
  return createComponent(
    Dynamic,
    mergeProps(rest, {
      component: "div",
      "data-aui-thread-root": "",
      ref: (element: HTMLDivElement) => {
        div = element;
        if (typeof local.ref === "function") local.ref(element);
      },
    }),
  );
};
