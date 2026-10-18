import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { PiThreadSupervisor } from "./ThreadSupervisor";

let root: string;
let agentDir: string;
const supervisors: PiThreadSupervisor[] = [];

const writeModels = async (directory: string, provider: string) => {
  await mkdir(directory, { recursive: true });
  await writeFile(
    join(directory, "models.json"),
    JSON.stringify({
      providers: {
        [provider]: {
          baseUrl: "http://127.0.0.1:1/v1",
          api: "openai-completions",
          apiKey: "unused-fixture-key",
          models: [
            { id: "first", contextWindow: 32768 },
            { id: "second", contextWindow: 65536 },
          ],
        },
      },
    }),
  );
};

const createSupervisor = (directory?: string) => {
  const supervisor = new PiThreadSupervisor({
    workspacePath: root,
    ...(directory ? { agentDir: directory } : {}),
  });
  supervisors.push(supervisor);
  return supervisor;
};

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "pi-model-directory-"));
  agentDir = join(root, "custom-agent");
  const defaultDirectory = join(root, "default-agent");
  await writeModels(agentDir, "custom-fixture");
  await writeModels(defaultDirectory, "default-fixture");
  vi.stubEnv("PI_CODING_AGENT_DIR", defaultDirectory);
  vi.stubEnv("PI_OFFLINE", "1");
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("Unexpected network request");
    }),
  );
});

afterEach(async () => {
  for (const supervisor of supervisors.splice(0)) await supervisor.dispose();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  await rm(root, { recursive: true, force: true });
});

describe("PiThreadSupervisor model directories", () => {
  it("keeps the SDK model directory default without an override", async () => {
    const models = await createSupervisor().getAvailableModels();
    expect(
      models
        .filter((model) => model.provider === "default-fixture")
        .map((model) => model.modelId),
    ).toEqual(["first", "second"]);
  });

  it.each(["absolute", "relative", "file-url", "tilde"])(
    "lists models from a %s configured agent directory",
    async (form) => {
      const directory =
        form === "relative"
          ? relative(process.cwd(), agentDir)
          : form === "file-url"
            ? pathToFileURL(agentDir).href
            : form === "tilde"
              ? `~/${relative(homedir(), agentDir)}`
              : agentDir;
      const models = await createSupervisor(directory).getAvailableModels();
      expect(
        models
          .filter((model) => model.provider === "custom-fixture")
          .map((model) => model.modelId),
      ).toEqual(["first", "second"]);
      expect(models.some((model) => model.provider === "default-fixture")).toBe(
        false,
      );
    },
  );

  it("selects a model from the same custom catalog as the live session", async () => {
    const supervisor = createSupervisor(agentDir);
    const thread = await supervisor.createThread();
    await supervisor.setModel(thread.metadata.id, {
      provider: "custom-fixture",
      modelId: "second",
    });
    const updated = await supervisor.getThread(thread.metadata.id);
    expect(updated.metadata.config).toMatchObject({
      provider: "custom-fixture",
      modelId: "second",
    });
  });
});
