import {
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
import { DELETE, GET, POST } from "../next";
import { variants } from "../vite";
import { handleNotesRequest, type NotesRequest } from "./handler";
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

  it("requires the custom header", async () => {
    const response = await call(
      request("GET", "/ping", { headers: { "x-variants": "" } }),
    );
    expect(response.status).toBe(403);
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
  });
});
