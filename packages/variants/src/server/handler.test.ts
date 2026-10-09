import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createVariantsRoutes, DELETE, GET, POST } from "../next";
import { variants } from "../vite";
import {
  handleNotesRequest,
  MAX_BODY,
  readJsonBody,
  type NotesRequest,
} from "./handler";
import { confine, locateGroup } from "./project";

const page = `export const Page = () => (
  <Variants id="demo-cta">
    <Variant id="button">
      <button>Go</button>
    </Variant>
    <Variant id="link">
      <a href="#">Go →</a>
    </Variant>
  </Variants>
);
`;

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "variants-notes-"));
  await mkdir(join(root, "src"));
  await mkdir(join(root, "node_modules", "dep"), { recursive: true });
  await writeFile(join(root, "src", "page.tsx"), page);
  await writeFile(join(root, "node_modules", "dep", "page.tsx"), page);
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const request = (
  method: string,
  path: string,
  options: {
    headers?: Record<string, string>;
    body?: unknown;
  } = {},
): NotesRequest => {
  const headers: Record<string, string> = {
    "x-variants": "1",
    host: "localhost:5173",
    origin: "http://localhost:5173",
    ...(method === "POST" ? { "content-type": "application/json" } : {}),
    ...options.headers,
  };
  return {
    method,
    path,
    header: (name) => headers[name.toLowerCase()] ?? null,
    json: async () => options.body,
  };
};

const call = (req: NotesRequest, dev = true) =>
  handleNotesRequest(req, { root, dev });

