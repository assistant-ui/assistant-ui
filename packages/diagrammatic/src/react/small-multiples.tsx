import {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ReactNode,
  forwardRef,
} from "react";

export type SmallMultiplesProps = ComponentPropsWithoutRef<"div"> & {
  columns?: number;
  gap?: string;
  title?: string;
  children: ReactNode;
};

export const SmallMultiples = forwardRef<HTMLDivElement, SmallMultiplesProps>(
  ({ columns = 2, gap = "0.7rem", title, children, style, ...rest }, ref) => {
    const layout: CSSProperties = {
      display: "grid",
      gridTemplateColumns: `repeat(${Math.max(1, columns)}, minmax(0, 1fr))`,
      gap,
      ...style,
    };
    return (
      <div
        ref={ref}
        role={title ? "group" : undefined}
        aria-label={title}
        data-dg-multiples=""
        style={layout}
        {...rest}
      >
        {children}
      </div>
    );
  },
);

SmallMultiples.displayName = "SmallMultiples";
