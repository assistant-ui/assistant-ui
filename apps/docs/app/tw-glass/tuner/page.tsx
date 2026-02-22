"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  buildDisplacementMapSvg,
  encodeSvgUrl,
  buildStandardFilter,
  buildChromaticFilter,
  toDataUri,
} from "../../../../../packages/tw-glass/scripts/filter-builder.mjs";
import { PATTERNS, unsplash, PatternPicker } from "../(home)/pattern-picker";

// ─── Types ─────────────────────────────────────────────────────────

interface MapParams {
  inset: number;
  cornerRadius: number;
  innerBlur: number;
  outerBlur: number;
  shape: "rect" | "circle";
}

interface FilterParams {
  mode: "standard" | "chromatic";
  scale: number;
  rRatio: number;
  gRatio: number;
}

type BlendMode =
  | "soft-light"
  | "screen"
  | "overlay"
  | "hard-light"
  | "color-dodge";

interface AppearanceParams {
  blur: number;
  brightness: number;
  saturation: number;
  bgOpacity: number;
  showSurface: boolean;
  highlight: number;
  highlightSize: number;
  shadow: number;
  highlightBlend: BlendMode;
  circleScale: number;
  sizeVariance: number;
  speedMin: number;
  speedMax: number;
  bubbleCount: number;
}

// ─── Defaults ──────────────────────────────────────────────────────

const DEFAULT_MAP: MapParams = {
  inset: 6,
  cornerRadius: 40,
  innerBlur: 0,
  outerBlur: 0,
  shape: "circle",
};

const DEFAULT_FILTER: FilterParams = {
  mode: "chromatic",
  scale: 0.5,
  rRatio: 2.5,
  gRatio: 2.0,
};

const DEFAULT_APPEARANCE: AppearanceParams = {
  blur: 2,
  brightness: 1.1,
  saturation: 2.0,
  bgOpacity: 0,
  showSurface: true,
  highlight: 0.4,
  highlightSize: 42,
  shadow: 0.12,
  highlightBlend: "overlay",
  circleScale: 1.35,
  sizeVariance: 1,
  speedMin: 15,
  speedMax: 19,
  bubbleCount: 50,
};

// ─── Page ──────────────────────────────────────────────────────────

