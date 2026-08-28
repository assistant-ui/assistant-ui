import {
  defineComponent,
  h,
  mergeProps,
  onMounted,
  onScopeDispose,
  type SlotsType,
  type VNodeChild,
} from "vue";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";

export const ThreadPrimitiveRoot = defineComponent({
  name: "ThreadPrimitiveRoot",
  inheritAttrs: false,
  slots: Object as SlotsType<{ default?: () => VNodeChild[] }>,
  setup(_, { attrs, slots }) {
    const aui = useAui();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (aui.thread.getState().speech == null) return;
      event.preventDefault();
      try {
        aui.thread.stopSpeaking();
      } catch (error) {
        if (
          !(error instanceof Error) ||
          error.message !== "No message is being spoken"
        ) {
          throw error;
        }
      }
    };
    onMounted(() => {
      document.addEventListener("keydown", handleKeyDown);
    });
    onScopeDispose(() => {
      document.removeEventListener("keydown", handleKeyDown);
    });
    return () => h("div", mergeProps(attrs, {}), slots.default?.());
  },
});

export const ThreadPrimitiveEmpty = defineComponent({
  name: "ThreadPrimitiveEmpty",
  slots: Object as SlotsType<{ default?: () => VNodeChild[] }>,
  setup(_, { slots }) {
    const empty = useAuiState((s) => s.thread.isEmpty);
    return () => (empty.value ? slots.default?.() : null);
  },
});

export const ThreadPrimitiveViewportFooter = defineComponent({
  name: "ThreadPrimitiveViewportFooter",
  inheritAttrs: false,
  slots: Object as SlotsType<{ default?: () => VNodeChild[] }>,
  setup(_, { attrs, slots }) {
    return () => h("div", mergeProps(attrs, {}), slots.default?.());
  },
});
