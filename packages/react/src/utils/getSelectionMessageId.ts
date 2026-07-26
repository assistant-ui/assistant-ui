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

  if (!hasQuoteSelectableRegion(anchorMessageElement)) return messageId;

  if (!anchorMarker || anchorMarker !== focusMarker) return null;

  return messageId;
};
