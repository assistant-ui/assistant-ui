"use client";

import { useState, type ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { CopyCommandButton } from "@/components/shared/copy-command-button";
import { Highlight } from "@/components/shared/highlight";
import { CodeBlock } from "@/components/ui/code-block";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typeEyebrow, typePage } from "@/components/shared/type";
import { cn } from "@/lib/utils";
import { GlassTextHero } from "./glass-text-hero";
import { PATTERNS, unsplash, PatternPicker } from "./pattern-picker";
import { DemoArea, GlassDemo } from "./demo-components";

const ANALYTICS_PAGE = "tw-glass" as const;

export default function TwGlassPage() {
  const [patternIndex, setPatternIndex] = useState(0);
  const bg = PATTERNS[patternIndex]?.id ?? "";
  const patternName = PATTERNS[patternIndex]?.name.toLowerCase() ?? "";

  return (
    <PageFrame pad="sub">
      <header className="max-w-2xl">
        <h1 className={typePage}>Refraction, pure CSS.</h1>
        <p className={cn(typeDeck, "mt-4 max-w-[52ch]")}>
          Realistic glass for Tailwind CSS v4: SVG displacement maps, chromatic
          aberration, frosted surfaces. No JavaScript.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
          <CopyCommandButton
            command="npm install tw-glass"
            analyticsContext={{ page: ANALYTICS_PAGE, section: "hero" }}
          />
          <a
            href="https://github.com/assistant-ui/assistant-ui/tree/main/packages/tw-glass"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            README on GitHub
          </a>
        </div>
      </header>

      <figure className="mt-12 md:mt-16">
        <div
          className="border-foreground/10 relative overflow-hidden border transition-[background-image] duration-500"
          style={{
            backgroundImage: unsplash(bg),
            backgroundAttachment: "fixed",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="flex min-h-[24rem] items-center justify-center px-6 py-16">
            <GlassTextHero bg={bg} />
          </div>
        </div>
        <figcaption className="mt-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <span className="text-muted-foreground/70 font-mono text-[11px] tracking-wide">
            fig. 01 · {patternName} · move the cursor
          </span>
          <PatternPicker active={patternIndex} onChange={setPatternIndex} />
        </figcaption>
      </figure>

      <div className="border-foreground/10 mt-16 border-t md:mt-20">
        <DemoSection
          id="installation"
          title="Install"
          description="Add the plugin next to Tailwind."
        >
          <Snippet
            lang="css"
            title="app/globals.css"
            code={`@import "tailwindcss";
@import "tw-glass";`}
          />
        </DemoSection>

        <DemoSection
          title="Refraction"
          description="Composable utilities for glass-like displacement."
        >
          <Example
            title="glass"
            description="Base utility. Applies an SVG displacement filter via backdrop-filter. Requires visible content behind the element."
            code='<div class="glass rounded-xl p-6">Glass panel</div>'
            bg={bg}
          >
            <GlassDemo className="glass" />
          </Example>

          <Example
            title="glass glass-surface"
            description="Add frosted surface styling: a semi-transparent background, inner glow, and shadow."
            code='<div class="glass glass-surface rounded-xl p-6">Frosted panel</div>'
            bg={bg}
          >
            <GlassDemo className="glass glass-surface" />
          </Example>
        </DemoSection>

        <DemoSection
          title="Strength"
          description="How much the background distorts."
        >
          <Example
            title="glass-strength-{value}"
            description="Displacement intensity. Available: 5, 10, 20 (default), 30, 40, 50. Higher values create more dramatic refraction."
            code='<div class="glass glass-strength-40 rounded-xl p-6">Strong glass</div>'
            bg={bg}
          >
            <div className="grid grid-cols-3">
              <GlassDemo className="glass glass-strength-5" label="5" />
              <GlassDemo className="glass glass-strength-20" label="20" />
              <GlassDemo className="glass glass-strength-50" label="50" />
            </div>
          </Example>
        </DemoSection>

        <DemoSection
          title="Chromatic"
          description="Prism dispersion via RGB channel splitting."
        >
          <Example
            title="glass-chromatic-{value}"
            description="Replaces standard displacement with per-channel RGB splitting. Same strength levels: 5, 10, 20, 30, 40, 50."
            code='<div class="glass glass-chromatic-20 rounded-xl p-6">Chromatic glass</div>'
            bg={bg}
          >
            <div className="grid grid-cols-3">
              <GlassDemo className="glass glass-chromatic-10" label="10" />
              <GlassDemo className="glass glass-chromatic-20" label="20" />
              <GlassDemo className="glass glass-chromatic-40" label="40" />
            </div>
          </Example>
        </DemoSection>

        <DemoSection
          title="Modifiers"
          description="Blur, saturation, and brightness, with any numeric value."
        >
          <Example
            title="glass-blur-{px}"
            description="Post-displacement blur in pixels. Default: 2px."
            code='<div class="glass glass-blur-6 rounded-xl p-6">Blurry glass</div>'
            bg={bg}
          >
            <div className="grid grid-cols-3">
              <GlassDemo className="glass glass-blur-0" label="0px" />
              <GlassDemo className="glass glass-blur-2" label="2px" />
              <GlassDemo className="glass glass-blur-6" label="6px" />
            </div>
          </Example>

          <Example
            title="glass-saturation-{pct}"
            description="Color saturation as a percentage. Default: 120 (1.2x). 100 = no change."
            code='<div class="glass glass-saturation-200 rounded-xl p-6">Vivid glass</div>'
            bg={bg}
          >
            <div className="grid grid-cols-3">
              <GlassDemo className="glass glass-saturation-50" label="50" />
              <GlassDemo className="glass glass-saturation-120" label="120" />
              <GlassDemo className="glass glass-saturation-200" label="200" />
            </div>
          </Example>

          <Example
            title="glass-brightness-{pct}"
            description="Brightness as a percentage. Default: 105. 100 = no change."
            code='<div class="glass glass-brightness-130 rounded-xl p-6">Bright glass</div>'
            bg={bg}
          >
            <div className="grid grid-cols-3">
              <GlassDemo className="glass glass-brightness-80" label="80" />
              <GlassDemo className="glass glass-brightness-105" label="105" />
              <GlassDemo className="glass glass-brightness-140" label="140" />
            </div>
          </Example>
        </DemoSection>

        <DemoSection
          title="Composition"
          description="Stack modifiers on the base class."
        >
          <Example
            title="glass glass-strength-30 glass-blur-4 …"
            description="Combine any modifiers with the base glass class."
            code={`<div class="glass glass-strength-30 glass-blur-4 glass-saturation-150 glass-surface rounded-xl p-6">
  Composed glass panel
</div>`}
            bg={bg}
          >
            <GlassDemo className="glass glass-strength-30 glass-blur-4 glass-saturation-150 glass-surface" />
          </Example>
        </DemoSection>
      </div>

      <footer className="mt-16 flex flex-col gap-3">
        <p className="text-muted-foreground text-sm">
          The loading sibling:{" "}
          <a
            href="/tw-shimmer"
            className="text-foreground font-medium transition-colors"
          >
            tw-shimmer
          </a>
          .
        </p>
        <a
          href="https://github.com/assistant-ui/assistant-ui/tree/main/packages/tw-glass"
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground group inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          Full reference in the README
          <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>
      </footer>
    </PageFrame>
  );
}

function DemoSection({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="border-foreground/10 scroll-mt-24 border-b py-10 md:grid md:grid-cols-[180px_minmax(0,1fr)] md:gap-12 md:py-12"
    >
      <div className="mb-6 md:sticky md:top-24 md:mb-0 md:self-start">
        <h2 className={typeEyebrow}>{title}</h2>
        <p className="text-muted-foreground/70 mt-2 max-w-[22ch] text-[13px] leading-relaxed">
          {description}
        </p>
      </div>
      <div className="flex flex-col gap-12">{children}</div>
    </section>
  );
}

function Example({
  title,
  description,
  code,
  bg,
  children,
}: {
  title: string;
  description: string;
  code: string;
  bg: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="font-mono text-[14px] font-medium">{title}</h3>
        <p className="text-muted-foreground mt-1 max-w-[60ch] text-sm leading-relaxed text-pretty">
          {description}
        </p>
      </div>
      <div className="border-foreground/10 overflow-hidden border">
        <DemoArea pattern={bg}>{children}</DemoArea>
      </div>
      <Snippet lang="html" code={code} />
    </div>
  );
}

function Snippet({
  lang,
  code,
  title,
}: {
  lang: string;
  code: string;
  title?: string;
}) {
  return (
    <CodeBlock {...(title ? { title } : {})} className="my-0">
      <Highlight code={code} language={lang} />
    </CodeBlock>
  );
}