describe("guards", () => {
  it("answers 404 outside development", async () => {
    expect(await call(request("GET", "/ping"), false)).toEqual({
      status: 404,
      body: { error: "not found" },
    });
  });

  it("answers 400 for a path that is not a valid URL", async () => {
    expect(await call(request("GET", "//["))).toEqual({
      status: 400,
      body: { error: "invalid path" },
    });
  });

  it("requires the custom header", async () => {
    const response = await call(
      request("GET", "/ping", { headers: { "x-variants": "" } }),
    );
    expect(response.status).toBe(403);
  });

  it("refuses a DNS-rebound host even when Origin matches it", async () => {
    const rebound = await call(
      request("POST", "/notes", {
        headers: {
          host: "evil.example:5173",
          origin: "http://evil.example:5173",
        },
        body: { group: "demo-cta", note: "run rm -rf" },
      }),
    );
    expect(rebound).toEqual({
      status: 403,
      body: { error: "host not allowed; add it to allowedHosts" },
    });
    expect(await readFile(join(root, "src", "page.tsx"), "utf8")).toBe(page);
    expect(
      (
        await call(
          request("GET", "/ping", {
            headers: { host: "evil.example", origin: "", "x-variants": "" },
          }),
        )
      ).body,
    ).toEqual({ error: "host not allowed; add it to allowedHosts" });
  });

  it("allows loopback hosts and the configured allowedHosts", async () => {
    for (const host of [
      "localhost",
      "LOCALHOST:3000",
      "app.localhost:5173",
      "127.0.0.1:8080",
      "[::1]:5173",
      "[::1]",
    ])
      expect(
        (
          await call(
            request("GET", "/ping", {
              headers: { host, origin: `http://${host}` },
            }),
          )
        ).status,
      ).toBe(200);
    const withHosts = (host: string, allowedHosts: readonly string[] | true) =>
      handleNotesRequest(
        request("GET", "/ping", {
          headers: { host, origin: `http://${host}` },
        }),
        { root, dev: true, allowedHosts },
      ).then((response) => response.status);
    expect(await withHosts("dev.example.test:3000", ["dev.example.test"])).toBe(
      200,
    );
    expect(await withHosts("a.example.test", [".example.test"])).toBe(200);
    expect(await withHosts("example.test", [".example.test"])).toBe(200);
    expect(await withHosts("evil.test", [".example.test"])).toBe(403);
    expect(await withHosts("[::2]:80", ["dev.example.test"])).toBe(403);
    expect(await withHosts("anything.example", true)).toBe(200);
  });

  it("blocks cross-site and foreign origins", async () => {
    expect(
      (
        await call(
          request("GET", "/ping", {
            headers: { "sec-fetch-site": "cross-site" },
          }),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await call(
          request("GET", "/ping", {
            headers: { origin: "https://evil.example" },
          }),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await call(
          request("GET", "/ping", {
            headers: {
              origin: "https://evil.example",
              "x-forwarded-host": "evil.example",
            },
          }),
        )
      ).status,
    ).toBe(403);
    expect(
      (await call(request("GET", "/ping", { headers: { origin: "null" } })))
        .status,
    ).toBe(403);
    expect(
      (await call(request("GET", "/ping", { headers: { origin: "::" } })))
        .status,
    ).toBe(403);
    expect(
      (await call(request("GET", "/ping", { headers: { host: "" } }))).status,
    ).toBe(400);
  });

  it("allows same-origin requests, with or without an Origin header", async () => {
    expect((await call(request("GET", "/ping"))).body).toEqual({
      ok: true,
      version: 1,
    });
    const noOrigin = request("GET", "/ping");
    const header = noOrigin.header;
    noOrigin.header = (name) => (name === "origin" ? null : header(name));
    expect((await call(noOrigin)).status).toBe(200);
  });

  it("requires JSON for writes and validates the body", async () => {
    expect(
      (
        await call(
          request("POST", "/notes", {
            headers: { "content-type": "text/plain" },
            body: {},
          }),
        )
      ).status,
    ).toBe(415);
    for (const body of [
      { group: "bad id", note: "x" },
      { group: "demo-cta", variant: 3, note: "x" },
      { group: "demo-cta", note: " " },
      { group: "demo-cta", note: "x", hint: 4 },
    ]) {
      expect((await call(request("POST", "/notes", { body }))).status).toBe(
        400,
      );
    }
    expect((await call(request("PUT", "/notes"))).status).toBe(404);
    expect((await call(request("DELETE", "/elsewhere"))).status).toBe(405);
  });

  it("keeps file access inside the root", async () => {
    await expect(confine(root, "../outside.tsx")).rejects.toThrow();
    const outside = await mkdtemp(join(tmpdir(), "variants-outside-"));
    try {
      await writeFile(join(outside, "x.tsx"), page);
      await symlink(join(outside, "x.tsx"), join(root, "src", "link.tsx"));
      await expect(confine(root, "src/link.tsx")).rejects.toThrow(
        "outside the project root",
      );
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });
});

describe("notes round trip", () => {
  it("adds, lists and deletes markers in the one file that declares the group", async () => {
    const added = await call(
      request("POST", "/notes", {
        body: {
          group: "demo-cta",
          variant: "link",
          note: "smaller arrow",
          hint: "a",
        },
      }),
    );
    expect(added.status).toBe(201);
    const { id, file, line } = added.body as {
      id: string;
      file: string;
      line: number;
    };
    expect(file).toBe(join("src", "page.tsx"));
    expect(line).toBe(7);
    const written = await readFile(join(root, "src", "page.tsx"), "utf8");
    expect(written).toContain(`@variants-note id="${id}"`);
    expect(
      await readFile(join(root, "node_modules", "dep", "page.tsx"), "utf8"),
    ).toBe(page);

    const listed = await call(request("GET", "/notes?groups=demo-cta,other"));
    expect(listed.body).toEqual({
      notes: [
        expect.objectContaining({
          id,
          group: "demo-cta",
          variant: "link",
          note: "smaller arrow",
          hint: "a",
          file: join("src", "page.tsx"),
        }),
      ],
    });
    expect((await call(request("GET", "/notes?groups=other"))).body).toEqual({
      notes: [],
    });

    const removed = await call(
      request("DELETE", `/notes/${id}?group=demo-cta`),
    );
    expect(removed).toEqual({ status: 200, body: { ok: true } });
    expect(await readFile(join(root, "src", "page.tsx"), "utf8")).toBe(page);
    expect(
      (await call(request("DELETE", `/notes/${id}?group=demo-cta`))).status,
    ).toBe(404);
    expect(
      (await call(request("DELETE", `/notes/${id}?group=bad%20id`))).status,
    ).toBe(400);
  });

  it("reports missing, duplicated and invalid targets", async () => {
    expect(
      (
        await call(
          request("POST", "/notes", { body: { group: "nope", note: "x" } }),
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await call(
          request("POST", "/notes", {
            body: { group: "demo-cta", variant: "nope", note: "x" },
          }),
        )
      ).status,
    ).toBe(404);
    await writeFile(join(root, "src", "copy.tsx"), page);
    expect((await locateGroup(root, "demo-cta")).ok).toBe(false);
    expect(
      (
        await call(
          request("POST", "/notes", { body: { group: "demo-cta", note: "x" } }),
        )
      ).status,
    ).toBe(409);
    expect(
      (await call(request("DELETE", "/notes/n-00000000?group=demo-cta")))
        .status,
    ).toBe(409);
  });

  it("turns unexpected failures into 500", async () => {
    const broken = request("POST", "/notes");
    broken.json = async () => {
      throw new Error("bad json");
    };
    expect(await call(broken)).toEqual({
      status: 500,
      body: { error: "bad json" },
    });
  });
});

describe("body and concurrency", () => {
  it("answers 400 for malformed JSON and 413 for an oversized body", async () => {
    const malformed = request("POST", "/notes");
    malformed.json = () => readJsonBody([new TextEncoder().encode("{")]);
    expect(await call(malformed)).toEqual({
      status: 400,
      body: { error: "invalid JSON body" },
    });
    const oversized = request("POST", "/notes");
    oversized.json = () => readJsonBody(["x".repeat(MAX_BODY + 1)]);
    expect((await call(oversized)).status).toBe(413);
  });

  it("keeps both markers when two notes are saved at once", async () => {
    const save = (note: string) =>
      call(
        request("POST", "/notes", {
          body: { group: "demo-cta", variant: "link", note },
        }),
      );
    const results = await Promise.all([save("one"), save("two")]);
    expect(results.map((result) => result.status)).toEqual([201, 201]);
    const listed = await call(request("GET", "/notes?groups=demo-cta"));
    expect(
      (listed.body as { notes: { note: string }[] }).notes
        .map((note) => note.note)
        .sort(),
    ).toEqual(["one", "two"]);
  });

  it("deletes a note only through the group that owns it", async () => {
    await writeFile(
      join(root, "src", "page.tsx"),
      `${page}\nexport const Other = () => (\n  <Variants id="demo-other">\n    <Variant id="x">x</Variant>\n  </Variants>\n);\n`,
    );
    const added = await call(
      request("POST", "/notes", { body: { group: "demo-cta", note: "keep" } }),
    );
    const { id } = added.body as { id: string };
    expect(
      (await call(request("DELETE", `/notes/${id}?group=demo-other`))).status,
    ).toBe(404);
    expect(await readFile(join(root, "src", "page.tsx"), "utf8")).toContain(id);
  });

  it("reports an unreadable directory instead of skipping it", async () => {
    const locked = join(root, "src", "locked");
    await mkdir(locked);
    await chmod(locked, 0o000);
    try {
      expect(
        (await call(request("GET", "/notes?groups=demo-cta"))).status,
      ).toBe(500);
    } finally {
      await chmod(locked, 0o755);
    }
  });
});

describe("adapters", () => {
  it("serves the endpoints from the Vite dev server middleware", async () => {
    let middleware:
      | ((req: unknown, res: unknown, next: () => void) => void)
      | undefined;
    const plugin = variants();
    expect(plugin.apply).toBe("serve");
    plugin.configureServer({
      config: { root },
      middlewares: {
        use: (path, handler) => {
          expect(path).toBe("/__variants");
          middleware = handler as never;
        },
      },
    });
    const body = JSON.stringify({ group: "demo-cta", note: "from vite" });
    const req = {
      method: "POST",
      url: "/notes",
      headers: {
        "x-variants": "1",
        host: "localhost",
        "content-type": "application/json",
      },
      async *[Symbol.asyncIterator]() {
        yield new TextEncoder().encode(body.slice(0, 10));
        yield body.slice(10);
      },
    };
    const response = await new Promise<{ status: number; body: string }>(
      (resolve) => {
        const res = {
          statusCode: 0,
          setHeader: () => {},
          end: (text: string) =>
            resolve({ status: res.statusCode, body: text }),
        };
        middleware!(req, res, () => {});
      },
    );
    expect(response.status).toBe(201);
    expect(await readFile(join(root, "src", "page.tsx"), "utf8")).toContain(
      "@variants-note",
    );
  });

  it("merges the plugin's allowedHosts with Vite's server.allowedHosts", async () => {
    let middleware:
      | ((req: unknown, res: unknown, next: () => void) => void)
      | undefined;
    variants({ allowedHosts: ["plugin.test"] }).configureServer({
      config: { root, server: { allowedHosts: [".vite.test"] } },
      middlewares: { use: (_path, handler) => (middleware = handler as never) },
    });
    const status = (host: string) =>
      new Promise<number>((resolve) => {
        const res = {
          statusCode: 0,
          setHeader: () => {},
          end: () => resolve(res.statusCode),
        };
        middleware!(
          {
            method: "GET",
            url: "/ping",
            headers: { "x-variants": "1", host },
            async *[Symbol.asyncIterator]() {},
          },
          res,
          () => {},
        );
      });
    expect(await status("plugin.test:5173")).toBe(200);
    expect(await status("app.vite.test")).toBe(200);
    expect(await status("evil.example")).toBe(403);
  });

  it("lets Next.js route handlers allow another dev host", async () => {
    vi.spyOn(process, "cwd").mockReturnValue(root);
    vi.stubEnv("NODE_ENV", "development");
    const ping = (host: string) =>
      new Request(`http://${host}/__variants/ping`, {
        headers: { "x-variants": "1", host },
      });
    expect((await GET(ping("dev.example.test"))).status).toBe(403);
    const routes = createVariantsRoutes({ allowedHosts: ["dev.example.test"] });
    expect((await routes.GET(ping("dev.example.test"))).status).toBe(200);
  });

  it("serves Next.js route handlers only in development", async () => {
    vi.spyOn(process, "cwd").mockReturnValue(root);
    const make = (method: string, path: string, body?: unknown) =>
      new Request(`http://localhost:3000/__variants${path}`, {
        method,
        headers: {
          "x-variants": "1",
          origin: "http://localhost:3000",
          host: "localhost:3000",
          ...(body ? { "content-type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    vi.stubEnv("NODE_ENV", "production");
    expect((await GET(make("GET", "/ping"))).status).toBe(404);
    vi.stubEnv("NODE_ENV", "development");
    expect(await (await GET(make("GET", "/ping"))).json()).toEqual({
      ok: true,
      version: 1,
    });
    const added = await POST(
      make("POST", "/notes", { group: "demo-cta", note: "from next" }),
    );
    expect(added.status).toBe(201);
    const { id } = (await added.json()) as { id: string };
    expect(
      (await DELETE(make("DELETE", `/notes/${id}?group=demo-cta`))).status,
    ).toBe(200);
    expect(await readFile(join(root, "src", "page.tsx"), "utf8")).toBe(page);
    const oversized = await POST(
      make("POST", "/notes", { group: "demo-cta", note: "x".repeat(MAX_BODY) }),
    );
    expect(oversized.status).toBe(413);
  });
});
