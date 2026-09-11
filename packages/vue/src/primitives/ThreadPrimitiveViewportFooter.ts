import {
  defineComponent,
  h,
  inject,
  mergeProps,
  onMounted,
  onScopeDispose,
  shallowRef,
  type SlotsType,
  type VNodeChild,
} from "vue";
import { viewportInjectionKey } from "./viewportContext";

/**
 * A footer container that measures its height into the viewport's content
 * inset. Positions within the summed inset of the native bottom count as at
 * bottom, and a growing inset re-follows a pinned viewport. Multiple footers
 * sum. Typically used with `class="sticky bottom-0"`.
 */
export const ThreadPrimitiveViewportFooter = defineComponent({
  name: "ThreadPrimitiveViewportFooter",
  inheritAttrs: false,
  slots: Object as SlotsType<{ default?: () => VNodeChild[] }>,
  setup(_, { attrs, slots }) {
    const viewport = inject(viewportInjectionKey, null);
    const divRef = shallowRef<HTMLElement | null>(null);
    let dispose: (() => void) | undefined;

    onMounted(() => {
      const div = divRef.value;
      if (!div || !viewport) return;

      const contentInset = viewport.registerContentInset();
      const updateHeight = () => {
        const marginTop =
          Number.parseFloat(getComputedStyle(div).marginTop) || 0;
        contentInset.setHeight(div.offsetHeight + marginTop);
      };
      updateHeight();

      let resizeObserver: ResizeObserver | undefined;
      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(updateHeight);
        resizeObserver.observe(div);
      }

      dispose = () => {
        resizeObserver?.disconnect();
        contentInset.unregister();
      };
    });

    onScopeDispose(() => {
      dispose?.();
    });

    return () =>
      h("div", mergeProps(attrs, { ref: divRef }), slots.default?.());
  },
});
