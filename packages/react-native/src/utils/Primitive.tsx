import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  version,
  type ComponentRef,
  type ForwardRefExoticComponent,
  type ReactElement,
  type ReactNode,
  type Ref,
  type RefAttributes,
  type RefCallback,
} from "react";
import {
  Pressable,
  type PressableProps,
  type PressableStateCallbackType,
} from "react-native";

export type PrimitivePressableProps = PressableProps & {
  /**
   * Renders the single child element in place of the `Pressable` and merges
   * the primitive's props into it: the child's handlers run before the
   * primitive's, the child's other props win, styles are combined, and refs
   * are composed.
   */
  asChild?: boolean | undefined;
};

type AnyProps = Record<string, unknown>;
type Handler = (...args: unknown[]) => unknown;
type PressableStyle = PressableProps["style"];

const resolveStyle = (
  style: PressableStyle,
  state: PressableStateCallbackType,
) => (typeof style === "function" ? style(state) : style);

function composeStyles(
  slotStyle: PressableStyle,
  childStyle: PressableStyle,
): PressableStyle {
  if (!slotStyle) return childStyle;
  if (!childStyle) return slotStyle;
  if (typeof slotStyle === "function" || typeof childStyle === "function") {
    return (state) => [
      resolveStyle(slotStyle, state),
      resolveStyle(childStyle, state),
    ];
  }
  return [slotStyle, childStyle];
}

function mergeProps(slotProps: AnyProps, childProps: AnyProps): AnyProps {
  const overrideProps: AnyProps = { ...childProps };
  for (const propName of Object.keys(childProps)) {
    const slotValue = slotProps[propName];
    const childValue = childProps[propName];
    if (/^on[A-Z]/.test(propName)) {
      if (slotValue && childValue) {
        overrideProps[propName] = (...args: unknown[]) => {
          const result = (childValue as Handler)(...args);
          (slotValue as Handler)(...args);
          return result;
        };
      } else if (slotValue) {
        overrideProps[propName] = slotValue;
      }
    } else if (propName === "style") {
      overrideProps[propName] = composeStyles(
        slotValue as PressableStyle,
        childValue as PressableStyle,
      );
    } else if (propName === "className") {
      overrideProps[propName] = [slotValue, childValue]
        .filter(Boolean)
        .join(" ");
    }
  }
  return { ...slotProps, ...overrideProps };
}

// React 19 moved an element's ref onto its props; reading the other location
// logs a warning on each major.
const refIsProp = Number.parseInt(version, 10) >= 19;

const getElementRef = (element: ReactElement): Ref<unknown> | undefined =>
  refIsProp
    ? (element.props as { ref?: Ref<unknown> }).ref
    : (element as unknown as { ref?: Ref<unknown> }).ref;

function setRef(ref: Ref<unknown> | undefined, value: unknown) {
  if (typeof ref === "function") return ref(value);
  if (ref) (ref as { current: unknown }).current = value;
  return undefined;
}

function composeRefs(
  ...refs: (Ref<unknown> | undefined)[]
): RefCallback<unknown> {
  return (node) => {
    const cleanups = refs.map((ref) => setRef(ref, node));
    if (!cleanups.some((cleanup) => typeof cleanup === "function")) return;
    return () => {
      cleanups.forEach((cleanup, i) => {
        if (typeof cleanup === "function") cleanup();
        else setRef(refs[i], null);
      });
    };
  };
}

const Slot = forwardRef<unknown, AnyProps & { children?: ReactNode }>(
  ({ children, ...slotProps }, forwardedRef) => {
    if (!isValidElement<AnyProps>(children)) {
      return Children.count(children) > 1 ? Children.only(null) : null;
    }
    const props = mergeProps(slotProps, children.props);
    if (forwardedRef) {
      props["ref"] = composeRefs(forwardedRef, getElementRef(children));
    }
    return cloneElement(children, props);
  },
);

Slot.displayName = "Slot";

const PrimitivePressable = forwardRef<
  ComponentRef<typeof Pressable>,
  PrimitivePressableProps
>(({ asChild, ...props }, ref) =>
  asChild ? <Slot {...props} ref={ref} /> : <Pressable {...props} ref={ref} />,
);

PrimitivePressable.displayName = "Primitive.Pressable";

export const Primitive: {
  Pressable: ForwardRefExoticComponent<
    PrimitivePressableProps & RefAttributes<ComponentRef<typeof Pressable>>
  >;
} = { Pressable: PrimitivePressable };
