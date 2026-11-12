import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  vi.resetModules();
  vi.doUnmock("rehype-katex");
});

it("retries the KaTeX import after a failed load", async () => {
  let fail = true;
  const rehypeKatex = () => {};
  vi.doMock("rehype-katex", () => {
    if (fail) throw new Error("chunk failed");
    return { default: rehypeKatex };
  });
  const { loadKatexPlugins } = await import("./markdown-text");

  await expect(loadKatexPlugins()).rejects.toThrow();
  fail = false;
  vi.resetModules();
  await expect(loadKatexPlugins()).resolves.toEqual([rehypeKatex]);
});
