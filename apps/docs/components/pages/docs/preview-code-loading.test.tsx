import { renderToString } from "react-dom/server";
import { expect, it, vi } from "vitest";

const loadHighlighter = vi.hoisted(() => vi.fn());
vi.mock("react-shiki", async (importOriginal) => {
  loadHighlighter();
  return { ...(await importOriginal<typeof import("react-shiki")>()) };
});

it("renders closed code panels without initializing the highlighter", async () => {
  const [{ PreviewCodeClient }, { SampleFrame }] = await Promise.all([
    import("./preview-code"),
    import("./samples/sample-frame"),
  ]);
  const html = renderToString(
    <>
      <PreviewCodeClient code="const preview = 1;" codeVariant="base">
        <span>Live preview</span>
      </PreviewCodeClient>
      <SampleFrame code="const sample = 2;">
        <span>Live sample</span>
      </SampleFrame>
    </>,
  );
  expect(html).toContain("Live preview");
  expect(html).toContain("Live sample");
  expect(html).not.toContain("<pre");
  expect(loadHighlighter).not.toHaveBeenCalled();
});
