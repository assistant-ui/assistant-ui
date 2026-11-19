import {
  createComponent,
  mergeProps,
  Show,
  splitProps,
  type JSX,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import { messageErrorText } from "@assistant-ui/core/store/internal";
import { useAuiState } from "../useAuiState";

/** A wrapper element for the current message's error state. */
export const ErrorPrimitiveRoot = (
  props: JSX.HTMLAttributes<HTMLDivElement>,
): JSX.Element => {
  const [, rest] = splitProps(props, []);
  return createComponent(
    Dynamic,
    mergeProps({ role: "alert" }, rest, { component: "div" }),
  );
};

/**
 * Renders the current assistant message's error text as raw text, or the
 * children instead when given; renders nothing while the message has no
 * error.
 */
export const ErrorPrimitiveMessage = (props: {
  children?: JSX.Element;
}): JSX.Element => {
  const error = useAuiState(messageErrorText);
  return createComponent(Show, {
    keyed: true,
    get when() {
      return error() !== undefined;
    },
    get children() {
      return "children" in props ? props.children : String(error());
    },
  });
};
