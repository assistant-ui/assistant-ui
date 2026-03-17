"use client";

/**
 * COMPREHENSIVE SHIMMER SANDBOX
 * For internal testing, tuning, and experimental purposes.
 *
 * Tests all variations of:
 * - shimmer (text shimmer)
 * - shimmer-bg (background shimmer)
 * - shimmer-container (container-based auto-sizing)
 * - Various utility overrides (angle, color, speed, spread, width)
 */

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export default function ShimmerSandboxPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12">
        {/* Header - full width */}
        <header className="mb-12 space-y-4">
          <h1 className="font-bold text-4xl">Shimmer Sandbox</h1>
          <p className="max-w-2xl text-muted-foreground">
            Comprehensive testing playground for shimmer text and shimmer-bg
            utilities. Use this to tune values, test edge cases, and experiment
            with different configurations.
          </p>
        </header>

        {/* Two-column layout */}
        <div className="flex gap-8">
          {/* Sticky sidebar navigation */}
          <aside className="hidden w-56 shrink-0 lg:block">
            <TableOfContents />
          </aside>

          {/* Main content */}
          <main className="min-w-0 flex-1 space-y-16">
            <TextShimmerSection />
            <BackgroundShimmerSection />
            <ContainerSizeSection />
            <SkeletonPatternsSection />
            <AngleTestSection />
            <ColorTestSection />
            <SpeedTestSection />
            <SpreadTestSection />
            <NestedContainersSection />
            <EdgeCasesSection />
            <InteractivePlaygroundSection />
          </main>
        </div>
      </div>
    </div>
  );
}

function TableOfContents() {
  const sections = [
    { id: "text-shimmer", label: "Text Shimmer" },
    { id: "background-shimmer", label: "Background Shimmer" },
    { id: "container-sizes", label: "Container Sizes" },
    { id: "skeleton-patterns", label: "Skeleton Patterns" },
    { id: "angles", label: "Angles" },
    { id: "colors", label: "Colors" },
    { id: "speeds", label: "Speeds" },
    { id: "spreads", label: "Spreads" },
    { id: "nested-containers", label: "Nested Containers" },
    { id: "edge-cases", label: "Edge Cases" },
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

// ============================================================================
// TEXT SHIMMER SECTION
// ============================================================================

function TextShimmerSection() {
  return (
    <Section
      id="text-shimmer"
      title="Text Shimmer"
      description="The shimmer class creates an animated gradient effect on text using background-clip."
    >
      <div className="grid gap-6 md:grid-cols-2">
        {/* Font sizes */}
        <TestCard title="Font Sizes" description="Different text sizes">
          <div className="shimmer-container space-y-2">
            <p className="shimmer text-foreground/40 text-xs">
              Extra small text with shimmer
            </p>
            <p className="shimmer text-foreground/40 text-sm">
              Small text with shimmer effect
            </p>
            <p className="shimmer text-base text-foreground/40">
              Base text with shimmer effect
            </p>
            <p className="shimmer text-foreground/40 text-lg">
              Large text with shimmer
            </p>
            <p className="shimmer text-foreground/40 text-xl">
              Extra large shimmer
            </p>
            <p className="shimmer text-2xl text-foreground/40">2XL shimmer</p>
            <p className="shimmer font-bold text-4xl text-foreground/40">
              4XL Bold
            </p>
          </div>
        </TestCard>

        {/* Line lengths */}
        <TestCard title="Line Lengths" description="Various text widths">
          <div className="shimmer-container space-y-2">
            <p className="shimmer text-foreground/40">Short</p>
            <p className="shimmer text-foreground/40">Medium length text</p>
            <p className="shimmer text-foreground/40">
              This is a longer line of text that wraps around
            </p>
            <p className="shimmer text-foreground/40">
              This is an even longer paragraph that demonstrates how the shimmer
              effect works across multiple lines of text content.
            </p>
          </div>
        </TestCard>

        {/* Font weights */}
        <TestCard title="Font Weights" description="Different weights">
          <div className="shimmer-container space-y-2">
            <p className="shimmer font-thin text-foreground/40 text-lg">
              Thin weight shimmer
            </p>
            <p className="shimmer font-light text-foreground/40 text-lg">
              Light weight shimmer
            </p>
            <p className="shimmer font-normal text-foreground/40 text-lg">
              Normal weight shimmer
            </p>
            <p className="shimmer font-medium text-foreground/40 text-lg">
              Medium weight shimmer
            </p>
            <p className="shimmer font-semibold text-foreground/40 text-lg">
              Semibold shimmer
            </p>
            <p className="shimmer font-bold text-foreground/40 text-lg">
              Bold weight shimmer
            </p>
            <p className="shimmer font-black text-foreground/40 text-lg">
              Black weight shimmer
            </p>
          </div>
        </TestCard>

        {/* Without container */}
        <TestCard
          title="Without shimmer-container"
          description="Uses default width (200px)"
        >
          <div className="space-y-2">
            <p className="shimmer text-foreground/40 text-sm">
              No container - default width (200)
            </p>
            <p className="shimmer text-base text-foreground/40">
              The shimmer will animate at a fixed 200px track width
            </p>
            <p className="shimmer text-foreground/40 text-lg">
              Longer text still uses 200px
            </p>
          </div>
        </TestCard>

        {/* Mixed content */}
        <TestCard title="Mixed Content" description="Headlines and body text">
          <div className="shimmer-container space-y-4">
            <h4 className="shimmer font-bold text-2xl text-foreground/40">
              Headline with shimmer
            </h4>
            <p className="shimmer text-foreground/40">
              Body text that follows the headline. This demonstrates how shimmer
              works in a typical content layout with multiple elements.
            </p>
            <p className="shimmer text-foreground/50 text-sm">
              Caption or metadata text
            </p>
          </div>
        </TestCard>

        {/* Inline shimmer */}
        <TestCard
          title="Inline Shimmer"
          description="Shimmer on inline elements"
        >
          <div className="shimmer-container">
            <p>
              This is regular text with{" "}
              <span className="shimmer text-foreground/40">inline shimmer</span>{" "}
              mixed in.
            </p>
            <p className="mt-2">
              Multiple{" "}
              <span className="shimmer text-foreground/40">inline</span>{" "}
              <span className="shimmer text-foreground/40">shimmer</span>{" "}
              <span className="shimmer text-foreground/40">elements</span> in
              one line.
            </p>
          </div>
        </TestCard>
      </div>
    </Section>
  );
}

// ============================================================================
// BACKGROUND SHIMMER SECTION
// ============================================================================

function BackgroundShimmerSection() {
  return (
    <Section
      id="background-shimmer"
      title="Background Shimmer"
      description="The shimmer-bg class creates an animated highlight stripe overlay using ::after pseudo-element."
    >
      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic shapes */}
        <TestCard title="Basic Shapes" description="Different element shapes">
          <div className="shimmer-container space-y-4">
            <div className="shimmer-bg h-4 rounded bg-muted" />
            <div className="shimmer-bg h-8 rounded-md bg-muted" />
            <div className="shimmer-bg h-12 rounded-lg bg-muted" />
            <div className="shimmer-bg h-6 rounded-full bg-muted" />
            <div className="shimmer-bg size-16 rounded-full bg-muted" />
          </div>
        </TestCard>

        {/* Widths */}
        <TestCard
          title="Partial Widths"
          description="Elements with various widths"
        >
          <div className="shimmer-container space-y-2">
            <div className="shimmer-bg h-4 w-full rounded bg-muted" />
            <div className="shimmer-bg h-4 w-4/5 rounded bg-muted" />
            <div className="shimmer-bg h-4 w-3/4 rounded bg-muted" />
            <div className="shimmer-bg h-4 w-2/3 rounded bg-muted" />
            <div className="shimmer-bg h-4 w-1/2 rounded bg-muted" />
            <div className="shimmer-bg h-4 w-1/3 rounded bg-muted" />
            <div className="shimmer-bg h-4 w-1/4 rounded bg-muted" />
          </div>
        </TestCard>

        {/* Heights */}
        <TestCard title="Heights" description="Different heights">
          <div className="shimmer-container flex items-end gap-2">
            <div className="shimmer-bg h-4 w-12 rounded bg-muted" />
            <div className="shimmer-bg h-8 w-12 rounded bg-muted" />
            <div className="shimmer-bg h-12 w-12 rounded bg-muted" />
            <div className="shimmer-bg h-16 w-12 rounded bg-muted" />
            <div className="shimmer-bg h-24 w-12 rounded bg-muted" />
            <div className="shimmer-bg h-32 w-12 rounded bg-muted" />
          </div>
        </TestCard>

        {/* Without container */}
        <TestCard
          title="Without shimmer-container"
          description="Uses default width (800px)"
        >
          <div className="space-y-2">
            <div className="shimmer-bg h-6 w-full rounded bg-muted" />
            <div className="shimmer-bg h-6 w-3/4 rounded bg-muted" />
            <div className="shimmer-bg h-6 w-1/2 rounded bg-muted" />
          </div>
        </TestCard>

        {/* Aspect ratios */}
        <TestCard title="Aspect Ratios" description="Common media ratios">
          <div className="shimmer-container space-y-4">
            <div className="shimmer-bg aspect-video rounded-lg bg-muted" />
            <div className="flex gap-4">
              <div className="shimmer-bg aspect-square w-20 rounded bg-muted" />
              <div className="shimmer-bg aspect-4/3 w-24 rounded bg-muted" />
              <div className="shimmer-bg aspect-3/4 w-16 rounded bg-muted" />
            </div>
          </div>
        </TestCard>

        {/* Grid of items */}
        <TestCard title="Grid Layout" description="Multiple items in grid">
          <div className="shimmer-container grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="shimmer-bg aspect-square rounded bg-muted"
              />
            ))}
          </div>
        </TestCard>
      </div>
    </Section>
  );
}

