// @vitest-environment node
import { describe, expect, it } from "vitest";
// @ts-expect-error The script is plain JavaScript without declarations.
import { bundleFixture } from "../scripts/bundle-boundary.mjs";

type Bundle = { modules: string[]; bytes: number; gzip: number };

const PKG = "packages/generative-frame/src/";
const SPEC = [
  new RegExp(`^${PKG}spec/`),
  new RegExp(`^${PKG}json-schema\\.ts$`),
];
const FRAME = [
  /(^|\/)safe-content-frame\//,
  new RegExp(`^${PKG}runtime/`),
  new RegExp(`^${PKG}(widget|bootstrap|csp|preview)\\.ts$`),
];

const offending = (bundle: Bundle, patterns: RegExp[]) =>
  bundle.modules.filter((id) => patterns.some((pattern) => pattern.test(id)));

// Written past the console capture so the sizes show in CI logs.
const { stdout } = (
  globalThis as unknown as {
    process: { stdout: { write(text: string): void } };
  }
).process;
const report = (name: string, bundle: Bundle) =>
  stdout.write(
    `bundle ${name}: ${(bundle.bytes / 1024).toFixed(1)} kB min, ${(bundle.gzip / 1024).toFixed(1)} kB min+gzip\n`,
  );

describe("bundle boundaries", { timeout: 60_000 }, () => {
  it("keeps spec code out of an HTML-widget app", async () => {
    const bundle: Bundle = await bundleFixture("frame.ts");
    report("frame (core, react, tools)", bundle);
    expect(bundle.modules).toContain(`${PKG}widget.ts`);
    expect(offending(bundle, SPEC)).toEqual([]);
  });

  it("keeps the frame, runtime, and Safe Content Frame out of a spec-only app", async () => {
    const bundle: Bundle = await bundleFixture("spec.ts");
    report("spec (spec, spec/react, spec/tools)", bundle);
    expect(bundle.modules).toContain(`${PKG}spec/catalog.ts`);
    expect(offending(bundle, FRAME)).toEqual([]);
  });

  it("keeps the halves apart in the assistant-ui entries", async () => {
    const frame: Bundle = await bundleFixture("frame-assistant-ui.ts");
    const spec: Bundle = await bundleFixture("spec-assistant-ui.ts");
    report("frame assistant-ui", frame);
    report("spec assistant-ui", spec);
    expect(offending(frame, SPEC)).toEqual([]);
    expect(offending(spec, FRAME)).toEqual([]);
  });
});