export default function GlassTunerPage() {
  const [map, setMap] = useState<MapParams>(DEFAULT_MAP);
  const [filter, setFilter] = useState<FilterParams>(DEFAULT_FILTER);
  const [appearance, setAppearance] =
    useState<AppearanceParams>(DEFAULT_APPEARANCE);
  const [bgIndex, setBgIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const updateMap = useCallback(
    <K extends keyof MapParams>(key: K, value: MapParams[K]) =>
      setMap((prev) => ({ ...prev, [key]: value })),
    [],
  );
  const updateFilter = useCallback(
    <K extends keyof FilterParams>(key: K, value: FilterParams[K]) =>
      setFilter((prev) => ({ ...prev, [key]: value })),
    [],
  );
  const updateAppearance = useCallback(
    <K extends keyof AppearanceParams>(key: K, value: AppearanceParams[K]) =>
      setAppearance((prev) => ({ ...prev, [key]: value })),
    [],
  );

  // Rebuild filter SVG whenever map or filter params change
  const filterUri = useMemo(() => {
    const mapSvg = buildDisplacementMapSvg(map) as string;
    const urlEncoded = encodeSvgUrl(mapSvg) as string;
    const filterSvg =
      filter.mode === "chromatic"
        ? (buildChromaticFilter(
            urlEncoded,
            filter.scale,
            filter.rRatio,
            filter.gRatio,
          ) as string)
        : (buildStandardFilter(urlEncoded, filter.scale) as string);
    return toDataUri(filterSvg) as string;
  }, [map, filter]);

  // Inline style for the preview element
  const previewStyle = useMemo<React.CSSProperties>(
    () =>
      ({
        "--tw-glass-filter": filterUri,
        "--tw-glass-blur": `${appearance.blur}px`,
        "--tw-glass-brightness": appearance.brightness,
        "--tw-glass-saturation": appearance.saturation,
        "--glass-bg-opacity": appearance.bgOpacity,
      }) as React.CSSProperties,
    [filterUri, appearance],
  );

  // Compile output CSS
  const compiledCss = useMemo(() => {
    const lines: string[] = [];
    lines.push("@utility my-glass {");
    lines.push(`  --tw-glass-filter: ${filterUri};`);
    lines.push(
      "  --tw-backdrop-blur: var(--tw-glass-filter) blur(var(--tw-glass-blur));",
    );
    lines.push(
      "  --tw-backdrop-brightness: brightness(var(--tw-glass-brightness));",
    );
    lines.push(
      "  --tw-backdrop-saturate: saturate(var(--tw-glass-saturation));",
    );

    if (appearance.blur !== DEFAULT_APPEARANCE.blur) {
      lines.push(`  --tw-glass-blur: ${appearance.blur}px;`);
    }
    if (appearance.brightness !== DEFAULT_APPEARANCE.brightness) {
      lines.push(`  --tw-glass-brightness: ${appearance.brightness};`);
    }
    if (appearance.saturation !== DEFAULT_APPEARANCE.saturation) {
      lines.push(`  --tw-glass-saturation: ${appearance.saturation};`);
    }
    if (appearance.bgOpacity !== DEFAULT_APPEARANCE.bgOpacity) {
      lines.push(`  --glass-bg-opacity: ${appearance.bgOpacity};`);
    }

    lines.push("}");
    return lines.join("\n");
  }, [filterUri, appearance]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(compiledCss);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [compiledCss]);

  const handleReset = useCallback(() => {
    setMap(DEFAULT_MAP);
    setFilter(DEFAULT_FILTER);
    setAppearance(DEFAULT_APPEARANCE);
  }, []);

  const surfaceCls = appearance.showSurface ? "glass-surface" : "";

  const bgUrl = unsplash(PATTERNS[bgIndex]!.id);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <header className="mb-8 flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="font-bold text-3xl">Glass Tuner</h1>
            <p className="text-muted-foreground text-sm">
              Tweak every glass parameter live, then copy the compiled CSS.
            </p>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-lg border px-3 py-1.5 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
          >
            Reset
          </button>
        </header>

        {/* Controls + Preview */}
        <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
          {/* Left: Controls */}
          <div className="space-y-6">
            <ControlGroup title="Displacement Map">
              <div className="flex gap-3">
                <ModeButton
                  label="Rect"
                  active={map.shape === "rect"}
                  onClick={() => updateMap("shape", "rect")}
                />
                <ModeButton
                  label="Circle"
                  active={map.shape === "circle"}
                  onClick={() => updateMap("shape", "circle")}
                />
              </div>
              <Slider
                label="Inset"
                value={map.inset}
                min={0}
                max={45}
                step={1}
                display={`${map.inset}`}
                onChange={(v) => updateMap("inset", v)}
              />
              {map.shape === "rect" && (
                <Slider
                  label="Corner radius"
                  value={map.cornerRadius}
                  min={0}
                  max={40}
                  step={1}
                  display={`${map.cornerRadius}`}
                  onChange={(v) => updateMap("cornerRadius", v)}
                />
              )}
              <Slider
                label="Inner blur"
                value={map.innerBlur}
                min={0}
                max={30}
                step={0.5}
                display={`${map.innerBlur}`}
                onChange={(v) => updateMap("innerBlur", v)}
              />
              <Slider
                label="Outer blur"
                value={map.outerBlur}
                min={0}
                max={15}
                step={0.1}
                display={`${map.outerBlur.toFixed(1)}`}
                onChange={(v) => updateMap("outerBlur", v)}
              />
            </ControlGroup>

            <ControlGroup title="Filter">
              <div className="flex gap-3">
                <ModeButton
                  label="Standard"
                  active={filter.mode === "standard"}
                  onClick={() => updateFilter("mode", "standard")}
                />
                <ModeButton
                  label="Chromatic"
                  active={filter.mode === "chromatic"}
                  onClick={() => updateFilter("mode", "chromatic")}
                />
              </div>
              <Slider
                label="Scale"
                value={filter.scale}
                min={0.01}
                max={0.5}
                step={0.01}
                display={filter.scale.toFixed(2)}
                onChange={(v) => updateFilter("scale", v)}
              />
              {filter.mode === "chromatic" && (
                <>
                  <Slider
                    label="R ratio"
                    value={filter.rRatio}
                    min={1.0}
                    max={2.5}
                    step={0.1}
                    display={filter.rRatio.toFixed(1)}
                    onChange={(v) => updateFilter("rRatio", v)}
                  />
                  <Slider
                    label="G ratio"
                    value={filter.gRatio}
                    min={1.0}
                    max={2.0}
                    step={0.1}
                    display={filter.gRatio.toFixed(1)}
                    onChange={(v) => updateFilter("gRatio", v)}
                  />
                </>
              )}
            </ControlGroup>

            <ControlGroup title="Appearance">
              <Slider
                label="Blur"
                value={appearance.blur}
                min={0}
                max={20}
                step={1}
                display={`${appearance.blur}px`}
                onChange={(v) => updateAppearance("blur", v)}
              />
              <Slider
                label="Brightness"
                value={appearance.brightness}
                min={0.5}
                max={2.0}
                step={0.05}
                display={appearance.brightness.toFixed(2)}
                onChange={(v) => updateAppearance("brightness", v)}
              />
              <Slider
                label="Saturation"
                value={appearance.saturation}
                min={0}
                max={3.0}
                step={0.1}
                display={appearance.saturation.toFixed(1)}
                onChange={(v) => updateAppearance("saturation", v)}
              />
              <Slider
                label="BG opacity"
                value={appearance.bgOpacity}
                min={0}
                max={0.5}
                step={0.01}
                display={appearance.bgOpacity.toFixed(2)}
                onChange={(v) => updateAppearance("bgOpacity", v)}
              />
              <Slider
                label="Highlight"
                value={appearance.highlight}
                min={0}
                max={0.8}
                step={0.05}
                display={appearance.highlight.toFixed(2)}
                onChange={(v) => updateAppearance("highlight", v)}
              />
              <Slider
                label="Highlight size"
                value={appearance.highlightSize}
                min={10}
                max={80}
                step={1}
                display={`${appearance.highlightSize}%`}
                onChange={(v) => updateAppearance("highlightSize", v)}
              />
              <BlendSelect
                value={appearance.highlightBlend}
                onChange={(v) => updateAppearance("highlightBlend", v)}
              />
              <Slider
                label="Shadow"
                value={appearance.shadow}
                min={0}
                max={0.5}
                step={0.02}
                display={appearance.shadow.toFixed(2)}
                onChange={(v) => updateAppearance("shadow", v)}
              />
              <Slider
                label="Circle scale"
                value={appearance.circleScale}
                min={0.3}
                max={2.5}
                step={0.05}
                display={`${appearance.circleScale.toFixed(2)}x`}
                onChange={(v) => updateAppearance("circleScale", v)}
              />
              <Slider
                label="Size variance"
                value={appearance.sizeVariance}
                min={0}
                max={1}
                step={0.05}
                display={appearance.sizeVariance.toFixed(2)}
                onChange={(v) => updateAppearance("sizeVariance", v)}
              />
              <Slider
                label="Speed min"
                value={appearance.speedMin}
                min={3}
                max={40}
                step={1}
                display={`${appearance.speedMin}s`}
                onChange={(v) => updateAppearance("speedMin", v)}
              />
              <Slider
                label="Speed max"
                value={appearance.speedMax}
                min={5}
                max={60}
                step={1}
                display={`${appearance.speedMax}s`}
                onChange={(v) => updateAppearance("speedMax", v)}
              />
              <Slider
                label="Bubble count"
                value={appearance.bubbleCount}
                min={1}
                max={50}
                step={1}
                display={`${appearance.bubbleCount}`}
                onChange={(v) => updateAppearance("bubbleCount", v)}
              />
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={appearance.showSurface}
                  onChange={(e) =>
                    updateAppearance("showSurface", e.target.checked)
                  }
                  className="rounded"
                />
                <span className="text-sm">Surface styling</span>
              </label>
            </ControlGroup>
          </div>

          {/* Right: Live Preview */}
          <div className="lg:sticky lg:top-16 lg:h-[calc(100vh-5rem)] lg:self-start">
            <SpringChain
              bgUrl={bgUrl}
              previewStyle={previewStyle}
              surfaceCls={surfaceCls}
              highlight={appearance.highlight}
              highlightSize={appearance.highlightSize}
              shadow={appearance.shadow}
              highlightBlend={appearance.highlightBlend}
              circleScale={appearance.circleScale}
              sizeVariance={appearance.sizeVariance}
              speedMin={appearance.speedMin}
              speedMax={appearance.speedMax}
              bubbleCount={appearance.bubbleCount}
            />
          </div>
        </div>

        {/* Compiled CSS Output */}
        <div className="mt-8">
          <div className="relative overflow-hidden rounded-xl border bg-muted/50">
            <div className="flex items-center justify-between border-b px-4 py-2">
              <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Compiled CSS
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="rounded-md bg-foreground/10 px-3 py-1 text-sm transition-colors hover:bg-foreground/20"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <pre className="overflow-x-auto p-4 font-mono text-sm leading-relaxed">
              <code>{compiledCss}</code>
            </pre>
          </div>
        </div>
      </div>

      <PatternPicker active={bgIndex} onChange={setBgIndex} />
    </div>
  );
}

