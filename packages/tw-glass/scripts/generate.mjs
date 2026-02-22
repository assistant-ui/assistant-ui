#!/usr/bin/env node
/**
 * Generates src/index.css for tw-glass.
 *
 * The displacement map SVG is base64-encoded once, then embedded inside each
 * filter SVG's <feImage href>. The outer filter SVG is URL-encoded as a data
 * URI for use in backdrop-filter: url("data:...#f").
 *
 * Run: node scripts/generate.mjs
 */

import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  buildDisplacementMapSvg,
  encodeSvgUrl,
  buildStandardFilter,
  buildChromaticFilter,
  toDataUri,
} from "./filter-builder.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Displacement Map ──────────────────────────────────────────────

const DISPLACEMENT_MAP_SVG = buildDisplacementMapSvg();
const mapUrlEncoded = encodeSvgUrl(DISPLACEMENT_MAP_SVG);

// ─── Strength Levels ───────────────────────────────────────────────
// Scale is in objectBoundingBox units (fraction of element size).
// strength-20 at scale 0.10 matches the tested "standard" look.

const STRENGTHS = [
  { name: "5", scale: 0.03 },
  { name: "10", scale: 0.05 },
  { name: "20", scale: 0.1 },
  { name: "30", scale: 0.15 },
  { name: "40", scale: 0.2 },
  { name: "50", scale: 0.25 },
];

const DEFAULT_STRENGTH = "20";

// ─── Filter Builders ───────────────────────────────────────────────
// (imported from filter-builder.mjs)

// ─── Generate CSS ──────────────────────────────────────────────────

const defaultScale = STRENGTHS.find((s) => s.name === DEFAULT_STRENGTH).scale;
const defaultFilterUri = toDataUri(
  buildStandardFilter(mapUrlEncoded, defaultScale),
);

const lines = [];
const emit = (s = "") => lines.push(s);

emit(`/*`);
emit(` * tw-glass — Tailwind CSS v4 plugin for glass refraction effects`);
emit(` *`);
emit(
  ` * Uses SVG displacement maps with filterUnits="objectBoundingBox" to create`,
);
emit(
  ` * glass-like refraction that scales with element size. No JavaScript, no`,
);
emit(` * companion components — just CSS classes.`);
emit(` *`);
emit(` * Usage:`);
emit(` *   @import "tw-glass";`);
emit(` *`);
emit(
  ` *   <div class="glass">                              <!-- default refraction -->`,
);
emit(
  ` *   <div class="glass glass-strength-40">             <!-- stronger -->`,
);
emit(
  ` *   <div class="glass glass-chromatic-20">            <!-- RGB splitting -->`,
);
emit(
  ` *   <div class="glass glass-blur-4">                  <!-- custom blur (px) -->`,
);
emit(
  ` *   <div class="glass glass-saturation-150">          <!-- 150% saturation -->`,
);
emit(
  ` *   <div class="glass glass-brightness-110">          <!-- 110% brightness -->`,
);
emit(
  ` *   <div class="glass glass-surface">                 <!-- frosted surface -->`,
);
emit(
  ` *   <h1 class="glass-text">                              <!-- glass text effect -->`,
);
emit(` */`);
emit();

// Custom properties
emit(`/* ── Custom Properties ──────────────────────────────────────── */`);
emit();
emit(`@property --tw-glass-blur {`);
emit(`  syntax: "<length>";`);
emit(`  inherits: false;`);
emit(`  initial-value: 2px;`);
emit(`}`);
emit();
emit(`@property --tw-glass-brightness {`);
emit(`  syntax: "<number>";`);
emit(`  inherits: false;`);
emit(`  initial-value: 1.05;`);
emit(`}`);
emit();
emit(`@property --tw-glass-saturation {`);
emit(`  syntax: "<number>";`);
emit(`  inherits: false;`);
emit(`  initial-value: 1.2;`);
emit(`}`);
emit();
emit(`@property --glass-bg-opacity {`);
emit(`  syntax: "<number>";`);
emit(`  inherits: true;`);
emit(`  initial-value: 0.08;`);
emit(`}`);
emit();

// ─── Tailwind v4 Backdrop Composition ────────────────────────────────
// Tailwind v4 "owns" the backdrop-filter property: it strips any
// backdrop-filter declaration from user CSS (@utility, @layer utilities)
// and only generates it via its own internal composition of --tw-backdrop-*
// variables.  To work around this we:
//
// 1. Set Tailwind's --tw-backdrop-* vars inside the tree-shakeable @utility
// 2. Apply the actual backdrop-filter property via @layer components, which
//    Tailwind passes through without stripping.
//
// The composition string mirrors what Tailwind generates for its built-in
// backdrop-* utilities — if the variable is unset the trailing comma makes
// var() resolve to an empty string which is ignored.

