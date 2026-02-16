// glass-panel-svg.tsx
//
// Creates a "frosted glass" refraction effect using SVG displacement maps
// applied via CSS backdrop-filter. The effect bends what's behind the glass
// panel, simulating how thick glass distorts light at its edges.
//
// How it works:
// 1. Generate an SVG with color gradients encoding X/Y displacement (R=X, G=Y)
// 2. Embed that SVG as a data URI in an feDisplacementMap filter
// 3. Apply the filter via backdrop-filter CSS property
//
// Why SVG instead of WebGL: backdrop-filter composes naturally with the DOM,
// handles transparency correctly, and doesn't require canvas management.
// Tradeoff: regenerates the SVG when dimensions change (memoized to minimize).
//
// Browser support: Chrome, Safari, Edge. Firefox has partial support.
// Degrades gracefully to no effect on unsupported browsers.
//
// Usage:
//   <GlassPanel depth={10} strength={40}>content</GlassPanel>
//   or
//   const styles = useGlassStyles({ width, height, depth: 10 })
//   <div style={styles}>content</div>

"use client";

import {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
  type CSSProperties,
  type RefObject,
} from "react";

// =============================================================================
// Types
// =============================================================================

interface Dimensions {
  width: number;
  height: number;
}

interface GlassEffectOptions {
  /** How far the refraction extends inward from edges (px) */
  depth: number;
  /** Border radius for the inner "flat" area (px) */
  radius: number;
  /** Intensity of the displacement effect */
  strength: number;
  /** Color fringing at edges—simulates light dispersion through glass */
  chromaticAberration: number;
  /** Gaussian blur applied before and after displacement */
  blur: number;
  /** Multiplier for backdrop brightness */
  brightness: number;
  /** Multiplier for backdrop color saturation */
  saturation: number;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_GLASS_OPTIONS: GlassEffectOptions = {
  depth: 12,
  radius: 12,
  strength: 40,
  chromaticAberration: 8,
  blur: 2,
  brightness: 1.05,
  saturation: 1.2,
} as const;

// =============================================================================
// SVG Filter Generators
// =============================================================================

interface DisplacementMapParams {
  width: number;
  height: number;
  radius: number;
  depth: number;
}

/**
 * Generates an SVG displacement map as a data URI.
 *
 * The displacement map encodes how much to shift each pixel:
 * - Red channel (0-255) → X displacement (-128 to +127 after normalization)
 * - Green channel (0-255) → Y displacement
 * - Gray (#808080) = no displacement (the "neutral" value)
 *
 * Structure:
 * - Outer area: gradients that push pixels outward (glass edge refraction)
 * - Inner rounded rect: neutral gray (flat, undistorted center)
 * - Blur on the inner rect creates a smooth transition
 */
function buildDisplacementMapSvg({
  width,
  height,
  radius,
  depth,
}: DisplacementMapParams): string {
  // Scale gradient positions relative to element size to keep edge effect proportional
  const radiusYPct = Math.ceil((radius / height) * 15);
  const radiusXPct = Math.ceil((radius / width) * 15);
  const innerWidth = Math.max(0, width - 2 * depth);
  const innerHeight = Math.max(0, height - 2 * depth);

  const svg = `<svg height="${height}" width="${width}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <style>.mix { mix-blend-mode: screen; }</style>
    <defs>
      <linearGradient id="Y" x1="0" x2="0" y1="${radiusYPct}%" y2="${100 - radiusYPct}%">
        <stop offset="0%" stop-color="#0F0" />
        <stop offset="100%" stop-color="#000" />
      </linearGradient>
      <linearGradient id="X" x1="${radiusXPct}%" x2="${100 - radiusXPct}%" y1="0" y2="0">
        <stop offset="0%" stop-color="#F00" />
        <stop offset="100%" stop-color="#000" />
      </linearGradient>
    </defs>
    <rect x="0" y="0" height="${height}" width="${width}" fill="#808080" />
    <g filter="blur(2px)">
      <rect x="0" y="0" height="${height}" width="${width}" fill="#000080" />
      <rect x="0" y="0" height="${height}" width="${width}" fill="url(#Y)" class="mix" />
      <rect x="0" y="0" height="${height}" width="${width}" fill="url(#X)" class="mix" />
      <rect x="${depth}" y="${depth}" height="${innerHeight}" width="${innerWidth}" fill="#808080" rx="${radius}" ry="${radius}" filter="blur(${depth}px)" />
    </g>
  </svg>`;

  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

interface DisplacementFilterParams extends DisplacementMapParams {
  strength: number;
  chromaticAberration: number;
}

/**
 * Generates an SVG filter with feDisplacementMap as a data URI.
 *
 * When chromaticAberration > 0, displaces R/G/B channels by different amounts
 * to simulate how glass disperses light into its component colors (like a prism).
 * Red shifts most, green middle, blue least—creating color fringing at edges.
 */
function buildDisplacementFilterUrl({
  width,
  height,
  radius,
  depth,
  strength,
  chromaticAberration,
}: DisplacementFilterParams): string {
  const mapUrl = buildDisplacementMapSvg({ width, height, radius, depth });

  const feImage = `<feImage x="0" y="0" height="${height}" width="${width}" href="${mapUrl}" result="displacementMap" />`;

  let filterContent: string;

  if (chromaticAberration === 0) {
    filterContent = `
      ${feImage}
      <feDisplacementMap in="SourceGraphic" in2="displacementMap" scale="${strength}" xChannelSelector="R" yChannelSelector="G" />
    `;
  } else {
    // Displace each color channel by different amounts to create fringing
    const redScale = strength + chromaticAberration * 2;
    const greenScale = strength + chromaticAberration;
    const blueScale = strength;

    // Each channel: displace → isolate with color matrix → blend back together
    filterContent = `
      ${feImage}
      <feDisplacementMap in="SourceGraphic" in2="displacementMap" scale="${redScale}" xChannelSelector="R" yChannelSelector="G" />
      <feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="displacedR" />
      <feDisplacementMap in="SourceGraphic" in2="displacementMap" scale="${greenScale}" xChannelSelector="R" yChannelSelector="G" />
      <feColorMatrix type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="displacedG" />
      <feDisplacementMap in="SourceGraphic" in2="displacementMap" scale="${blueScale}" xChannelSelector="R" yChannelSelector="G" />
      <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="displacedB" />
      <feBlend in="displacedR" in2="displacedG" mode="screen"/>
      <feBlend in2="displacedB" mode="screen"/>
    `;
  }

  const svg = `<svg height="${height}" width="${width}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="displace" color-interpolation-filters="sRGB">${filterContent}</filter>
    </defs>
  </svg>`;

  return "data:image/svg+xml;utf8," + encodeURIComponent(svg) + "#displace";
}

// =============================================================================
// Style Builders
// =============================================================================

interface BackdropFilterParams {
  filterUrl: string;
  blur: number;
  brightness: number;
  saturation: number;
}

/**
 * Builds the backdrop-filter CSS value.
 *
 * Filter order matters:
 * 1. Pre-blur (half strength) - softens source before displacement
 * 2. SVG displacement filter - the actual refraction
 * 3. Post-blur (full strength) - smooths displacement artifacts
 * 4. Brightness/saturation - final color adjustment
 */
function buildBackdropFilterValue({
  filterUrl,
  blur,
  brightness,
  saturation,
}: BackdropFilterParams): string {
  return `blur(${blur / 2}px) url('${filterUrl}') blur(${blur}px) brightness(${brightness}) saturate(${saturation})`;
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Tracks element dimensions via ResizeObserver.
 *
 * Dimensions are rounded to integers because the SVG filter is regenerated
 * on size change, and sub-pixel changes would cause unnecessary rebuilds.
 */
function useElementDimensions(
  ref: RefObject<HTMLElement | null>,
): Dimensions | null {
  const [dimensions, setDimensions] = useState<Dimensions | null>(null);

  const updateDimensions = useCallback(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setDimensions({
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      });
    }
  }, [ref]);

  useEffect(() => {
    updateDimensions();

    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver(updateDimensions);
    observer.observe(element);

    return () => observer.disconnect();
  }, [updateDimensions, ref]);

  return dimensions;
}

/**
 * Detects browser support for backdrop-filter.
 *
 * Returns true during SSR (optimistic) to avoid layout shift.
 * The effect degrades gracefully—unsupported browsers just see
 * no glass distortion, which is fine.
 */
function useSupportsBackdropFilter(): boolean {
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    const hasSupport =
      CSS.supports("backdrop-filter", "blur(1px)") ||
      CSS.supports("-webkit-backdrop-filter", "blur(1px)");
    setSupported(hasSupport);
  }, []);

  return supported;
}

