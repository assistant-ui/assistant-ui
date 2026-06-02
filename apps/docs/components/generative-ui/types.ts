import type { ComponentType } from "react";

/**
 * A node in a JSON UI spec. Either a bare string (text leaf) or an element:
 * `{ type, ...props, children }`. `type` is the registry key (a component
 * name); `children` is reserved for nesting; everything else is passed to the
 * resolved component as props. This flat shape mirrors HTML/JSX (what LLMs
 * produce most reliably) and assistant-ui's own `type`-discriminated parts.
 */
export type UINode = string | UIElement;

export type UIElement = {
  readonly type: string;
  readonly children?: readonly UINode[];
  readonly [prop: string]: unknown;
};

/**
 * Maps component names to the React components that render them. The allowlist
 * is the security boundary: a `type` not present here is not rendered. Both the
 * shipped gallery primitives and a user's own components register the same way.
 */
export type UIRegistry = Record<string, ComponentType<any>>;