// ─── Floating Bubbles ─────────────────────────────────────────────

const MIN_SIZE = 36;
const MAX_SIZE = 120;

// Stable per-bubble randomness seeded by index
function seededRandom(i: number, salt: number) {
  const x = Math.sin(i * 9301 + salt * 4973) * 49297;
  return x - Math.floor(x);
}

interface BubbleDef {
  size: number;
  xPct: number; // horizontal position as % of container width
  duration: number; // animation duration in seconds
  delay: number; // initial delay (negative = starts mid-animation)
}

function computeBubbles(
  circleScale: number,
  sizeVariance: number,
  speedMin: number,
  speedMax: number,
  count: number,
): BubbleDef[] {
  return Array.from({ length: count }, (_, i) => {
    const t = seededRandom(i, 0);
    const mid = (MIN_SIZE + MAX_SIZE) / 2;
    const half = ((MAX_SIZE - MIN_SIZE) / 2) * sizeVariance;
    const base = mid + (t - 0.5) * 2 * half;
    const size = Math.round(base * circleScale);
    const xPct = seededRandom(i, 1) * 100;
    const duration = speedMin + seededRandom(i, 2) * (speedMax - speedMin);
    const delay = -(seededRandom(i, 3) * duration); // stagger start
    return { size, xPct, duration, delay };
  });
}

