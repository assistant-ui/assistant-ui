/**
 * Steps a streaming partial path down into `key`. `partialPath` is the remaining
 * segment of the parse meta's partial path relative to the current node
 * (`undefined` once the walk leaves the partial frontier, i.e. everything below
 * is complete).
 */
export function descend(
  partialPath: readonly string[] | undefined,
  key: string,
): readonly string[] | undefined {
  return partialPath?.[0] === key ? partialPath.slice(1) : undefined;
}
