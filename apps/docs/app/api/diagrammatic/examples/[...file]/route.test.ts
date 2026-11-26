import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { GET, generateStaticParams } from "./route";

vi.mock("next/cache", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/cache")>()),
  cacheLife: () => {},
}));

const get = (file: string[]) =>
  GET(new Request("http://localhost/"), {
    params: Promise.resolve({ file }),
  });

describe("diagrammatic example sources", () => {
  it("prerenders one source per example file", () => {
    const params = generateStaticParams();
    expect(params).toContainEqual({ file: ["line", "basic"] });
    expect(params).toContainEqual({ file: ["dot-world-map", "motion"] });
  });

  it("serves an example's source and its highlighted html", async () => {
    const res = await get(["line", "basic"]);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { code: string; html: string };
    expect(body.code).toBe(
      readFileSync(
        path.join(
          process.cwd(),
          "components/diagrammatic/examples/line/basic.tsx",
        ),
        "utf8",
      ).trimEnd(),
    );
    expect(body.html).toContain("<pre");
  });

  it("serves nothing for unknown or escaping names", async () => {
    expect((await get(["line", "missing"])).status).toBe(404);
    expect((await get(["..", "example"])).status).toBe(404);
    expect((await get(["line", "basic.tsx"])).status).toBe(404);
  });
});
