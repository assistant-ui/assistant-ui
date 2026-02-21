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

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Displacement Map ──────────────────────────────────────────────
// 100×100 viewBox, preserveAspectRatio="none" so it stretches to any element.
// R channel = X offset, G channel = Y offset. #808080 = no displacement.
// Edge gradients create the lens-like refraction; inner rect punches a
// neutral center so the middle of the element is undistorted.

const DISPLACEMENT_MAP_SVG = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">',
  "<defs>",
  '<linearGradient id="x" x1="5%" y1="0" x2="95%" y2="0">',
  '<stop offset="0%" stop-color="#F00"/>',
  '<stop offset="100%" stop-color="#000"/>',
  "</linearGradient>",
  '<linearGradient id="y" x1="0" y1="5%" x2="0" y2="95%">',
  '<stop offset="0%" stop-color="#0F0"/>',
  '<stop offset="100%" stop-color="#000"/>',
  "</linearGradient>",
  '<filter id="ob"><feGaussianBlur stdDeviation="1.5"/></filter>',
  '<filter id="ib"><feGaussianBlur stdDeviation="4"/></filter>',
  "</defs>",
  '<rect width="100" height="100" fill="#808080"/>',
  '<g filter="url(#ob)">',
  '<rect width="100" height="100" fill="#000080"/>',
  '<rect width="100" height="100" fill="url(#y)" style="mix-blend-mode:screen"/>',
  '<rect width="100" height="100" fill="url(#x)" style="mix-blend-mode:screen"/>',
  '<rect x="8" y="8" width="84" height="84" rx="4" ry="4" fill="#808080" filter="url(#ib)"/>',
  "</g>",
  "</svg>",
].join("");

const mapBase64 = Buffer.from(DISPLACEMENT_MAP_SVG).toString("base64");

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

const feImage = [
  `<feImage href="data:image/svg+xml;base64,${mapBase64}"`,
  ` x="0" y="0" width="1" height="1" preserveAspectRatio="none" result="map"/>`,
].join("");

function filterOpen() {
  return [
    '<svg xmlns="http://www.w3.org/2000/svg"><defs>',
    '<filter id="f" filterUnits="objectBoundingBox"',
    ' primitiveUnits="objectBoundingBox"',
    ' x="0" y="0" width="1" height="1"',
    ' color-interpolation-filters="sRGB">',
  ].join("");
}

function filterClose() {
  return "</filter></defs></svg>";
}

function buildStandardFilter(scale) {
  return [
    filterOpen(),
    feImage,
    `<feDisplacementMap in="SourceGraphic" in2="map" scale="${scale}"`,
    ` xChannelSelector="R" yChannelSelector="G"/>`,
    filterClose(),
  ].join("");
}

function buildChromaticFilter(scale) {
  const r = +(scale * 1.4).toFixed(4);
  const g = +(scale * 1.2).toFixed(4);
  const b = +scale.toFixed(4);

  return [
    filterOpen(),
    feImage,
    // Red channel
    `<feDisplacementMap in="SourceGraphic" in2="map" scale="${r}" xChannelSelector="R" yChannelSelector="G"/>`,
    '<feColorMatrix type="matrix" values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" result="dR"/>',
    // Green channel
    `<feDisplacementMap in="SourceGraphic" in2="map" scale="${g}" xChannelSelector="R" yChannelSelector="G"/>`,
    '<feColorMatrix type="matrix" values="0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0" result="dG"/>',
    // Blue channel
    `<feDisplacementMap in="SourceGraphic" in2="map" scale="${b}" xChannelSelector="R" yChannelSelector="G"/>`,
    '<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0" result="dB"/>',
    // Blend
    '<feBlend in="dR" in2="dG" mode="screen" result="rg"/>',
    '<feBlend in="rg" in2="dB" mode="screen"/>',
    filterClose(),
  ].join("");
}

function toDataUri(svg) {
  // Minimal encoding for SVG in CSS url("..."). Matches the approach
  // used by mini-svg-data-uri: encode only the characters that are
  // unsafe in data URIs or CSS strings, leave everything else literal.
  const encoded = svg
    .replace(/"/g, "'") // XML attrs: " → ' (avoids closing CSS string)
    .replace(/%/g, "%25") // must be first (percent-encoding escape)
    .replace(/#/g, "%23") // URI fragment delimiter
    .replace(/</g, "%3C") // URI delimiter (RFC 3986)
    .replace(/>/g, "%3E") // URI delimiter (RFC 3986)
    .replace(/\s+/g, "%20"); // collapse whitespace
  return `url("data:image/svg+xml,${encoded}#f")`;
}

// ─── Generate CSS ──────────────────────────────────────────────────

const defaultScale = STRENGTHS.find((s) => s.name === DEFAULT_STRENGTH).scale;
const defaultFilterUri = toDataUri(buildStandardFilter(defaultScale));

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
  const uri = toDataUri(buildStandardFilter(scale));
  emit(`@utility glass-strength-${name} {`);
  emit(`  --tw-glass-filter: ${uri};`);
  emit(`}`);
  emit();
}

// Chromatic levels
emit(`/* ── Chromatic Aberration (RGB channel splitting) ──────────── */`);
emit();
for (const { name, scale } of STRENGTHS) {
  const uri = toDataUri(buildChromaticFilter(scale));
  emit(`@utility glass-chromatic-${name} {`);
  emit(`  --tw-glass-filter: ${uri};`);
  emit(`}`);
  emit();
}

// Continuous modifier utilities
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
emit(`  --glass-bg-opacity: calc(--value(integer) * 0.01);`);
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
