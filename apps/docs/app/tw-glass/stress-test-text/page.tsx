"use client";

import { useState, useEffect, type ReactNode } from "react";

const PHOTO_ID = "photo-1531366936337-7c912a4589a7";
const unsplash = (id: string) =>
  `url(https://images.unsplash.com/${id}?auto=format&fit=crop&w=1920&q=80)`;

const BG_IMAGE = unsplash(PHOTO_ID);

const TEXT_BG: React.CSSProperties = {
  backgroundImage: BG_IMAGE,
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundAttachment: "fixed",
};

export default function GlassTextStressTestPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <header className="mb-12 space-y-4">
          <h1 className="font-bold text-4xl">Glass Text Stress Test</h1>
          <p className="max-w-2xl text-muted-foreground">
            Pressure-test the glass-text utility under heavy load: many
            elements, extreme sizes, varied backgrounds, long copy, and all
            options simultaneously.
          </p>
        </header>

        <div className="flex gap-8">
          <aside className="hidden w-56 shrink-0 lg:block">
            <TableOfContents />
          </aside>

          <main className="min-w-0 flex-1 space-y-16">
            <MassGridSection />
            <FontSizeSection />
            <FontWeightSection />
            <BackgroundVariantsSection />
            <LongCopySection />
            <NestedContainersSection />
            <ScrollStressSection />
            <InteractiveSection />
          </main>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TABLE OF CONTENTS
// ============================================================================