// ============================================================================
// SHARED CONSTANTS
// ============================================================================

const SHIMMER_COLORS = [
  {
    name: "Red",
    shimmerColor: "oklch(0.637 0.237 25.331)",
    textColor: "text-red-500/50",
  },
  {
    name: "Orange",
    shimmerColor: "oklch(0.705 0.191 47.604)",
    textColor: "text-orange-500/50",
  },
  {
    name: "Yellow",
    shimmerColor: "oklch(0.852 0.199 91.936)",
    textColor: "text-yellow-500/50",
  },
  {
    name: "Green",
    shimmerColor: "oklch(0.723 0.219 149.579)",
    textColor: "text-green-500/50",
  },
  {
    name: "Blue",
    shimmerColor: "oklch(0.623 0.214 259.815)",
    textColor: "text-blue-500/50",
  },
  {
    name: "Purple",
    shimmerColor: "oklch(0.627 0.265 303.9)",
    textColor: "text-purple-500/50",
  },
  {
    name: "Pink",
    shimmerColor: "oklch(0.656 0.241 354.308)",
    textColor: "text-pink-500/50",
  },
];

// ============================================================================
// CONTAINER SIZE SECTION
// ============================================================================

const CONTAINER_SIZES = [
  { width: 50, label: "50px" },
  { width: 80, label: "80px" },
  { width: 120, label: "120px" },
  { width: 200, label: "200px" },
  { width: 300, label: "300px" },
  { width: 400, label: "400px" },
  { width: 600, label: "600px" },
  { width: 800, label: "800px" },
  { width: 1000, label: "1000px" },
];

