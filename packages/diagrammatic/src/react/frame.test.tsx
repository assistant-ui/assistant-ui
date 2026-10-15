import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FIXTURES } from "./testUtils";

/**
 * The pixel contract every form shares: a root sized in CSS pixels whose
 * viewBox is that size, type printed only in em of the root, and nothing
 * placed outside the box. A form drawing in a unit box of its own, or printing
 * an absolute size, fails here.
 */
describe("pixel frame", () => {
  for (const [name, element] of Object.entries(FIXTURES)) {
    it(`${name} draws in pixels inside its own box`, () => {
      const html = renderToStaticMarkup(element);
      const root = html.match(/<svg[^>]*>/)![0];
      const box = root.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
      const inline = root.includes("display:inline-block");
      if (!inline) {
        expect(box, `${name} viewBox`).not.toBeNull();
        const [, w, h] = box!;
        expect(root).toContain(`width="${w}"`);
        expect(root).toContain(`height="${h}"`);
        expect(root).toMatch(/font-size="\d+(\.\d+)?"/);
        const width = Number(w);
        const height = Number(h);
        for (const text of html.matchAll(/<text ([^>]*)>/g)) {
          const attrs = text[1]!;
          const size = attrs.match(/font-size="([^"]+)"/);
          if (size) expect(size[1], `${name} text size`).toMatch(/em$/);
          const x = Number(attrs.match(/ x="(-?[\d.]+)"/)?.[1] ?? 0);
          const y = Number(attrs.match(/ y="(-?[\d.]+)"/)?.[1] ?? 0);
          expect(x, `${name} text x`).toBeGreaterThanOrEqual(-0.5);
          expect(x, `${name} text x`).toBeLessThanOrEqual(width + 0.5);
          expect(y, `${name} text y`).toBeGreaterThanOrEqual(-0.5);
          expect(y, `${name} text y`).toBeLessThanOrEqual(height + 0.5);
        }
      }
      expect(root).toContain("font-family:var(--dg-font, inherit)");
      expect(root).not.toContain("data-density");
    });
  }
});
