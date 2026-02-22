"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";

const PHOTO_ID = "photo-1531366936337-7c912a4589a7";
const unsplash = (id: string) =>
  `url(https://images.unsplash.com/${id}?auto=format&fit=crop&w=1920&q=80)`;

const BG_STYLE: React.CSSProperties = {
  backgroundImage: unsplash(PHOTO_ID),
  backgroundAttachment: "fixed",
  backgroundSize: "cover",
  backgroundPosition: "center",
};

export default function GlassStressTestPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <header className="mb-12 space-y-4">
          <h1 className="font-bold text-4xl">Glass Stress Test</h1>
          <p className="max-w-2xl text-muted-foreground">
            Pressure-test tw-glass rendering under heavy load: many elements,
            nested glass, extreme blur, rapid resizing, and all variants
            simultaneously.
          </p>
        </header>

        <div className="flex gap-8">
          <aside className="hidden w-56 shrink-0 lg:block">
            <TableOfContents />
          </aside>

          <main className="min-w-0 flex-1 space-y-16">
            <MassGridSection />
            <AllVariantsSection />
            <NestedGlassSection />
            <ScrollStressSection />
            <ResizeBehaviorSection />
            <BlurExtremesSection />
            <ComposabilitySection />
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
    { id: "all-variants", label: "All Variants" },
    { id: "nested-glass", label: "Nested Glass" },
    { id: "scroll-stress", label: "Scroll Stress" },
    { id: "resize-behavior", label: "Resize Behavior" },
    { id: "blur-extremes", label: "Blur Extremes" },
    { id: "composability", label: "Composability" },
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

function DemoArea({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative overflow-hidden rounded-lg bg-muted p-6 shadow-[inset_0_1px_4px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_4px_rgba(0,0,0,0.4)]"
      style={BG_STYLE}
    >
      {children}
    </div>
  );
}

function GlassPanel({
  className = "",
  label,
  compact = false,
}: {
  className?: string;
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
  const [count, setCount] = useState(36);
  const cols = Math.ceil(Math.sqrt(count));

  return (
    <Section
      id="mass-grid"
      title="Mass Grid"
      description="Raw element count under glass. Crank the slider to stress the compositor."
    >
      <TestCard
        title={`${count} glass elements`}
        description="Each cell is a glass glass-surface div over a shared photo background."
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
            min="10"
            max="200"
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="flex-1"
          />
          <FpsCounter />
        </div>
        <DemoArea>
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: count }).map((_, i) => (
              <div
                key={i}
                className="glass glass-surface aspect-square rounded-lg"
              />
            ))}
          </div>
        </DemoArea>
      </TestCard>
    </Section>
  );
}

// ============================================================================
// ALL VARIANTS SECTION
// ============================================================================

const STRENGTH_VARIANTS = [
  { label: "strength-5", cls: "glass glass-strength-5" },
  { label: "strength-10", cls: "glass glass-strength-10" },
  { label: "strength-20", cls: "glass glass-strength-20" },
  { label: "strength-30", cls: "glass glass-strength-30" },
  { label: "strength-40", cls: "glass glass-strength-40" },
  { label: "strength-50", cls: "glass glass-strength-50" },
];

const CHROMATIC_VARIANTS = [
  { label: "chromatic-5", cls: "glass glass-chromatic-5" },
  { label: "chromatic-10", cls: "glass glass-chromatic-10" },
  { label: "chromatic-20", cls: "glass glass-chromatic-20" },
  { label: "chromatic-30", cls: "glass glass-chromatic-30" },
  { label: "chromatic-40", cls: "glass glass-chromatic-40" },
  { label: "chromatic-50", cls: "glass glass-chromatic-50" },
];

