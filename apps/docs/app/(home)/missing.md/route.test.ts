import { expect, it } from "vitest";
import "@/test/mock-content";
import { GET } from "./route";

it("returns a markdown 404 with the requested path and the documentation index", async () => {
  const response = GET(new Request("https://example.com/unknown?view=base"));

  expect(response.status).toBe(404);
  expect(response.headers.get("Content-Type")).toBe(
    "text/markdown; charset=utf-8",
  );
  expect(await response.text()).toBe(
    "# Page not found\n\nThere is no page at `/unknown`.\n\nEvery page is listed in [llms.txt](/llms.txt).\n",
  );
});

it("quotes the original path from the rewrite query", async () => {
  const response = GET(
    new Request("https://example.com/missing.md?path=%2Fnested%2Funknown.mdx"),
  );

  expect(response.status).toBe(404);
  expect(await response.text()).toContain(
    "There is no page at `/nested/unknown.mdx`.",
  );
});

it("keeps a crafted path inside the code span", async () => {
  const response = GET(
    new Request(
      "https://example.com/missing.md?path=%2Fx%E2%80%A8%23%20Injected%C2%85%60",
    ),
  );

  expect(await response.text()).toContain(
    "There is no page at `/x# Injected`.",
  );
});
