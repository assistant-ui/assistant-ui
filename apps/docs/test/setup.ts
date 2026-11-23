import { vi } from "vitest";

// Vitest runs "use cache" functions as plain calls, and cacheLife() throws outside a cacheComponents build.
vi.mock("next/cache", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/cache")>()),
  cacheLife: () => {},
}));

// jsdom's Blob has no stream(), which Shiki's inlined WASM loader reads.
if (
  typeof Blob !== "undefined" &&
  typeof Blob.prototype.stream !== "function"
) {
  Blob.prototype.stream = function stream(this: Blob) {
    return new ReadableStream<Uint8Array<ArrayBuffer>>({
      type: "bytes",
      start: async (controller) => {
        controller.enqueue(new Uint8Array(await this.arrayBuffer()));
        controller.close();
      },
    });
  };
}