// =============================================================================
// Public API
// =============================================================================

export interface GlassPanelProps {
  children?: ReactNode;
  className?: string;
  depth?: number;
  radius?: number;
  strength?: number;
  chromaticAberration?: number;
  blur?: number;
  /** When true, renders the displacement map as background for debugging */
  debug?: boolean;
}

/**
 * A container that applies SVG glass refraction effect via backdrop-filter.
 */
export function GlassPanel({
  children,
  className,
  depth = DEFAULT_GLASS_OPTIONS.depth,
  radius = DEFAULT_GLASS_OPTIONS.radius,
  strength = DEFAULT_GLASS_OPTIONS.strength,
  chromaticAberration = DEFAULT_GLASS_OPTIONS.chromaticAberration,
  blur = DEFAULT_GLASS_OPTIONS.blur,
  debug = false,
}: GlassPanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const dimensions = useElementDimensions(ref);

  const style = useMemo((): CSSProperties => {
    const base: CSSProperties = { borderRadius: radius };

    if (!dimensions || dimensions.width <= 0 || dimensions.height <= 0) {
      return base;
    }

    if (debug) {
      const mapUrl = buildDisplacementMapSvg({
        width: dimensions.width,
        height: dimensions.height,
        radius,
        depth,
      });
      return {
        ...base,
        background: `url("${mapUrl}")`,
        backgroundSize: "cover",
      };
    }

    const filterUrl = buildDisplacementFilterUrl({
      width: dimensions.width,
      height: dimensions.height,
      radius,
      depth,
      strength,
      chromaticAberration,
    });

    const backdropFilter = buildBackdropFilterValue({
      filterUrl,
      blur,
      brightness: DEFAULT_GLASS_OPTIONS.brightness,
      saturation: DEFAULT_GLASS_OPTIONS.saturation,
    });

    return {
      ...base,
      backdropFilter,
      WebkitBackdropFilter: backdropFilter,
    };
  }, [dimensions, radius, depth, strength, chromaticAberration, blur, debug]);

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}

