"use client";

import { useState, useCallback } from "react";
import { Leva } from "leva";
import { Copy, Check, Sparkle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SINE_VIGNETTE } from "./constants";
import { GlassTextHero } from "./glass-text-hero";
import { PATTERNS, unsplash, PatternPicker } from "./pattern-picker";
import { DemoArea, GlassDemo } from "./demo-components";
import {
  HighlightStyles,
  Box,
  BoxTitle,
  BoxContent,
  BoxCodeHeader,
  BoxCode,
  CodeBlock,
} from "./doc-components";

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
    <>
      {/* Fixed full-viewport background with selected pattern + sine-eased vignette */}
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-center bg-cover bg-fixed transition-[background-image] duration-500"
        style={{
          backgroundImage: unsplash(bg),
          opacity: 0.1,
          maskImage: SINE_VIGNETTE,
          WebkitMaskImage: SINE_VIGNETTE,
        }}
      />
      <div className="container relative z-10 mx-auto max-w-7xl space-y-16 px-4 pt-12 pb-28">
        <Leva collapsed={false} titleBar={{ title: "Glass Text Effect" }} />
        <HighlightStyles />
        <PatternPicker active={patternIndex} onChange={setPatternIndex} />

        {/* Hero */}
        <div className="mx-auto flex w-fit flex-col items-center space-y-6 text-center">
          <div className="glass glass-surface glass-bg-3 glass-chromatic-50 glass-blur-0 glass-saturation-200 glass-brightness-150 flex items-center gap-2 rounded-full px-4 py-1.5 text-sm">
            <Sparkle className="size-4 opacity-50" />
            <span className="text-foreground/60">Tailwind CSS v4 Plugin</span>
          </div>

          <div className="flex flex-col gap-5">
            <GlassTextHero bg={bg} />

            <p className="text-balance font-light text-lg text-muted-foreground">
              Realistic glass refraction, with a single class. Pure CSS, no
              JavaScript.
            </p>
          </div>
        </div>

        {/* Installation */}
        <div id="installation" className="space-y-8">
          <div className="mx-auto max-w-3xl space-y-6">
            <Box className="glass">
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

            <Box className="glass">
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
                <GlassDemo className="glass" />
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
                <GlassDemo className="glass glass-surface" />
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
              Simulates light dispersion through a prism using RGB channel
              splitting.
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
                  <GlassDemo
                    className="glass glass-blur-0"
                    label="0px"
                    compact
                  />
                  <GlassDemo
                    className="glass glass-blur-2"
                    label="2px"
                    compact
                  />
                  <GlassDemo
                    className="glass glass-blur-6"
                    label="6px"
                    compact
                  />
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
                <GlassDemo className="glass glass-strength-30 glass-blur-4 glass-saturation-150 glass-surface" />
              </DemoArea>
            </Box>
          </div>
        </div>
      </div>
    </>
  );
}
