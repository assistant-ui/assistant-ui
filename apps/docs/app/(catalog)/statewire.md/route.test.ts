import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("Statewire setup markdown", () => {
  it("serves the real archive install path and Durable Object agent instructions", async () => {
    const response = GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    const markdown = await response.text();
    expect(markdown).toContain("/downloads/statewire-tic-tac-toe.zip");
    expect(markdown).toContain("vendor/provenance.json");
    expect(markdown).toContain("StatewireDurableObject");
    expect(markdown).toContain("new_sqlite_classes");
    expect(markdown).toContain("not currently a published npm package");
    expect(markdown).toContain("user's setup instructions");
  });
});
