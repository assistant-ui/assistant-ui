export type NavGroup<N extends { id: string }> = {
  label: string;
  nodes: N[];
};

export const flattenNav = <N extends { id: string }>(
  groups: readonly NavGroup<N>[],
): N[] => groups.flatMap((group) => group.nodes);

export const findNavNode = <N extends { id: string }>(
  groups: readonly NavGroup<N>[],
  nodeId: string | null,
): N | undefined =>
  nodeId ? flattenNav(groups).find((node) => node.id === nodeId) : undefined;

export const firstNavId = <N extends { id: string }>(
  groups: readonly NavGroup<N>[],
): string | null => flattenNav(groups)[0]?.id ?? null;
