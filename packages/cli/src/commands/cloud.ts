import { Command, Option } from "commander";
import * as p from "@clack/prompts";
import {
  createProject,
  fetchOrganizations,
  fetchProjects,
  type AccountsOrganization,
  type AccountsProject,
} from "aui-auth/accounts";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  cloudAccessToken,
  cloudAuthConfig,
  loginToCloud,
  logoutFromCloud,
  validateCloudUrl,
} from "../lib/cloud-auth";
import {
  readCloudProjectConfig,
  mergeCloudEnvironment,
  readOptionalFile,
  writeCloudProjectConfig,
} from "../lib/cloud-config";
import {
  provisionCloudHarness,
  resolveProvisionRequest,
} from "../lib/cloud-provision";
import { logger } from "../lib/utils/logger";
import { create } from "./create";

class SetupCancelled extends Error {}

const answer = <T>(value: T | symbol): Exclude<T, symbol> => {
  if (p.isCancel(value)) throw new SetupCancelled();
  return value as Exclude<T, symbol>;
};

type SetupOptions = {
  org?: string;
  newOrg?: string;
  project?: string;
  newProject?: string;
  name?: string;
  harnessName?: string;
  backendUrl: string;
  apiUrl: string;
  accessCode?: string;
  open?: boolean;
  yes?: boolean;
  skipInstall?: boolean;
  useNpm?: boolean;
  usePnpm?: boolean;
  useYarn?: boolean;
  useBun?: boolean;
  debugSourceRoot?: string;
};

const selectResource = async <
  T extends { id: string; slug: string; name: string },
>(
  resources: T[],
  selected: string | undefined,
  kind: string,
  yes: boolean,
): Promise<T | null> => {
  if (selected) {
    const resource = resources.find(
      ({ id, slug }) => selected === id || selected === slug,
    );
    if (!resource)
      throw new Error(`${kind} "${selected}" was not found in your account.`);
    return resource;
  }
  if (resources.length === 0) return null;
  if (resources.length === 1) return resources[0]!;
  if (yes)
    throw new Error(
      `Choose a ${kind.toLowerCase()} with --${kind.toLowerCase()} when using --yes.`,
    );
  const id = answer(
    await p.select({
      message: `Choose a ${kind.toLowerCase()}`,
      options: resources.map((resource) => ({
        value: resource.id,
        label: `${resource.name} (${resource.slug})`,
      })),
    }),
  );
  return resources.find((resource) => resource.id === id)!;
};

