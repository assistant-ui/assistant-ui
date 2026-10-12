import assert from "node:assert/strict";
import test from "node:test";
import { findChrome } from "./chrome.ts";
import { createRenderer, RENDER_WIDTH } from "./render.ts";
import type { Format } from "./types.ts";

const noProse = { before: "", after: "" };

const size = (screenshot: string) => {
  const png = Buffer.from(screenshot, "base64");
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
};

const answers: [Format, string][] = [
  ["text", "# Bill\n\nEach of the four pays **$30**."],
  [
    "present",
    JSON.stringify({
      _type: "Card",
      title: "Bill",
      children: [{ _type: "Text", value: "Each of the four pays $30." }],
    }),
  ],
  [
    "spec",
    JSON.stringify({
      root: "card",
      elements: {
        card: { type: "Card", props: { title: "Bill" }, children: ["share"] },
        share: {
          type: "Text",
          props: { value: "Each of the four pays $30." },
        },
      },
    }),
  ],
  ["present", JSON.stringify({ _type: "Input", placeholder: "Amount" })],
  ["frame", "<h3>Bill</h3><p>Each of the four pays $30.</p>"],
  [
    "present",
    JSON.stringify({
      _type: "Diagram",
      code: "flowchart LR\n  A[Order] --> B[Ship]",
    }),
  ],
  [
    "present",
    JSON.stringify({
      _type: "Map",
      route: true,
      places: [
        { label: "Monterey", lat: 36.6002, lng: -121.8947 },
        { label: "Big Sur", lat: 36.2704, lng: -121.8081 },
      ],
    }),
  ],
];

test(
  "renders answers in Chrome one at a time, slices tall ones, and reports what fails",
  { skip: findChrome() ? false : "no Chrome to render in" },
  async () => {
    const renderer = await createRenderer();
    try {
      for (const [format, artifact] of answers) {
        const { screenshots, cutOff, runtimeErrors } = await renderer.render(
          format,
          artifact,
          noProse,
        );
        assert.deepEqual(runtimeErrors, [], artifact);
        assert.equal(cutOff, false);
        assert.equal(screenshots.length, 1, artifact);
        const { width, height } = size(screenshots[0]!);
        assert.equal(width, RENDER_WIDTH, artifact);
        assert.ok(height > 40, `${artifact} is ${height} px tall`);
      }

      const tall = await renderer.render(
        "text",
        Array.from({ length: 80 }, (_, i) => `Step ${i + 1}.`).join("\n\n"),
        noProse,
      );
      assert.ok(tall.screenshots.length > 1);
      for (const screenshot of tall.screenshots) {
        const { width, height } = size(screenshot);
        assert.equal(width, RENDER_WIDTH);
        assert.ok(height <= 1_000);
      }

      const broken = await renderer.render(
        "frame",
        "<p>Bill</p><script>throw new Error('boom')</script>",
        noProse,
      );
      assert.ok(
        broken.runtimeErrors.some((error) => error.includes("boom")),
        broken.runtimeErrors.join("; "),
      );

      const [prose, markdown] = await Promise.all([
        renderer.render("present", "Sure.", noProse),
        renderer.render("text", "Each of the four pays $30.", noProse),
      ]);
      assert.deepEqual(prose.runtimeErrors, [
        "The answer is not JSON, so nothing renders.",
        "The answer rendered blank.",
      ]);
      assert.deepEqual(markdown.runtimeErrors, []);
      assert.ok(
        size(prose.screenshots[0]!).height <
          size(markdown.screenshots[0]!).height,
        "each screenshot shows its own answer",
      );
    } finally {
      await renderer.close();
    }
  },
);

test(
  "prose does not hide a blank spec answer",
  { skip: findChrome() ? false : "no Chrome to render in" },
  async () => {
    const renderer = await createRenderer();
    try {
      const rendered = await renderer.render("spec", "{}", {
        before: "Here is your plan.",
        after: "",
      });
      assert.ok(
        rendered.runtimeErrors.includes("The answer rendered blank."),
        rendered.runtimeErrors.join("; "),
      );
    } finally {
      await renderer.close();
    }
  },
);
