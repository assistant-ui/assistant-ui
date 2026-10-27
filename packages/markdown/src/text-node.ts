import type { TextNode } from "./ast";

// NULs mask decoded literals at matching offsets without changing the public AST.
const syntax = new WeakMap<TextNode, string>();

export const syntaxOf = (node: TextNode): string =>
  syntax.get(node) ?? node.value;

export const createText = (value: string, syntaxValue = value): TextNode => {
  const node: TextNode = { type: "text", value };
  if (syntaxValue !== value) syntax.set(node, syntaxValue);
  return node;
};

export const sliceText = (
  node: TextNode,
  start: number,
  end?: number,
): TextNode =>
  createText(node.value.slice(start, end), syntaxOf(node).slice(start, end));

export const concatText = (left: TextNode, right: TextNode): TextNode =>
  createText(left.value + right.value, syntaxOf(left) + syntaxOf(right));
