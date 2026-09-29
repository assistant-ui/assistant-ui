import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  renderTractionImage: vi.fn(async () => new Response()),
}));

vi.mock("@/lib/traction-image", () => ({
  renderTractionImage: mocks.renderTractionImage,
}));

const { GET, dynamic } = await import("./route");

describe("GET /traction.png", () => {
  it("renders at request time so npm is never read from a build", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  it("renders the light theme", async () => {
    await GET();
    expect(mocks.renderTractionImage).toHaveBeenCalledWith("light");
  });
});
