const idSets = new WeakMap<readonly { readonly id: string }[], Set<string>>();

export const hasMessageId = (
  messages: readonly { readonly id: string }[],
  id: string,
): boolean => {
  let set = idSets.get(messages);
  if (!set) {
    set = new Set(messages.map((message) => message.id));
    idSets.set(messages, set);
  }
  return set.has(id);
};
