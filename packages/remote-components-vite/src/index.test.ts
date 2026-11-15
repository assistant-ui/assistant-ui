import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer, type ViteDevServer } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  devAllowedHosts,
  devCorsAllows,
  devHostAllowed,
  remoteComponents,
  singleFileCors,
} from "./index";

describe("devCorsAllows", () => {
  it.each([
    [undefined, undefined, true],
    ["null", undefined, false],
    ["http://localhost:3000", undefined, true],
    ["http://app.localhost:3000", undefined, true],
    ["http://127.0.0.1:5173", undefined, true],
    ["http://[::1]:5173", undefined, true],
    ["https://evil.example", undefined, false],
    ["http://localhost.evil.example", undefined, false],
    ["http://192.168.1.5:5173", "192.168.1.5:5173", true],
    ["http://192.168.1.5:5173", "localhost:5173", false],
    ["not a url", "localhost:5173", false],
  ])("origin %s, host %s → %s", (origin, host, expected) => {
    expect(devCorsAllows(origin, host)).toBe(expected);
  });

  it("admits Origin null only when opaque frames are allowed", () => {
    expect(devCorsAllows("null", "localhost:5173", true)).toBe(true);
    expect(devCorsAllows("https://evil.example", undefined, true)).toBe(false);
  });
});

/** A GET with exactly these headers; fetch replaces a custom Host. */
const rawGet = (url: string, headers: Record<string, string>) =>
  new Promise<{ status: number; cors: string | undefined }>(
    (resolve, reject) => {
      const req = request(url, { headers }, (res) => {
        res.resume();
        resolve({
          status: res.statusCode ?? 0,
          cors: res.headers["access-control-allow-origin"] as
            | string
            | undefined,
        });
      });
      req.on("error", reject);
      req.end();
    },
  );

describe("devHostAllowed", () => {
  it.each([
    ["localhost:5173", undefined, true],
    ["app.localhost", undefined, true],
    ["127.0.0.1:5173", undefined, true],
    ["192.168.1.5:5173", undefined, true],
    ["[::1]:5173", undefined, true],
    ["evil.example:5173", undefined, false],
    ["evil.example", ["dev.example"], false],
    ["dev.example:5173", ["dev.example"], true],
    ["a.dev.example", [".dev.example"], true],
    ["anything", true, true],
    [undefined, undefined, false],
  ] as const)("host %s, allowedHosts %j → %s", (host, allowed, expected) => {
    expect(devHostAllowed(host, allowed as never)).toBe(expected);
  });
});

describe("devAllowedHosts", () => {
  const config = (server: Record<string, unknown>, preview = {}) =>
    ({ server: { allowedHosts: [], ...server }, preview }) as never;

  it("adds the hosts Vite's config names", () => {
    expect(devAllowedHosts(config({ host: "a.test" }))).toEqual(["a.test"]);
    expect(devAllowedHosts(config({}, { host: "b.test" }))).toEqual(["b.test"]);
    expect(devAllowedHosts(config({ hmr: { host: "c.test" } }))).toEqual([
      "c.test",
    ]);
    expect(devAllowedHosts(config({ origin: "http://d.test:5173" }))).toEqual([
      "d.test",
    ]);
    expect(
      devAllowedHosts(config({ allowedHosts: ["e.test"], host: true })),
    ).toEqual(["e.test"]);
    expect(devAllowedHosts(config({ allowedHosts: true }))).toBe(true);
  });
});

describe("singleFileCors", () => {
  it.each([
    [
      { origin: "http://localhost:3000" },
      false,
      false,
      "http://localhost:3000",
    ],
    [{ origin: "https://evil.example" }, false, false, undefined],
    [{ origin: "null" }, false, false, undefined],
    [{ origin: "null" }, false, true, "null"],
    [{ origin: "http://localhost:3000" }, true, false, undefined],
    [{ origin: "https://app.example" }, true, false, undefined],
    [{}, false, false, undefined],
  ])(
    "headers %j, customCors %s, opaqueFrames %s → %s",
    (headers, customCors, opaqueFrames, expected) => {
      expect(
        singleFileCors(headers, { customCors, opaqueFrames })[
          "access-control-allow-origin"
        ],
      ).toBe(expected);
    },
  );
});

