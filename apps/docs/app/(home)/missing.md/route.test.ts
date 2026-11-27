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
