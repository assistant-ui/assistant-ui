import { computed, defineComponent, h, type SlotsType } from "vue";
import { AuiConfig, Derived } from "@assistant-ui/store/client";
import type {} from "@assistant-ui/core/store";
import { AuiProvider } from "../AuiProvider";
import { useAui } from "../useAui";

/**
 * Scopes the subtree to the thread message at `index`: descendants read the
 * message through `s.message` and its edit composer through `s.composer`.
 */
export const MessageByIndexProvider = defineComponent({
  name: "MessageByIndexProvider",
  props: {
    index: {
      type: Number,
      required: true,
    },
  },
  slots: Object as SlotsType<{ default?: () => unknown }>,
  setup(props, { slots }) {
    const aui = useAui();
    const config = computed(() =>
      AuiConfig({
        message: Derived({
          source: "thread",
          query: { type: "index", index: props.index },
          get: (aui) => aui.thread.message({ index: props.index }),
        }),
        composer: Derived({
          source: "message",
          query: {},
          get: (aui) => aui.thread.message({ index: props.index }).composer(),
        }),
      }),
    );
    return () =>
      h(
        AuiProvider,
        { config: config.value, extends: aui },
        { default: () => slots.default?.() },
      );
  },
});
