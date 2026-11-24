"use client";

import * as React from "react";
import {
  Copy01Icon,
  DropperIcon,
  Tick02Icon,
  UnfoldMoreIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { cn } from "@/lib/utils";
import {
  Menu,
  MenuChoice,
  MenuPopup,
  MenuRadioGroup,
  MenuTrigger,
} from "@/components/base/base-thread-shell";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/*
 * Our own primitive (shadcn has no color picker). An Okhsv wheel: hue and
 * saturation on the disc, brightness on the arc below it, opacity on a second
 * arc outside that, theme swatches, a hex/rgb/hsl/oklch field, copy and an
 * eyedropper, in a glass Popover. Okhsv keeps perceived chroma constant around
 * the disc, so there's no muddy yellow or glaring cyan.
 */

type Hsv = { h: number; s: number; v: number };

const DISC_RADIUS = 84;
const THUMB_INSET = 9;
const WHEEL_W = 180;
const WHEEL_CX = WHEEL_W / 2;
const WHEEL_CY = DISC_RADIUS;
const BAND_STROKE = 14;
const BAND_R = DISC_RADIUS + 6 + BAND_STROKE / 2;
const BAND_HALF_SPAN = (42 * Math.PI) / 180;
const BAND_ANG_LEFT = Math.PI / 2 + BAND_HALF_SPAN;
const BAND_ANG_RIGHT = Math.PI / 2 - BAND_HALF_SPAN;
const WHEEL_H = WHEEL_CY + BAND_R + THUMB_INSET + 2;

const ALPHA_STROKE = 10;
/** Far enough out that the opacity arc's hit area starts exactly where the
 * brightness arc's ends, so neither band steals the other's outer edge. */
const ALPHA_R = BAND_R + (BAND_STROKE + 10) / 2 + (ALPHA_STROKE + 6) / 2;
const WHEEL_H_ALPHA = WHEEL_CY + ALPHA_R + THUMB_INSET + 2;
/** Two 2.5px squares across the 10px band — fine enough to read as "nothing
 * here" without moiring against the arc's curve. */
const CHECKER_CELL = 5;
/**
 * The transparency check, as one inked square per 2×2 tile over whatever sits
 * behind it. Inking one square rather than painting both means the same
 * pattern reads correctly on the page and on the popover, in either theme; the
 * ink itself comes from `currentColor`, so a text utility sets it.
 */
const CHECKER_IMAGE =
  "repeating-conic-gradient(currentColor 0% 25%, transparent 0% 50%)";

/** Wide enough for the value field's select, copy and eyedropper to sit
 * on one line beneath the wheel. */
const POPOVER_WIDTH = WHEEL_W + 60;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/**
 * Accepts `fff`, `#fff`, `ffff`, `ffffff` or `#ffffffcc`; returns `#rrggbb`,
 * or `#rrggbbaa` when the value carries real transparency. A fully opaque `ff`
 * pair is dropped, so an opaque color has exactly one spelling.
 */
function normalizeHex(input: string): string | null {
  let raw = input.trim().replace(/^#/, "").toLowerCase();
  if (/^[0-9a-f]{3,4}$/.test(raw)) {
    raw = raw
      .split("")
      .map((digit) => digit + digit)
      .join("");
  }
  if (/^[0-9a-f]{6}$/.test(raw)) return `#${raw}`;
  if (/^[0-9a-f]{8}$/.test(raw)) {
    return raw.endsWith("ff") ? `#${raw.slice(0, 6)}` : `#${raw}`;
  }
  return null;
}

/** Splits `#rrggbbaa` into its opaque base and a 0–1 alpha. */
function splitAlpha(hex: string): { base: string; alpha: number } {
  if (hex.length === 9) {
    return { base: hex.slice(0, 7), alpha: parseInt(hex.slice(7), 16) / 255 };
  }
  return { base: hex, alpha: 1 };
}

/** Re-attaches alpha to a `#rrggbb`, dropping the pair at full opacity. */
function withAlpha(base: string, alpha: number): string {
  const a = clamp(alpha, 0, 1);
  if (a >= 1) return base;
  return `${base}${Math.round(a * 255)
    .toString(16)
    .padStart(2, "0")}`;
}

/* ------------------------------------------------------------ okhsv ↔ hex */

/* Björn Ottosson's Okhsv model: unlike plain HSV, a constant saturation on
 * the disc keeps a constant *perceived* chroma, so the wheel has no muddy
 * band around yellow and no over-bright cyan. */

const K1 = 0.206;
const K2 = 0.03;
const K3 = (1 + K1) / (1 + K2);

const toe = (x: number) =>
  0.5 * (K3 * x - K1 + Math.sqrt((K3 * x - K1) ** 2 + 4 * K2 * K3 * x));

const toeInv = (x: number) => (x * x + K1 * x) / (K3 * (x + K2));

const srgbTransfer = (x: number) =>
  x >= 0.0031308 ? 1.055 * Math.pow(x, 1 / 2.4) - 0.055 : 12.92 * x;

const srgbTransferInv = (x: number) =>
  x >= 0.04045 ? Math.pow((x + 0.055) / 1.055, 2.4) : x / 12.92;

function oklabToLinearSrgb(
  L: number,
  a: number,
  b: number,
): [number, number, number] {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

function linearSrgbToOklab(
  r: number,
  g: number,
  b: number,
): [number, number, number] {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function computeMaxSaturation(a: number, b: number): number {
  let k0: number, k1: number, k2: number, k3: number, k4: number;
  let wl: number, wm: number, ws: number;
  if (-1.88170328 * a - 0.80936493 * b > 1) {
    k0 = 1.19086277;
    k1 = 1.76576728;
    k2 = 0.59662641;
    k3 = 0.75515197;
    k4 = 0.56771245;
    wl = 4.0767416621;
    wm = -3.3077115913;
    ws = 0.2309699292;
  } else if (1.81444104 * a - 1.19445276 * b > 1) {
    k0 = 0.73956515;
    k1 = -0.45954404;
    k2 = 0.08285427;
    k3 = 0.1254107;
    k4 = 0.14503204;
    wl = -1.2684380046;
    wm = 2.6097574011;
    ws = -0.3413193965;
  } else {
    k0 = 1.35733652;
    k1 = -0.00915799;
    k2 = -1.1513021;
    k3 = -0.50559606;
    k4 = 0.00692167;
    wl = -0.0041960863;
    wm = -0.7034186147;
    ws = 1.707614701;
  }
  let S = k0 + k1 * a + k2 * b + k3 * a * a + k4 * a * b;
  const kl = 0.3963377774 * a + 0.2158037573 * b;
  const km = -0.1055613458 * a - 0.0638541728 * b;
  const ks = -0.0894841775 * a - 1.291485548 * b;
  const l_ = 1 + S * kl;
  const m_ = 1 + S * km;
  const s_ = 1 + S * ks;
  const f = wl * l_ ** 3 + wm * m_ ** 3 + ws * s_ ** 3;
  const f1 = 3 * (wl * kl * l_ ** 2 + wm * km * m_ ** 2 + ws * ks * s_ ** 2);
  const f2 = 6 * (wl * kl * kl * l_ + wm * km * km * m_ + ws * ks * ks * s_);
  S -= (f * f1) / (f1 * f1 - 0.5 * f * f2);
  return S;
}

function findCusp(a: number, b: number): [number, number] {
  const sCusp = computeMaxSaturation(a, b);
  const [r, g, bb] = oklabToLinearSrgb(1, sCusp * a, sCusp * b);
  const lCusp = Math.cbrt(1 / Math.max(r, g, bb));
  return [lCusp, lCusp * sCusp];
}

/* The disc is ~28k pixels and every one of them needs a cusp; binning the
 * hue circle turns that into 1024 solves, computed lazily. */
const CUSP_BINS = 1024;
const cuspCache = new Float64Array(CUSP_BINS * 2);
const cuspSeen = new Uint8Array(CUSP_BINS);

function cuspForHue(h: number): [number, number] {
  const bin = Math.min(
    CUSP_BINS - 1,
    Math.floor((((h % 1) + 1) % 1) * CUSP_BINS),
  );
  if (!cuspSeen[bin]) {
    const angle = (2 * Math.PI * (bin + 0.5)) / CUSP_BINS;
    const [lCusp, cCusp] = findCusp(Math.cos(angle), Math.sin(angle));
    cuspCache[bin * 2] = lCusp;
    cuspCache[bin * 2 + 1] = cCusp;
    cuspSeen[bin] = 1;
  }
  return [cuspCache[bin * 2]!, cuspCache[bin * 2 + 1]!];
}

const S0 = 0.5;

function okhsvToLinearSrgb(
  h: number,
  s: number,
  v: number,
  cusp?: [number, number],
): [number, number, number] {
  if (v <= 0) return [0, 0, 0];
  const a_ = Math.cos(2 * Math.PI * h);
  const b_ = Math.sin(2 * Math.PI * h);
  const [cuspL, cuspC] = cusp ?? findCusp(a_, b_);
  const sMax = cuspC / cuspL;
  const tMax = cuspC / (1 - cuspL);
  const k = 1 - S0 / sMax;
  const denom = S0 + tMax - tMax * k * s;
  const lV = 1 - (s * S0) / denom;
  const cV = (s * tMax * S0) / denom;
  let L = v * lV;
  let C = v * cV;
  const lVt = toeInv(lV);
  const cVt = (cV * lVt) / lV;
  const lNew = toeInv(L);
  C = (C * lNew) / L;
  L = lNew;
  const [rs, gs, bs] = oklabToLinearSrgb(lVt, a_ * cVt, b_ * cVt);
  const scaleL = Math.cbrt(1 / Math.max(rs, gs, bs, 0));
  L *= scaleL;
  C *= scaleL;
  return oklabToLinearSrgb(L, C * a_, C * b_);
}

function hsvToHex({ h, s, v }: Hsv): string {
  const rgb = okhsvToLinearSrgb(h / 360, s / 100, v / 100);
  const channel = (x: number) =>
    Math.round(clamp(srgbTransfer(x), 0, 1) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(rgb[0])}${channel(rgb[1])}${channel(rgb[2])}`;
}

function hexToHsv(hex: string): Hsv {
  // Alpha is carried alongside the wheel, never on it, so an `aa` pair is
  // sliced off rather than shifting every channel eight bits.
  const value = parseInt(hex.slice(1, 7), 16);
  const r = srgbTransferInv(((value >> 16) & 255) / 255);
  const g = srgbTransferInv(((value >> 8) & 255) / 255);
  const b = srgbTransferInv((value & 255) / 255);
  const [L, labA, labB] = linearSrgbToOklab(r, g, b);
  if (L <= 1e-6) return { h: 0, s: 0, v: 0 };
  const C = Math.hypot(labA, labB);
  if (C < 1e-6) return { h: 0, s: 0, v: clamp(toe(L), 0, 1) * 100 };
  const a_ = labA / C;
  const b_ = labB / C;
  const h = (Math.atan2(labB, labA) / (2 * Math.PI) + 1) % 1;
  const [cuspL, cuspC] = findCusp(a_, b_);
  const sMax = cuspC / cuspL;
  const tMax = cuspC / (1 - cuspL);
  const k = 1 - S0 / sMax;
  const t = tMax / (C + L * tMax);
  const lV = t * L;
  const cV = t * C;
  const lVt = toeInv(lV);
  const cVt = (cV * lVt) / lV;
  const [rs, gs, bs] = oklabToLinearSrgb(lVt, a_ * cVt, b_ * cVt);
  const scaleL = Math.cbrt(1 / Math.max(rs, gs, bs, 0));
  const toeL = toe(L / scaleL);
  const v = toeL / lV;
  const s = ((S0 + tMax) * cV) / (tMax * S0 + tMax * k * cV);
  return {
    h: h * 360,
    s: clamp(s, 0, 1) * 100,
    v: clamp(v, 0, 1) * 100,
  };
}

/* ------------------------------------------------------------- notations */

type ColorFormat = "hex" | "rgb" | "hsl" | "oklch";

const COLOR_FORMATS: readonly { value: ColorFormat; label: string }[] = [
  { value: "hex", label: "HEX" },
  { value: "rgb", label: "RGB" },
  { value: "hsl", label: "HSL" },
  { value: "oklch", label: "OKLCH" },
];

const round = (x: number, places = 0) => {
  const factor = 10 ** places;
  return Math.round(x * factor) / factor;
};

function hexToRgb(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1, 7), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const channel = (x: number) =>
    Math.round(clamp(x, 0, 255))
      .toString(16)
      .padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l * 100];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return [(((h * 60) % 360) + 360) % 360, s * 100, l * 100];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hn = (((h % 360) + 360) % 360) / 60;
  const sn = clamp(s, 0, 100) / 100;
  const ln = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs((hn % 2) - 1));
  const m = ln - c / 2;
  const [r, g, b] =
    hn < 1
      ? [c, x, 0]
      : hn < 2
        ? [x, c, 0]
        : hn < 3
          ? [0, c, x]
          : hn < 4
            ? [0, x, c]
            : hn < 5
              ? [x, 0, c]
              : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

function hexToOklch(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex);
  const [L, a, bb] = linearSrgbToOklab(
    srgbTransferInv(r / 255),
    srgbTransferInv(g / 255),
    srgbTransferInv(b / 255),
  );
  const c = Math.hypot(a, bb);
  const h = c < 1e-6 ? 0 : ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360;
  return [L, c, h];
}

function oklchToHex(L: number, c: number, h: number): string {
  const rad = (h * Math.PI) / 180;
  const rgb = oklabToLinearSrgb(L, c * Math.cos(rad), c * Math.sin(rad));
  return rgbToHex(
    clamp(srgbTransfer(rgb[0]), 0, 1) * 255,
    clamp(srgbTransfer(rgb[1]), 0, 1) * 255,
    clamp(srgbTransfer(rgb[2]), 0, 1) * 255,
  );
}

/**
 * The channel values only — the notation is already named by the select
 * beside the field, so `rgb(…)` wrapping would only eat room. Alpha rides
 * along in the CSS slash form, and is omitted entirely at full opacity so an
 * opaque color reads exactly as it always has.
 */
function formatColor(hex: string, format: ColorFormat): string {
  const { base, alpha } = splitAlpha(hex);
  const suffix = alpha < 1 ? ` / ${round(alpha, 2)}` : "";
  if (format === "hex") return hex;
  if (format === "rgb") return `${hexToRgb(base).join(" ")}${suffix}`;
  if (format === "hsl") {
    const [h, s, l] = rgbToHsl(...hexToRgb(base));
    return `${round(h)} ${round(s)}% ${round(l)}%${suffix}`;
  }
  // Two decimals keeps `0.72 0.19 150` inside the field; the exact color is
  // carried by the hex value, not by what the field shows.
  const [L, c, h] = hexToOklch(base);
  return `${round(L, 2)} ${round(c, 2)} ${round(h)}${suffix}`;
}

/**
 * Reads back anything the field might hold: bare channels in the current
 * notation, or a full `rgb(…)` / `hsl(…)` / `oklch(…)` string pasted in from
 * somewhere else, with or without a trailing alpha. Returns `#rrggbb` — or
 * `#rrggbbaa` when it read transparency — and null when it does not parse.
 */
function parseColor(input: string, format: ColorFormat): string | null {
  const text = input.trim().toLowerCase();
  const hex = normalizeHex(text);
  if (hex) return hex;

  const match = /^([a-z]*)\s*\(?\s*([^)]*?)\s*\)?$/.exec(text);
  if (!match) return null;
  const kind = match[1] || format;
  const tokens = match[2]!.split(/[\s,/]+/).filter(Boolean);
  const parts = tokens.map((part) => parseFloat(part));
  if (parts.length < 3 || parts.slice(0, 3).some(Number.isNaN)) return null;

  // The modern `rgb(0 0 0 / 40%)` and the legacy `rgba(0, 0, 0, 0.4)` both put
  // alpha in the fourth slot; only the `%` tells the two scales apart.
  const alpha =
    parts.length > 3 && !Number.isNaN(parts[3]!)
      ? clamp(tokens[3]!.includes("%") ? parts[3]! / 100 : parts[3]!, 0, 1)
      : 1;

  const [a, b, c] = parts as [number, number, number];
  if (kind.startsWith("rgb")) return withAlpha(rgbToHex(a, b, c), alpha);
  if (kind.startsWith("hsl")) {
    return withAlpha(rgbToHex(...hslToRgb(a, b, c)), alpha);
  }
  if (kind.startsWith("oklch")) {
    // `78.6%` arrives here as 78.6, but lightness is a 0–1 quantity.
    return withAlpha(oklchToHex(a > 1 ? a / 100 : a, b, c), alpha);
  }
  return null;
}

/* -------------------------------------------------------------- hue disc */

const THUMB_SHADOW = "0 0 0 1px rgb(0 0 0 / 14%), 0 1px 3px rgb(0 0 0 / 25%)";

function ColorPickerDisc({
  hsv,
  onChange,
}: {
  hsv: Hsv;
  onChange: (next: Hsv) => void;
}) {
  const discRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const reachRadius = DISC_RADIUS - THUMB_INSET;

  // Painted once: hue around the disc, saturation out from the middle. The
  // blur hides the pixel stepping without moving any of the stops.
  React.useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = Math.round(DISC_RADIUS * 2 * dpr);
    canvas.width = size;
    canvas.height = size;
    const image = ctx.createImageData(size, size);
    const data = image.data;
    const center = size / 2;
    const reach = (DISC_RADIUS - THUMB_INSET) * dpr;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x + 0.5 - center;
        const dy = y + 0.5 - center;
        const h = (Math.atan2(dy, dx) / (2 * Math.PI) + 1.25) % 1;
        const s = clamp(Math.hypot(dx, dy) / reach, 0, 1);
        const rgb = okhsvToLinearSrgb(h, s, 1, cuspForHue(h));
        const i = (y * size + x) * 4;
        data[i] = Math.round(clamp(srgbTransfer(rgb[0]), 0, 1) * 255);
        data[i + 1] = Math.round(clamp(srgbTransfer(rgb[1]), 0, 1) * 255);
        data[i + 2] = Math.round(clamp(srgbTransfer(rgb[2]), 0, 1) * 255);
        data[i + 3] = 255;
      }
    }
    const layer = document.createElement("canvas");
    layer.width = size;
    layer.height = size;
    layer.getContext("2d")?.putImageData(image, 0, 0);
    ctx.filter = `blur(${5 * dpr}px)`;
    ctx.drawImage(layer, 0, 0);
    ctx.filter = "none";
    ctx.globalCompositeOperation = "destination-in";
    ctx.beginPath();
    ctx.arc(center, center, center - 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  }, []);

  const fromPointer = (clientX: number, clientY: number) => {
    const rect = discRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dx = clientX - rect.left - DISC_RADIUS;
    const dy = clientY - rect.top - DISC_RADIUS;
    const h = ((Math.atan2(dy, dx) * 180) / Math.PI + 90 + 360) % 360;
    const s = clamp(Math.hypot(dx, dy) / reachRadius, 0, 1) * 100;
    onChange({ ...hsv, h, s });
  };

  const angle = ((hsv.h - 90) * Math.PI) / 180;
  const radius = (hsv.s / 100) * reachRadius;

  return (
    <div
      ref={discRef}
      role="slider"
      aria-label="Hue and saturation"
      aria-valuemin={0}
      aria-valuemax={360}
      aria-valuenow={Math.round(hsv.h)}
      aria-valuetext={`Hue ${Math.round(hsv.h)} degrees, saturation ${Math.round(hsv.s)}%`}
      tabIndex={0}
      data-slot="color-picker-disc"
      onPointerDown={(e) => {
        e.preventDefault();
        try {
          discRef.current?.setPointerCapture(e.pointerId);
        } catch {}
        setDragging(true);
        fromPointer(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (!dragging) return;
        if (e.pointerType === "mouse" && e.buttons === 0) {
          setDragging(false);
          return;
        }
        fromPointer(e.clientX, e.clientY);
      }}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
      onLostPointerCapture={() => setDragging(false)}
      onKeyDown={(e) => {
        const dh = e.key === "ArrowRight" ? 2 : e.key === "ArrowLeft" ? -2 : 0;
        const ds = e.key === "ArrowUp" ? 2 : e.key === "ArrowDown" ? -2 : 0;
        if (!dh && !ds) return;
        e.preventDefault();
        onChange({
          ...hsv,
          h: (hsv.h + dh + 360) % 360,
          s: clamp(hsv.s + ds, 0, 100),
        });
      }}
      className="group/disc relative mx-auto cursor-pointer rounded-full outline-none"
      style={{
        width: DISC_RADIUS * 2,
        height: DISC_RADIUS * 2,
        touchAction: "none",
      }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 size-full rounded-full"
      />
      <div className="border-foreground/10 pointer-events-none absolute inset-0 rounded-full border" />
      {/* Focus grows the thumb to its dragging size, so the disc needs no ring. */}
      <div
        data-dragging={dragging || undefined}
        className="pointer-events-none absolute size-4 -translate-1/2 rounded-full border-2 border-white transition-[scale] duration-(--duration-150) ease-(--ease-move) group-focus-visible/disc:scale-125 data-dragging:scale-125 motion-reduce:transition-none"
        style={{
          left: DISC_RADIUS + radius * Math.cos(angle),
          top: DISC_RADIUS + radius * Math.sin(angle),
          background: hsvToHex(hsv),
          boxShadow: THUMB_SHADOW,
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------ arc bands */

function arcPoint(t: number, radius: number) {
  const angle = BAND_ANG_LEFT + t * (BAND_ANG_RIGHT - BAND_ANG_LEFT);
  return {
    x: WHEEL_CX + radius * Math.cos(angle),
    y: WHEEL_CY + radius * Math.sin(angle),
  };
}

function arcPath(radius: number) {
  const left = arcPoint(0, radius);
  const right = arcPoint(1, radius);
  return `M ${left.x} ${left.y} A ${radius} ${radius} 0 0 0 ${right.x} ${right.y}`;
}

// Only the angle matters, so a finger can wander off the ring mid-drag
// without the value jumping, and both bands share one implementation.
function useArcScrub(onScrub: (t: number) => void) {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = React.useState(false);

  const fromPointer = (clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dx = clientX - rect.left - WHEEL_CX;
    const dy = clientY - rect.top - WHEEL_CY;
    let angle = Math.atan2(dy, dx);
    if (angle < -Math.PI / 2) angle += Math.PI * 2;
    onScrub(
      clamp((BAND_ANG_LEFT - angle) / (BAND_ANG_LEFT - BAND_ANG_RIGHT), 0, 1),
    );
  };

  const handlers = {
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      try {
        svgRef.current?.setPointerCapture(e.pointerId);
      } catch {}
      setDragging(true);
      fromPointer(e.clientX, e.clientY);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!dragging) return;
      if (e.pointerType === "mouse" && e.buttons === 0) {
        setDragging(false);
        return;
      }
      fromPointer(e.clientX, e.clientY);
    },
    onPointerUp: () => setDragging(false),
    onPointerCancel: () => setDragging(false),
    onLostPointerCapture: () => setDragging(false),
  };

  return { svgRef, dragging, handlers };
}

function arcKeyDelta(key: string, current: number) {
  if (key === "ArrowRight" || key === "ArrowUp") return 2;
  if (key === "ArrowLeft" || key === "ArrowDown") return -2;
  if (key === "PageUp") return 10;
  if (key === "PageDown") return -10;
  if (key === "Home") return -current;
  if (key === "End") return 100 - current;
  return null;
}

// The square svg passes clicks through to the disc; only its arcs take them.
const bandSvg = "group/band absolute inset-0 cursor-pointer outline-none";
const bandSvgStyle = { touchAction: "none", pointerEvents: "none" } as const;
const bandThumb =
  "pointer-events-none origin-center transition-[scale] duration-(--duration-150) ease-(--ease-move) [transform-box:fill-box] group-focus-visible/band:scale-120 data-dragging:scale-120 motion-reduce:transition-none";
const bandThumbLift = { filter: "drop-shadow(0 1px 2px rgb(0 0 0 / 35%))" };

function ColorPickerBrightness({
  hsv,
  onChange,
}: {
  hsv: Hsv;
  onChange: (next: Hsv) => void;
}) {
  const gradientId = React.useId();
  const { svgRef, dragging, handlers } = useArcScrub((t) =>
    onChange({ ...hsv, v: t * 100 }),
  );
  const left = arcPoint(0, BAND_R);
  const right = arcPoint(1, BAND_R);
  const path = arcPath(BAND_R);
  const thumb = arcPoint(hsv.v / 100, BAND_R);

  return (
    <svg
      ref={svgRef}
      role="slider"
      aria-label="Brightness"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(hsv.v)}
      tabIndex={0}
      data-slot="color-picker-brightness"
      viewBox={`0 0 ${WHEEL_W} ${WHEEL_H}`}
      {...handlers}
      onKeyDown={(e) => {
        const delta = arcKeyDelta(e.key, hsv.v);
        if (delta === null) return;
        e.preventDefault();
        onChange({ ...hsv, v: clamp(hsv.v + delta, 0, 100) });
      }}
      className={bandSvg}
      style={{ width: WHEEL_W, height: WHEEL_H, ...bandSvgStyle }}
    >
      <defs>
        <linearGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          x1={left.x}
          y1={left.y}
          x2={right.x}
          y2={right.y}
        >
          <stop offset="0" stopColor="#000" />
          <stop offset="1" stopColor="#fff" />
        </linearGradient>
      </defs>
      <path
        d={path}
        fill="none"
        strokeWidth={BAND_STROKE + 2}
        strokeLinecap="round"
        className="stroke-foreground/15"
      />
      <path
        d={path}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={BAND_STROKE}
        strokeLinecap="round"
        style={{ pointerEvents: "stroke" }}
      />
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={BAND_STROKE + 10}
        strokeLinecap="round"
        style={{ pointerEvents: "stroke" }}
      />
      <circle
        cx={thumb.x}
        cy={thumb.y}
        r={7.5}
        fill={hsvToHex({ h: hsv.h, s: 0, v: hsv.v })}
        stroke="#fff"
        strokeWidth={2}
        data-dragging={dragging || undefined}
        className={bandThumb}
        style={bandThumbLift}
      />
    </svg>
  );
}

function ColorPickerOpacity({
  base,
  alpha,
  onChange,
}: {
  base: string;
  alpha: number;
  onChange: (next: number) => void;
}) {
  const gradientId = React.useId();
  const checkerId = React.useId();
  const { svgRef, dragging, handlers } = useArcScrub(onChange);
  const percent = alpha * 100;
  const left = arcPoint(0, ALPHA_R);
  const right = arcPoint(1, ALPHA_R);
  const path = arcPath(ALPHA_R);
  const thumb = arcPoint(alpha, ALPHA_R);

  return (
    <svg
      ref={svgRef}
      role="slider"
      aria-label="Opacity"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
      aria-valuetext={`${Math.round(percent)}%`}
      tabIndex={0}
      data-slot="color-picker-opacity"
      viewBox={`0 0 ${WHEEL_W} ${WHEEL_H_ALPHA}`}
      {...handlers}
      onKeyDown={(e) => {
        const delta = arcKeyDelta(e.key, percent);
        if (delta === null) return;
        e.preventDefault();
        onChange(clamp(percent + delta, 0, 100) / 100);
      }}
      className={bandSvg}
      style={{ width: WHEEL_W, height: WHEEL_H_ALPHA, ...bandSvgStyle }}
    >
      <defs>
        <pattern
          id={checkerId}
          width={CHECKER_CELL}
          height={CHECKER_CELL}
          patternUnits="userSpaceOnUse"
        >
          <rect
            width={CHECKER_CELL / 2}
            height={CHECKER_CELL / 2}
            className="fill-foreground/20"
          />
          <rect
            x={CHECKER_CELL / 2}
            y={CHECKER_CELL / 2}
            width={CHECKER_CELL / 2}
            height={CHECKER_CELL / 2}
            className="fill-foreground/20"
          />
        </pattern>
        {/* stopOpacity, because a `transparent` stop fades through black in
            some engines. */}
        <linearGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          x1={left.x}
          y1={left.y}
          x2={right.x}
          y2={right.y}
        >
          <stop offset="0" stopColor={base} stopOpacity={0} />
          <stop offset="1" stopColor={base} stopOpacity={1} />
        </linearGradient>
      </defs>
      <path
        d={path}
        fill="none"
        strokeWidth={ALPHA_STROKE + 2}
        strokeLinecap="round"
        className="stroke-foreground/15"
      />
      <path
        d={path}
        fill="none"
        stroke={`url(#${checkerId})`}
        strokeWidth={ALPHA_STROKE}
        strokeLinecap="round"
      />
      <path
        d={path}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={ALPHA_STROKE}
        strokeLinecap="round"
        style={{ pointerEvents: "stroke" }}
      />
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={ALPHA_STROKE + 6}
        strokeLinecap="round"
        style={{ pointerEvents: "stroke" }}
      />
      <g
        data-dragging={dragging || undefined}
        className={bandThumb}
        style={bandThumbLift}
      >
        <circle cx={thumb.x} cy={thumb.y} r={7} fill={`url(#${checkerId})`} />
        <circle
          cx={thumb.x}
          cy={thumb.y}
          r={7}
          fill={base}
          fillOpacity={alpha}
          stroke="#fff"
          strokeWidth={2}
        />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------- swatches */

type ColorSwatch = {
  /** Any CSS color; a `var(--token)` resolves against the theme. */
  value: string;
  label: string;
};

const THEME_SWATCHES: readonly ColorSwatch[] = [
  { label: "Foreground", value: "var(--foreground)" },
  { label: "Muted foreground", value: "var(--muted-foreground)" },
  { label: "Border", value: "var(--border)" },
  { label: "Muted", value: "var(--muted)" },
  { label: "Brand", value: "var(--brand)" },
  { label: "Success", value: "var(--success)" },
  { label: "Pending", value: "var(--pending)" },
  { label: "Destructive", value: "var(--destructive)" },
];

// getComputedStyle substitutes the variable, then canvas turns whatever space
// it serialized in (Chrome reports lab() for an oklch() token) into sRGB.
function resolveCssColor(color: string, ctx: CanvasRenderingContext2D) {
  const probe = document.createElement("span");
  probe.style.color = color;
  document.body.append(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();

  // Canvas ignores a color it can't parse, which is the only way to tell.
  const sentinel = "#010203";
  ctx.fillStyle = sentinel;
  ctx.fillStyle = computed;
  if (ctx.fillStyle === sentinel) return null;

  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return rgbToHex(r!, g!, b!);
}

function useSwatchHexes(swatches: readonly ColorSwatch[]) {
  return React.useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return [];
    return swatches
      .map((swatch) => ({ swatch, hex: resolveCssColor(swatch.value, ctx) }))
      .filter(
        (entry): entry is { swatch: ColorSwatch; hex: string } =>
          entry.hex !== null,
      );
  }, [swatches]);
}

/* ----------------------------------------------------------- eyedropper */

const emptySubscribe = () => () => {};

type EyeDropperConstructor = new () => {
  open(): Promise<{ sRGBHex: string }>;
};

// Chromium only, so the button appears from what the browser reports.
function useEyeDropper() {
  return React.useSyncExternalStore(
    emptySubscribe,
    () => (window as { EyeDropper?: EyeDropperConstructor }).EyeDropper ?? null,
    () => null,
  );
}

/* -------------------------------------------------------------- panel */

function ColorPickerPanel({
  value,
  onValueChange,
  format,
  onFormatChange,
  swatches,
  opacity,
}: {
  value: string;
  onValueChange: (hex: string) => void;
  format: ColorFormat;
  onFormatChange: (format: ColorFormat) => void;
  swatches: readonly ColorSwatch[];
  opacity: boolean;
}) {
  const eyeDropper = useEyeDropper();
  const swatchHexes = useSwatchHexes(swatches);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const initial = normalizeHex(value) ?? "#ffffff";
  // `seen` is the exact color in force; `hsv` is only the wheel's reading of
  // it, which the Okhsv round trip can nudge a step.
  const [state, setState] = React.useState(() => ({
    hsv: hexToHsv(initial),
    draft: formatColor(initial, format),
    seen: initial,
  }));
  const { base, alpha } = splitAlpha(state.seen);

  const incoming = normalizeHex(value);
  if (incoming && incoming !== state.seen) {
    setState({
      hsv: hexToHsv(incoming),
      draft: formatColor(incoming, format),
      seen: incoming,
    });
  }

  const commit = (next: Hsv, hex: string) => {
    setState({ hsv: next, draft: formatColor(hex, format), seen: hex });
    onValueChange(hex);
  };
  const apply = (next: Hsv) => commit(next, withAlpha(hsvToHex(next), alpha));
  const applyAlpha = (next: number) => commit(state.hsv, withAlpha(base, next));
  const applyHex = (hex: string) => commit(hexToHsv(hex), hex);

  const commitDraft = () => {
    const hex = parseColor(state.draft, format);
    if (hex && hex !== state.seen) applyHex(hex);
    else
      setState((prev) => ({ ...prev, draft: formatColor(prev.seen, format) }));
  };

  return (
    <div data-slot="color-picker-panel" className="flex flex-col gap-3">
      <div
        className="relative mx-auto"
        style={{ width: WHEEL_W, height: opacity ? WHEEL_H_ALPHA : WHEEL_H }}
      >
        <div
          className="absolute inset-x-0 top-0"
          style={{ height: DISC_RADIUS * 2 }}
        >
          <ColorPickerDisc hsv={state.hsv} onChange={apply} />
        </div>
        <ColorPickerBrightness hsv={state.hsv} onChange={apply} />
        {opacity ? (
          <ColorPickerOpacity base={base} alpha={alpha} onChange={applyAlpha} />
        ) : null}
      </div>

      {swatchHexes.length > 0 ? (
        <div
          data-slot="color-picker-swatches"
          className="flex items-center justify-between px-0.5"
        >
          {swatchHexes.map(({ swatch, hex }) => (
            <Tooltip key={swatch.label}>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    aria-label={swatch.label}
                    aria-pressed={hex === base}
                    // A swatch picks the color; the opacity stays as set.
                    onClick={() => applyHex(withAlpha(hex, alpha))}
                    className="pressable border-foreground/15 focus-visible:border-ring aria-pressed:border-foreground size-5 cursor-pointer rounded-full border outline-none focus-visible:border-2 aria-pressed:border-2"
                    style={{ background: swatch.value }}
                  />
                }
              />
              <TooltipContent className="tabular-nums">
                {swatch.label} · {hex}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      ) : null}

      <InputGroup data-slot="color-picker-field">
        <InputGroupAddon align="inline-start" className="ps-1">
          <Menu>
            <MenuTrigger
              aria-label="Color notation"
              className="text-small text-foreground hover:bg-foreground/[0.07] focus-visible:bg-foreground/[0.07] data-popup-open:bg-foreground/[0.07] flex h-6 items-center gap-0.5 rounded-md px-1.5 outline-none"
            >
              {COLOR_FORMATS.find((option) => option.value === format)?.label}
              <HugeiconsIcon
                icon={UnfoldMoreIcon}
                aria-hidden
                className="text-muted-foreground size-3.5"
              />
            </MenuTrigger>
            {/* The addon focuses the field on any click that reaches it. */}
            <MenuPopup
              align="start"
              className="min-w-28"
              onClick={(e) => e.stopPropagation()}
            >
              <MenuRadioGroup
                value={format}
                onValueChange={(next) => {
                  onFormatChange(next as ColorFormat);
                  setState((prev) => ({
                    ...prev,
                    draft: formatColor(prev.seen, next as ColorFormat),
                  }));
                }}
              >
                {COLOR_FORMATS.map((option) => (
                  <MenuChoice key={option.value} value={option.value}>
                    {option.label}
                  </MenuChoice>
                ))}
              </MenuRadioGroup>
            </MenuPopup>
          </Menu>
        </InputGroupAddon>
        <InputGroupInput
          value={state.draft}
          onChange={(e) =>
            setState((prev) => ({ ...prev, draft: e.target.value }))
          }
          onBlur={commitDraft}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          aria-label={`Color value in ${format}`}
          spellCheck={false}
          autoComplete="off"
          className="text-small text-end font-mono tabular-nums"
        />
        <InputGroupAddon align="inline-end" className="gap-0">
          <Tooltip>
            <TooltipTrigger
              render={
                <InputGroupButton
                  size="icon-xs"
                  aria-label={copied ? "Copied" : `Copy ${format} value`}
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    navigator.clipboard
                      .writeText(formatColor(state.seen, format))
                      .then(() => setCopied(true))
                      .catch(() => setCopied(false))
                  }
                />
              }
            >
              <span className="grid">
                <HugeiconsIcon
                  icon={Copy01Icon}
                  aria-hidden
                  className={cn(
                    "icon-swap",
                    copied ? "icon-swap-out" : "icon-swap-in",
                  )}
                />
                <HugeiconsIcon
                  icon={Tick02Icon}
                  aria-hidden
                  className={cn(
                    "icon-swap",
                    copied ? "icon-swap-in" : "icon-swap-out",
                  )}
                />
              </span>
            </TooltipTrigger>
            <TooltipContent>{copied ? "Copied" : "Copy"}</TooltipContent>
          </Tooltip>
          {eyeDropper ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <InputGroupButton
                    size="icon-xs"
                    aria-label="Pick a color from the screen"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      new eyeDropper()
                        .open()
                        .then((result) => {
                          // The screen is opaque, so the arc keeps deciding alpha.
                          const hex = normalizeHex(result.sRGBHex);
                          if (hex) applyHex(withAlpha(hex, alpha));
                        })
                        .catch(() => {});
                    }}
                  />
                }
              >
                <HugeiconsIcon icon={DropperIcon} aria-hidden />
              </TooltipTrigger>
              <TooltipContent>Pick a color from the screen</TooltipContent>
            </Tooltip>
          ) : null}
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}

/* --------------------------------------------------------------- picker */

type ColorPickerProps = {
  /** Names the trigger for assistive tech: "Background" reads "Background color". */
  label: string;
  /** `#rrggbb`, or `#rrggbbaa` when `opacity` is on and the color isn't opaque. */
  value: string;
  onValueChange: (value: string) => void;
  /** Text beside the swatch instead of the value, like "Auto". */
  displayValue?: string;
  /** Shows only the swatch. */
  hideValue?: boolean;
  /** The notation the field opens in. */
  defaultFormat?: ColorFormat;
  /** One-click colors under the wheel; defaults to the theme's tokens. */
  swatches?: readonly ColorSwatch[];
  /** The opacity arc outside the brightness one. On by default. */
  opacity?: boolean;
  disabled?: boolean;
  className?: string;
};

function ColorPicker({
  label,
  value,
  onValueChange,
  displayValue,
  hideValue = false,
  defaultFormat = "hex",
  swatches = THEME_SWATCHES,
  opacity = true,
  disabled,
  className,
}: ColorPickerProps) {
  // Kept here so reopening keeps the notation last chosen.
  const [format, setFormat] = React.useState<ColorFormat>(defaultFormat);
  const hex = normalizeHex(value);
  const formatted = hex ? formatColor(hex, format) : value;

  return (
    <Popover modal={false}>
      <PopoverTrigger
        disabled={disabled}
        aria-label={`${label} color`}
        render={
          <Button
            variant="ghost"
            size="sm"
            data-slot="color-picker-trigger"
            className={cn("gap-2 px-2", hideValue && "px-1.5", className)}
          />
        }
      >
        {hideValue ? null : (
          <span className="text-small text-muted-foreground tabular-nums">
            {displayValue ?? formatted}
          </span>
        )}
        <span
          aria-hidden
          className={cn(
            "border-foreground/15 size-4.5 shrink-0 rounded-full border",
            opacity && "text-foreground/20",
          )}
          // Over a checker, so a translucent value reads as translucent.
          style={
            opacity
              ? {
                  backgroundImage: `linear-gradient(${value}, ${value}), ${CHECKER_IMAGE}`,
                  backgroundSize: `auto, ${CHECKER_CELL}px ${CHECKER_CELL}px`,
                }
              : { background: value }
          }
        />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        aria-label="Color picker"
        data-slot="color-picker-content"
        className="w-auto p-3"
        style={{ width: POPOVER_WIDTH }}
      >
        <ColorPickerPanel
          value={value}
          onValueChange={onValueChange}
          format={format}
          onFormatChange={setFormat}
          swatches={swatches}
          opacity={opacity}
        />
      </PopoverContent>
    </Popover>
  );
}

export {
  ColorPicker,
  ColorPickerPanel,
  COLOR_FORMATS,
  THEME_SWATCHES,
  formatColor,
  hexToHsv,
  hsvToHex,
  normalizeHex,
  parseColor,
  splitAlpha,
  withAlpha,
};
export type { ColorFormat, ColorPickerProps, ColorSwatch, Hsv };
