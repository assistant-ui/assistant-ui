import {
  type ComponentProps,
  type ComponentPropsWithoutRef,
  type ComponentRef,
  type ElementType,
  type ForwardRefExoticComponent,
  type PropsWithoutRef,
  type ReactElement,
  type ReactNode,
  type RefAttributes,
  cloneElement,
  forwardRef,
  isValidElement,
} from "react";
import { Primitive as RadixPrimitive } from "radix-ui/internal";
import { Slot } from "radix-ui";

/**
 * Thin wrapper around Radix `Primitive` that adds `render` prop support.
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

type WithRenderPropProps<T extends ElementType> =
  ComponentPropsWithoutRef<T> & {
    render?: ReactElement | undefined;
  };

type PrimitiveProps<E extends PrimitiveNode> = WithRenderPropProps<
  (typeof RadixPrimitive)[E]
>;

type WithRenderPropRuntimeProps<T extends ElementType> =
  WithRenderPropProps<T> & {
    asChild?: boolean | undefined;
    children?: ReactNode | undefined;
  };

type PrimitiveRef<E extends PrimitiveNode> = ComponentRef<
  (typeof RadixPrimitive)[E]
>;

/**
 * Composes the children of a `render` element. Outer children win when supplied;
 * the render element's own children are the fallback.
 */
function composeRenderElement(
  render: ReactElement,
  children: ReactNode,
): ReactElement {
  return cloneElement(
    render,
    undefined,
    children !== undefined
      ? children
      : (render.props as { children?: ReactNode }).children,
  );
}

/**
 * Composes a `render` element at a call site that has already computed its props.
 *
 * `withRenderProp` wraps a component; this covers the case where the props are
 * already in hand and the composition happens inline.
 */
function renderSlot(
  render: ReactElement,
  children: ReactNode,
  props: ComponentProps<typeof Slot.Root>,
): ReactElement {
  return (
    <Slot.Root {...props}>{composeRenderElement(render, children)}</Slot.Root>
  );
}

function withRenderProp<T extends ElementType>(Component: T) {
  const Wrapped = forwardRef<ComponentRef<T>, WithRenderPropRuntimeProps<T>>(
    (
      {
        render,
        asChild,
        children,
        ...rest
      }: PropsWithoutRef<WithRenderPropRuntimeProps<T>>,
      ref,
    ) => {
      const Comp = Component as any;

      if (render && isValidElement(render)) {
        return (
          <Comp {...(rest as any)} asChild ref={ref}>
            {composeRenderElement(render, children)}
          </Comp>
        );
      }

      return (
        <Comp {...(rest as any)} asChild={asChild} ref={ref}>
          {children}
        </Comp>
      );
    },
  );

  const componentName =
    typeof Component === "string"
      ? Component
      : (Component.displayName ?? Component.name ?? "Component");
  Wrapped.displayName = componentName;

  return Wrapped as ForwardRefExoticComponent<
    WithRenderPropProps<T> & RefAttributes<ComponentRef<T>>
  >;
}

function createPrimitive<E extends PrimitiveNode>(node: E) {
  const RadixComp = RadixPrimitive[node];
  const Component = withRenderProp(RadixComp);

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

export { Primitive, renderSlot, withRenderProp };
export type { PrimitiveProps, WithRenderPropProps };
