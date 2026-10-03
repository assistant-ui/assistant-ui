import { mkdir, readFile, writeFile, link, rename, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

export type CloudProjectConfig = {
  organizationId: string;
  organizationSlug: string;
  projectId: string;
  projectSlug: string;
  harnessId: string;
  harnessOrigin: string;
  apiOrigin: string;
  workspaceId: string;
  backendUrl: string;
};

export const writeCloudFile = async (
  file: string,
  contents: string,
  options: { exclusive?: boolean } = {},
): Promise<void> => {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, contents, { flag: "wx", mode: 0o600 });
    if (options.exclusive) await link(temporary, file);
    else await rename(temporary, file);
  } finally {
    await rm(temporary, { force: true });
  }
};

export const cloudProjectConfigPath = (directory: string): string =>
  path.join(directory, ".assistant-ui", "cloud.json");

export const readCloudProjectConfig = async (
  directory: string,
): Promise<CloudProjectConfig | null> => {
  try {
    return JSON.parse(
      await readFile(cloudProjectConfigPath(directory), "utf8"),
    ) as CloudProjectConfig;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
};

export const readOptionalFile = async (file: string): Promise<string> => {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "";
    throw error;
  }
};

export const mergeCloudEnvironment = (
  contents: string,
  values: Record<string, string>,
): string => {
  const lines = contents.split(/\r?\n/);
  const pending = new Map(Object.entries(values));
  for (const line of lines) {
    const match = line.match(
      /^\s*(?:export\s+)?([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/,
    );
    if (!match) continue;
    const key = match[1]!;
    const expected = values[key];
    if (expected === undefined) continue;
    const existing = match[2]!.trim();
    const quoted = JSON.stringify(expected);
    if (
      existing !== expected &&
      existing !== quoted &&
      existing !== `'${expected}'`
    ) {
      throw new Error(
        `${key} is already configured in .env.local. Keep your existing configuration or use a new directory.`,
      );
    }
    pending.delete(key);
  }
  if (pending.size === 0) return contents;
  const additions = [...pending].map(
    ([key, value]) => `${key}=${JSON.stringify(value)}`,
  );
  return `${contents}${contents && !contents.endsWith("\n") ? "\n" : ""}${additions.join("\n")}\n`;
};

export const writeCloudProjectConfig = async (
  directory: string,
  config: CloudProjectConfig,
  apiKey: string,
): Promise<void> => {
  const envFile = path.join(directory, ".env.local");
  const contents = await readOptionalFile(envFile);
  const environment = mergeCloudEnvironment(contents, {
    ASSISTANT_API_KEY: apiKey,
    NEXT_PUBLIC_ASSISTANT_BASE_URL: config.apiOrigin,
    NEXT_PUBLIC_ASSISTANT_HARNESS_URL: config.harnessOrigin,
    NEXT_PUBLIC_ASSISTANT_WORKSPACE_ID: config.workspaceId,
  });
  const gitignoreFile = path.join(directory, ".gitignore");
  const gitignore = await readOptionalFile(gitignoreFile);
  const ignored = gitignore.split(/\r?\n/).map((line) => line.trim());
  if (!ignored.includes(".env.local") && !ignored.includes(".env*.local")) {
    await writeCloudFile(
      gitignoreFile,
      `${gitignore}${gitignore && !gitignore.endsWith("\n") ? "\n" : ""}.env.local\n`,
    );
  }
  await writeCloudFile(envFile, environment);
  await writeCloudFile(
    cloudProjectConfigPath(directory),
    `${JSON.stringify(config, null, 2)}\n`,
  );
};