describe("dev server CORS", () => {
  let root: string;
  let server: ViteDevServer;
  let base: string;

  beforeAll(async () => {
    root = mkdtempSync(path.join(tmpdir(), "rc-vite-cors-"));
    writeFileSync(path.join(root, "secret.ts"), "export const key = 1;\n");
    writeFileSync(
      path.join(root, "Card.tsx"),
      "export default function Card() { return null; }\n",
    );
    server = await createServer({
      root,
      configFile: false,
      logLevel: "silent",
      plugins: [remoteComponents({ components: { Card: "Card.tsx" } })],
      server: { host: "127.0.0.1", port: 0, ws: false },
    });
    await server.listen();
    const { port } = server.httpServer!.address() as AddressInfo;
    base = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await server?.close();
    rmSync(root, { recursive: true, force: true });
  });

  const get = (headers: Record<string, string>) =>
    fetch(`${base}/secret.ts`, { headers });

  it("gives a page on another site no CORS header, so it can't read the response", async () => {
    const response = await get({ origin: "https://evil.example" });
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("refuses a rebound host name even when Origin matches Host", async () => {
    const { port } = new URL(base);
    const response = await rawGet(`${base}/secret.ts`, {
      origin: `http://evil.example:${port}`,
      host: `evil.example:${port}`,
    });
    expect(response.status).toBe(403);
    expect(response.cors).toBeUndefined();
  });

  it("answers a loopback page, and gives an opaque frame no CORS header by default", async () => {
    const host = await get({ origin: "http://localhost:3000" });
    expect(host.status).toBe(200);
    expect(host.headers.get("access-control-allow-origin")).toBe(
      "http://localhost:3000",
    );
    // What a browser sends for an opaque frame's module: Origin null, no
    // Referer, from the developer's page or any other site alike.
    const frame = await get({ origin: "null" });
    expect(frame.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("answers an opaque frame with opaqueFrames", async () => {
    const opaque = await createServer({
      root,
      configFile: false,
      logLevel: "silent",
      plugins: [remoteComponents({ opaqueFrames: true })],
      server: { host: "127.0.0.1", port: 0, ws: false },
    });
    await opaque.listen();
    try {
      const { port } = opaque.httpServer!.address() as AddressInfo;
      const frame = await fetch(`http://127.0.0.1:${port}/secret.ts`, {
        headers: { origin: "null" },
      });
      expect(frame.status).toBe(200);
      expect(frame.headers.get("access-control-allow-origin")).toBe("null");
      const other = await fetch(`http://127.0.0.1:${port}/secret.ts`, {
        headers: { origin: "https://evil.example" },
      });
      expect(other.headers.get("access-control-allow-origin")).toBeNull();
    } finally {
      await opaque.close();
    }
  });

  it("refuses a rebound host name on the plugin's own pages, with or without Origin", async () => {
    const { port } = new URL(base);
    for (const headers of [
      { host: `evil.example:${port}` },
      { host: `evil.example:${port}`, origin: `http://evil.example:${port}` },
    ]) {
      expect((await rawGet(`${base}/Card/`, headers)).status).toBe(403);
    }
    expect((await rawGet(`${base}/Card/`, {})).status).toBe(200);
  });

  it.each([
    ["server.host", { host: "devbox.test" }],
    ["server.origin", { origin: "http://devbox.test:5173" }],
  ])(
    "admits the host Vite's own %s names on the plugin's pages",
    async (_name, extra) => {
      const named = await createServer({
        root,
        configFile: false,
        logLevel: "silent",
        plugins: [remoteComponents({ components: { Card: "Card.tsx" } })],
        server: { port: 0, ws: false, ...extra },
      });
      // Listen on loopback whatever server.host names.
      await new Promise<void>((resolve) =>
        named.httpServer!.listen(0, "127.0.0.1", resolve),
      );
      try {
        const { port } = named.httpServer!.address() as AddressInfo;
        const url = `http://127.0.0.1:${port}/Card/`;
        expect(
          (await rawGet(url, { host: `devbox.test:${port}` })).status,
        ).toBe(200);
        expect((await rawGet(url, { host: `other.test:${port}` })).status).toBe(
          403,
        );
      } finally {
        await named.close();
      }
    },
  );

  it("does not refuse a request for its Origin alone", async () => {
    // A same-origin POST behind a Host-rewriting proxy carries its public
    // Origin; only the CORS header decides whether a page can read.
    const response = await fetch(`${base}/secret.ts`, {
      headers: { origin: "https://dev.example" },
    });
    expect(response.status).toBe(200);
  });

  it("leaves other paths to Vite's own host check", async () => {
    const { port } = new URL(base);
    // Vite 8 refuses it itself; the plugin's check covers only its pages.
    const response = await rawGet(`${base}/secret.ts`, {
      host: `evil.example:${port}`,
    });
    expect(response.status).toBe(403);
  });

  it("applies a project's own server.cors to the plugin's pages", async () => {
    const custom = await createServer({
      root,
      configFile: false,
      logLevel: "silent",
      plugins: [remoteComponents({ components: { Card: "Card.tsx" } })],
      server: {
        host: "127.0.0.1",
        port: 0,
        ws: false,
        cors: { origin: ["https://app.example"] },
      },
    });
    await custom.listen();
    try {
      const { port } = custom.httpServer!.address() as AddressInfo;
      const page = (origin: string) =>
        fetch(`http://127.0.0.1:${port}/Card/`, { headers: { origin } });
      const allowed = await page("https://app.example");
      expect(allowed.status).toBe(200);
      expect(allowed.headers.get("access-control-allow-origin")).toBe(
        "https://app.example",
      );
      const other = await page("https://evil.example");
      expect(other.headers.get("access-control-allow-origin")).toBeNull();
    } finally {
      await custom.close();
    }
  });

  it("leaves CORS to a project that sets server.cors", async () => {
    const custom = await createServer({
      root,
      configFile: false,
      logLevel: "silent",
      plugins: [remoteComponents()],
      server: { host: "127.0.0.1", port: 0, ws: false, cors: { origin: "*" } },
    });
    await custom.listen();
    try {
      const { port } = custom.httpServer!.address() as AddressInfo;
      const response = await fetch(`http://127.0.0.1:${port}/secret.ts`, {
        headers: { origin: "https://evil.example" },
      });
      expect(response.status).toBe(200);
      expect(response.headers.get("access-control-allow-origin")).toBe("*");
    } finally {
      await custom.close();
    }
  });
});
