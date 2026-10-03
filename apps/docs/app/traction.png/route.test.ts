import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const requests: (() => void)[] = [];

  return {
    requests,
    connection: vi.fn(
      () =>
        new Promise<void>((resolve) => {
          requests.push(resolve);
        }),
    ),
    renderTractionImage: vi.fn(async () => new Response()),
  };
});

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: mocks.connection,
}));

vi.mock("@/lib/traction-image", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/traction-image")>()),
  renderTractionImage: mocks.renderTractionImage,
}));

const { GET } = await import("./route");

const flush = () => new Promise((resolve) => setTimeout(resolve));

describe("GET /traction.png", () => {
  it("waits for the request before rendering", async () => {
    const response = GET();
    await flush();

    expect(mocks.connection).toHaveBeenCalledOnce();
    expect(mocks.renderTractionImage).not.toHaveBeenCalled();

    mocks.requests.shift()?.();
    await response;
    expect(mocks.renderTractionImage).toHaveBeenCalledWith("light");
  });

  it("renders the light theme", async () => {
    const response = GET();
    mocks.requests.shift()?.();
    await response;
    expect(mocks.renderTractionImage).toHaveBeenCalledWith("light");
  });
});
