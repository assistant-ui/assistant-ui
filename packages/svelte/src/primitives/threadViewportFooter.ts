import type { threadViewport } from "./threadViewport";

/**
 * Builder for a footer whose height contributes to a viewport's content
 * inset. Call during component initialization and attach to the footer
 * element with `{@attach footer.attach}`.
 */
export const threadViewportFooter = (options: {
  viewport: ReturnType<typeof threadViewport>;
}) => {
  const { viewport } = options;
  return {
    attach: (el: HTMLElement) => {
      const contentInset = viewport.registerContentInset();
      const updateHeight = () => {
        const marginTop =
          Number.parseFloat(getComputedStyle(el).marginTop) || 0;
        contentInset.setHeight(el.offsetHeight + marginTop);
      };
      updateHeight();

      const resizeObserver =
        typeof ResizeObserver !== "undefined"
          ? new ResizeObserver(updateHeight)
          : undefined;
      resizeObserver?.observe(el);

      return () => {
        resizeObserver?.disconnect();
        contentInset.unregister();
      };
    },
  };
};
