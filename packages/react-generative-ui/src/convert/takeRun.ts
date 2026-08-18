import type { NormalizedUIElement, NormalizedUINode } from "../ir";

const isElement = (node: NormalizedUINode): node is NormalizedUIElement =>
  typeof node === "object" && node !== null && !Array.isArray(node);

export function takeRun(
  nodes: readonly (NormalizedUINode | undefined)[],
  index: number,
  matches: (element: NormalizedUIElement) => boolean,
): { run: NormalizedUIElement[]; next: number } {
  const run: NormalizedUIElement[] = [];
  let next = index;
  while (next < nodes.length) {
    const candidate = nodes[next];
    if (candidate === undefined || !isElement(candidate) || !matches(candidate))
      break;
    run.push(candidate);
    next += 1;
  }
  return { run, next };
}
