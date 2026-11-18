import { createComponent, mergeProps, splitProps, type JSX } from "solid-js";
import { Dynamic } from "solid-js/web";
import type {} from "@assistant-ui/core/store";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";
import { callEventHandler } from "./callEventHandler";

/**
 * A button that switches to a new thread. Carries `data-active` and
 * `aria-current` while the new thread is the main one.
 */
export const ThreadListPrimitiveNew = (
  props: JSX.ButtonHTMLAttributes<HTMLButtonElement>,
): JSX.Element => {
  const [local, rest] = splitProps(props, ["onClick"]);
  const aui = useAui();
  const active = useAuiState(
    (s) => s.threads.newThreadId === s.threads.mainThreadId,
  );

  return createComponent(
    Dynamic,
    mergeProps(rest, {
      component: "button",
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
        aui.threads.switchToNewThread();
      },
    }),
  );
};
