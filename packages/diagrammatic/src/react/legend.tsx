import { type ComponentPropsWithoutRef, forwardRef } from "react";
import { cat } from "../core/theme";

export type LegendProps = Omit<ComponentPropsWithoutRef<"ul">, "children"> & {
  names: readonly string[];
  /** One color per name. Defaults to the categorical palette in order, which is what every multi-series form draws. */
  colors?: readonly string[];
};

/**
 * A legend on the page's own type: a flat list of swatch and name pairs that
 * inherits the host's font and color and wraps like text. Pair it with
 * `legend={false}` on the figure. Colors resolve through the same tokens as
 * the marks, so a bridged palette matches without configuration;
 * `getSeriesColor` from the interactive entry reads a rendered mark when the
 * host would rather ask the figure.
 */
export const Legend = forwardRef<HTMLUListElement, LegendProps>(
  ({ names, colors, style, ...rest }, ref) => (
    <ul
      ref={ref}
      data-dg-legend=""
      {...rest}
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0.25em 1em",
        margin: 0,
        padding: 0,
        listStyle: "none",
        ...style,
      }}
    >
      {names.map((name, i) => (
        <li
          key={`${name}-${i}`}
          data-series={name}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.45em",
          }}
        >
          <span
            aria-hidden
            style={{
              width: "0.65em",
              height: "0.65em",
              borderRadius: "50%",
              background: colors?.[i] ?? cat(i),
              flex: "none",
            }}
          />
          {name}
        </li>
      ))}
    </ul>
  ),
);

Legend.displayName = "Legend";
