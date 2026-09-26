const QUOTE_SELECTABLE_SELECTOR = "[data-aui-quote-selectable]";

const getElement = (node: Node | null): HTMLElement | null => {
  return node instanceof HTMLElement ? node : (node?.parentElement ?? null);
};

const findMessageElement = (node: Node | null): HTMLElement | null => {
  let el = node instanceof HTMLElement ? node : (node?.parentElement ?? null);
  while (el) {
    const id = el.getAttribute("data-message-id");
    if (id) return el;
    el = el.parentElement;
  }
  return null;
};

const isExcluded = (marker: Element): boolean => {
  return marker.getAttribute("data-aui-quote-selectable") === "false";
};

const hasQuoteSelectableRegion = (messageElement: HTMLElement) => {
  if (
    messageElement.matches(QUOTE_SELECTABLE_SELECTOR) &&
    !isExcluded(messageElement)
  ) {
    return true;
  }
  for (const marker of messageElement.querySelectorAll(
    QUOTE_SELECTABLE_SELECTOR,
  )) {
    if (!isExcluded(marker)) return true;
  }
  return false;
};

const findQuoteMarker = (
  node: Node | null,
  messageElement: HTMLElement,
): HTMLElement | null => {
  const marker = getElement(node)?.closest(QUOTE_SELECTABLE_SELECTOR);
  if (!(marker instanceof HTMLElement)) return null;
  if (!messageElement.contains(marker)) return null;
  return marker;
};

const normalizeRangeEnd = (range: Range): Range => {
  if (range.endOffset !== 0 || range.collapsed) return range;

  const walker = range.endContainer.ownerDocument?.createTreeWalker(
    range.commonAncestorContainer,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
  );
  if (!walker) return range;
  walker.currentNode = range.endContainer;

  while (walker.previousNode()) {
    const node = walker.currentNode;
    const offset = node instanceof Text ? node.length : node.childNodes.length;
    if (range.comparePoint(node, offset) < 0) return range;
    const element = node instanceof Element ? node : node.parentElement;
    const marker = element?.closest(QUOTE_SELECTABLE_SELECTOR);
    if (marker && isExcluded(marker)) return range;
    if (!(node instanceof Text) || !node.data.trim()) continue;

    const normalized = range.cloneRange();
    normalized.setEnd(node, offset);
    return normalized.collapsed ? range : normalized;
  }
  return range;
};

const intersectsExcluded = (
  scope: Element,
  ranges: readonly Range[],
): boolean => {
  for (const marker of scope.querySelectorAll(QUOTE_SELECTABLE_SELECTOR)) {
    if (!isExcluded(marker)) continue;
    if (ranges.some((range) => range.intersectsNode(marker))) return true;
  }
  return false;
};

export const getSelectionMessageId = (
  selection: Selection,
  root?: Element | null,
): string | null => {
  let { anchorNode, focusNode } = selection;
  if (!anchorNode || !focusNode) return null;

  const ranges = Array.from({ length: selection.rangeCount }, (_, i) =>
    selection.getRangeAt(i),
  );
  if (ranges.length === 1) {
    const range = normalizeRangeEnd(ranges[0]!);
    if (range !== ranges[0]) {
      ranges[0] = range;
      anchorNode = range.startContainer;
      focusNode = range.endContainer;
    }
  }

  const anchorMessageElement = findMessageElement(anchorNode);
  const focusMessageElement = findMessageElement(focusNode);

  if (!anchorMessageElement || anchorMessageElement !== focusMessageElement) {
    return null;
  }
  if (root && !root.contains(anchorMessageElement)) {
    return null;
  }

  const messageId = anchorMessageElement.getAttribute("data-message-id");
  if (!messageId) return null;

  const anchorMarker = findQuoteMarker(anchorNode, anchorMessageElement);
  const focusMarker = findQuoteMarker(focusNode, anchorMessageElement);

  if (anchorMarker && isExcluded(anchorMarker)) return null;
  if (focusMarker && isExcluded(focusMarker)) return null;

  if (hasQuoteSelectableRegion(anchorMessageElement)) {
    if (!anchorMarker || anchorMarker !== focusMarker) return null;
  }

  const scope = anchorMarker ?? anchorMessageElement;

  for (const { commonAncestorContainer } of ranges) {
    if (!scope.contains(commonAncestorContainer)) return null;
  }

  return intersectsExcluded(scope, ranges) ? null : messageId;
};
