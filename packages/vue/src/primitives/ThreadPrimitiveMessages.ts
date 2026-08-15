import { defineComponent, h, type SlotsType } from "vue";
import type {} from "@assistant-ui/core/store";
import { useAuiState } from "../useAuiState";
import { MessageByIndexProvider } from "./MessageByIndexProvider";

/**
 * Renders the default slot once per message in the current thread, each
 * instance scoped to its message through {@link MessageByIndexProvider}.
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
  slots: Object as SlotsType<{ default?: () => unknown }>,
  setup(_, { slots }) {
    const count = useAuiState((s) => s.thread.messages.length);
    return () =>
      Array.from({ length: count.value }, (_, index) =>
        h(
          MessageByIndexProvider,
          { index, key: index },
          { default: () => slots.default?.() },
        ),
      );
  },
});
