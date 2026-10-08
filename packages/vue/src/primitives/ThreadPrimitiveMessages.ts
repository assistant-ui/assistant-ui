import { defineComponent, h, type SlotsType, type VNodeChild } from "vue";
import type {} from "@assistant-ui/core/store";
import { useAuiState } from "../useAuiState";
import { MessageByIdProvider } from "./MessageByIdProvider";
import { useStableKeys } from "./stableKeys";

/**
 * Renders the default slot once per message in the current thread, each
 * instance scoped to its message through {@link MessageByIdProvider} and
 * keyed by the message id. A stable id keeps its row component instance across
 * updates; a new id remounts the row. Because rows render inside this
 * component, an outer `<TransitionGroup>` cannot animate individual messages.
 *
 * @example
 * ```html
 * <ThreadPrimitiveMessages>
 *   <ChatMessage />
 * </ThreadPrimitiveMessages>
 * ```
 */
export const ThreadPrimitiveMessages = defineComponent({
  name: "ThreadPrimitiveMessages",
  slots: Object as SlotsType<{ default?: () => VNodeChild[] }>,
  setup(_, { slots }) {
    const messages = useAuiState((s) => s.thread.messages);
    const ids = useStableKeys(() =>
      messages.value.map((message) => message.id),
    );
    return () =>
      ids.value.map((id) =>
        h(
          MessageByIdProvider,
          { id, key: id },
          { default: () => slots.default?.() },
        ),
      );
  },
});
