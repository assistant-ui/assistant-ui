import { computed, defineComponent, h, type SlotsType } from "vue";
import type {} from "@assistant-ui/core/store";
import { useAuiState } from "../useAuiState";
import { MessageByIdProvider } from "./MessageByIdProvider";
import { MessageByIndexProvider } from "./MessageByIndexProvider";

const OPTIMISTIC_TAIL_KEY = "tail:optimistic";

type Row =
  | { key: string; id: string }
  | { key: typeof OPTIMISTIC_TAIL_KEY; index: number };

/**
 * Renders the default slot once per message in the current thread, each
 * instance scoped to its message through {@link MessageByIdProvider} and
 * keyed by the message id: an edit or reload that replaces the occupant of a
 * slot remounts that row, so `<TransitionGroup>` and per-row component state
 * follow message identity. The optimistic trailing placeholder the runtime
 * appends while a run has not produced an assistant message yet regenerates
 * its id on every store update, so that row alone is keyed positionally and
 * scoped by index until a real message takes its place.
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
    const messages = useAuiState((s) => s.thread.messages);
    let previousRows: readonly Row[] = [];
    const rows = computed(() => {
      const next = messages.value.map((message, index): Row => {
        if (
          index === messages.value.length - 1 &&
          message.role === "assistant" &&
          message.metadata.isOptimistic === true
        ) {
          return { key: OPTIMISTIC_TAIL_KEY, index };
        }
        return { key: `id:${message.id}`, id: message.id };
      });
      const prev = previousRows;
      if (
        prev.length !== next.length ||
        prev.some(
          (row, index) =>
            row.key !== next[index]!.key ||
            "index" in row !== "index" in next[index]!,
        )
      ) {
        previousRows = next;
      }
      return previousRows;
    });
    return () =>
      rows.value.map((row) =>
        "id" in row
          ? h(
              MessageByIdProvider,
              { id: row.id, key: row.key },
              { default: () => slots.default?.() },
            )
          : h(
              MessageByIndexProvider,
              { index: row.index, key: row.key },
              { default: () => slots.default?.() },
            ),
      );
  },
});