function TableOfContents() {
  const sections = [
    { id: "mass-grid", label: "Mass Grid" },
    { id: "font-sizes", label: "Font Sizes" },
    { id: "font-weights", label: "Font Weights" },
    { id: "backgrounds", label: "Backgrounds" },
    { id: "long-copy", label: "Long Copy" },
    { id: "nested-containers", label: "Nested Containers" },
    { id: "scroll-stress", label: "Scroll Stress" },
    { id: "interactive", label: "Interactive" },
  ];

  return (
    <nav className="sticky top-24">
      <h2 className="mb-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
        Sections
      </h2>
      <ul className="space-y-1">
        {sections.map(({ id, label }) => (
          <li key={id}>
            <a
              href={`#${id}`}
              className="block rounded-md px-3 py-1.5 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
            >
              {label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-8 space-y-6">
      <div className="space-y-2">
        <h2 className="font-bold text-2xl">{title}</h2>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function TestCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3 overflow-x-auto rounded-lg border border-dashed p-4">
      <div>
        <h3 className="font-semibold">{title}</h3>
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function DemoArea({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-muted p-6 shadow-[inset_0_1px_4px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_4px_rgba(0,0,0,0.4)] ${className}`}
    >
      {children}
    </div>
  );
}

function GlassText({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={`glass-text ${className}`}
      style={{ ...TEXT_BG, ...style }}
    >
      {children}
    </span>
  );
}

function useFps() {
  const [fps, setFps] = useState(0);

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let rafId: number;

    function tick() {
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastTime = now;
      }
      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return fps;
}

function FpsCounter() {
  const fps = useFps();
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1 font-mono text-sm">
      <span
        className={`size-2 rounded-full ${
          fps >= 55
            ? "bg-green-500"
            : fps >= 30
              ? "bg-yellow-500"
              : "bg-red-500"
        }`}
      />
      {fps} FPS
    </div>
  );
}

// ============================================================================
// MASS GRID SECTION
// ============================================================================

function MassGridSection() {
  const [count, setCount] = useState(24);
  const cols = Math.min(Math.ceil(Math.sqrt(count)), 8);

  return (
    <Section
      id="mass-grid"
      title="Mass Grid"
      description="Raw element count with glass-text. Crank the slider to stress the filter chain."
    >
      <TestCard
        title={`${count} glass-text elements`}
        description="Each cell is a glass-text heading over a shared photo background."
      >
        <div className="mb-4 flex items-center gap-4">
          <label
            className="flex items-center gap-2 font-medium text-sm"
            htmlFor="mass-grid-count"
          >
            Elements
            <span className="font-mono text-muted-foreground">{count}</span>
          </label>
          <input
            id="mass-grid-count"
            type="range"
            min="4"
            max="120"
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="flex-1"
          />
          <FpsCounter />
        </div>
        <DemoArea>
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="text-center">
                <GlassText className="font-bold text-3xl">Glass</GlassText>
              </div>
            ))}
          </div>
        </DemoArea>
      </TestCard>
    </Section>
  );
}

// ============================================================================
// FONT SIZE SECTION
// ============================================================================

const FONT_SIZES = [
  { label: "text-sm", cls: "text-sm" },
  { label: "text-base", cls: "text-base" },
  { label: "text-2xl", cls: "text-2xl" },
  { label: "text-4xl", cls: "text-4xl" },
  { label: "text-6xl", cls: "text-6xl" },
  { label: "text-8xl", cls: "text-8xl" },
  { label: "text-9xl", cls: "text-9xl" },
];

function FontSizeSection() {
  return (
    <Section
      id="font-sizes"
      title="Font Sizes"
      description="Glass text at every scale, from body copy to hero headlines. Tests filter rendering at extreme glyph sizes."
    >
      <TestCard
        title="text-sm through text-9xl"
        description="The SVG filter uses SourceAlpha, so glyph dimensions directly affect the height map."
      >
        <DemoArea>
          <div className="space-y-6">
            {FONT_SIZES.map(({ label, cls }) => (
              <div key={label} className="space-y-1">
                <code className="rounded bg-foreground/10 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {label}
                </code>
                <div>
                  <GlassText className={`font-bold ${cls}`}>tw-glass</GlassText>
                </div>
              </div>
            ))}
          </div>
        </DemoArea>
      </TestCard>
    </Section>
  );
}

// ============================================================================
// FONT WEIGHT SECTION
// ============================================================================

const FONT_WEIGHTS = [
  { label: "font-thin", cls: "font-thin" },
  { label: "font-light", cls: "font-light" },
  { label: "font-normal", cls: "font-normal" },
  { label: "font-medium", cls: "font-medium" },
  { label: "font-semibold", cls: "font-semibold" },
  { label: "font-bold", cls: "font-bold" },
  { label: "font-extrabold", cls: "font-extrabold" },
  { label: "font-black", cls: "font-black" },
];

function FontWeightSection() {
  return (
    <Section
      id="font-weights"
      title="Font Weights"
      description="Glyph stroke thickness affects the alpha channel height map. Thin strokes produce sharper highlights; heavy strokes broaden the diffuse area."
    >
      <TestCard
        title="font-thin through font-black"
        description="All at text-5xl to make weight differences visible."
      >
        <DemoArea>
          <div className="space-y-4">
            {FONT_WEIGHTS.map(({ label, cls }) => (
              <div key={label} className="flex items-baseline gap-4">
                <code className="w-32 shrink-0 rounded bg-foreground/10 px-1.5 py-0.5 text-right font-mono text-[10px] text-muted-foreground">
                  {label}
                </code>
                <GlassText className={`text-5xl ${cls}`}>tw-glass</GlassText>
              </div>
            ))}
          </div>
        </DemoArea>
      </TestCard>
    </Section>
  );
}

// ============================================================================
// BACKGROUND VARIANTS SECTION
// ============================================================================

const BG_VARIANTS: {
  label: string;
  style: React.CSSProperties;
}[] = [
  {
    label: "Photo (fixed)",
    style: {
      backgroundImage: BG_IMAGE,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "fixed",
    },
  },
  {
    label: "Linear gradient",
    style: {
      backgroundImage: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    },
  },
  {
    label: "Radial gradient",
    style: {
      backgroundImage:
        "radial-gradient(circle at 30% 40%, #f093fb, #f5576c, #4facfe)",
    },
  },
  {
    label: "Conic gradient",
    style: {
      backgroundImage:
        "conic-gradient(from 45deg, #12c2e9, #c471ed, #f64f59, #12c2e9)",
    },
  },
  {
    label: "Solid color",
    style: { backgroundColor: "#888" },
  },
  {
    label: "Dark solid",
    style: { backgroundColor: "#222" },
  },
];

function BackgroundVariantsSection() {
  return (
    <Section
      id="backgrounds"
      title="Background Variants"
      description="Glass text with different background sources clipped through the text. Tests visual quality across gradients, photos, and solids."
    >
      <TestCard
        title="6 background styles"
        description="Each heading uses a different background-image/color with background-clip: text."
      >
        <DemoArea>
          <div className="space-y-6">
            {BG_VARIANTS.map(({ label, style }) => (
              <div key={label} className="space-y-1">
                <code className="rounded bg-foreground/10 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {label}
                </code>
                <div>
                  <GlassText className="font-bold text-6xl" style={style}>
                    tw-glass
                  </GlassText>
                </div>
              </div>
            ))}
          </div>
        </DemoArea>
      </TestCard>
    </Section>
  );
}

// ============================================================================
// LONG COPY SECTION
// ============================================================================

const LOREM =
  "The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs. How vexingly quick daft zebras jump. Sphinx of black quartz, judge my vow.";

function LongCopySection() {
  return (
    <Section
      id="long-copy"
      title="Long Copy"
      description="Glass text applied to paragraphs and multi-line content. Tests filter performance on large text blocks."
    >
      <TestCard
        title="Paragraph text"
        description="Full paragraphs of glass text at different sizes."
      >
        <DemoArea>
          <div className="space-y-6">
            <div className="space-y-1">
              <code className="rounded bg-foreground/10 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                text-lg
              </code>
              <p>
                <GlassText className="font-medium text-lg leading-relaxed">
                  {LOREM} {LOREM}
                </GlassText>
              </p>
            </div>

            <div className="space-y-1">
              <code className="rounded bg-foreground/10 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                text-2xl
              </code>
              <p>
                <GlassText className="font-semibold text-2xl leading-relaxed">
                  {LOREM}
                </GlassText>
              </p>
            </div>

            <div className="space-y-1">
              <code className="rounded bg-foreground/10 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                text-4xl (multiline)
              </code>
              <p>
                <GlassText className="font-bold text-4xl leading-tight">
                  {LOREM}
                </GlassText>
              </p>
            </div>
          </div>
        </DemoArea>
      </TestCard>
    </Section>
  );
}

// ============================================================================
// NESTED CONTAINERS SECTION
// ============================================================================

function NestedContainersSection() {
  return (
    <Section
      id="nested-containers"
      title="Nested Containers"
      description="Glass text inside glass panels, and glass panels inside glass text regions. Tests filter stacking."
    >
      <TestCard
        title="glass-text inside glass panels"
        description="Glass text headings rendered within glass glass-surface containers."
      >
        <DemoArea className="p-0">
          <div
            className="p-6"
            style={{
              backgroundImage: BG_IMAGE,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundAttachment: "fixed",
            }}
          >
            <div className="space-y-4">
              <div className="glass glass-surface rounded-xl p-6">
                <GlassText className="font-bold text-4xl">
                  Heading inside glass
                </GlassText>
                <p className="mt-2 text-muted-foreground text-sm">
                  Regular text below the glass heading.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="glass glass-surface glass-strength-30 rounded-xl p-6">
                  <GlassText className="font-bold text-2xl">Panel A</GlassText>
                </div>
                <div className="glass glass-surface glass-chromatic-20 rounded-xl p-6">
                  <GlassText className="font-bold text-2xl">Panel B</GlassText>
                </div>
              </div>

              <div className="glass glass-surface rounded-xl p-6">
                <div className="glass glass-surface rounded-lg p-4">
                  <GlassText className="font-bold text-3xl">
                    Double nested
                  </GlassText>
                </div>
              </div>
            </div>
          </div>
        </DemoArea>
      </TestCard>
    </Section>
  );
}

// ============================================================================
// SCROLL STRESS SECTION
// ============================================================================

function ScrollStressSection() {
  return (
    <Section
      id="scroll-stress"
      title="Scroll Stress"
      description="40 glass-text headings stacked vertically. Tests filter performance during scroll."
    >
      <TestCard
        title="Scroll through glass text headings"
        description="Each heading uses glass-text with a fixed background."
      >
        <div className="relative h-[500px] overflow-y-auto rounded-lg bg-muted">
          <div className="space-y-4 p-4">
            {Array.from({ length: 40 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-foreground/10 border-dashed px-4 py-3"
              >
                <GlassText className="font-bold text-3xl">
                  Glass heading {i + 1}
                </GlassText>
              </div>
            ))}
          </div>
        </div>
      </TestCard>
    </Section>
  );
}

// ============================================================================
// INTERACTIVE SECTION
// ============================================================================

const PHOTO_OPTIONS = [
  { label: "Aurora", id: "photo-1531366936337-7c912a4589a7" },
  { label: "Fern", id: "photo-1557672172-298e090bd0f1" },
  { label: "Wave", id: "photo-1659762073691-e724db40f9d5" },
  { label: "Gradient", id: "" },
];

function InteractiveSection() {
  const [count, setCount] = useState(8);
  const [fontSize, setFontSize] = useState(64);
  const [fontWeight, setFontWeight] = useState(700);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [text, setText] = useState("tw-glass");

  const cols = Math.min(count, 4);

  const photo = PHOTO_OPTIONS[photoIdx];
  const bgStyle: React.CSSProperties = photo?.id
    ? {
        backgroundImage: unsplash(photo.id),
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }
    : {
        backgroundImage: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      };

  return (
    <Section
      id="interactive"
      title="Interactive"
      description="User-controlled parameters. All sliders update in real time."
    >
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-5">
          <SliderControl
            id="int-count"
            label="Elements"
            value={count}
            min={1}
            max={48}
            onChange={setCount}
            display={`${count}`}
          />

          <SliderControl
            id="int-font-size"
            label="Font Size"
            value={fontSize}
            min={12}
            max={192}
            onChange={setFontSize}
            display={`${fontSize}px`}
          />

          <SliderControl
            id="int-font-weight"
            label="Font Weight"
            value={fontWeight}
            min={100}
            max={900}
            step={100}
            onChange={setFontWeight}
            display={`${fontWeight}`}
          />

          <div className="space-y-2">
            <label className="font-medium text-sm" htmlFor="int-text">
              Text
            </label>
            <input
              id="int-text"
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <span className="font-medium text-sm">Background</span>
            <div className="flex gap-2">
              {PHOTO_OPTIONS.map((p, i) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setPhotoIdx(i)}
                  className={`cursor-pointer rounded-md px-3 py-1.5 text-sm transition-colors ${
                    photoIdx === i
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <FpsCounter />
        </div>

        <div>
          <DemoArea>
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="text-center">
                  <GlassText
                    className="inline-block"
                    style={{
                      ...bgStyle,
                      fontSize: `${fontSize}px`,
                      fontWeight,
                    }}
                  >
                    {text}
                  </GlassText>
                </div>
              ))}
            </div>
          </DemoArea>
        </div>
      </div>
    </Section>
  );
}

function SliderControl({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  display,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  display: string;
}) {
  return (
    <div className="space-y-2">
      <label
        className="flex items-center justify-between font-medium text-sm"
        htmlFor={id}
      >
        <span>{label}</span>
        <span className="font-mono text-muted-foreground">{display}</span>
      </label>
      <input
        id={id}
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
