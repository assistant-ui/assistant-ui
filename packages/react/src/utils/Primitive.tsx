import {
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
import { Primitive as RadixPrimitive } from "@radix-ui/react-primitive";
import { Slot } from "radix-ui";

/**
 * Thin wrapper around `@radix-ui/react-primitive` that adds `render` prop support.
 *
 * When `render` is provided, it is converted to the equivalent `asChild` pattern:
 *   render={<Comp props />} + children  →  asChild + <Comp props>{children}</Comp>
 *
 * All prop merging, ref composition, and event handler chaining remain handled
 * by Radix's battle-tested Slot implementation — we add zero custom logic for that.
 */

// Radix's element set plus extra intrinsics (e.g. "video") that fall back to a
// local asChild-aware wrapper when @radix-ui/react-primitive has no entry.
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
  "video",
] as const;
type PrimitiveNode = (typeof NODES)[number];

type WithRenderPropProps<T extends ElementType> =
  ComponentPropsWithoutRef<T> & {
    asChild?: boolean | undefined;
    render?: ReactElement | undefined;
  };

type PrimitiveProps<E extends PrimitiveNode> = WithRenderPropProps<E>;

type WithRenderPropRuntimeProps<T extends ElementType> =
  WithRenderPropProps<T> & {
    asChild?: boolean | undefined;
    children?: ReactNode | undefined;
  };

type PrimitiveRef<E extends PrimitiveNode> = ComponentRef<E>;

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
        const renderChildren =
          children !== undefined
            ? children
            : ((render.props as Record<string, unknown>).children as ReactNode);

        return (
          <Comp {...(rest as any)} asChild ref={ref}>
            {cloneElement(render, undefined, renderChildren)}
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
  const RadixComp =
    (RadixPrimitive as Record<string, ElementType | undefined>)[node] ??
    forwardRef<ComponentRef<E>, WithRenderPropRuntimeProps<E>>(
      ({ asChild, children, ...rest }, ref) => {
        const Comp = (asChild ? Slot.Root : node) as ElementType;
        return (
          <Comp {...(rest as any)} ref={ref}>
            {children}
          </Comp>
        );
      },
    );
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

export { Primitive, withRenderProp };
export type { PrimitiveProps, WithRenderPropProps };
