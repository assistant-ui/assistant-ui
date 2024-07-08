import {
  ComponentPropsWithoutRef,
  ElementRef,
  ElementType,
  forwardRef,
} from "react";

export const classNames = (
  ...classNames: (string | boolean | null | undefined)[]
) => classNames.filter(Boolean).join(" ");

export const withDefaultProps =
  <TProps extends { className?: string }>({
    className,
    ...defaultProps
  }: Partial<TProps>) =>
  ({ className: classNameProp, ...props }: TProps) => {
    return {
      className: classNames(className, classNameProp),
      ...defaultProps,
      ...props,
    } as TProps;
  };

export const withDefaults = <TComponent extends ElementType>(
  Component: TComponent,
  defaultProps: Partial<Omit<ComponentPropsWithoutRef<TComponent>, "asChild">>,
) => {
  type TComponentProps = typeof defaultProps;
  const getProps = withDefaultProps<TComponentProps>(defaultProps);
  const WithDefaults = forwardRef<ElementRef<TComponent>, TComponentProps>(
    (props, ref) => {
      const ComponentAsAny = Component as any;
      return <ComponentAsAny {...getProps(props)} ref={ref} />;
    },
  );
  WithDefaults.displayName =
    "withDefaults(" +
    (typeof Component === "string" ? Component : Component.displayName) +
    ")";
  return WithDefaults;
};