// Spherical shading — primary highlight from top-left
function sphereHighlight(highlight: number, size: number) {
  return `radial-gradient(circle at 30% 25%, rgba(255,255,255,${highlight}) 0%, rgba(255,255,255,0) ${size}%, rgba(0,0,0,${(highlight * 0.2).toFixed(3)}) 100%)`;
}

// Secondary rim-light from bottom-right (simulates environment bounce)
function sphereRimLight(highlight: number) {
  const rim = highlight * 0.5;
  return `radial-gradient(circle at 75% 80%, rgba(255,255,255,${rim.toFixed(3)}) 0%, rgba(255,255,255,0) 45%)`;
}
function sphereShadow(shadow: number) {
  return `radial-gradient(ellipse 70% 70% at 75% 80%, rgba(0,0,0,${shadow}) 0%, rgba(0,0,0,${(shadow * 0.33).toFixed(2)}) 35%, transparent 65%)`;
}

function SpringChain({
  bgUrl,
  previewStyle,
  surfaceCls,
  highlight,
  highlightSize,
  shadow,
  highlightBlend,
  circleScale,
  sizeVariance,
  speedMin,
  speedMax,
  bubbleCount,
}: {
  bgUrl: string;
  previewStyle: React.CSSProperties;
  surfaceCls: string;
  highlight: number;
  highlightSize: number;
  shadow: number;
  highlightBlend: BlendMode;
  circleScale: number;
  sizeVariance: number;
  speedMin: number;
  speedMax: number;
  bubbleCount: number;
}) {
  const bubbles = useMemo(
    () =>
      computeBubbles(
        circleScale,
        sizeVariance,
        speedMin,
        speedMax,
        bubbleCount,
      ),
    [circleScale, sizeVariance, speedMin, speedMax, bubbleCount],
  );

  const highlightBg = useMemo(
    () => sphereHighlight(highlight, highlightSize),
    [highlight, highlightSize],
  );
  const shadowBg = useMemo(() => sphereShadow(shadow), [shadow]);
  const rimBg = useMemo(() => sphereRimLight(highlight), [highlight]);

  // Crossfade background layers
  const prevBgRef = useRef(bgUrl);
  const [bgLayers, setBgLayers] = useState<{ url: string; key: number }[]>([
    { url: bgUrl, key: 0 },
  ]);
  const keyRef = useRef(0);

  useEffect(() => {
    if (bgUrl !== prevBgRef.current) {
      prevBgRef.current = bgUrl;
      keyRef.current += 1;
      const newKey = keyRef.current;
      setBgLayers((prev) => [...prev, { url: bgUrl, key: newKey }]);
      // Remove old layers after transition completes
      const timeout = setTimeout(() => {
        setBgLayers((prev) => prev.filter((l) => l.key === newKey));
      }, 800);
      return () => clearTimeout(timeout);
    }
  }, [bgUrl]);

  return (
    <div
      className="relative h-full min-h-[400px] overflow-hidden rounded-2xl"
      style={{ containerType: "size" }}
    >
      {/* Background layers — crossfade */}
      {bgLayers.map((layer) => (
        <div
          key={layer.key}
          className="pointer-events-none absolute inset-0 animate-[fade-in_0.7s_ease-in-out_forwards]"
          style={{
            backgroundImage: layer.url,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      ))}

      {/* Floating bubbles */}
      {bubbles.map((b, i) => (
        <div
          key={i}
          className={`glass ${surfaceCls} pointer-events-none absolute rounded-full`}
          style={{
            ...previewStyle,
            isolation: "isolate",
            width: b.size,
            height: b.size,
            left: `calc(${b.xPct}% - ${b.size / 2}px)`,
            top: "100%",
            animation: `float-up ${b.duration}s linear ${b.delay}s infinite`,
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{ background: highlightBg, mixBlendMode: highlightBlend }}
          />
          <div
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{ background: rimBg, mixBlendMode: "screen" }}
          />
          <div
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{ background: shadowBg, mixBlendMode: "multiply" }}
          />
        </div>
      ))}

      {/* Keyframes — travels from bottom of container to above it */}
      <style>{`
        @keyframes float-up {
          from { transform: translateY(0); }
          to   { transform: translateY(-250cqh); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─── Shared Components ─────────────────────────────────────────────

function ControlGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-xl border p-4">
      <h3 className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="font-mono text-muted-foreground">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );
}

function ModeButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg px-3 py-1.5 text-sm transition-colors ${
        active
          ? "bg-foreground text-background"
          : "bg-muted text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

const BLEND_MODES: BlendMode[] = [
  "soft-light",
  "screen",
  "overlay",
  "hard-light",
  "color-dodge",
];

function BlendSelect({
  value,
  onChange,
}: {
  value: BlendMode;
  onChange: (v: BlendMode) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span>Highlight blend</span>
        <span className="font-mono text-muted-foreground">{value}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {BLEND_MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            className={`rounded-md px-2 py-1 text-xs transition-colors ${
              mode === value
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {mode}
          </button>
        ))}
      </div>
    </div>
  );
}