/**
 * Global CSS classes for glass panel styling (background, shadows).
 */
export function GlassPanelCSS() {
  return (
    <style>{`
      .glass-panel {
        background: rgba(255, 255, 255, 0.15);
        box-shadow:
          inset 0 0 0 1px rgba(255, 255, 255, 0.2),
          inset 0 1px 0 rgba(255, 255, 255, 0.4),
          0 4px 16px rgba(0, 0, 0, 0.1);
      }
      .glass-panel-dark {
        background: rgba(0, 0, 0, 0.2);
        box-shadow:
          inset 0 0 0 1px rgba(255, 255, 255, 0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.15),
          0 4px 16px rgba(0, 0, 0, 0.2);
      }
    `}</style>
  );
}

export interface GlassPanelUnderlayProps {
  children: ReactNode;
  className?: string;
  depth?: number;
  radius?: number;
  strength?: number;
  chromaticAberration?: number;
  blur?: number;
  disabled?: boolean;
}

/**
 * Applies SVG glass refraction effect to a container.
 * On incompatible browsers or when disabled, renders without the effect.
 */
export function GlassPanelUnderlay({
  children,
  className,
  depth = DEFAULT_GLASS_OPTIONS.depth,
  radius = DEFAULT_GLASS_OPTIONS.radius,
  strength = DEFAULT_GLASS_OPTIONS.strength,
  chromaticAberration = DEFAULT_GLASS_OPTIONS.chromaticAberration,
  blur = DEFAULT_GLASS_OPTIONS.blur,
  disabled = false,
}: GlassPanelUnderlayProps) {
  const ref = useRef<HTMLDivElement>(null);
  const dimensions = useElementDimensions(ref);
  const supported = useSupportsBackdropFilter();

  const style = useMemo((): CSSProperties => {
    const base: CSSProperties = { borderRadius: radius };

    const canApply =
      !disabled &&
      supported &&
      dimensions &&
      dimensions.width > 0 &&
      dimensions.height > 0;

    if (!canApply) {
      return base;
    }

    const filterUrl = buildDisplacementFilterUrl({
      width: dimensions.width,
      height: dimensions.height,
      radius,
      depth,
      strength,
      chromaticAberration,
    });

    const backdropFilter = buildBackdropFilterValue({
      filterUrl,
      blur,
      brightness: DEFAULT_GLASS_OPTIONS.brightness,
      saturation: DEFAULT_GLASS_OPTIONS.saturation,
    });

    return {
      ...base,
      backdropFilter,
      WebkitBackdropFilter: backdropFilter,
    };
  }, [
    dimensions,
    radius,
    depth,
    strength,
    chromaticAberration,
    blur,
    disabled,
    supported,
  ]);

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}

export interface UseGlassStylesOptions {
  width: number;
  height: number;
  depth?: number;
  radius?: number;
  strength?: number;
  chromaticAberration?: number;
  blur?: number;
  brightness?: number;
  saturation?: number;
  enabled?: boolean;
}

/**
 * Hook that generates glass effect styles to apply directly to an element.
 * Use when you need to apply the glass effect to an existing element
 * rather than wrapping it with GlassPanel or GlassPanelUnderlay.
 */
export function useGlassStyles({
  width,
  height,
  depth = DEFAULT_GLASS_OPTIONS.depth,
  radius = DEFAULT_GLASS_OPTIONS.radius,
  strength = DEFAULT_GLASS_OPTIONS.strength,
  chromaticAberration = DEFAULT_GLASS_OPTIONS.chromaticAberration,
  blur = DEFAULT_GLASS_OPTIONS.blur,
  brightness = DEFAULT_GLASS_OPTIONS.brightness,
  saturation = DEFAULT_GLASS_OPTIONS.saturation,
  enabled = true,
}: UseGlassStylesOptions): CSSProperties {
  const supported = useSupportsBackdropFilter();

  return useMemo(() => {
    if (!enabled || !supported || width <= 0 || height <= 0) {
      return {};
    }

    const filterUrl = buildDisplacementFilterUrl({
      width,
      height,
      radius,
      depth,
      strength,
      chromaticAberration,
    });

    const backdropFilter = buildBackdropFilterValue({
      filterUrl,
      blur,
      brightness,
      saturation,
    });

    return {
      backdropFilter,
      WebkitBackdropFilter: backdropFilter,
    };
  }, [
    width,
    height,
    depth,
    radius,
    strength,
    chromaticAberration,
    blur,
    brightness,
    saturation,
    enabled,
    supported,
  ]);
}
