import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("harness-sdk setup markdown", () => {
  it("serves alpha setup instructions with accurate verification status", async () => {
    const response = GET();
    expect(response.status).toBe(200);
    expect(Object.fromEntries(response.headers)).toEqual({
      "cache-control": "no-cache, must-revalidate",
      "content-type": "text/markdown; charset=utf-8",
      etag: expect.stringMatching(/^"sha256-[0-9a-f]{64}"$/),
      "x-robots-tag": "noindex, follow",
    });
    const markdown = await response.text();
    expect(markdown).toContain("assistant-ui-cloud-harness-b9d8b56ad.tgz");
    expect(markdown).toContain("--access-code MULTIPLAYER-2026");
    expect(markdown).toContain("vendor/provenance.json");
    expect(markdown).toMatch(/real device sign-in and production provisioning have passed/i);
    expect(markdown).not.toContain("registration currently requires manual completion");
    expect(markdown).toContain("ASSISTANT_API_KEY remains server-only");
    expect(markdown).toContain("canonical /api/chat route");
    expect(markdown).toContain("refuses to overwrite an existing one");
    expect(markdown).toContain("user's setup instructions");
  });
});
