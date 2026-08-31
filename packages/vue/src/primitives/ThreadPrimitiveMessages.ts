import {
  computed,
  defineComponent,
  h,
  type SlotsType,
  type VNodeChild,
} from "vue";
import type {} from "@assistant-ui/core/store";
import { useAuiState } from "../useAuiState";
import { MessageByIdProvider } from "./MessageByIdProvider";

/**
 * Renders the default slot once per message in the current thread, each
 * instance scoped to its message through {@link MessageByIdProvider} and
 * keyed by the message id: an edit or reload that replaces the occupant of a
 * slot remounts that row, so `<TransitionGroup>` and per-row component state
 * follow message identity. The empty optimistic placeholder that precedes a
 * response is its own identity, so the arrival of the real assistant message
 * remounts that one row (a leave/enter pair under `<TransitionGroup>`).
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
    let previousIds: readonly string[] = [];
    const ids = computed(() => {
      const next = messages.value.map((message) => message.id);
      if (
        previousIds.length !== next.length ||
        previousIds.some((id, index) => id !== next[index])
      ) {
        previousIds = next;
      }
      return previousIds;
    });
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
