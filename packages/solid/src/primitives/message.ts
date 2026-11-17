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

/** A wrapper element for one message. Sets `data-message-id` and tracks pointer hover into `s.message.isHovering`, including an element already under the pointer when it mounts. */
export const MessagePrimitiveRoot = (
  props: JSX.HTMLAttributes<HTMLDivElement>,
): JSX.Element => {
  const [local, rest] = splitProps(props, [
    "onMouseEnter",
    "onMouseLeave",
    "ref",
  ]);
  const aui = useAui();
  const messageId = useAuiState((s) => s.message.id);
  let active = true;
  onCleanup(() => {
    active = false;
    aui.message.setIsHovering(false);
  });
  return createComponent(
    Dynamic,
    mergeProps(rest, {
      component: "div",
      get "data-message-id"() {
        return messageId();
      },
      ref: (element: HTMLDivElement) => {
        if (element.matches(":hover")) {
          queueMicrotask(() => {
            if (active) aui.message.setIsHovering(true);
          });
        }
        if (typeof local.ref === "function") local.ref(element);
      },
      onMouseEnter: (
        event: MouseEvent & { currentTarget: HTMLDivElement; target: Element },
      ) => {
        callEventHandler(local.onMouseEnter, event);
        if (event.defaultPrevented) return;
        aui.message.setIsHovering(true);
      },
      onMouseLeave: (
        event: MouseEvent & { currentTarget: HTMLDivElement; target: Element },
      ) => {
        callEventHandler(local.onMouseLeave, event);
        if (event.defaultPrevented) return;
        aui.message.setIsHovering(false);
      },
    }),
  );
};
