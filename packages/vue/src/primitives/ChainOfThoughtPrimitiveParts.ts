import {
  computed,
  defineComponent,
  h,
  onScopeDispose,
  type SlotsType,
  type VNodeChild,
} from "vue";
import type { PartMethods, PartState } from "@assistant-ui/core/store";
import { AuiConfig, Derived } from "@assistant-ui/store/client";
import { AuiProvider } from "../AuiProvider";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";
import { createLastValidCache, createStaleReporter } from "./lastValidCache";

type ChainOfThoughtPartsSlots = {
  default?: (props: { part: PartState }) => VNodeChild[];
};

const ChainOfThoughtPartByIndexProvider = defineComponent({
  name: "ChainOfThoughtPartByIndexProvider",
  props: {
    index: {
      type: Number,
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
      const index = props.index;
      const cache = createLastValidCache<PartMethods>(
        createStaleReporter({
          name: "ChainOfThoughtPartByIndexProvider",
          index,
          isCurrent: () => !disposed && index === props.index,
          isValid: () => index < aui.chainOfThought.getState().parts.length,
        }),
      );
      return AuiConfig({
        part: Derived({
          source: "chainOfThought",
          query: { type: "index", index },
          // chainOfThought.part() delegates to a userland getMessagePart, so
          // validity is not decided by parts.length alone; a lookup throw is
          // absorbed into the stale cache like an invalid index.
          get: (aui) => {
            const valid = index < aui.chainOfThought.getState().parts.length;
            try {
              return cache.resolve(valid, () =>
                aui.chainOfThought.part({ index }),
              );
            } catch (error) {
              return cache.resolve(false, () => {
                throw error;
              });
            }
          },
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

const ChainOfThoughtPartView = defineComponent({
  name: "ChainOfThoughtPartView",
  slots: Object as SlotsType<ChainOfThoughtPartsSlots>,
  setup(_, { slots }) {
    const part = useAuiState((s) => s.part);
    return () => slots.default?.({ part: part.value });
  },
});

/**
 * Renders the parts within a chain of thought through the default slot, one
 * invocation per entry of `s.chainOfThought.parts`.
 *
 * Rendering is not gated on `s.chainOfThought.collapsed`; gate visibility in
 * the caller (for example with `AuiIf`), matching the React primitive.
 */
export const ChainOfThoughtPrimitiveParts = defineComponent({
  name: "ChainOfThoughtPrimitiveParts",
  slots: Object as SlotsType<ChainOfThoughtPartsSlots>,
  setup(_, { slots }) {
    const count = useAuiState((s) => s.chainOfThought.parts.length);
    return () =>
      Array.from({ length: count.value }, (_, index) =>
        h(
          ChainOfThoughtPartByIndexProvider,
          { index, key: index },
          {
            default: () =>
              h(ChainOfThoughtPartView, null, { default: slots.default }),
          },
        ),
      );
  },
});
