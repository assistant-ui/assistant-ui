// @vitest-environment node

import { channel } from "node:diagnostics_channel";
import { expect, it, vi } from "vitest";

it("leaves production requests alone: no address hook, 404 for every route", async () => {
  vi.stubEnv("NODE_ENV", "production");
  const { GET, POST } = await import("./next");
  const ping = new Request("http://localhost:3000/__variants/ping", {
    headers: { "x-variants": "1", host: "localhost:3000" },
  });
  expect((await GET(ping)).status).toBe(404);
  expect(
    (
      await POST(
        new Request("http://localhost:3000/__variants/notes", {
          method: "POST",
          body: "{}",
        }),
      )
    ).status,
  ).toBe(404);
  expect(channel("http.server.request.start").hasSubscribers).toBe(false);
  vi.unstubAllEnvs();
});
