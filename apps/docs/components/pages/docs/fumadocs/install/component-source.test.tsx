import { renderToString } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { ComponentSourceFromFile } from "./component-source";

vi.mock("@farm.js/core/cache", async (importOriginal) => ({
  ...(await importOriginal()),
  unstable_cache: <T,>(fn: T) => fn,
}));

it("highlights registry source on the server so the page ships no client highlighter", async () => {
  const element = await ComponentSourceFromFile({
    file: {
      name: "thread",
      path: "components/assistant-ui/thread.tsx",
      content: "export default function Thread() { return null; }",
    },
    collapsible: false,
  });
  const html = renderToString(element);

  expect(html).toContain(
    'class="shiki shiki-themes catppuccin-latte catppuccin-mocha"',
  );
  expect(html).toMatch(/--shiki-light:#[0-9a-f]{6};--shiki-dark:#[0-9a-f]{6}/i);
  expect(html.replace(/<[^>]+>/g, "")).toContain("export function Thread()");
});
