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

      const measure = () => {
        const marginTop =
          Number.parseFloat(getComputedStyle(div).marginTop) || 0;
        return div.offsetHeight + marginTop;
      };
      const contentInset = viewport.registerContentInset(measure);
      const updateHeight = () => contentInset.setHeight(measure());
      updateHeight();

      let resizeObserver: ResizeObserver | undefined;
      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(updateHeight);
        resizeObserver.observe(div);
      }

      let mutationObserver: MutationObserver | undefined;
      if (typeof MutationObserver !== "undefined") {
        mutationObserver = new MutationObserver(updateHeight);
        mutationObserver.observe(div, {
          attributes: true,
          attributeFilter: ["class", "style"],
        });
      }
      window.addEventListener("resize", updateHeight);

      dispose = () => {
        resizeObserver?.disconnect();
        mutationObserver?.disconnect();
        window.removeEventListener("resize", updateHeight);
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
