import { createComponent, mergeProps, splitProps, type JSX } from "solid-js";
import { Dynamic } from "solid-js/web";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";
import { callEventHandler } from "./callEventHandler";

/**
 * A button that toggles the collapsed state of the chain of thought accordion.
 * Exposes the current disclosure state through `aria-expanded`.
 * Caller listeners run first and can veto the toggle via `preventDefault`.
 */
export const ChainOfThoughtPrimitiveAccordionTrigger = (
  props: JSX.ButtonHTMLAttributes<HTMLButtonElement>,
): JSX.Element => {
  const [local, rest] = splitProps(props, ["onClick"]);
  const aui = useAui();
  const collapsed = useAuiState((s) => s.chainOfThought.collapsed);
  return createComponent(
    Dynamic,
    mergeProps(rest, {
      component: "button",
      type: "button" as const,
      get "aria-expanded"() {
        return !collapsed();
      },
      onClick: (
        event: MouseEvent & {
          currentTarget: HTMLButtonElement;
          target: Element;
        },
      ) => {
        callEventHandler(local.onClick, event);
        if (event.defaultPrevented || rest.disabled) return;
        aui.chainOfThought.setCollapsed(!collapsed());
      },
    }),
  );
};
