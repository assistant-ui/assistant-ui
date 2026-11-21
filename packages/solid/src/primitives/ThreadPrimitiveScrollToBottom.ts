import {
  createComponent,
  createMemo,
  mergeProps,
  splitProps,
  useContext,
  type JSX,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import { isDevelopment } from "@assistant-ui/core/store/internal";
import { callEventHandler } from "./callEventHandler";
import { ViewportContext } from "./viewportContext";

let warnedOutsideViewport = false;

/**
 * A button that scrolls the surrounding {@link ThreadPrimitiveViewport} to the bottom. Disabled while the viewport is already at the bottom, or when no viewport provides the channel.
 */
export const ThreadPrimitiveScrollToBottom = (
  props: JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
    behavior?: ScrollBehavior;
  },
): JSX.Element => {
  const [local, rest] = splitProps(props, ["behavior", "onClick"]);
  const viewport = useContext(ViewportContext);
  if (isDevelopment && !viewport && !warnedOutsideViewport) {
    warnedOutsideViewport = true;
    console.warn(
      "ThreadPrimitiveScrollToBottom: no surrounding ThreadPrimitiveViewport provides the scroll channel; the button stays disabled. Place it inside the viewport.",
    );
  }
  const disabled = createMemo(
    () => !viewport || viewport.isAtBottom() || rest.disabled,
  );

  return createComponent(
    Dynamic,
    mergeProps(rest, {
      component: "button",
      type: "button" as const,
      get disabled() {
        return disabled();
      },
      onClick: (
        event: MouseEvent & {
          currentTarget: HTMLButtonElement;
          target: Element;
        },
      ) => {
        callEventHandler(local.onClick, event);
        if (event.defaultPrevented || !viewport || disabled()) return;
        viewport.scrollToBottom(local.behavior ?? "auto");
      },
    }),
  );
};
