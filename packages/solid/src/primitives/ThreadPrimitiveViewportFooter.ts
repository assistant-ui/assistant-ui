import {
  createComponent,
  mergeProps,
  onCleanup,
  onMount,
  splitProps,
  useContext,
  type JSX,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import { ViewportContext } from "./viewportContext";

/**
 * A footer container that measures its height into the viewport's content inset. Positions within the summed inset of the native bottom count as at bottom, and a growing inset re-follows a pinned viewport. Multiple footers sum. Typically used with `class="sticky bottom-0"`.
 */
export const ThreadPrimitiveViewportFooter = (
  props: JSX.HTMLAttributes<HTMLDivElement>,
): JSX.Element => {
  const [local, rest] = splitProps(props, ["ref"]);
  const viewport = useContext(ViewportContext);
  let div!: HTMLDivElement;
  let dispose: (() => void) | undefined;

  onMount(() => {
    if (!viewport) return;

    const contentInset = viewport.registerContentInset();
    const updateHeight = () => {
      const marginTop = Number.parseFloat(getComputedStyle(div).marginTop) || 0;
      contentInset.setHeight(div.offsetHeight + marginTop);
    };
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
  onCleanup(() => dispose?.());

  return createComponent(
    Dynamic,
    mergeProps(rest, {
      component: "div",
      ref: (element: HTMLDivElement) => {
        div = element;
        if (typeof local.ref === "function") local.ref(element);
      },
    }),
  );
};
