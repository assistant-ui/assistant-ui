"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useMotionValue, useSpring, useMotionValueEvent } from "motion/react";
import { useControls, folder, button, Leva } from "leva";
import { Copy, Check, FileCode, Sparkle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SyntaxHighlighter } from "@/components/assistant-ui/shiki-highlighter";
import {
  transformerMetaHighlight,
  transformerMetaWordHighlight,
} from "@shikijs/transformers";

const HIGHLIGHT_STYLES = `
  .highlighted {
    background: rgba(59, 130, 246, 0.15);
    display: block;
  }
  .dark .highlighted {
    background: rgba(147, 197, 253, 0.25);
  }
  .highlighted-word {
    background: rgba(59, 130, 246, 0.2);
    color: rgb(30, 58, 138);
    padding: 0 0.125rem;
    border-radius: 0.125rem;
    font-style: normal;
    font-weight: inherit;
  }
  .dark .highlighted-word {
    background: rgba(147, 197, 253, 0.3);
    color: rgb(165, 180, 252);
  }
`;

function HighlightStyles() {
  return (
    <style jsx global>
      {HIGHLIGHT_STYLES}
    </style>
  );
}

export default function TwGlassPage() {
  const [copied, setCopied] = useState(false);
  const [patternIndex, setPatternIndex] = useState(0);

  const copyToClipboard = useCallback(async (text: string) => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, []);

  const bg = PATTERNS[patternIndex]?.id ?? "";

  return (
    <div className="container mx-auto max-w-7xl space-y-16 px-4 pt-12 pb-28">
      <Leva collapsed={false} titleBar={{ title: "Glass Text Effect" }} />
      <HighlightStyles />
      <PatternPicker active={patternIndex} onChange={setPatternIndex} />

      {/* Hero */}
      <div className="mx-auto flex w-fit flex-col items-center space-y-6 text-center">
        <div className="flex cursor-default rounded-full bg-border p-px">
          <div className="flex items-center gap-2 rounded-full bg-background px-4 py-1.5 text-sm">
            <Sparkle className="size-4 opacity-50" />
            <span className="text-foreground/60">Tailwind CSS v4 Plugin</span>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <GlassTextHero bg={bg} />

          <p className="max-w-[520px] text-balance font-light text-lg text-muted-foreground">
            Glass refraction via SVG displacement maps. Pure CSS, no JavaScript.
          </p>
        </div>
      </div>

      {/* Installation */}
      <div id="installation" className="space-y-8">
        <div className="text-center">
          <h2 className="font-medium text-3xl">Installation</h2>
        </div>

        <div className="mx-auto max-w-3xl space-y-6">
          <Box>
            <BoxContent>
              <div className="flex items-center justify-between">
                <code className="text-sm">npm install tw-glass</code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard("npm install tw-glass")}
                >
                  {copied ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              </div>
            </BoxContent>
          </Box>

          <Box>
            <BoxCodeHeader fileName="styles/globals.css" />
            <BoxCode>
              <CodeBlock
                language="css"
                code={`@import "tailwindcss";
@import "tw-glass";`}
                highlight="tw-glass"
                highlightMode="line"
              />
            </BoxCode>
          </Box>
        </div>
      </div>

      {/* Base Glass */}
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="mb-2 font-medium text-3xl">Glass Refraction</h2>
          <p className="text-muted-foreground text-xl">
            Composable utilities for glass-like displacement effects.
          </p>
        </div>

        <div className="mx-auto max-w-3xl space-y-6">
          <Box>
            <BoxTitle
              title="glass"
              description="Base utility. Applies SVG displacement filter via backdrop-filter. Requires visible content behind the element."
            />
            <BoxCode>
              <CodeBlock
                language="html"
                code='<div class="glass rounded-xl p-6">Glass panel</div>'
                highlight="glass"
                highlightMode="text"
              />
            </BoxCode>
            <DemoArea pattern={bg}>
              <GlassDemo className="glass" label="glass" />
            </DemoArea>
          </Box>

          <Box>
            <BoxTitle
              title="glass glass-surface"
              description="Add frosted surface styling (semi-transparent background + inner glow + shadow)."
            />
            <BoxCode>
              <CodeBlock
                language="html"
                code='<div class="glass glass-surface rounded-xl p-6">Frosted panel</div>'
                highlight="glass-surface"
                highlightMode="text"
              />
            </BoxCode>
            <DemoArea pattern={bg}>
              <GlassDemo
                className="glass glass-surface"
                label="glass glass-surface"
              />
            </DemoArea>
          </Box>
        </div>
      </div>

      {/* Strength */}
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="mb-2 font-medium text-3xl">Displacement Strength</h2>
          <p className="text-muted-foreground text-xl">
            Control how much the background is distorted.
          </p>
        </div>

        <div className="mx-auto max-w-3xl space-y-6">
          <Box>
            <BoxTitle
              title="glass-strength-{value}"
              description="Displacement intensity. Available: 5, 10, 20 (default), 30, 40, 50. Higher values create more dramatic refraction."
            />
            <BoxCode>
              <CodeBlock
                language="html"
                code='<div class="glass glass-strength-40 rounded-xl p-6">Strong glass</div>'
                highlight="glass-strength"
                highlightMode="text"
              />
            </BoxCode>
            <DemoArea pattern={bg}>
              <div className="grid grid-cols-3 gap-4">
                <GlassDemo
                  className="glass glass-strength-5"
                  label="5"
                  compact
                />
                <GlassDemo
                  className="glass glass-strength-20"
                  label="20"
                  compact
                />
                <GlassDemo
                  className="glass glass-strength-50"
                  label="50"
                  compact
                />
              </div>
            </DemoArea>
          </Box>
        </div>
      </div>

      {/* Chromatic */}
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="mb-2 font-medium text-3xl">Chromatic Aberration</h2>
          <p className="text-muted-foreground text-xl">
            RGB channel splitting simulates light dispersion through a prism.
          </p>
        </div>

        <div className="mx-auto max-w-3xl space-y-6">
          <Box>
            <BoxTitle
              title="glass-chromatic-{value}"
              description="Replaces standard displacement with per-channel RGB splitting. Same strength levels: 5, 10, 20, 30, 40, 50."
            />
            <BoxCode>
              <CodeBlock
                language="html"
                code='<div class="glass glass-chromatic-20 rounded-xl p-6">Chromatic glass</div>'
                highlight="glass-chromatic"
                highlightMode="text"
              />
            </BoxCode>
            <DemoArea pattern={bg}>
              <div className="grid grid-cols-3 gap-4">
                <GlassDemo
                  className="glass glass-chromatic-10"
                  label="10"
                  compact
                />
                <GlassDemo
                  className="glass glass-chromatic-20"
                  label="20"
                  compact
                />
                <GlassDemo
                  className="glass glass-chromatic-40"
                  label="40"
                  compact
                />
              </div>
            </DemoArea>
          </Box>
        </div>
      </div>

      {/* Continuous Modifiers */}
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="mb-2 font-medium text-3xl">Modifiers</h2>
          <p className="text-muted-foreground text-xl">
            Fine-tune blur, saturation, and brightness with any numeric value.
          </p>
        </div>

        <div className="mx-auto max-w-3xl space-y-6">
          <Box>
            <BoxTitle
              title="glass-blur-{px}"
              description="Post-displacement blur in pixels. Default: 2px."
            />
            <BoxCode>
              <CodeBlock
                language="html"
                code='<div class="glass glass-blur-6 rounded-xl p-6">Blurry glass</div>'
                highlight="glass-blur"
                highlightMode="text"
              />
            </BoxCode>
            <DemoArea pattern={bg}>
              <div className="grid grid-cols-3 gap-4">
                <GlassDemo className="glass glass-blur-0" label="0px" compact />
                <GlassDemo className="glass glass-blur-2" label="2px" compact />
                <GlassDemo className="glass glass-blur-6" label="6px" compact />
              </div>
            </DemoArea>
          </Box>

          <Box>
            <BoxTitle
              title="glass-saturation-{pct}"
              description="Color saturation as a percentage. Default: 120 (1.2x). 100 = no change."
            />
            <BoxCode>
              <CodeBlock
                language="html"
                code='<div class="glass glass-saturation-200 rounded-xl p-6">Vivid glass</div>'
                highlight="glass-saturation"
                highlightMode="text"
              />
            </BoxCode>
            <DemoArea pattern={bg}>
              <div className="grid grid-cols-3 gap-4">
                <GlassDemo
                  className="glass glass-saturation-50"
                  label="50"
                  compact
                />
                <GlassDemo
                  className="glass glass-saturation-120"
                  label="120"
                  compact
                />
                <GlassDemo
                  className="glass glass-saturation-200"
                  label="200"
                  compact
                />
              </div>
            </DemoArea>
          </Box>

          <Box>
            <BoxTitle
              title="glass-brightness-{pct}"
              description="Brightness as a percentage. Default: 105. 100 = no change."
            />
            <BoxCode>
              <CodeBlock
                language="html"
                code='<div class="glass glass-brightness-130 rounded-xl p-6">Bright glass</div>'
                highlight="glass-brightness"
                highlightMode="text"
              />
            </BoxCode>
            <DemoArea pattern={bg}>
              <div className="grid grid-cols-3 gap-4">
                <GlassDemo
                  className="glass glass-brightness-80"
                  label="80"
                  compact
                />
                <GlassDemo
                  className="glass glass-brightness-105"
                  label="105"
                  compact
                />
                <GlassDemo
                  className="glass glass-brightness-140"
                  label="140"
                  compact
                />
              </div>
            </DemoArea>
          </Box>
        </div>
      </div>

      {/* Composition */}
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="mb-2 font-medium text-3xl">Composition</h2>
          <p className="text-muted-foreground text-xl">
            Combine any modifiers with the base glass class.
          </p>
        </div>

        <div className="mx-auto max-w-3xl space-y-6">
          <Box>
            <BoxCode>
              <CodeBlock
                language="html"
                code={`<div class="glass glass-strength-30 glass-blur-4 glass-saturation-150 glass-surface rounded-xl p-6">
  Composed glass panel
</div>`}
                highlight={[
                  "glass-strength",
                  "glass-blur",
                  "glass-saturation",
                  "glass-surface",
                ]}
                highlightMode="text"
              />
            </BoxCode>
            <DemoArea pattern={bg}>
              <GlassDemo
                className="glass glass-strength-30 glass-blur-4 glass-saturation-150 glass-surface"
                label="glass glass-strength-30 glass-blur-4 glass-saturation-150 glass-surface"
              />
            </DemoArea>
          </Box>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Glass Text Hero with Leva tuning panel
// =============================================================================

const GLASS_TEXT_DEFAULTS = {
  // Blur (height map)
  blurStdDev: 1.1,
  // Diffuse lighting
  diffSurfaceScale: 8,
  diffConstant: 1.4,
  diffLightX: 0,
  diffLightY: -160,
  diffLightZ: 30,
  // Specular lighting
  specSurfaceScale: 9,
  specConstant: 3.2,
  specExponent: 17,
  specLightX: 0,
  specLightY: 160,
  specLightZ: 50,
  // Compositing
  diffOpacity: 0.7,
  specOpacity: 0.6,
  // Background
  showBgImage: true,
  bgOpacity: 1,
};

function GlassTextHero({ bg }: { bg: string }) {
  const filterId = "glass-text-tunable";
  const controlsRef = useRef<Record<string, unknown>>({});
  const diffPointLightRef = useRef<SVGFEPointLightElement>(null);
  const specPointLightRef = useRef<SVGFEPointLightElement>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springConfig = { stiffness: 200, damping: 30, mass: 0.3 };
  const sx = useSpring(mouseX, springConfig);
  const sy = useSpring(mouseY, springConfig);

  useMotionValueEvent(sx, "change", (v) => {
    diffPointLightRef.current?.setAttribute("x", String(v));
    specPointLightRef.current?.setAttribute("x", String(-v));
  });
  useMotionValueEvent(sy, "change", (v) => {
    diffPointLightRef.current?.setAttribute("y", String(v));
    specPointLightRef.current?.setAttribute("y", String(-v));
  });

  useEffect(() => {
    const range = 500;
    const onMove = (e: MouseEvent) => {
      mouseX.set(((e.clientX / window.innerWidth) * 2 - 1) * range);
      mouseY.set(((e.clientY / window.innerHeight) * 2 - 1) * range);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [mouseX, mouseY]);

  const controls = useControls({
    "Blur (Height Map)": folder({
      blurStdDev: {
        value: GLASS_TEXT_DEFAULTS.blurStdDev,
        min: 0,
        max: 8,
        step: 0.1,
        label: "Std Deviation",
      },
    }),
    "Diffuse Light": folder({
      diffSurfaceScale: {
        value: GLASS_TEXT_DEFAULTS.diffSurfaceScale,
        min: 0,
        max: 30,
        step: 0.5,
        label: "Surface Scale",
      },
      diffConstant: {
        value: GLASS_TEXT_DEFAULTS.diffConstant,
        min: 0,
        max: 3,
        step: 0.05,
        label: "Intensity",
      },
      diffLightX: {
        value: GLASS_TEXT_DEFAULTS.diffLightX,
        min: -500,
        max: 500,
        step: 10,
        label: "Light X",
      },
      diffLightY: {
        value: GLASS_TEXT_DEFAULTS.diffLightY,
        min: -500,
        max: 500,
        step: 10,
        label: "Light Y",
      },
      diffLightZ: {
        value: GLASS_TEXT_DEFAULTS.diffLightZ,
        min: 0,
        max: 800,
        step: 10,
        label: "Light Z",
      },
      diffOpacity: {
        value: GLASS_TEXT_DEFAULTS.diffOpacity,
        min: 0,
        max: 1,
        step: 0.05,
        label: "Opacity",
      },
    }),
    "Specular Highlight": folder({
      specSurfaceScale: {
        value: GLASS_TEXT_DEFAULTS.specSurfaceScale,
        min: 0,
        max: 30,
        step: 0.5,
        label: "Surface Scale",
      },
      specConstant: {
        value: GLASS_TEXT_DEFAULTS.specConstant,
        min: 0,
        max: 5,
        step: 0.1,
        label: "Intensity",
      },
      specExponent: {
        value: GLASS_TEXT_DEFAULTS.specExponent,
        min: 1,
        max: 128,
        step: 1,
        label: "Sharpness",
      },
      specLightX: {
        value: GLASS_TEXT_DEFAULTS.specLightX,
        min: -500,
        max: 500,
        step: 10,
        label: "Light X",
      },
      specLightY: {
        value: GLASS_TEXT_DEFAULTS.specLightY,
        min: -500,
        max: 500,
        step: 10,
        label: "Light Y",
      },
      specLightZ: {
        value: GLASS_TEXT_DEFAULTS.specLightZ,
        min: 0,
        max: 800,
        step: 10,
        label: "Light Z",
      },
      specOpacity: {
        value: GLASS_TEXT_DEFAULTS.specOpacity,
        min: 0,
        max: 1,
        step: 0.05,
        label: "Opacity",
      },
    }),
    Background: folder(
      {
        showBgImage: {
          value: GLASS_TEXT_DEFAULTS.showBgImage,
          label: "Show Image",
        },
        bgOpacity: {
          value: GLASS_TEXT_DEFAULTS.bgOpacity,
          min: 0,
          max: 1,
          step: 0.05,
          label: "Image Opacity",
        },
      },
      { collapsed: true },
    ),
    "Export for LLM": button(() => {
      const c = controlsRef.current;
      const lines = Object.entries(GLASS_TEXT_DEFAULTS)
        .filter(([, def]) => typeof def === "number")
        .map(([key]) => {
          const val = c[key];
          return `- ${key}: ${val}`;
        })
        .join("\n");
      const text = `## Glass Text Effect — Current Values\n\n${lines}`;
      navigator.clipboard.writeText(text);
    }),
  });

  controlsRef.current = controls;

  return (
    <div className="pointer-events-none select-none font-bold text-5xl tracking-tight lg:text-7xl">
      {/* Inline SVG filter — every parameter is live */}
      <svg
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 0,
          height: 0,
          mixBlendMode: "screen",
        }}
      >
        <defs>
          <filter
            id={filterId}
            x="-10%"
            y="-10%"
            width="120%"
            height="120%"
            colorInterpolationFilters="sRGB"
          >
            {/* Blur source alpha to create a smooth height map */}
            <feGaussianBlur
              in="SourceAlpha"
              stdDeviation={controls.blurStdDev}
              result="blur"
            />

            {/* Diffuse lighting — broad surface illumination */}
            <feDiffuseLighting
              in="blur"
              surfaceScale={controls.diffSurfaceScale}
              diffuseConstant={controls.diffConstant}
              result="diffuse"
            >
              <fePointLight
                ref={diffPointLightRef}
                x={0}
                y={0}
                z={controls.diffLightZ}
              />
            </feDiffuseLighting>

            {/* Specular lighting — sharp edge highlights */}
            <feSpecularLighting
              in="blur"
              surfaceScale={controls.specSurfaceScale}
              specularConstant={controls.specConstant}
              specularExponent={controls.specExponent}
              result="specular"
            >
              <fePointLight
                ref={specPointLightRef}
                x={0}
                y={0}
                z={controls.specLightZ}
              />
            </feSpecularLighting>

            {/* Clip both to original text alpha */}
            <feComposite
              in="specular"
              in2="SourceAlpha"
              operator="in"
              result="specClip"
            />
            <feComposite
              in="diffuse"
              in2="SourceAlpha"
              operator="in"
              result="diffClip"
            />

            {/* Fade diffuse/specular by their opacity sliders */}
            <feColorMatrix
              in="diffClip"
              type="matrix"
              values={`1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 ${controls.diffOpacity} 0`}
              result="diffFade"
            />
            <feColorMatrix
              in="specClip"
              type="matrix"
              values={`1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 ${controls.specOpacity} 0`}
              result="specFade"
            />

            {/* Layer: background image, diffuse, specular */}
            <feMerge>
              <feMergeNode in="SourceGraphic" />
              <feMergeNode in="diffFade" />
              <feMergeNode in="specFade" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      <h1
        className="pointer-events-auto inline text-9xl"
        style={{
          filter: `url(#${filterId})`,
          color: "transparent",
          backgroundImage: controls.showBgImage
            ? `linear-gradient(rgba(255,255,255,${1 - controls.bgOpacity}),rgba(255,255,255,${1 - controls.bgOpacity})),${unsplash(bg)}`
            : undefined,
          backgroundColor: controls.showBgImage ? undefined : "#999",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
        }}
      >
        tw-glass
      </h1>
    </div>
  );
}

// =============================================================================
// Demo components
// =============================================================================

// ─── Background Patterns ────────────────────────────────────────────
// Unsplash photos that look great under glass refraction.

const unsplash = (id: string) =>
  `url(https://images.unsplash.com/${id}?auto=format&fit=crop&w=1920&q=80)`;

const unsplashThumb = (id: string) =>
  `url(https://images.unsplash.com/${id}?auto=format&fit=crop&w=88&h=88&q=60)`;

const PATTERNS = [
  { name: "Waterfall", id: "photo-1626080308326-a6131ac180db" },
  { name: "Fern", id: "photo-1557672172-298e090bd0f1" },
  { name: "Hands", id: "photo-1541661538396-53ba2d051eed" },
  { name: "Abstract", id: "photo-1604871000636-074fa5117945" },
  { name: "Wave", id: "photo-1659762073691-e724db40f9d5" },
  { name: "Portrait", id: "photo-1599163666602-ef737d996c16" },
];

function DemoArea({
  children,
  pattern,
}: {
  children: React.ReactNode;
  pattern: string;
}) {
  return (
    <div
      className="relative overflow-hidden bg-muted p-6 shadow-[inset_0_1px_4px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_4px_rgba(0,0,0,0.4)]"
      style={{
        backgroundImage: unsplash(pattern),
        backgroundAttachment: "fixed",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {children}
    </div>
  );
}

function PatternPicker({
  active,
  onChange,
}: {
  active: number;
  onChange: (index: number) => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center">
      <div className="glass glass-surface flex gap-2 rounded-2xl p-2">
        {PATTERNS.map((p, i) => (
          <button
            key={p.name}
            type="button"
            onClick={() => onChange(i)}
            aria-label={p.name}
            title={p.name}
            className={`size-11 cursor-pointer overflow-hidden rounded-xl bg-muted transition-all ${
              active === i
                ? "ring-2 ring-foreground/40 ring-offset-2 ring-offset-background"
                : "opacity-70 hover:opacity-100"
            }`}
            style={{
              backgroundImage: unsplashThumb(p.id),
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function GlassDemo({
  className,
  label,
  compact = false,
}: {
  className: string;
  label: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-xl ${className} ${compact ? "px-4 py-6" : "p-6"}`}
      style={{ minHeight: compact ? 80 : 100 }}
    >
      <code className="rounded bg-foreground/10 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
        {label}
      </code>
    </div>
  );
}

// =============================================================================
// Shared components (matching tw-shimmer page)
// =============================================================================

interface CodeBlockProps {
  language: string;
  code: string;
  highlight?: string | string[];
  highlightMode?: "line" | "text";
}

function CodeBlock({
  language,
  code,
  highlight,
  highlightMode = "line",
}: CodeBlockProps) {
  let metaProps = {};

  if (highlight) {
    const highlights = Array.isArray(highlight) ? highlight : [highlight];

    if (highlightMode === "text") {
      const patterns = highlights.map((h) => `/${h}/`).join(" ");
      metaProps = { meta: { __raw: patterns } };
    } else if (highlightMode === "line") {
      const lines = code.split("\n");
      const lineNumbers = lines
        .map((line, index) =>
          highlights.some((h) => line.includes(h)) ? index + 1 : null,
        )
        .filter((n): n is number => n !== null);

      if (lineNumbers.length > 0) {
        metaProps = { meta: { __raw: `{${lineNumbers.join(",")}}` } };
      }
    }
  }

  return (
    <SyntaxHighlighter
      language={language}
      code={code}
      {...metaProps}
      addDefaultStyles={false}
      className="[--padding-left:1.5rem] [&_code]:block [&_pre]:m-0 [&_pre]:rounded-none [&_pre]:bg-transparent! [&_pre]:px-0 [&_pre]:py-4"
      transformers={[
        transformerMetaHighlight(),
        transformerMetaWordHighlight(),
      ]}
      components={{
        // biome-ignore lint/correctness/noNestedComponentDefinitions: false positive
        Pre: ({ className, ...props }: any) => (
          <pre className={className} {...props} />
        ),
        // biome-ignore lint/correctness/noNestedComponentDefinitions: false positive
        Code: ({ className, ...props }: any) => (
          <code className={className} {...props} />
        ),
      }}
    />
  );
}

function Box({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed [&>*:not(:last-child)]:border-b [&>*:not(:last-child)]:border-dashed">
      {children}
    </div>
  );
}

function BoxTitle({
  title,
  description,
}: {
  title: string;
  description: React.ReactNode;
}) {
  return (
    <div className="space-y-2 bg-muted/40 p-6">
      <h3 className="font-mono text-lg">{title}</h3>
      <p className="max-w-[70ch] text-muted-foreground text-sm">
        {description}
      </p>
    </div>
  );
}

function BoxContent({ children }: { children: React.ReactNode }) {
  return <div className="p-6">{children}</div>;
}

function BoxCodeHeader({ fileName }: { fileName: string }) {
  return (
    <div className="flex items-center gap-2 px-6 py-4 font-medium font-mono text-sm">
      <FileCode className="size-4 text-muted-foreground" />
      {fileName}
    </div>
  );
}

function BoxCode({ children }: { children: React.ReactNode }) {
  return <div className="p-2 text-sm">{children}</div>;
}
