import type { WidgetSize } from "../protocol";

export function measureRoot(root: Element): WidgetSize {
  const rect = root.getBoundingClientRect();
  return { width: Math.ceil(rect.width), height: Math.ceil(rect.height) };
}

/**
 * The size to report to the host, or `undefined` while the root has no
 * layout width. A frame laid out at zero width (a collapsed or hidden
 * container, or Chrome's full-page capture) wraps its content one word per
 * line, and its height would size the iframe far past its content.
 */
export function reportableSize(root: Element): WidgetSize | undefined {
  const size = measureRoot(root);
  return size.width > 0 ? size : undefined;
}
