"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
  type CSSProperties,
} from "react";
import { cn } from "@/lib/utils";

const DEFAULT_DURATION = 500;
const DIGIT_CELLS = Array.from({ length: 10 }, (_, i) => i);

if (typeof CSS !== "undefined" && typeof CSS.registerProperty === "function") {
  try {
    CSS.registerProperty({
      name: "--aui-number-roll-pos",
      syntax: "<number>",
      inherits: true,
      initialValue: "0",
    });
  } catch {
    /* Already registered by another copy of this component. */
  }
}

let supportsRoll: boolean | undefined;
const canAnimate = () =>
  (supportsRoll ??=
    typeof CSS !== "undefined" &&
    typeof CSS.registerProperty === "function" &&
    CSS.supports(
      "transform",
      "translateY(clamp(-1lh, calc((mod(7.5, 10) - 5) * 1lh), 1lh))",
    ));

type DigitPart = { type: "digit"; key: string; digit: number };
type SymbolPart = { type: "symbol"; key: string; value: string };
type Part = DigitPart | SymbolPart;
type RenderedPart = Part & { exiting?: boolean };

const toParts = (
  value: number,
  formatter: Intl.NumberFormat,
  prefix: string | undefined,
  suffix: string | undefined,
): Part[] => {
  type Atom =
    | { kind: "integer"; digit: number }
    | { kind: "group"; value: string }
    | { kind: "fraction"; digit: number }
    | { kind: "symbol"; type: string; value: string };

  const atoms: Atom[] = [];
  if (prefix) atoms.push({ kind: "symbol", type: "prefix", value: prefix });
  for (const part of formatter.formatToParts(value)) {
    if (part.type === "integer" || part.type === "fraction") {
      for (const char of part.value) {
        const digit = char.charCodeAt(0) - 48;
        if (digit >= 0 && digit <= 9) {
          atoms.push({ kind: part.type, digit });
        } else {
          atoms.push({ kind: "symbol", type: part.type, value: char });
        }
      }
    } else if (part.type === "group") {
      atoms.push({ kind: "group", value: part.value });
    } else {
      const type =
        part.type === "minusSign" || part.type === "plusSign"
          ? "sign"
          : part.type;
      atoms.push({ kind: "symbol", type, value: part.value });
    }
  }
  if (suffix) atoms.push({ kind: "symbol", type: "suffix", value: suffix });

  const counts = new Map<string, number>();
  const nextKey = (type: string) => {
    const count = counts.get(type) ?? 0;
    counts.set(type, count + 1);
    return `${type}:${count}`;
  };

  /* Integer digits and group separators are keyed right to left so the ones digit is always int:0. When the digit count changes (999 -> 1,000), the surviving places keep their identity and only the new leading parts enter, instead of every column being re-assigned a new meaning. */
  const parts: Part[] = new Array(atoms.length);
  for (let i = atoms.length - 1; i >= 0; i--) {
    const atom = atoms[i]!;
    if (atom.kind === "integer") {
      parts[i] = { type: "digit", key: nextKey("int"), digit: atom.digit };
    } else if (atom.kind === "group") {
      parts[i] = { type: "symbol", key: nextKey("group"), value: atom.value };
    }
  }
  for (let i = 0; i < atoms.length; i++) {
    const atom = atoms[i]!;
    if (atom.kind === "fraction") {
      parts[i] = { type: "digit", key: nextKey("fraction"), digit: atom.digit };
    } else if (atom.kind === "symbol") {
      parts[i] = {
        type: "symbol",
        key: `${nextKey(atom.type)}:${atom.value}`,
        value: atom.value,
      };
    }
  }
  return parts;
};

const merge = (prev: RenderedPart[], next: Part[]): RenderedPart[] => {
  const nextKeys = new Set(next.map((part) => part.key));
  const prevKeys = new Set(prev.map((part) => part.key));
  const out: RenderedPart[] = [];
  let i = 0;
  const emitExited = (until: string | undefined) => {
    while (i < prev.length && prev[i]!.key !== until) {
      const old = prev[i++]!;
      if (!nextKeys.has(old.key)) {
        out.push(old.exiting ? old : { ...old, exiting: true });
      }
    }
  };
  for (const part of next) {
    if (prevKeys.has(part.key)) {
      emitExited(part.key);
      i++;
    }
    out.push(part);
  }
  emitExited(undefined);
  return out;
};

const rollDelta = (from: number, to: number, dir: number) => {
  const up = (((to - from) % 10) + 10) % 10;
  if (dir > 0) return up;
  if (dir < 0) return up - 10;
  return up > 5 ? up - 10 : up;
};

function NumberRollDigit({ digit, dir }: { digit: number; dir: number }) {
  const [state, setState] = useState({ digit, roll: digit });
  if (state.digit !== digit) {
    setState({ digit, roll: state.roll + rollDelta(state.digit, digit, dir) });
  }

  return (
    <span
      data-slot="number-roll-digit"
      className="relative inline-block overflow-clip [transition-property:--aui-number-roll-pos] duration-(--aui-number-roll-duration) ease-(--aui-number-roll-ease) motion-reduce:transition-none"
      style={{ "--aui-number-roll-pos": state.roll } as CSSProperties}
    >
      {/* Digit glyphs render through ::before so find-in-page and copy never see the strip. overflow-clip (not hidden) keeps the inline-block's baseline on the text instead of the box bottom edge. */}
      <span
        data-d={digit}
        className="invisible before:content-[attr(data-d)]"
      />
      {DIGIT_CELLS.map((cell) => (
        <span
          key={cell}
          data-d={cell}
          className="absolute inset-0 text-center before:content-[attr(data-d)]"
          style={{
            transform: `translateY(clamp(-1lh, calc((mod(mod(${cell} - var(--aui-number-roll-pos), 10) + 5, 10) - 5) * 1lh), 1lh))`,
          }}
        />
      ))}
    </span>
  );
}