const projectSlug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const organizationForSetup = async (
  issuer: string,
  token: string,
  options: SetupOptions,
): Promise<AccountsOrganization> => {
  const organizations = await fetchOrganizations({ issuer }, token);
  if (!options.newOrg) {
    const existing = await selectResource(
      organizations,
      options.org,
      "Org",
      !!options.yes,
    );
    if (existing) return existing;
  }
  const slug =
    options.newOrg ??
    (options.yes
      ? undefined
      : answer(
          await p.text({
            message: "Choose a slug for your new organization",
            validate: (value) =>
              /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value ?? "")
                ? undefined
                : "Use lowercase letters, numbers, and hyphens.",
          }),
        ));
  if (!slug)
    throw new Error(
      "No organizations found. Pass --new-org <slug> to create one.",
    );
  const response = await fetch(`${issuer}/api/oidc/organizations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: options.name ?? slug, slug }),
    signal: AbortSignal.timeout(30_000),
    redirect: "error",
  });
  if (!response.ok)
    throw new Error(`Could not create organization (${response.status}).`);
  return (await response.json()) as AccountsOrganization;
};

const projectForSetup = async (
  issuer: string,
  token: string,
  organization: AccountsOrganization,
  directory: string,
  options: SetupOptions,
): Promise<AccountsProject> => {
  const projects = await fetchProjects({ issuer }, token, {
    id: organization.id,
  });
  if (!options.newProject) {
    const existing = await selectResource(
      projects,
      options.project,
      "Project",
      !!options.yes,
    );
    if (existing) return existing;
  }
  const slug = options.newProject ?? projectSlug(path.basename(directory));
  if (!slug)
    throw new Error("Choose a project slug with --new-project <slug>.");
  const created = await createProject(
    { issuer },
    token,
    { id: organization.id },
    {
      name: options.name ?? path.basename(directory),
      slug,
    },
  );
  if ("reason" in created) {
    const existing = projects.find((project) => project.slug === slug);
    if (existing) return existing;
    throw new Error(
      `Project slug "${slug}" already exists. Select it with --project or choose another slug.`,
    );
  }
  return created;
};

const scaffoldCloudProject = async (
  directory: string,
  options: SetupOptions,
): Promise<void> => {
  try {
    await access(path.join(directory, "package.json"));
    const marker = JSON.parse(
      await readFile(
        path.join(directory, ".assistant-ui", "template.json"),
        "utf8",
      ),
    ) as { template?: string };
    if (marker.template !== "cloud-harness")
      throw new Error(
        "This directory is not a cloud-harness app. Use a new directory.",
      );
    return;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    if (await readOptionalFile(path.join(directory, "package.json"))) {
      throw new Error(
        "This directory already contains an app. Use a new directory for the multiplayer scaffold.",
      );
    }
  }
  const packageRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../..",
  );
  const args = [
    directory,
    "--template",
    "cloud-harness",
    "--no-skills",
    "--debug-source-root",
    options.debugSourceRoot ?? packageRoot,
  ];
  if (options.skipInstall) args.push("--skip-install");
  for (const flag of ["useNpm", "usePnpm", "useYarn", "useBun"] as const) {
    if (options[flag]) args.push(`--use-${flag.slice(3).toLowerCase()}`);
  }
  await create.parseAsync(args, { from: "user" });
};

export const setupCloud = async (
  directory: string,
  options: SetupOptions,
): Promise<void> => {
  if (options.org && options.newOrg)
    throw new Error("Choose --org or --new-org.");
  if (options.project && options.newProject)
    throw new Error("Choose --project or --new-project.");
  validateCloudUrl(options.apiUrl);
  const backend = new URL(options.backendUrl);
  if (
    backend.protocol !== "https:" &&
    !(
      backend.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(backend.hostname)
    )
  ) {
    throw new Error(
      "Use an HTTPS backend URL or an HTTP localhost URL for development.",
    );
  }
  const target = path.resolve(directory);
  const previous = await readCloudProjectConfig(target);
  if (previous) {
    if (
      (options.project &&
        options.project !== previous.projectId &&
        options.project !== previous.projectSlug) ||
      (options.newProject && options.newProject !== previous.projectSlug) ||
      (options.org &&
        options.org !== previous.organizationId &&
        options.org !== previous.organizationSlug) ||
      (options.newOrg && options.newOrg !== previous.organizationSlug)
    )
      throw new Error(
        "This directory is already configured for another organization or project. Use a new directory.",
      );
    const environment = await readOptionalFile(path.join(target, ".env.local"));
    if (!/^ASSISTANT_API_KEY=.+/m.test(environment))
      throw new Error(
        "This project is configured but its .env.local API key is missing. Restore it before running setup again.",
      );
    const expected = mergeCloudEnvironment(environment, {
      NEXT_PUBLIC_ASSISTANT_BASE_URL: previous.apiOrigin,
      NEXT_PUBLIC_ASSISTANT_HARNESS_URL: previous.harnessOrigin,
      NEXT_PUBLIC_ASSISTANT_WORKSPACE_ID: previous.workspaceId,
    });
    if (expected !== environment)
      throw new Error(
        "Cloud settings are missing from .env.local. Restore them before running setup again.",
      );
    logger.success(
      `Already configured: ${previous.projectSlug} / ${previous.harnessId}`,
    );
    return;
  }
  const auth = cloudAuthConfig();
  const token = await cloudAccessToken(auth, {
    noOpen: options.open === false,
    print: logger.info,
  });
  const organization = await organizationForSetup(auth.issuer, token, options);
  const project = await projectForSetup(
    auth.issuer,
    token,
    organization,
    target,
    options,
  );
  await scaffoldCloudProject(target, options);
  const accessCode =
    options.accessCode ??
    process.env.ASSISTANT_UI_ACCESS_CODE ??
    (options.yes
      ? undefined
      : answer(
          await p.password({
            message:
              "Hackathon access code (leave empty if your plan includes harnesses)",
          }),
        ));
  const request = await resolveProvisionRequest(
    target,
    {
      org_id: organization.id,
      project_id: project.id,
      harness_name: options.harnessName ?? `${project.name} chat`,
      backend_urls: backend.protocol === "http:" ? [] : [backend.href],
      allow_localhost: backend.protocol === "http:",
    },
    accessCode,
  );
  const result = await provisionCloudHarness(options.apiUrl, token, request);
  await writeCloudProjectConfig(
    target,
    {
      organizationId: organization.id,
      organizationSlug: organization.slug,
      projectId: result.project_id,
      projectSlug: project.slug,
      harnessId: result.harness_id,
      harnessOrigin: result.harness_origin,
      apiOrigin: result.api_origin,
      workspaceId: result.workspace_id,
    },
    result.api_key,
  );
  logger.success(`Multiplayer chat configured for ${project.name}.`);
  logger.info(`Project: ${target}`);
  logger.info(
    "Add OPENAI_API_KEY to .env.local, then start the app with your package manager's dev command.",
  );
  logger.info(
    backend.protocol === "http:"
      ? `Open ${backend.origin}/#main in two browser windows to try shared chat. Deploy or expose the app to share it with teammates.`
      : 'Open your deployed app and use "Share this chat" to invite teammates to the same conversation.',
  );
};

