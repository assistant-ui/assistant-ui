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

const hasQuoteSelectableRegion = (messageElement: HTMLElement) => {
  return (
    messageElement.matches(QUOTE_SELECTABLE_SELECTOR) ||
    !!messageElement.querySelector(QUOTE_SELECTABLE_SELECTOR)
  );
};

const findQuoteSelectableRegion = (
  node: Node | null,
  messageElement: HTMLElement,
): HTMLElement | null => {
  const region = getElement(node)?.closest(QUOTE_SELECTABLE_SELECTOR);
  if (!(region instanceof HTMLElement)) return null;
  if (!messageElement.contains(region)) return null;
  return region;
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

  if (!hasQuoteSelectableRegion(anchorMessageElement)) return messageId;

  const anchorRegion = findQuoteSelectableRegion(
    anchorNode,
    anchorMessageElement,
  );
  const focusRegion = findQuoteSelectableRegion(
    focusNode,
    anchorMessageElement,
  );

  if (!anchorRegion || anchorRegion !== focusRegion) return null;

  return messageId;
};
