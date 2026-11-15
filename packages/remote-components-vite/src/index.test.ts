import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer, type ViteDevServer } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { devCorsAllows, remoteComponents } from "./index";

describe("devCorsAllows", () => {
  it.each([
    [undefined, undefined, undefined, true],
    ["http://localhost:3000", undefined, undefined, true],
    ["http://app.localhost:3000", undefined, undefined, true],
    ["http://127.0.0.1:5173", undefined, undefined, true],
    ["http://[::1]:5173", undefined, undefined, true],
    ["https://evil.example", undefined, undefined, false],
    ["http://localhost.evil.example", undefined, undefined, false],
    ["http://192.168.1.5:5173", undefined, "192.168.1.5:5173", true],
    ["http://192.168.1.5:5173", undefined, "localhost:5173", false],
    ["null", "http://localhost:3000/chat", undefined, true],
    ["null", "http://127.0.0.1:5173/Card/", undefined, true],
    ["null", "https://evil.example/", undefined, false],
    ["null", undefined, undefined, false],
    ["null", "not a url", undefined, false],
  ])(
    "origin %s, referer %s, host %s → %s",
    (origin, referer, host, expected) => {
      expect(devCorsAllows(origin, referer, host)).toBe(expected);
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
    server = await createServer({
      root,
      configFile: false,
      logLevel: "silent",
      plugins: [remoteComponents()],
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

  it("refuses a page on another site", async () => {
    const response = await get({ origin: "https://evil.example" });
    expect(response.status).toBe(403);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("refuses an opaque frame on another site", async () => {
    const response = await get({
      origin: "null",
      referer: "https://evil.example/",
    });
    expect(response.status).toBe(403);
  });

  it("answers a loopback host page and an opaque remote frame it embeds", async () => {
    const host = await get({ origin: "http://localhost:3000" });
    expect(host.status).toBe(200);
    expect(host.headers.get("access-control-allow-origin")).toBe(
      "http://localhost:3000",
    );
    const frame = await get({
      origin: "null",
      referer: "http://localhost:3000/",
    });
    expect(frame.status).toBe(200);
    expect(frame.headers.get("access-control-allow-origin")).toBe("null");
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
