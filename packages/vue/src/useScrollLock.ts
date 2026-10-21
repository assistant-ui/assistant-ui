import { onScopeDispose, type Ref } from "vue";

const findScrollableAncestor = (element: HTMLElement | null | undefined) => {
  let current = element;
  while (current) {
    const { overflowY } = getComputedStyle(current);
    if (overflowY === "scroll" || overflowY === "auto") return current;
    current = current.parentElement;
  }
  return null;
};

export const useScrollLock = (
  target: Ref<HTMLElement | null | undefined>,
  animationDuration: number,
) => {
  let cleanup: (() => void) | null = null;

  onScopeDispose(() => cleanup?.());

  return () => {
    cleanup?.();

    const scrollContainer = findScrollableAncestor(target.value);
    if (!scrollContainer) {
      cleanup = null;
      return;
    }

    const scrollPosition = scrollContainer.scrollTop;
    const scrollbarWidth = scrollContainer.style.scrollbarWidth;
    const computed = getComputedStyle(scrollContainer);
    const paddingSide =
      computed.direction === "rtl" ? "paddingLeft" : "paddingRight";
    const previousPadding = scrollContainer.style[paddingSide];
    const elementScrollbarSize =
      scrollContainer.offsetWidth -
      scrollContainer.clientWidth -
      parseFloat(computed.borderLeftWidth) -
      parseFloat(computed.borderRightWidth);
    // Root offsetWidth excludes the viewport scrollbar, so use the viewport
    // width only when the element's own gutter is absent.
    const ownerDocument = scrollContainer.ownerDocument;
    const isRootScroller =
      scrollContainer === ownerDocument.documentElement ||
      scrollContainer === ownerDocument.body;
    const scrollbarSize =
      isRootScroller && elementScrollbarSize <= 0
        ? (ownerDocument.defaultView?.innerWidth ?? 0) -
          ownerDocument.documentElement.clientWidth
        : elementScrollbarSize;

    scrollContainer.style.scrollbarWidth = "none";
    if (scrollbarSize > 0) {
      scrollContainer.style[paddingSide] = `${
        parseFloat(computed[paddingSide]) + scrollbarSize
      }px`;
    }

    const restoreStyles = () => {
      scrollContainer.style.scrollbarWidth = scrollbarWidth;
      scrollContainer.style[paddingSide] = previousPadding;
    };
    const resetPosition = () => (scrollContainer.scrollTop = scrollPosition);
    scrollContainer.addEventListener("scroll", resetPosition);

    const timeoutId = setTimeout(() => {
      scrollContainer.removeEventListener("scroll", resetPosition);
      restoreStyles();
      cleanup = null;
    }, animationDuration);

    cleanup = () => {
      clearTimeout(timeoutId);
      scrollContainer.removeEventListener("scroll", resetPosition);
      restoreStyles();
    };
  };
};
