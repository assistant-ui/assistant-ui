import { computed, defineComponent, h, type SlotsType } from "vue";
import type {} from "@assistant-ui/core/store";
import { useAuiState } from "../useAuiState";
import { MessageByIdProvider } from "./MessageByIdProvider";

const ID_SEPARATOR = "\u001f";

/**
 * Renders the default slot once per message in the current thread, each
 * instance scoped to its message through {@link MessageByIdProvider} and
 * keyed by the message id: an edit or reload that replaces the occupant of a
 * slot remounts that row, so `<TransitionGroup>` and per-row component state
 * follow message identity.
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
    const joinedIds = useAuiState((s) =>
      s.thread.messages.map((message) => message.id).join(ID_SEPARATOR),
    );
    const ids = computed(() =>
      joinedIds.value === "" ? [] : joinedIds.value.split(ID_SEPARATOR),
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