function AllVariantsSection() {
  return (
    <Section
      id="all-variants"
      title="All Variants"
      description="Every strength and chromatic level rendered simultaneously."
    >
      <TestCard
        title="6 strength + 6 chromatic = 12 panels"
        description="All active at once over the same photo background."
      >
        <DemoArea>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
              {STRENGTH_VARIANTS.map(({ label, cls }) => (
                <GlassPanel key={label} className={cls} label={label} compact />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
              {CHROMATIC_VARIANTS.map(({ label, cls }) => (
                <GlassPanel key={label} className={cls} label={label} compact />
              ))}
            </div>
          </div>
        </DemoArea>
      </TestCard>
    </Section>
  );
}

// ============================================================================
// NESTED GLASS SECTION
// ============================================================================

function NestedGlassSection() {
  const [depth, setDepth] = useState(3);

  return (
    <Section
      id="nested-glass"
      title="Nested Glass"
      description="Glass inside glass. Test compositor stacking and filter composition."
    >
      <TestCard
        title={`${depth} levels deep`}
        description="Recursive nesting of glass elements."
      >
        <div className="mb-4 flex items-center gap-4">
          <label
            className="flex items-center gap-2 font-medium text-sm"
            htmlFor="nest-depth"
          >
            Depth
            <span className="font-mono text-muted-foreground">{depth}</span>
          </label>
          <input
            id="nest-depth"
            type="range"
            min="1"
            max="5"
            value={depth}
            onChange={(e) => setDepth(Number(e.target.value))}
            className="flex-1"
          />
        </div>
        <DemoArea>
          <NestLevel current={1} max={depth} />
        </DemoArea>
      </TestCard>
    </Section>
  );
}

function NestLevel({ current, max }: { current: number; max: number }) {
  if (current > max) return null;
  return (
    <div className="glass glass-surface rounded-xl p-4">
      <code className="mb-2 block w-fit rounded bg-foreground/10 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
        Level {current}
      </code>
      {current < max ? (
        <div className="mt-3">
          <NestLevel current={current + 1} max={max} />
        </div>
      ) : (
        <p className="mt-2 text-muted-foreground text-sm">Innermost layer</p>
      )}
    </div>
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
      description="50+ glass panels stacked vertically with parallax background. Tests compositor performance during scroll."
    >
      <TestCard
        title="Scroll through glass panels"
        description="Each panel uses glass glass-surface over a fixed background."
      >
        <div
          className="relative h-[500px] overflow-y-auto rounded-lg"
          style={BG_STYLE}
        >
          <div className="space-y-3 p-4">
            {Array.from({ length: 60 }).map((_, i) => (
              <div key={i} className="glass glass-surface rounded-xl px-4 py-3">
                <code className="font-mono text-[10px] text-muted-foreground">
                  Panel {i + 1}
                </code>
              </div>
            ))}
          </div>
        </div>
      </TestCard>
    </Section>
  );
}

// ============================================================================
// RESIZE BEHAVIOR SECTION
// ============================================================================

function ResizeBehaviorSection() {
  return (
    <Section
      id="resize-behavior"
      title="Resize Behavior"
      description="Drag the resize handle to change element size. Verifies objectBoundingBox filter units scale correctly without JS."
    >
      <TestCard
        title="Resizable glass panel"
        description="Use the drag handle at the bottom-right corner."
      >
        <DemoArea>
          <div
            className="glass glass-surface glass-strength-30 resize overflow-auto rounded-xl p-6"
            style={{ width: 300, height: 200, minWidth: 100, minHeight: 80 }}
          >
            <code className="rounded bg-foreground/10 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              Resize me (CSS resize: both)
            </code>
            <p className="mt-3 text-muted-foreground text-sm">
              The SVG displacement map uses objectBoundingBox units, so it
              should scale smoothly as you drag.
            </p>
          </div>
        </DemoArea>
      </TestCard>
    </Section>
  );
}

// ============================================================================
// BLUR EXTREMES SECTION
// ============================================================================

const BLUR_VALUES = [0, 2, 6, 12, 20, 40];

function BlurExtremesSection() {
  return (
    <Section
      id="blur-extremes"
      title="Blur Extremes"
      description="Glass with extreme blur values. Tests filter chain performance."
    >
      <TestCard
        title="Blur range: 0px to 40px"
        description="Higher values push the compositor harder."
      >
        <DemoArea>
          <div className="grid grid-cols-3 gap-4 md:grid-cols-6">
            {BLUR_VALUES.map((blur) => (
              <GlassPanel
                key={blur}
                className={`glass glass-blur-${blur}`}
                label={`blur-${blur}`}
                compact
              />
            ))}
          </div>
        </DemoArea>
      </TestCard>
    </Section>
  );
}

// ============================================================================
// COMPOSABILITY SECTION
// ============================================================================

function ComposabilitySection() {
  return (
    <Section
      id="composability"
      title="Composability"
      description="All modifiers stacked on a single element — everything at once."
    >
      <TestCard
        title="Full composition"
        description="strength-50 + chromatic + blur-6 + saturation-200 + brightness-130 + surface"
      >
        <DemoArea>
          <GlassPanel
            className="glass glass-strength-50 glass-blur-6 glass-saturation-200 glass-brightness-130 glass-surface"
            label="glass glass-strength-50 glass-blur-6 glass-saturation-200 glass-brightness-130 glass-surface"
          />
        </DemoArea>
        <DemoArea>
          <GlassPanel
            className="glass glass-chromatic-50 glass-blur-6 glass-saturation-200 glass-brightness-130 glass-surface"
            label="glass glass-chromatic-50 glass-blur-6 glass-saturation-200 glass-brightness-130 glass-surface"
          />
        </DemoArea>
      </TestCard>
    </Section>
  );
}

// ============================================================================
// INTERACTIVE SECTION
// ============================================================================

const STRENGTH_STEPS = [5, 10, 20, 30, 40, 50];

function InteractiveSection() {
  const [count, setCount] = useState(16);
  const [strength, setStrength] = useState<number>(20);
  const [blur, setBlur] = useState(2);
  const [saturation, setSaturation] = useState(120);
  const [brightness, setBrightness] = useState(105);
  const [chromatic, setChromatic] = useState(false);

  const cols = Math.ceil(Math.sqrt(count));

  const strengthClass = chromatic
    ? `glass-chromatic-${strength}`
    : `glass-strength-${strength}`;
  const fullClass = `glass ${strengthClass} glass-blur-${blur} glass-saturation-${saturation} glass-brightness-${brightness} glass-surface`;

  // Snap strength to valid discrete values
  const snapStrength = useCallback((val: number) => {
    return STRENGTH_STEPS.reduce((prev, curr) =>
      Math.abs(curr - val) < Math.abs(prev - val) ? curr : prev,
    );
  }, []);

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
            max={100}
            onChange={setCount}
            display={`${count}`}
          />

          <SliderControl
            id="int-strength"
            label={chromatic ? "Chromatic" : "Strength"}
            value={strength}
            min={5}
            max={50}
            step={5}
            onChange={(v) => setStrength(snapStrength(v))}
            display={`${strength}`}
          />

          <SliderControl
            id="int-blur"
            label="Blur"
            value={blur}
            min={0}
            max={40}
            onChange={setBlur}
            display={`${blur}px`}
          />

          <SliderControl
            id="int-saturation"
            label="Saturation"
            value={saturation}
            min={0}
            max={300}
            onChange={setSaturation}
            display={`${saturation}%`}
          />

          <SliderControl
            id="int-brightness"
            label="Brightness"
            value={brightness}
            min={50}
            max={200}
            onChange={setBrightness}
            display={`${brightness}%`}
          />

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={chromatic}
              onChange={(e) => setChromatic(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Chromatic aberration</span>
          </label>

          <div className="rounded-lg bg-muted p-4">
            <p className="mb-2 font-medium text-muted-foreground text-xs">
              Applied Classes:
            </p>
            <code className="block break-all text-sm">{fullClass}</code>
          </div>

          <FpsCounter />
        </div>

        <div>
          <DemoArea>
            <div
              className="grid gap-2"
              style={{
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: count }).map((_, i) => (
                <div
                  key={i}
                  className={`${fullClass} aspect-square rounded-lg`}
                />
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
