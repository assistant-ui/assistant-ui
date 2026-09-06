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

const intersectsExcluded = (scope: Element, selection: Selection): boolean => {
  const ranges = Array.from({ length: selection.rangeCount }, (_, i) =>
    selection.getRangeAt(i),
  );
  for (const marker of scope.querySelectorAll(QUOTE_SELECTABLE_SELECTOR)) {
    if (!isExcluded(marker)) continue;
    if (ranges.some((range) => range.intersectsNode(marker))) return true;
  }
  return false;
};

export const getSelectionMessageId = (selection: Selection): string | null => {
  const { anchorNode, focusNode } = selection;
  if (!anchorNode || !focusNode) return null;

  const anchorMessageElement = findMessageElement(anchorNode);
  const focusMessageElement = findMessageElement(focusNode);

  if (!anchorMessageElement || anchorMessageElement !== focusMessageElement) {
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

  for (let i = 0; i < selection.rangeCount; i++) {
    const { commonAncestorContainer } = selection.getRangeAt(i);
    if (!scope.contains(commonAncestorContainer)) return null;
  }

  return intersectsExcluded(scope, selection) ? null : messageId;
};