function NumberRollPart({ part, dir }: { part: RenderedPart; dir: number }) {
  return (
    <span
      data-slot="number-roll-part"
      className={cn(
        "inline-grid grid-cols-[1fr] transition-[grid-template-columns,opacity,translate] duration-(--aui-number-roll-fade) ease-out motion-reduce:transition-none",
        "starting:translate-y-(--aui-number-roll-shift) starting:grid-cols-[0fr] starting:opacity-0",
        part.exiting &&
          "pointer-events-none translate-y-[calc(var(--aui-number-roll-shift)*-1)] grid-cols-[0fr] opacity-0",
      )}
      style={
        {
          "--aui-number-roll-shift":
            dir === 0 ? "0%" : dir > 0 ? "35%" : "-35%",
        } as CSSProperties
      }
    >
      <span className="min-w-0 overflow-hidden">
        {part.type === "digit" ? (
          <NumberRollDigit digit={part.digit} dir={dir} />
        ) : (
          <span data-slot="number-roll-symbol" className="whitespace-pre">
            {part.value}
          </span>
        )}
      </span>
    </span>
  );
}

export type NumberRollProps = Omit<
  ComponentProps<"span">,
  "children" | "prefix"
> & {
  value: number;
  format?: Intl.NumberFormatOptions;
  locales?: Intl.LocalesArgument;
  prefix?: string;
  suffix?: string;
  trend?: "auto" | "up" | "down";
  duration?: number;
};

/**
 * Animated number that rolls digits odometer-style when the value changes. Formatting is driven by `Intl.NumberFormat`, so compact notation ("1.1K"), currencies, percentages, and locale-specific output animate gracefully: digits spin in place while entering and exiting characters slide and fade. Renders the plain formatted value on the server and in browsers without CSS `mod()` support; when server rendering, pass an explicit `locales` so the server and client format identically.
 *
 * ```tsx
 * <NumberRoll value={count} format={{ notation: "compact" }} />
 * ```
 */
function NumberRoll({
  value,
  format,
  locales,
  prefix,
  suffix,
  trend = "auto",
  duration = DEFAULT_DURATION,
  className,
  style,
  ...props
}: NumberRollProps) {
  const [enhanced, setEnhanced] = useState(false);
  useEffect(() => {
    if (canAnimate()) setEnhanced(true);
  }, []);

  const formatter = useMemo(
    () => new Intl.NumberFormat(locales, format),
    [locales, format],
  );
  const parts = useMemo(
    () => toParts(value, formatter, prefix, suffix),
    [value, formatter, prefix, suffix],
  );
  const signature = useMemo(
    () =>
      parts
        .map((part) =>
          part.type === "digit" ? `${part.key}=${part.digit}` : part.key,
        )
        .join("|"),
    [parts],
  );

  const [display, setDisplay] = useState<{
    value: number;
    signature: string;
    rendered: RenderedPart[];
    dir: number;
  }>(() => ({ value, signature, rendered: parts, dir: 0 }));

  if (display.signature !== signature) {
    setDisplay({
      value,
      signature,
      rendered: merge(display.rendered, parts),
      dir:
        trend === "up"
          ? 1
          : trend === "down"
            ? -1
            : Math.sign(value - display.value),
    });
  }

  const exitingKeys = display.rendered
    .filter((part) => part.exiting)
    .map((part) => part.key)
    .join("|");
  useEffect(() => {
    if (!exitingKeys) return;
    const timeout = setTimeout(() => {
      setDisplay((current) => ({
        ...current,
        rendered: current.rendered.filter((part) => !part.exiting),
      }));
    }, duration);
    return () => clearTimeout(timeout);
  }, [exitingKeys, duration]);

  const formatted = `${prefix ?? ""}${formatter.format(value)}${suffix ?? ""}`;

  return (
    <span
      data-slot="number-roll"
      className={cn("inline-block whitespace-nowrap tabular-nums", className)}
      style={
        {
          "--aui-number-roll-duration": `${duration}ms`,
          "--aui-number-roll-fade":
            "calc(var(--aui-number-roll-duration) * 0.6)",
          "--aui-number-roll-ease": "cubic-bezier(0.23, 1, 0.32, 1)",
          ...style,
        } as CSSProperties
      }
      {...props}
    >
      <span className="sr-only">{formatted}</span>
      {enhanced ? (
        <span aria-hidden className="inline-block select-none">
          {display.rendered.map((part) => (
            <NumberRollPart key={part.key} part={part} dir={display.dir} />
          ))}
        </span>
      ) : (
        <span aria-hidden>{formatted}</span>
      )}
    </span>
  );
}

export { NumberRoll };
