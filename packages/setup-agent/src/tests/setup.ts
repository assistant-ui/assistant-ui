import { beforeEach, vi } from "vitest";
import { testGuide } from "./guide-fixture";

// Commands fetch their guide from the setup server; tests serve the fixture
// unless they stub fetch themselves.
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      /\/guide\?/.test(String(url))
        ? Response.json(testGuide)
        : new Response("not stubbed", { status: 500 }),
    ),
  );
});
