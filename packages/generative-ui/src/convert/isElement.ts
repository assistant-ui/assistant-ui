import type { NormalizedUIElement, NormalizedUINode } from "../ir";

export const isElement = (
  node: NormalizedUINode,
): node is NormalizedUIElement =>
  typeof node === "object" && node !== null && !Array.isArray(node);
