const findMessageId = (node: Node | null): string | null => {
  let el = node instanceof HTMLElement ? node : (node?.parentElement ?? null);
  while (el) {
    const id = el.getAttribute("data-message-id");
    if (id) return id;
    el = el.parentElement;
  }
  return null;
};

export const getSelectionMessageId = (selection: Selection): string | null => {
  const { anchorNode, focusNode } = selection;
  if (!anchorNode || !focusNode) return null;

  const anchorId = findMessageId(anchorNode);
  const focusId = findMessageId(focusNode);

  if (!anchorId || anchorId !== focusId) return null;
  return anchorId;
};
