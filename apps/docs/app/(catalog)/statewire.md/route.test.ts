import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("Statewire setup markdown", () => {
  it("serves the real archive install path and Durable Object agent instructions", async () => {
    const response = GET();
    expect(response.status).toBe(200);
    expect(Object.fromEntries(response.headers)).toMatchObject({
      "cache-control": "no-cache, must-revalidate",
      "content-type": "text/markdown; charset=utf-8",
      "x-robots-tag": "noindex, follow",
    });
    expect(response.headers.get("etag")).toMatch(/^"sha256-[0-9a-f]{64}"$/);
    const markdown = await response.text();
    expect(markdown).toContain("/downloads/statewire-tic-tac-toe.zip");
    expect(markdown).toContain("vendor/provenance.json");
    expect(markdown).toContain("StatewireDurableObject");
    expect(markdown).toContain("new_sqlite_classes");
    expect(markdown).toContain("not currently a published npm package");
    expect(markdown).toContain("user's setup instructions");
    expect(markdown).toContain("`?room=<name>`");
    expect(markdown).toContain("`/game/<roomId>`");
  });
});
