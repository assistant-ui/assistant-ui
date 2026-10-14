/** The rest of a streaming parse's partial path below `key`, or undefined when the value still arriving is elsewhere. */
export function descend(
  partialPath: readonly string[] | undefined,
  key: string,
): readonly string[] | undefined {
  return partialPath?.[0] === key ? partialPath.slice(1) : undefined;
}
