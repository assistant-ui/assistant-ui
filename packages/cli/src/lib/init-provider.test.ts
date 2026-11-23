import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyChatProvider,
  providerInstallCommands,
  snapshotProject,
  switchRouteProvider,
} from "./init-provider";

const { runSpawn } = vi.hoisted(() => ({
  runSpawn: vi.fn(async () => {}),
}));
vi.mock("./run-spawn", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./run-spawn")>()),
  runSpawn,
}));

const ROUTE = `import { openai } from "@ai-sdk/openai";
import { frontendTools } from "@assistant-ui/ai-sdk";

export async function POST(req: Request) {
  const result = streamText({
    model: openai("gpt-6-luna"),
  });
}
`;

const roots: string[] = [];
const project = (files: Record<string, string>) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "aui-provider-"));
  roots.push(root);
  for (const [file, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), content);
  }
  return root;
};

afterEach(() => {
  for (const root of roots.splice(0))
    fs.rmSync(root, { recursive: true, force: true });
});

describe("snapshotProject", () => {
  it("notes an OpenAI package and a chat route the project already had", () => {
    expect(
      snapshotProject(
        project({
          "package.json": JSON.stringify({
            devDependencies: { "@ai-sdk/openai": "^3.0.0" },
          }),
          "src/app/api/chat/route.ts": "export {}",
        }),
      ),
    ).toEqual({ hadOpenAI: true, hadRoute: true });
    expect(snapshotProject(project({ "package.json": "{}" }))).toEqual({
      hadOpenAI: false,
      hadRoute: false,
    });
  });
});

describe("switchRouteProvider", () => {
  it("moves the scaffolded route's import and model to the provider", () => {
    const switched = switchRouteProvider(ROUTE, "anthropic");
    expect(switched).toContain(
      'import { anthropic } from "@ai-sdk/anthropic";',
    );
    expect(switched).toContain('model: anthropic("claude-opus-5-5"),');
    expect(switched).not.toContain("openai");
  });

  it("leaves a route that is not the scaffold alone", () => {
    expect(switchRouteProvider("export const POST = () => {};", "google")).toBe(
      undefined,
    );
  });
});

describe("providerInstallCommands", () => {
  it("adds the provider package and drops the OpenAI one init added", () => {
    expect(providerInstallCommands("pnpm", "anthropic", false)).toEqual([
      ["pnpm", ["add", "@ai-sdk/anthropic"]],
      ["pnpm", ["remove", "@ai-sdk/openai"]],
    ]);
    expect(providerInstallCommands("npm", "google", true)).toEqual([
      ["npm", ["install", "@ai-sdk/google"]],
    ]);
  });
});

describe("applyChatProvider", () => {
  it("switches the route init scaffolded to the provider --provider names", async () => {
    const root = project({ "app/api/chat/route.ts": ROUTE });
    const note = await applyChatProvider(root, "npm", "anthropic", {
      hadOpenAI: false,
      hadRoute: false,
    });
    expect(note).toBe(
      "Chat route: Anthropic (claude-opus-5-5). Set ANTHROPIC_API_KEY in .env.local.",
    );
    expect(
      fs.readFileSync(path.join(root, "app/api/chat/route.ts"), "utf8"),
    ).toContain('anthropic("claude-opus-5-5")');
    expect(runSpawn.mock.calls).toEqual([
      ["npm", ["install", "@ai-sdk/anthropic"], root],
      ["npm", ["uninstall", "@ai-sdk/openai"], root],
    ]);
  });

  it("changes nothing without --provider, with openai, or for a route the project already had", async () => {
    const root = project({ "app/api/chat/route.ts": ROUTE });
    const fresh = { hadOpenAI: false, hadRoute: false };
    expect(await applyChatProvider(root, "npm", undefined, fresh)).toBe(
      undefined,
    );
    expect(await applyChatProvider(root, "npm", "openai", fresh)).toBe(
      undefined,
    );
    expect(
      await applyChatProvider(root, "npm", "anthropic", {
        hadOpenAI: false,
        hadRoute: true,
      }),
    ).toBe(undefined);
    expect(
      fs.readFileSync(path.join(root, "app/api/chat/route.ts"), "utf8"),
    ).toBe(ROUTE);
    expect(runSpawn).not.toHaveBeenCalled();
  });
});
