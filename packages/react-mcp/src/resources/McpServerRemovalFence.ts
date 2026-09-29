import type { McpServerResourceProps } from "./McpServerResource";

const beginRemovalFenceSymbol = Symbol();

type McpServerResourceInternalProps = McpServerResourceProps & {
  [beginRemovalFenceSymbol]?: () => () => void;
};

export const withMcpServerRemovalFence = (
  props: McpServerResourceProps,
  beginRemovalFence: () => () => void,
): McpServerResourceProps =>
  ({
    ...props,
    [beginRemovalFenceSymbol]: beginRemovalFence,
  }) as McpServerResourceProps;

export const beginMcpServerRemovalFence = (
  props: McpServerResourceProps,
): (() => void) | undefined =>
  (props as McpServerResourceInternalProps)[beginRemovalFenceSymbol]?.();
