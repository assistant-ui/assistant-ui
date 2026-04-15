import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  type ElementType,
  type ForwardRefExoticComponent,
  type ReactElement,
  type ReactNode,
  type RefAttributes,
  cloneElement,
  forwardRef,
  isValidElement,
} from "react";

type WithRenderPropProps<T extends ElementType> =
  ComponentPropsWithoutRef<T> & {
    render?: ReactElement | undefined;
  };

function withRenderProp<T extends ElementType>(Component: T) {
  const Wrapped = forwardRef<ComponentRef<T>, WithRenderPropProps<T>>(
    ({ render, ...props }, ref) => {
      const { asChild, children, ...rest } =
        props as ComponentPropsWithoutRef<T> & {
          asChild?: boolean | undefined;
          children?: ReactNode | undefined;
        };

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

  return Wrapped as ForwardRefExoticComponent<
    WithRenderPropProps<T> & RefAttributes<ComponentRef<T>>
  >;
}

export { withRenderProp };
export type { WithRenderPropProps };
