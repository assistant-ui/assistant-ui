import {
  createComponent,
  mergeProps,
  onCleanup,
  splitProps,
  type JSX,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";
import { callEventHandler } from "./callEventHandler";
import {
  useThreadListCollection,
  useThreadListItemFocus,
} from "./threadListFocusGroup";

/**
 * A button that switches to the current thread-list item's thread. Carries
 * `data-active` and `aria-current` while that thread is the main one, for
 * standalone use; when nested under `ThreadListItemPrimitiveRoot` the root
 * carries them too.
 */
export const ThreadListItemPrimitiveTrigger = (
  props: JSX.ButtonHTMLAttributes<HTMLButtonElement>,
): JSX.Element => {
  const [local, rest] = splitProps(props, ["onClick", "ref"]);
  const aui = useAui();
  const active = useAuiState(
    (s) => s.threads.mainThreadId === s.threadListItem.id,
  );
  const collection = useThreadListCollection();
  const focus = useThreadListItemFocus();
  const key = Symbol();
  let trigger: HTMLButtonElement | null = null;
  let unregister: (() => void) | undefined;
  const setTrigger = (element: HTMLButtonElement) => {
    unregister?.();
    if (focus) focus.trigger = element;
    trigger = element;
    unregister = collection?.registerTrigger(key, element);
    if (typeof local.ref === "function") local.ref(element);
  };
  onCleanup(() => {
    unregister?.();
    if (focus?.trigger === trigger) focus.trigger = null;
  });
  return createComponent(
    Dynamic,
    mergeProps(rest, {
      component: "button",
      ref: setTrigger,
      type: "button" as const,
      get "data-active"() {
        return active() ? "true" : undefined;
      },
      get "aria-current"() {
        return active() ? ("true" as const) : undefined;
      },
      onClick: (
        event: MouseEvent & {
          currentTarget: HTMLButtonElement;
          target: Element;
        },
      ) => {
        callEventHandler(local.onClick, event);
        if (event.defaultPrevented || rest.disabled) return;
        aui.threadListItem.switchTo();
      },
    }),
  );
};