function ContainerSizeSection() {
  return (
    <Section
      id="container-sizes"
      title="Container Sizes"
      description="How shimmer adapts to different container widths via shimmer-container."
    >
      {/* Side by side comparison */}
      <TestCard
        title="Side-by-Side Comparison"
        description="All container widths at a glance"
      >
        <div className="flex flex-wrap items-end gap-4">
          {CONTAINER_SIZES.map(({ width, label }) => (
            <div key={width} className="flex flex-col items-center gap-2">
              <span className="text-muted-foreground text-xs">{label}</span>
              <div
                className="shimmer-container"
                style={{ width: `${width}px` }}
              >
                <div className="shimmer-bg h-8 w-full rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </TestCard>

      {/* Detailed breakdown */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Detailed Breakdown</h3>
        <div className="grid gap-4 overflow-x-auto">
          {CONTAINER_SIZES.map(({ width, label }) => (
            <ContainerSizeRow key={width} width={width} label={label} />
          ))}
        </div>
      </div>
    </Section>
  );
}

function ContainerSizeRow({ width, label }: { width: number; label: string }) {
  const trackMax = Math.min(width, 300);
  const minSpread = Math.min(200, trackMax);
  const preferred = width * 0.7;
  const expectedSpread = Math.max(minSpread, Math.min(preferred, trackMax));

  const base = width / 320;
  const passTimeRaw = 1.1 + (base - 1) * 0.25;
  const passTime = Math.min(1.6, Math.max(1.1, passTimeRaw));
  const speed = (width * 2) / passTime;

  return (
    <div className="flex min-w-max items-center gap-4 rounded-lg border p-3">
      <div className="w-20 shrink-0">
        <span className="font-mono font-semibold text-sm">{label}</span>
      </div>
      <div
        className="shimmer-container shrink-0"
        style={{ width: `${width}px` }}
      >
        <div className="shimmer-bg h-6 w-full rounded bg-muted" />
      </div>
      <div className="hidden shrink-0 text-muted-foreground text-xs xl:block">
        spread: ~{expectedSpread.toFixed(0)}px | pass: {passTime.toFixed(2)}s |
        speed: {speed.toFixed(0)}px/s
      </div>
    </div>
  );
}

// ============================================================================
// SKELETON PATTERNS SECTION
// ============================================================================

function SkeletonPatternsSection() {
  return (
    <Section
      id="skeleton-patterns"
      title="Skeleton Patterns"
      description="Common UI skeleton patterns using shimmer-bg."
    >
      <div className="grid gap-6 md:grid-cols-2">
        {/* Card skeleton */}
        <TestCard title="Card Skeleton" description="Basic card with content">
          <div className="shimmer-container rounded-lg border p-4">
            <div className="shimmer-bg mb-4 aspect-video rounded-lg bg-muted" />
            <div className="space-y-2">
              <div className="shimmer-bg h-5 w-3/4 rounded bg-muted" />
              <div className="shimmer-bg h-4 w-full rounded bg-muted" />
              <div className="shimmer-bg h-4 w-4/5 rounded bg-muted" />
            </div>
          </div>
        </TestCard>

        {/* Profile skeleton */}
        <TestCard title="Profile Skeleton" description="Avatar with details">
          <div className="shimmer-container flex items-center gap-4">
            <div className="shimmer-bg size-16 shrink-0 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="shimmer-bg h-5 w-1/3 rounded bg-muted" />
              <div className="shimmer-bg h-4 w-2/3 rounded bg-muted" />
              <div className="shimmer-bg h-3 w-1/2 rounded bg-muted" />
            </div>
          </div>
        </TestCard>

        {/* List skeleton */}
        <TestCard title="List Skeleton" description="Multiple list items">
          <div className="shimmer-container divide-y">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                <div className="shimmer-bg size-10 shrink-0 rounded-full bg-muted" />
                <div className="flex-1 space-y-1.5">
                  <div className="shimmer-bg h-4 w-1/3 rounded bg-muted" />
                  <div className="shimmer-bg h-3 w-2/3 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </TestCard>

        {/* Article skeleton */}
        <TestCard title="Article Skeleton" description="Blog post layout">
          <div className="shimmer-container space-y-4">
            <div className="shimmer-bg h-8 w-4/5 rounded bg-muted" />
            <div className="flex gap-2">
              <div className="shimmer-bg h-3 w-20 rounded bg-muted" />
              <div className="shimmer-bg h-3 w-24 rounded bg-muted" />
            </div>
            <div className="shimmer-bg aspect-video rounded-lg bg-muted" />
            <div className="space-y-2">
              <div className="shimmer-bg h-4 w-full rounded bg-muted" />
              <div className="shimmer-bg h-4 w-full rounded bg-muted" />
              <div className="shimmer-bg h-4 w-3/4 rounded bg-muted" />
            </div>
          </div>
        </TestCard>

        {/* Comment skeleton */}
        <TestCard title="Comment Skeleton" description="Threaded comments">
          <div className="shimmer-container space-y-4">
            <div className="flex gap-3">
              <div className="shimmer-bg size-8 shrink-0 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="shimmer-bg h-3 w-24 rounded bg-muted" />
                <div className="shimmer-bg h-4 w-full rounded bg-muted" />
                <div className="shimmer-bg h-4 w-4/5 rounded bg-muted" />
              </div>
            </div>
            <div className="ml-8 flex gap-3">
              <div className="shimmer-bg size-8 shrink-0 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="shimmer-bg h-3 w-20 rounded bg-muted" />
                <div className="shimmer-bg h-4 w-full rounded bg-muted" />
              </div>
            </div>
          </div>
        </TestCard>

        {/* Table skeleton */}
        <TestCard title="Table Skeleton" description="Data table rows">
          <div className="shimmer-container space-y-2">
            <div className="flex gap-2 border-b pb-2">
              <div className="shimmer-bg h-4 w-1/4 rounded bg-muted" />
              <div className="shimmer-bg h-4 w-1/4 rounded bg-muted" />
              <div className="shimmer-bg h-4 w-1/4 rounded bg-muted" />
              <div className="shimmer-bg h-4 w-1/4 rounded bg-muted" />
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-2">
                <div className="shimmer-bg h-4 w-1/4 rounded bg-muted" />
                <div className="shimmer-bg h-4 w-1/4 rounded bg-muted" />
                <div className="shimmer-bg h-4 w-1/4 rounded bg-muted" />
                <div className="shimmer-bg h-4 w-1/4 rounded bg-muted" />
              </div>
            ))}
          </div>
        </TestCard>

        {/* Navigation skeleton */}
        <TestCard title="Navigation Skeleton" description="Nav bar items">
          <div className="shimmer-container flex items-center justify-between">
            <div className="shimmer-bg h-8 w-32 rounded bg-muted" />
            <div className="flex gap-4">
              <div className="shimmer-bg h-4 w-16 rounded bg-muted" />
              <div className="shimmer-bg h-4 w-16 rounded bg-muted" />
              <div className="shimmer-bg h-4 w-16 rounded bg-muted" />
            </div>
            <div className="shimmer-bg size-8 rounded-full bg-muted" />
          </div>
        </TestCard>

        {/* Form skeleton */}
        <TestCard title="Form Skeleton" description="Input fields">
          <div className="shimmer-container space-y-4">
            <div className="space-y-1.5">
              <div className="shimmer-bg h-3 w-16 rounded bg-muted" />
              <div className="shimmer-bg h-10 w-full rounded-md bg-muted" />
            </div>
            <div className="space-y-1.5">
              <div className="shimmer-bg h-3 w-20 rounded bg-muted" />
              <div className="shimmer-bg h-10 w-full rounded-md bg-muted" />
            </div>
            <div className="shimmer-bg h-10 w-24 rounded-md bg-muted" />
          </div>
        </TestCard>

        {/* Media grid skeleton */}
        <TestCard title="Media Grid" description="Image gallery">
          <div className="shimmer-container grid grid-cols-3 gap-2">
            <div className="shimmer-bg col-span-2 row-span-2 aspect-square rounded-lg bg-muted" />
            <div className="shimmer-bg aspect-square rounded-lg bg-muted" />
            <div className="shimmer-bg aspect-square rounded-lg bg-muted" />
          </div>
        </TestCard>
      </div>
    </Section>
  );
}

// ============================================================================
// ANGLE TEST SECTION
// ============================================================================

const ANGLES = [0, 15, 30, 45, 60, 75, 90, 105, 120, 135];

function AngleTestSection() {
  return (
    <Section
      id="angles"
      title="Angles"
      description="Testing shimmer-angle-* utility for different gradient angles."
    >
      <div className="grid gap-6 md:grid-cols-2">
        {/* Text shimmer angles */}
        <TestCard
          title="Text Shimmer Angles"
          description="Using --shimmer-angle"
        >
          <div className="shimmer-container space-y-3">
            {ANGLES.map((angle) => (
              <p
                key={angle}
                className="shimmer font-medium text-foreground/40 text-lg"
                style={
                  { "--shimmer-angle": `${angle}deg` } as React.CSSProperties
                }
              >
                {angle}deg angle shimmer text
              </p>
            ))}
          </div>
        </TestCard>

        {/* Background shimmer angles */}
        <TestCard
          title="Background Shimmer Angles"
          description="Using --shimmer-angle"
        >
          <div className="shimmer-container space-y-3">
            {ANGLES.map((angle) => (
              <div key={angle} className="flex items-center gap-3">
                <span className="w-12 text-muted-foreground text-sm">
                  {angle}deg
                </span>
                <div
                  className="shimmer-bg h-6 flex-1 rounded bg-muted"
                  style={
                    { "--shimmer-angle": `${angle}deg` } as React.CSSProperties
                  }
                />
              </div>
            ))}
          </div>
        </TestCard>

        {/* Angled grid with position alignment */}
        <TestCard
          title="Angled + Position Offset"
          description="Using --shimmer-y for vertical alignment"
        >
          <div className="shimmer-container shimmer-angle-45 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="shimmer-bg h-6 rounded bg-muted"
                style={
                  {
                    "--shimmer-y": i * 24,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
        </TestCard>

        {/* Horizontal position offset */}
        <TestCard
          title="Horizontal Position Offset"
          description="Using shimmer-x-* for staggered timing"
        >
          {/* Fixed 96px cells + 8px gap = 104px stride */}
          <div className="shimmer-container shimmer-angle-45 grid grid-cols-[repeat(4,96px)] gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="shimmer-bg h-24 rounded bg-muted"
                style={
                  {
                    "--shimmer-x": (i % 4) * 104,
                    "--shimmer-y": Math.floor(i / 4) * 104,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
        </TestCard>
      </div>
    </Section>
  );
}

// ============================================================================
// COLOR TEST SECTION
// ============================================================================

function ColorTestSection() {
  return (
    <Section
      id="colors"
      title="Colors"
      description="Testing shimmer-color-* utility for different highlight colors."
    >
      <div className="grid gap-6 md:grid-cols-2">
        {/* Text shimmer colors */}
        <TestCard
          title="Text Shimmer Colors"
          description="Custom shimmer colors on text"
        >
          <div className="shimmer-container space-y-2">
            <p className="shimmer text-foreground/40 text-lg">Default color</p>
            {SHIMMER_COLORS.map(({ name, shimmerColor, textColor }) => (
              <p
                key={name}
                className={cn("shimmer text-lg", textColor)}
                style={
                  { "--shimmer-color": shimmerColor } as React.CSSProperties
                }
              >
                {name} shimmer
              </p>
            ))}
          </div>
        </TestCard>

        {/* Background shimmer colors */}
        <TestCard
          title="Background Shimmer Colors"
          description="Custom shimmer colors on backgrounds"
        >
          <div className="shimmer-container space-y-2">
            <div className="shimmer-bg h-6 rounded bg-muted" />
            {SHIMMER_COLORS.map(({ name, shimmerColor }) => (
              <div
                key={name}
                className="shimmer-bg h-6 rounded bg-muted"
                style={
                  { "--shimmer-color": shimmerColor } as React.CSSProperties
                }
              />
            ))}
          </div>
        </TestCard>

        {/* On colored backgrounds */}
        <TestCard
          title="On Colored Backgrounds"
          description="Shimmer on non-muted backgrounds"
        >
          <div className="shimmer-container grid grid-cols-2 gap-2">
            <div className="shimmer-bg h-12 rounded bg-red-200 dark:bg-red-900" />
            <div className="shimmer-bg h-12 rounded bg-blue-200 dark:bg-blue-900" />
            <div className="shimmer-bg h-12 rounded bg-green-200 dark:bg-green-900" />
            <div className="shimmer-bg h-12 rounded bg-yellow-200 dark:bg-yellow-900" />
            <div className="shimmer-bg h-12 rounded bg-purple-200 dark:bg-purple-900" />
            <div className="shimmer-bg h-12 rounded bg-gray-800 dark:bg-gray-200" />
          </div>
        </TestCard>

        {/* Inline style colors */}
        <TestCard
          title="Inline Style Colors"
          description="Using CSS custom properties directly"
        >
          <div className="shimmer-container space-y-2">
            <div
              className="shimmer-bg h-6 rounded bg-muted"
              style={
                {
                  "--shimmer-color": "oklch(0.7 0.2 30)",
                } as React.CSSProperties
              }
            />
            <div
              className="shimmer-bg h-6 rounded bg-muted"
              style={
                {
                  "--shimmer-color": "oklch(0.8 0.15 150)",
                } as React.CSSProperties
              }
            />
            <div
              className="shimmer-bg h-6 rounded bg-muted"
              style={
                {
                  "--shimmer-color": "oklch(0.9 0.1 270)",
                } as React.CSSProperties
              }
            />
          </div>
        </TestCard>
      </div>
    </Section>
  );
}

// ============================================================================
// SPEED TEST SECTION
// ============================================================================

const SPEEDS = [50, 100, 150, 200, 300, 500, 800, 1000, 1500, 2000];

function SpeedTestSection() {
  return (
    <Section
      id="speeds"
      title="Speeds"
      description="Testing shimmer-speed-* utility for different animation speeds (px/s)."
    >
      <div className="grid gap-6 md:grid-cols-2">
        {/* Text shimmer speeds */}
        <TestCard
          title="Text Shimmer Speeds"
          description="Slower to faster speeds"
        >
          <div className="shimmer-container space-y-2">
            {SPEEDS.map((speed) => (
              <p
                key={speed}
                className="shimmer text-foreground/40 text-sm"
                style={{ "--shimmer-speed": speed } as React.CSSProperties}
              >
                Speed {speed}px/s - The quick brown fox
              </p>
            ))}
          </div>
        </TestCard>

        {/* Background shimmer speeds */}
        <TestCard
          title="Background Shimmer Speeds"
          description="Slower to faster speeds"
        >
          <div className="shimmer-container space-y-2">
            {SPEEDS.map((speed) => (
              <div key={speed} className="flex items-center gap-3">
                <span className="w-16 text-muted-foreground text-xs">
                  {speed}px/s
                </span>
                <div
                  className="shimmer-bg h-5 flex-1 rounded bg-muted"
                  style={{ "--shimmer-speed": speed } as React.CSSProperties}
                />
              </div>
            ))}
          </div>
        </TestCard>

        {/* Speed with width */}
        <TestCard
          title="Speed + Manual Width"
          description="Same speed, different track widths"
        >
          <div className="space-y-4">
            {[200, 400, 600].map((w) => (
              <div key={w} className="space-y-1">
                <span className="text-muted-foreground text-xs">
                  --shimmer-width: 200, --shimmer-speed: 200
                </span>
                <div
                  className="shimmer-bg h-6 rounded bg-muted"
                  style={
                    {
                      width: `${w}px`,
                      "--shimmer-width": 200,
                      "--shimmer-speed": 200,
                    } as React.CSSProperties
                  }
                />
              </div>
            ))}
          </div>
        </TestCard>

        {/* Auto speed comparison */}
        <TestCard
          title="Auto Speed (Container-Based)"
          description="Speed derived from container width"
        >
          <div className="space-y-4">
            {[200, 400, 600].map((width) => (
              <div key={width} className="space-y-1">
                <span className="text-muted-foreground text-xs">
                  {width}px container - auto speed
                </span>
                <div
                  className="shimmer-container"
                  style={{ width: `${width}px` }}
                >
                  <div className="shimmer-bg h-6 w-full rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </TestCard>
      </div>
    </Section>
  );
}

// ============================================================================
// SPREAD TEST SECTION
// ============================================================================

const SPREADS = [20, 40, 60, 80, 100, 150, 200, 300, 400];

function SpreadTestSection() {
  return (
    <Section
      id="spreads"
      title="Spreads"
      description="Testing shimmer-spread-* (text) and shimmer-bg-spread-* (background) utilities."
    >
      <div className="grid gap-6 md:grid-cols-2">
        {/* Text shimmer spreads */}
        <TestCard
          title="Text Shimmer Spreads"
          description="Using --shimmer-spread (in ch units). Inside shimmer-container with 1x speed multiplier."
        >
          <div className="shimmer-container space-y-2">
            {[2, 4, 6, 8, 10, 12, 16, 20].map((spread) => (
              <p
                key={spread}
                className="shimmer text-foreground/40 text-sm"
                style={
                  { "--shimmer-spread": `${spread}ch` } as React.CSSProperties
                }
              >
                Spread {spread}ch - Shimmer text effect
              </p>
            ))}
          </div>
        </TestCard>

        {/* Background shimmer spreads */}
        <TestCard
          title="Background Shimmer Spreads"
          description="Using --shimmer-bg-spread (in px)"
        >
          <div className="shimmer-container space-y-2">
            {SPREADS.map((spread) => (
              <div key={spread} className="flex items-center gap-3">
                <span className="w-12 text-muted-foreground text-xs">
                  {spread}px
                </span>
                <div
                  className="shimmer-bg h-5 flex-1 rounded bg-muted"
                  style={
                    {
                      "--shimmer-bg-spread": `${spread}px`,
                    } as React.CSSProperties
                  }
                />
              </div>
            ))}
          </div>
        </TestCard>

        {/* Spread vs container width */}
        <TestCard
          title="Spread vs Container Width"
          description="How spread looks at different container sizes"
        >
          <div className="space-y-4">
            {[150, 300, 600].map((width) => (
              <div key={width} className="space-y-2">
                <span className="text-muted-foreground text-xs">
                  {width}px container
                </span>
                <div
                  className="shimmer-container space-y-1"
                  style={{ width: `${width}px` }}
                >
                  <div className="shimmer-bg h-5 rounded bg-muted" />
                  <div
                    className="shimmer-bg h-5 rounded bg-muted"
                    style={
                      { "--shimmer-bg-spread": "100px" } as React.CSSProperties
                    }
                  />
                  <div
                    className="shimmer-bg h-5 rounded bg-muted"
                    style={
                      { "--shimmer-bg-spread": "200px" } as React.CSSProperties
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </TestCard>

        {/* Auto spread behavior */}
        <TestCard
          title="Auto Spread Behavior"
          description="Default auto spread in shimmer-container"
        >
          <div className="space-y-4">
            <p className="text-muted-foreground text-xs">
              Auto spread clamps to: min(200px, track) to 70cqw to min(300px,
              track)
            </p>
            {[100, 200, 300, 400, 500].map((width) => (
              <div
                key={width}
                className="shimmer-container"
                style={{ width: `${width}px` }}
              >
                <div className="flex items-center gap-2">
                  <span className="w-12 shrink-0 text-muted-foreground text-xs">
                    {width}px
                  </span>
                  <div className="shimmer-bg h-5 flex-1 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </TestCard>
      </div>
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
      description="Testing shimmer behavior with nested shimmer-container elements."
    >
      <div className="grid gap-6 md:grid-cols-2">
        {/* Simple nesting */}
        <TestCard
          title="Simple Nesting"
          description="Nested containers with different widths"
        >
          <div className="shimmer-container rounded border p-4">
            <p className="mb-2 text-muted-foreground text-xs">
              Outer container (full width)
            </p>
            <div className="shimmer-bg mb-4 h-6 rounded bg-muted" />
            <div className="shimmer-container w-3/4 rounded border border-dashed p-4">
              <p className="mb-2 text-muted-foreground text-xs">
                Inner container (75% width)
              </p>
              <div className="shimmer-bg h-6 rounded bg-muted" />
            </div>
          </div>
        </TestCard>

        {/* Deep nesting */}
        <TestCard title="Deep Nesting" description="Multiple levels deep">
          <div className="shimmer-container rounded border p-3">
            <div className="shimmer-bg mb-2 h-4 rounded bg-muted" />
            <div className="shimmer-container w-4/5 rounded border border-dashed p-3">
              <div className="shimmer-bg mb-2 h-4 rounded bg-muted" />
              <div className="shimmer-container w-4/5 rounded border border-dotted p-3">
                <div className="shimmer-bg mb-2 h-4 rounded bg-muted" />
                <div className="shimmer-container w-4/5 rounded border p-3">
                  <div className="shimmer-bg h-4 rounded bg-muted" />
                </div>
              </div>
            </div>
          </div>
        </TestCard>

        {/* Mixed content in nesting */}
        <TestCard
          title="Mixed Content"
          description="Text and background shimmer nested"
        >
          <div className="shimmer-container space-y-4 rounded border p-4">
            <p className="shimmer font-semibold text-foreground/40 text-lg">
              Outer container text shimmer
            </p>
            <div className="shimmer-bg h-8 rounded bg-muted" />
            <div className="shimmer-container w-2/3 rounded border border-dashed p-4">
              <p className="shimmer text-foreground/40">Inner container text</p>
              <div className="shimmer-bg mt-2 h-6 rounded bg-muted" />
            </div>
          </div>
        </TestCard>

        {/* Grid of nested containers */}
        <TestCard
          title="Grid of Containers"
          description="Multiple containers in a grid"
        >
          <div className="grid grid-cols-2 gap-4">
            {["A", "B", "C", "D"].map((label) => (
              <div key={label} className="shimmer-container rounded border p-3">
                <p className="mb-2 text-muted-foreground text-xs">
                  Container {label}
                </p>
                <div className="shimmer-bg h-8 rounded bg-muted" />
              </div>
            ))}
          </div>
        </TestCard>

        {/* Container-level overrides */}
        <TestCard
          title="Container-Level Overrides"
          description="Overrides set on shimmer-container propagate to children"
        >
          <div
            className="shimmer-container space-y-3 rounded border p-4"
            style={
              {
                "--shimmer-speed": 100,
                "--shimmer-angle": "75deg",
              } as React.CSSProperties
            }
          >
            <p className="text-muted-foreground text-xs">
              Container: speed=100, angle=75deg
            </p>
            <p className="shimmer text-foreground/40">
              Text inherits container settings
            </p>
            <div className="shimmer-bg h-6 rounded bg-muted" />
            <div className="flex gap-2">
              <div className="shimmer-bg h-10 flex-1 rounded bg-muted" />
              <div className="shimmer-bg size-10 rounded-full bg-muted" />
            </div>
          </div>
        </TestCard>

        {/* Element-level overrides within container */}
        <TestCard
          title="Element-Level Overrides"
          description="Individual elements override container settings"
        >
          <div
            className="shimmer-container space-y-3 rounded border p-4"
            style={{ "--shimmer-speed": 150 } as React.CSSProperties}
          >
            <p className="text-muted-foreground text-xs">
              Container: speed=150 (default angle)
            </p>
            <div className="shimmer-bg h-5 rounded bg-muted" />
            <div
              className="shimmer-bg h-5 rounded bg-muted"
              style={{ "--shimmer-speed": 400 } as React.CSSProperties}
            />
            <div
              className="shimmer-bg h-5 rounded bg-muted"
              style={{ "--shimmer-angle": "45deg" } as React.CSSProperties}
            />
            <div
              className="shimmer-bg h-5 rounded bg-muted"
              style={
                {
                  "--shimmer-speed": 600,
                  "--shimmer-angle": "120deg",
                  "--shimmer-color": "oklch(0.7 0.15 200)",
                } as React.CSSProperties
              }
            />
            <p className="text-[10px] text-muted-foreground">
              1: inherit | 2: speed=400 | 3: angle=45 | 4: speed=600, angle=120,
              custom color
            </p>
          </div>
        </TestCard>

        {/* Complex nested inheritance */}
        <TestCard
          title="Complex Nested Inheritance"
          description="Multi-level nesting with overrides at each level"
        >
          <div
            className="shimmer-container space-y-2 rounded border p-3"
            style={{ "--shimmer-angle": "15deg" } as React.CSSProperties}
          >
            <p className="text-[10px] text-muted-foreground">L1: angle=15deg</p>
            <p className="shimmer text-foreground/40 text-sm">
              L1 text shimmer
            </p>
            <div className="shimmer-bg h-4 rounded bg-muted" />

            <div
              className="shimmer-container space-y-2 rounded border border-dashed p-3"
              style={{ "--shimmer-speed": 200 } as React.CSSProperties}
            >
              <p className="text-[10px] text-muted-foreground">
                L2: speed=200 (inherits angle=15)
              </p>
              <p className="shimmer text-foreground/40 text-sm">
                L2 text shimmer
              </p>
              <div className="shimmer-bg h-4 rounded bg-muted" />

              <div
                className="shimmer-container space-y-2 rounded border border-dotted p-3"
                style={
                  {
                    "--shimmer-angle": "90deg",
                    "--shimmer-color": "oklch(0.65 0.2 150)",
                  } as React.CSSProperties
                }
              >
                <p className="text-[10px] text-muted-foreground">
                  L3: angle=90 (overrides), color=green, inherits speed=200
                </p>
                <p className="shimmer text-foreground/40 text-sm">
                  L3 text shimmer
                </p>
                <div className="shimmer-bg h-4 rounded bg-muted" />

                {/* Element override at deepest level */}
                <div
                  className="shimmer-bg h-4 rounded bg-muted"
                  style={
                    {
                      "--shimmer-speed": 800,
                      "--shimmer-color": "oklch(0.7 0.2 30)",
                    } as React.CSSProperties
                  }
                />
                <p className="text-[10px] text-muted-foreground">
                  ^ Element override: speed=800, color=orange
                </p>
              </div>
            </div>
          </div>
        </TestCard>

        {/* Mixed text and skeleton with varied overrides */}
        <TestCard
          title="Mixed Content Stress Test"
          description="Text + skeletons with varied per-element overrides"
        >
          <div className="shimmer-container space-y-4 rounded border p-4">
            {/* Card 1: Default settings */}
            <div className="flex gap-3">
              <div className="shimmer-bg size-12 shrink-0 rounded-full bg-muted" />
              <div className="flex-1 space-y-1">
                <p className="shimmer font-medium text-foreground/40 text-sm">
                  Default speed text
                </p>
                <div className="shimmer-bg h-3 w-full rounded bg-muted" />
                <div className="shimmer-bg h-3 w-3/4 rounded bg-muted" />
              </div>
            </div>

            {/* Card 2: Slow, angled */}
            <div
              className="flex gap-3"
              style={
                {
                  "--shimmer-speed": 100,
                  "--shimmer-angle": "30deg",
                } as React.CSSProperties
              }
            >
              <div className="shimmer-bg size-12 shrink-0 rounded-full bg-muted" />
              <div className="flex-1 space-y-1">
                <p className="shimmer font-medium text-foreground/40 text-sm">
                  Slow + angled (100px/s, 30deg)
                </p>
                <div className="shimmer-bg h-3 w-full rounded bg-muted" />
                <div className="shimmer-bg h-3 w-3/4 rounded bg-muted" />
              </div>
            </div>

            {/* Card 3: Fast, colored */}
            <div
              className="flex gap-3"
              style={
                {
                  "--shimmer-speed": 600,
                  "--shimmer-color": "oklch(0.6 0.25 280)",
                } as React.CSSProperties
              }
            >
              <div className="shimmer-bg size-12 shrink-0 rounded-full bg-muted" />
              <div className="flex-1 space-y-1">
                <p className="shimmer font-medium text-purple-500/50 text-sm">
                  Fast + purple (600px/s)
                </p>
                <div className="shimmer-bg h-3 w-full rounded bg-muted" />
                <div className="shimmer-bg h-3 w-3/4 rounded bg-muted" />
              </div>
            </div>

            {/* Card 4: Per-element chaos */}
            <div className="flex gap-3">
              <div
                className="shimmer-bg size-12 shrink-0 rounded-full bg-muted"
                style={
                  {
                    "--shimmer-speed": 50,
                    "--shimmer-color": "oklch(0.7 0.2 30)",
                  } as React.CSSProperties
                }
              />
              <div className="flex-1 space-y-1">
                <p
                  className="shimmer font-medium text-foreground/40 text-sm"
                  style={{ "--shimmer-speed": 300 } as React.CSSProperties}
                >
                  Each element different
                </p>
                <div
                  className="shimmer-bg h-3 w-full rounded bg-muted"
                  style={{ "--shimmer-angle": "60deg" } as React.CSSProperties}
                />
                <div
                  className="shimmer-bg h-3 w-3/4 rounded bg-muted"
                  style={
                    {
                      "--shimmer-speed": 1000,
                      "--shimmer-color": "oklch(0.65 0.2 150)",
                    } as React.CSSProperties
                  }
                />
              </div>
            </div>
          </div>
        </TestCard>
      </div>
    </Section>
  );
}

// ============================================================================
// EDGE CASES SECTION
// ============================================================================

function EdgeCasesSection() {
  return (
    <Section
      id="edge-cases"
      title="Edge Cases"
      description="Testing unusual or extreme scenarios."
    >
      <div className="grid gap-6 md:grid-cols-2">
        {/* Very small */}
        <TestCard
          title="Very Small Elements"
          description="Tiny shimmer targets"
        >
          <div className="shimmer-container flex flex-wrap items-center gap-2">
            <div className="shimmer-bg size-2 rounded-full bg-muted" />
            <div className="shimmer-bg size-3 rounded-full bg-muted" />
            <div className="shimmer-bg size-4 rounded-full bg-muted" />
            <div className="shimmer-bg h-2 w-8 rounded bg-muted" />
            <div className="shimmer-bg h-2 w-16 rounded bg-muted" />
            <span className="shimmer text-[8px] text-foreground/40">
              Tiny text
            </span>
          </div>
        </TestCard>

        {/* Very large */}
        <TestCard title="Very Large Elements" description="Oversized targets">
          <div className="shimmer-container space-y-4">
            <div className="shimmer-bg h-32 rounded-lg bg-muted" />
            <p className="shimmer font-black text-6xl text-foreground/40">
              HUGE
            </p>
          </div>
        </TestCard>

        {/* Zero width container */}
        <TestCard title="Tiny Container" description="Container barely visible">
          <div className="flex gap-4">
            <div className="shimmer-container w-8">
              <div className="shimmer-bg h-8 rounded bg-muted" />
            </div>
            <div className="shimmer-container w-16">
              <div className="shimmer-bg h-8 rounded bg-muted" />
            </div>
          </div>
        </TestCard>

        {/* Multiple shimmers on one element */}
        <TestCard
          title="Both Shimmer Types"
          description="shimmer and shimmer-bg together (not recommended)"
        >
          <div className="shimmer-container">
            <div className="shimmer-bg shimmer rounded bg-muted p-4 text-foreground/40">
              This has both shimmer classes
            </div>
          </div>
        </TestCard>

        {/* Overflow scenarios */}
        <TestCard
          title="Overflow Scenarios"
          description="Content that overflows container"
        >
          <div className="shimmer-container w-48 rounded border p-2">
            <div className="shimmer-bg h-4 w-96 rounded bg-muted" />
            <p className="shimmer mt-2 whitespace-nowrap text-foreground/40">
              This text is way too long to fit
            </p>
          </div>
        </TestCard>

        {/* Rotated elements */}
        <TestCard title="Rotated Elements" description="With CSS transforms">
          <div className="shimmer-container flex items-center justify-center py-8">
            <div className="shimmer-bg h-16 w-32 rotate-12 rounded bg-muted" />
          </div>
        </TestCard>

        {/* Scaled elements */}
        <TestCard title="Scaled Elements" description="With scale transform">
          <div className="shimmer-container flex items-center justify-center py-4">
            <div className="shimmer-bg h-8 w-24 scale-150 rounded bg-muted" />
          </div>
        </TestCard>

        {/* Opacity */}
        <TestCard title="With Opacity" description="Semi-transparent elements">
          <div className="shimmer-container space-y-2">
            <div className="shimmer-bg h-6 rounded bg-muted opacity-100" />
            <div className="shimmer-bg h-6 rounded bg-muted opacity-75" />
            <div className="shimmer-bg h-6 rounded bg-muted opacity-50" />
            <div className="shimmer-bg h-6 rounded bg-muted opacity-25" />
          </div>
        </TestCard>

        {/* Border radius extremes */}
        <TestCard
          title="Border Radius Extremes"
          description="Various border-radius values"
        >
          <div className="shimmer-container space-y-2">
            <div className="shimmer-bg h-8 rounded-none bg-muted" />
            <div className="shimmer-bg h-8 rounded-sm bg-muted" />
            <div className="shimmer-bg h-8 rounded-xl bg-muted" />
            <div className="shimmer-bg h-8 rounded-3xl bg-muted" />
            <div className="shimmer-bg h-8 rounded-full bg-muted" />
          </div>
        </TestCard>
      </div>
    </Section>
  );
}

// ============================================================================
// INTERACTIVE PLAYGROUND SECTION
// ============================================================================

function InteractivePlaygroundSection() {
  const [width, setWidth] = useState(400);
  const [speed, setSpeed] = useState<number | null>(null);
  const [bgSpread, setBgSpread] = useState<number | null>(null);
  const [textSpread, setTextSpread] = useState<number | null>(null);
  const [angle, setAngle] = useState(90);
  const [useContainer, setUseContainer] = useState(true);

  const containerClass = useContainer ? "shimmer-container" : "";

  // Build inline style object for shimmer overrides
  // Note: text shimmer uses --shimmer-spread (in ch), bg shimmer uses --shimmer-bg-spread (in px)
  const shimmerStyle: React.CSSProperties = {
    ...(speed !== null && { "--shimmer-speed": speed }),
    ...(bgSpread !== null && { "--shimmer-bg-spread": `${bgSpread}px` }),
    ...(angle !== 90 && { "--shimmer-angle": `${angle}deg` }),
  } as React.CSSProperties;

  const textShimmerStyle: React.CSSProperties = {
    ...(speed !== null && { "--shimmer-speed": speed }),
    ...(textSpread !== null && { "--shimmer-spread": `${textSpread}ch` }),
    ...(angle !== 90 && { "--shimmer-angle": `${angle}deg` }),
  } as React.CSSProperties;

  // For display purposes
  const allStyleEntries = [
    ...Object.entries(shimmerStyle),
    ...Object.entries(textShimmerStyle).filter(
      ([k]) => k === "--shimmer-spread",
    ),
  ];

  return (
    <Section
      id="interactive"
      title="Interactive Playground"
      description="Experiment with different combinations of settings."
    >
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          {/* Width control */}
          <div className="space-y-2">
            <label
              className="flex items-center justify-between font-medium text-sm"
              htmlFor="container-width"
            >
              <span>Container Width</span>
              <span className="font-mono text-muted-foreground">{width}px</span>
            </label>
            <input
              id="container-width"
              type="range"
              min="50"
              max="800"
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Use container toggle */}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={useContainer}
              onChange={(e) => setUseContainer(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Use shimmer-container (auto sizing)</span>
          </label>

          {/* Speed control */}
          <div className="space-y-2">
            <label
              className="flex items-center justify-between font-medium text-sm"
              htmlFor="speed-override"
            >
              <span>Speed Override</span>
              <span className="font-mono text-muted-foreground">
                {speed !== null ? `${speed}px/s` : "auto"}
              </span>
            </label>
            <div className="flex items-center gap-2">
              <input
                id="speed-override"
                type="range"
                min="50"
                max="2000"
                value={speed ?? 500}
                onChange={(e) => setSpeed(Number(e.target.value))}
                disabled={speed === null}
                className="flex-1"
              />
              <button
                onClick={() => setSpeed(speed === null ? 500 : null)}
                className="rounded bg-muted px-2 py-1 text-xs"
              >
                {speed === null ? "Enable" : "Reset"}
              </button>
            </div>
          </div>

          {/* Background Spread control */}
          <div className="space-y-2">
            <label
              className="flex items-center justify-between font-medium text-sm"
              htmlFor="bg-spread"
            >
              <span>BG Spread (--shimmer-bg-spread)</span>
              <span className="font-mono text-muted-foreground">
                {bgSpread !== null ? `${bgSpread}px` : "auto"}
              </span>
            </label>
            <div className="flex items-center gap-2">
              <input
                id="bg-spread"
                type="range"
                min="20"
                max="400"
                value={bgSpread ?? 100}
                onChange={(e) => setBgSpread(Number(e.target.value))}
                disabled={bgSpread === null}
                className="flex-1"
              />
              <button
                onClick={() => setBgSpread(bgSpread === null ? 100 : null)}
                className="rounded bg-muted px-2 py-1 text-xs"
              >
                {bgSpread === null ? "Enable" : "Reset"}
              </button>
            </div>
          </div>

          {/* Text Spread control */}
          <div className="space-y-2">
            <label
              className="flex items-center justify-between font-medium text-sm"
              htmlFor="text-spread"
            >
              <span>Text Spread (--shimmer-spread)</span>
              <span className="font-mono text-muted-foreground">
                {textSpread !== null ? `${textSpread}ch` : "auto (6ch)"}
              </span>
            </label>
            <div className="flex items-center gap-2">
              <input
                id="text-spread"
                type="range"
                min="1"
                max="30"
                value={textSpread ?? 6}
                onChange={(e) => setTextSpread(Number(e.target.value))}
                disabled={textSpread === null}
                className="flex-1"
              />
              <button
                onClick={() => setTextSpread(textSpread === null ? 6 : null)}
                className="rounded bg-muted px-2 py-1 text-xs"
              >
                {textSpread === null ? "Enable" : "Reset"}
              </button>
            </div>
          </div>

          {/* Angle control */}
          <div className="space-y-2">
            <label
              className="flex items-center justify-between font-medium text-sm"
              htmlFor="angle"
            >
              <span>Angle</span>
              <span className="font-mono text-muted-foreground">
                {angle}deg
              </span>
            </label>
            <input
              id="angle"
              type="range"
              min="0"
              max="180"
              step="15"
              value={angle}
              onChange={(e) => setAngle(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Generated styles display */}
          <div className="rounded-lg bg-muted p-4">
            <p className="mb-2 font-medium text-muted-foreground text-xs">
              Applied Styles:
            </p>
            <code className="block space-y-1 text-sm">
              <div>
                class: {containerClass || "(none)"} shimmer / shimmer-bg
              </div>
              {allStyleEntries.length > 0 ? (
                allStyleEntries.map(
                  ([key, value]: [string, string | number]) => (
                    <div key={key}>
                      {key}: {String(value)}
                    </div>
                  ),
                )
              ) : (
                <div className="text-muted-foreground">(no overrides)</div>
              )}
            </code>
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-4">
          <h3 className="font-semibold">Preview</h3>
          <div
            className={cn(
              "rounded-lg border border-dashed p-4",
              containerClass,
            )}
            style={{ width: `${width}px`, maxWidth: "100%" }}
          >
            <div className="flex gap-3">
              <div
                className="shimmer-bg size-12 shrink-0 rounded-full bg-muted"
                style={shimmerStyle}
              />
              <div className="flex-1 space-y-2">
                <div
                  className="shimmer-bg h-4 w-1/3 rounded bg-muted"
                  style={shimmerStyle}
                />
                <div
                  className="shimmer-bg h-4 w-full rounded bg-muted"
                  style={shimmerStyle}
                />
                <div
                  className="shimmer-bg h-4 w-4/5 rounded bg-muted"
                  style={shimmerStyle}
                />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div
                className="shimmer-bg h-32 rounded-lg bg-muted"
                style={shimmerStyle}
              />
              <div className="flex gap-2">
                <div
                  className="shimmer-bg h-8 flex-1 rounded bg-muted"
                  style={shimmerStyle}
                />
                <div
                  className="shimmer-bg h-8 w-24 rounded bg-muted"
                  style={shimmerStyle}
                />
              </div>
            </div>
          </div>

          {/* Text shimmer preview */}
          <div
            className={cn(
              "space-y-2 rounded-lg border border-dashed p-4",
              containerClass,
            )}
            style={{ width: `${width}px`, maxWidth: "100%" }}
          >
            <p
              className="shimmer font-bold text-foreground/40 text-xl"
              style={textShimmerStyle}
            >
              Text Shimmer Preview
            </p>
            <p className="shimmer text-foreground/40" style={textShimmerStyle}>
              This is body text with the shimmer effect applied. It demonstrates
              how the shimmer looks on actual text content.
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}
