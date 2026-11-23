import {
  computed,
  defineComponent,
  h,
  onScopeDispose,
  type SlotsType,
  type VNodeChild,
} from "vue";
import { AuiConfig, Derived } from "@assistant-ui/store/client";
import { hasMessageId } from "@assistant-ui/core/internal";
import type { ComposerMethods, MessageMethods } from "@assistant-ui/core/store";
import { AuiProvider } from "../AuiProvider";
import { useAui } from "../useAui";
import { createLastValidCache, createStaleReporter } from "./lastValidCache";

/**
 * Scopes the subtree to the thread message with `id`: descendants read the
 * message through `s.message` and its edit composer through `s.composer`.
 * The scope follows the message's identity rather than a positional slot, so
 * it pairs with id-keyed iteration.
 */
export const MessageByIdProvider = defineComponent({
  name: "MessageByIdProvider",
  props: {
    id: {
      type: String,
      required: true,
    },
  },
  slots: Object as SlotsType<{ default?: () => VNodeChild[] }>,
  setup(props, { slots }) {
    const aui = useAui();
    let disposed = false;
    onScopeDispose(() => {
      disposed = true;
    });
    const config = computed(() => {
      const id = props.id;
      const messageCache = createLastValidCache<MessageMethods>(
        createStaleReporter({
          name: "MessageByIdProvider",
          index: id,
          isCurrent: () => !disposed && id === props.id,
          isValid: () => hasMessageId(aui.thread.getState().messages, id),
        }),
      );
      const composerCache = createLastValidCache<ComposerMethods>(null);
      return AuiConfig({
        message: Derived({
          source: "thread",
          query: { type: "id", id },
          get: (aui) =>
            messageCache.resolve(
              hasMessageId(aui.thread.getState().messages, id),
              () => aui.thread.message({ id }),
            ),
        }),
        composer: Derived({
          source: "message",
          query: {},
          get: (aui) =>
            composerCache.resolve(
              hasMessageId(aui.thread.getState().messages, id),
              () => aui.thread.message({ id }).composer(),
            ),
        }),
      });
    });
    return () =>
      h(
        AuiProvider,
        { config: config.value, extends: aui },
        { default: () => slots.default?.() },
      );
  },
});
