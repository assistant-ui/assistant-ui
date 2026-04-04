import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  type ForwardRefExoticComponent,
  type ReactElement,
  type ReactNode,
  type RefAttributes,
  cloneElement,
  forwardRef,
  isValidElement,
} from "react";
import { Primitive as RadixPrimitive } from "@radix-ui/react-primitive";

/**
 * Thin wrapper around `@radix-ui/react-primitive` that adds `render` prop support.
 *
 * When `render` is provided, it is converted to the equivalent `asChild` pattern:
 *   render={<Comp props />} + children  →  asChild + <Comp props>{children}</Comp>
 *
 * All prop merging, ref composition, and event handler chaining remain handled
 * by Radix's battle-tested Slot implementation — we add zero custom logic for that.
 */

// Match @radix-ui/react-primitive's full element set
const NODES = [
  "a",
  "button",
  "div",
  "form",
  "h2",
  "h3",
  "img",
  "input",
  "label",
  "li",
  "nav",
  "ol",
  "p",
  "select",
  "span",
  "svg",
  "ul",
] as const;
type PrimitiveNode = (typeof NODES)[number];

type PrimitiveProps<E extends PrimitiveNode> = ComponentPropsWithoutRef<
  (typeof RadixPrimitive)[E]
> & {
  render?: ReactElement | undefined;
};

type PrimitiveRef<E extends PrimitiveNode> = ComponentRef<
  (typeof RadixPrimitive)[E]
>;

function createPrimitive<E extends PrimitiveNode>(node: E) {
  const RadixComp = RadixPrimitive[node];

  const Component = forwardRef<PrimitiveRef<E>, PrimitiveProps<E>>(
    ({ render, asChild, children, ...props }, ref) => {
      if (render && isValidElement(render)) {
        // render={<Comp p />} + children
        //   → asChild + <Comp p>{children}</Comp>
        const renderChildren =
          children !== undefined
            ? children
            : ((render.props as Record<string, unknown>).children as ReactNode);
        return (
          <RadixComp asChild {...(props as any)} ref={ref}>
            {cloneElement(render, undefined, renderChildren)}
          </RadixComp>
        );
      }

      return (
        <RadixComp asChild={asChild} {...(props as any)} ref={ref}>
          {children}
        </RadixComp>
      );
    },
  );

  Component.displayName = `Primitive.${node}`;
  return Component as ForwardRefExoticComponent<
    PrimitiveProps<E> & RefAttributes<PrimitiveRef<E>>
  >;
}

const Primitive = NODES.reduce(
  (acc, node) => {
    acc[node] = createPrimitive(node);
    return acc;
  },
  {} as {
    [K in PrimitiveNode]: ReturnType<typeof createPrimitive<K>>;
  },
);

export { Primitive };
export type { PrimitiveProps };
