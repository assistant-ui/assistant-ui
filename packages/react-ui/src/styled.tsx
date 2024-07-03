import { Slot } from "@radix-ui/react-slot";
import {
  ComponentPropsWithoutRef,
  ElementRef,
  ElementType,
  forwardRef,
} from "react";

export const styled = <TComponent extends ElementType>(
  Component: TComponent,
  defaultProps: Partial<ComponentPropsWithoutRef<TComponent>>,
) => {
  const Wrapped = forwardRef<
    ElementRef<TComponent>,
    Omit<ComponentPropsWithoutRef<TComponent>, "asChild">
  >((props, ref) => {
    const ComponentAsAny = Component as any;
    return (
      <Slot {...defaultProps}>
        <ComponentAsAny {...props} ref={ref} />
      </Slot>
    );
  });
  Wrapped.displayName =
    "styled(" +
    (typeof Component === "string" ? Component : Component.displayName) +
    ")";
  return Wrapped;
};
