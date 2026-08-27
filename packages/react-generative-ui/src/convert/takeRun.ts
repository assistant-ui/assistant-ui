import type { NormalizedUIElement, NormalizedUINode } from "../ir";
import { isElement } from "./isElement";

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
