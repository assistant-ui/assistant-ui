import {
  computed,
  defineComponent,
  h,
  onScopeDispose,
  type SlotsType,
  type VNodeChild,
} from "vue";
import {
  AuiConfig,
  Derived,
  type AssistantClient,
} from "@assistant-ui/store/client";
import type { ComposerMethods, MessageMethods } from "@assistant-ui/core/store";
import { AuiProvider } from "../AuiProvider";
import { useAui } from "../useAui";
import { createLastValidCache, createStaleReporter } from "./lastValidCache";

const idSets = new WeakMap<readonly { id: string }[], Set<string>>();

const hasMessage = (aui: AssistantClient, id: string) => {
  const messages = aui.thread.getState().messages;
  let set = idSets.get(messages);
  if (!set) {
    set = new Set(messages.map((message) => message.id));
    idSets.set(messages, set);
  }
  return set.has(id);
};

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
          isValid: () => hasMessage(aui, id),
        }),
      );
      const composerCache = createLastValidCache<ComposerMethods>(null);
      return AuiConfig({
        message: Derived({
          source: "thread",
          query: { type: "id", id },
          get: (aui) =>
            messageCache.resolve(hasMessage(aui, id), () =>
              aui.thread.message({ id }),
            ),
        }),
        composer: Derived({
          source: "message",
          query: {},
          get: (aui) =>
            composerCache.resolve(hasMessage(aui, id), () =>
              aui.thread.message({ id }).composer(),
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
