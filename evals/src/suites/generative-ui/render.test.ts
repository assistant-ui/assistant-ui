import assert from "node:assert/strict";
import test from "node:test";
import { findChrome } from "./chrome.ts";
import { createRenderer, RENDER_WIDTH } from "./render.ts";
import type { Format } from "./types.ts";

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
      );
      assert.ok(tall.screenshots.length > 1);
      for (const screenshot of tall.screenshots) {
        const { width, height } = size(screenshot);
        assert.equal(width, RENDER_WIDTH);
        assert.ok(height <= 1_000);
      }

      const [prose, markdown] = await Promise.all([
        renderer.render("present", "Sure."),
        renderer.render("text", "Each of the four pays $30."),
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
