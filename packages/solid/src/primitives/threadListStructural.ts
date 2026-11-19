import { createComponent, mergeProps, splitProps, type JSX } from "solid-js";
import { Dynamic } from "solid-js/web";
import type {
  AssistantClient,
  AssistantState,
} from "@assistant-ui/store/client";
import {
  threadListItemUnarchiveDisabled,
  threadListLoadMoreDisabled,
} from "@assistant-ui/core/store/internal";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";
import { callEventHandler } from "./callEventHandler";

/**
 * A button that loads more threads. Stays mounted and disabled while no
 * more threads are available or a load is in flight.
 */
export const ThreadListPrimitiveLoadMore = (
  props: JSX.ButtonHTMLAttributes<HTMLButtonElement>,
): JSX.Element => {
  const [local, rest] = splitProps(props, ["onClick"]);
  const aui = useAui();
  const disabled = useAuiState(threadListLoadMoreDisabled);
  return createComponent(
    Dynamic,
    mergeProps(rest, {
      component: "button",
      type: "button" as const,
      get disabled() {
        return disabled() || rest.disabled;
      },
      onClick: (
        event: MouseEvent & {
          currentTarget: HTMLButtonElement;
          target: Element;
        },
      ) => {
        callEventHandler(local.onClick, event);
        if (event.defaultPrevented || disabled() || rest.disabled) return;
        void aui.threads.loadMore();
      },
    }),
  );
};

const threadListItemAction =
  (
    action: (aui: AssistantClient) => void,
    isDisabled: (state: AssistantState) => boolean = () => false,
  ) =>
  (props: JSX.ButtonHTMLAttributes<HTMLButtonElement>): JSX.Element => {
    const [local, rest] = splitProps(props, ["onClick"]);
    const aui = useAui();
    const disabled = useAuiState(isDisabled);
    return createComponent(
      Dynamic,
      mergeProps(rest, {
        component: "button",
        type: "button" as const,
        get disabled() {
          return disabled() || rest.disabled;
        },
        onClick: (
          event: MouseEvent & {
            currentTarget: HTMLButtonElement;
            target: Element;
          },
        ) => {
          callEventHandler(local.onClick, event);
          if (event.defaultPrevented || disabled() || rest.disabled) return;
          action(aui);
        },
      }),
    );
  };

/** A button that archives the current thread list item. */
export const ThreadListItemPrimitiveArchive = threadListItemAction((aui) =>
  aui.threadListItem.archive(),
);

/** A button that unarchives the current thread list item. */
export const ThreadListItemPrimitiveUnarchive = threadListItemAction(
  (aui) => aui.threadListItem.unarchive(),
  threadListItemUnarchiveDisabled,
);

/** A button that deletes the current thread list item. */
export const ThreadListItemPrimitiveDelete = threadListItemAction((aui) =>
  aui.threadListItem.delete(),
);
