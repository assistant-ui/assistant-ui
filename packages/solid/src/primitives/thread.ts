import {
  createComponent,
  mergeProps,
  onCleanup,
  onMount,
  splitProps,
  type JSX,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import { useAui } from "../useAui";

/** A wrapper element for the thread. While mounted, Escape stops an active speech synthesis run. */
export const ThreadPrimitiveRoot = (
  props: JSX.HTMLAttributes<HTMLDivElement>,
): JSX.Element => {
  const [, rest] = splitProps(props, []);
  const aui = useAui();
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || event.defaultPrevented) return;
    if (aui.thread.source === null) return;
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
  onMount(() => document.addEventListener("keydown", handleKeyDown));
  onCleanup(() => document.removeEventListener("keydown", handleKeyDown));
  return createComponent(Dynamic, mergeProps(rest, { component: "div" }));
};
