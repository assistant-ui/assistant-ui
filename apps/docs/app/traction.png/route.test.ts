import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  renderTractionImage: vi.fn(async () => new Response()),
}));

vi.mock("@/lib/traction-image", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/traction-image")>()),
  renderTractionImage: mocks.renderTractionImage,
}));

const { GET } = await import("./route");

describe("GET /traction.png", () => {
  it("renders the light image on every request", async () => {
    await GET();
    await GET();

    expect(mocks.renderTractionImage).toHaveBeenCalledTimes(2);
    expect(mocks.renderTractionImage).toHaveBeenCalledWith("light");
  });
});
