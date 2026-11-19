import { createComponent, mergeProps, splitProps, type JSX } from "solid-js";
import { Dynamic } from "solid-js/web";
import { useAuiState } from "../useAuiState";
import { callEventHandler } from "./callEventHandler";
import {
  ThreadListItemFocusContext,
  useThreadListCollection,
} from "./threadListFocusGroup";

/** Marks the active thread list item and moves focus between its triggers. */
export const ThreadListItemPrimitiveRoot = (
  props: JSX.HTMLAttributes<HTMLDivElement>,
): JSX.Element => {
  const [local, rest] = splitProps(props, ["onKeyDown"]);
  const active = useAuiState(
    (s) => s.threads.mainThreadId === s.threadListItem.id,
  );
  const focus = { trigger: null as HTMLButtonElement | null };
  const collection = useThreadListCollection();
  return createComponent(ThreadListItemFocusContext.Provider, {
    value: focus,
    get children() {
      return createComponent(
        Dynamic,
        mergeProps(rest, {
          component: "div",
          get "data-active"() {
            return active() ? "true" : undefined;
          },
          get "aria-current"() {
            return active() ? ("true" as const) : undefined;
          },
          onKeyDown: (
            event: KeyboardEvent & {
              currentTarget: HTMLDivElement;
              target: Element;
            },
          ) => {
            callEventHandler(local.onKeyDown, event);
            if (event.defaultPrevented) return;
            if (
              event.altKey ||
              event.ctrlKey ||
              event.metaKey ||
              event.shiftKey
            )
              return;
            const trigger = focus.trigger;
            if (
              !trigger ||
              event.target !== trigger ||
              (event.key !== "ArrowDown" && event.key !== "ArrowUp")
            ) {
              return;
            }
            const triggers = collection
              ?.getTriggers()
              .filter((node) => !node.disabled);
            if (!triggers) return;
            const next =
              triggers[
                triggers.indexOf(trigger) + (event.key === "ArrowDown" ? 1 : -1)
              ];
            if (!next) return;
            next.focus();
            event.preventDefault();
          },
        }),
      );
    },
  });
};
