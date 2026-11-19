import { createComponent, For, type JSX } from "solid-js";
import type {} from "@assistant-ui/core/store";
import { useAuiState } from "../useAuiState";
import { MessageByIdProvider } from "./MessageByIdProvider";

/** Renders the children once per message in the current thread, scoped through {@link MessageByIdProvider} and keyed by message id. A stable id keeps its row instance across updates; a new id remounts the row. */
export const ThreadPrimitiveMessages = (props: {
  children?: JSX.Element;
}): JSX.Element => {
  const ids = useAuiState((s) =>
    s.thread.messages.map((message) => message.id),
  );
  return createComponent(For<readonly string[], JSX.Element>, {
    get each() {
      return ids();
    },
    children: (id) =>
      createComponent(MessageByIdProvider, {
        id,
        get children() {
          return props.children;
        },
      }),
  });
};