export const cloud = new Command()
  .name("cloud")
  .description("sign in and set up a multiplayer Assistant Cloud chat")
  .addCommand(
    new Command("login")
      .description("sign in to Assistant Cloud using your browser")
      .option(
        "--no-open",
        "print the device sign-in URL without opening a browser",
      )
      .action(async (options: { open?: boolean }) => {
        await loginToCloud(cloudAuthConfig(), {
          noOpen: options.open === false,
          print: logger.info,
        });
      }),
  )
  .addCommand(
    new Command("logout")
      .description("revoke your CLI login and remove saved credentials")
      .action(async () => {
        await logoutFromCloud(cloudAuthConfig());
        logger.success("Signed out.");
      }),
  )
  .addCommand(
    new Command("setup")
      .description("create a shared AI chat and provision its cloud harness")
      .argument("[directory]", "new project directory", "multiplayer-chat")
      .option("--org <id-or-slug>", "use an existing organization")
      .option("--new-org <slug>", "create an organization")
      .option("--project <id-or-slug>", "use an existing project")
      .option("--new-project <slug>", "create a project")
      .option("--name <name>", "display name for a new project or organization")
      .option("--harness-name <name>", "name for the multiplayer harness")
      .option(
        "--backend-url <url>",
        "absolute URL of the app's chat route",
        "http://localhost:3000/api/chat",
      )
      .option(
        "--api-url <url>",
        "Assistant Cloud management URL",
        process.env.ASSISTANT_UI_CLOUD_URL ?? "https://cloud.assistant-ui.com",
      )
      .option(
        "--access-code <code>",
        "redeem your hackathon harness access code",
      )
      .option(
        "--no-open",
        "print the device sign-in URL without opening a browser",
      )
      .option("--yes", "skip prompts; select resources with flags")
      .option("--skip-install", "skip installing scaffold dependencies")
      .option("--use-npm", "install with npm")
      .option("--use-pnpm", "install with pnpm")
      .option("--use-yarn", "install with yarn")
      .option("--use-bun", "install with bun")
      .addOption(
        new Option(
          "--debug-source-root <path>",
          "local assistant-ui source root",
        ).hideHelp(),
      )
      .action(async (directory: string, options: SetupOptions) => {
        try {
          await setupCloud(directory, options);
        } catch (error) {
          if (!(error instanceof SetupCancelled)) throw error;
          p.cancel("Cloud setup cancelled. Rerun the same command to resume.");
        }
      }),
  );