const TW_BACKDROP_COMPOSITION = [
  "var(--tw-backdrop-blur,)",
  "var(--tw-backdrop-brightness,)",
  "var(--tw-backdrop-contrast,)",
  "var(--tw-backdrop-grayscale,)",
  "var(--tw-backdrop-hue-rotate,)",
  "var(--tw-backdrop-invert,)",
  "var(--tw-backdrop-opacity,)",
  "var(--tw-backdrop-saturate,)",
  "var(--tw-backdrop-sepia,)",
].join(" ");

emit(`/* ── Base Glass Utility ─────────────────────────────────────── */`);
emit();
emit(`@utility glass {`);
emit(`  --tw-glass-filter: ${defaultFilterUri};`);
emit(
  `  --tw-backdrop-blur: var(--tw-glass-filter) blur(var(--tw-glass-blur));`,
);
emit(`  --tw-backdrop-brightness: brightness(var(--tw-glass-brightness));`);
emit(`  --tw-backdrop-saturate: saturate(var(--tw-glass-saturation));`);
emit(`}`);
emit();
emit(`/* Companion rule — @layer components is not stripped by Tailwind v4 */`);
emit(`@layer components {`);
emit(`  .glass {`);
emit(`    -webkit-backdrop-filter: ${TW_BACKDROP_COMPOSITION};`);
emit(`    backdrop-filter: ${TW_BACKDROP_COMPOSITION};`);
emit(`  }`);
emit(`}`);
emit();

// Surface styling
emit(`/* ── Surface Styling (compose with "glass") ────────────────── */`);
emit();
emit(`@utility glass-surface {`);
emit(`  background: rgb(255 255 255 / var(--glass-bg-opacity));`);
emit(`  box-shadow:`);
emit(`    inset 0 0 0 1px rgb(255 255 255 / 0.15),`);
emit(`    inset 0 1px 0 rgb(255 255 255 / 0.25),`);
emit(`    0 8px 32px rgb(0 0 0 / 0.12);`);
emit(`}`);
emit();

// Strength levels
emit(`/* ── Displacement Strength ──────────────────────────────────── */`);
emit();
for (const { name, scale } of STRENGTHS) {
  const uri = toDataUri(buildStandardFilter(mapUrlEncoded, scale));
  emit(`@utility glass-strength-${name} {`);
  emit(`  --tw-glass-filter: ${uri};`);
  emit(`}`);
  emit();
}

// Chromatic levels
emit(`/* ── Chromatic Aberration (RGB channel splitting) ──────────── */`);
emit();
for (const { name, scale } of STRENGTHS) {
  const uri = toDataUri(buildChromaticFilter(mapUrlEncoded, scale));
  emit(`@utility glass-chromatic-${name} {`);
  emit(`  --tw-glass-filter: ${uri};`);
  emit(`}`);
  emit();
}

// ─── Continuous Modifiers ─────────────────────────────────────
emit(`/* ── Continuous Modifiers ───────────────────────────────────── */`);
emit();
emit(`@utility glass-blur-* {`);
emit(`  --tw-glass-blur: calc(--value(number) * 1px);`);
emit(`}`);
emit();
emit(`@utility glass-saturation-* {`);
emit(`  --tw-glass-saturation: calc(--value(number) / 100);`);
emit(`}`);
emit();
emit(`@utility glass-brightness-* {`);
emit(`  --tw-glass-brightness: calc(--value(number) / 100);`);
emit(`}`);
emit();
emit(`@utility glass-bg-* {`);
emit(`  --glass-bg-opacity: calc(--value(number) * 0.01);`);
emit(`}`);
emit();
emit(`/* ── Glass Text Effect ─────────────────────────────────────── */`);
emit(`/*`);
emit(
  ` * Shows a background image through the text shape, like looking through`,
);
emit(` * glass letters. Set \`background-image\` on the element and use`);
emit(` * \`background-attachment: fixed\` for a parallax-window effect.`);
emit(` *`);
emit(` * Usage:`);
emit(` *   <h1 class="glass-text" style="background-image: url(photo.jpg)">`);
emit(` *     tw-glass`);
emit(` *   </h1>`);
emit(` */`);
emit();
emit(`@utility glass-text {`);
emit(`  color: transparent;`);
emit(`  -webkit-background-clip: text;`);
emit(`  background-clip: text;`);
emit(`  background-size: cover;`);
emit(`  background-position: center;`);
emit(`}`);

const css = lines.join("\n") + "\n";
const outPath = resolve(__dirname, "../src/index.css");
writeFileSync(outPath, css);

console.log(`✓ Generated ${outPath}`);
console.log(`  ${STRENGTHS.length} standard strength levels`);
console.log(`  ${STRENGTHS.length} chromatic strength levels`);
console.log(`  ${(css.length / 1024).toFixed(1)}KB total`);
