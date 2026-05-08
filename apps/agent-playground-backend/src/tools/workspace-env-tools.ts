import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { sessionWorkspaceRegistry } from "../workspace-provider.js";
import {
  getWorkspaceEnvStatus,
  resolveWorkspaceAppPath,
  type WorkspaceEnvExpectedVar,
} from "../workspace-env/file-store.js";
import { createWorkspaceEnvRequest } from "../workspace-env/request-registry.js";

const envFileSchema = z.enum([".env", ".env.local"]);

const expectedEnvSchema = z.object({
  name: z.string(),
  required: z.boolean().default(true),
  secret: z.boolean().default(true),
  description: z.string().optional(),
  envFile: envFileSchema.optional(),
});

function getSessionWorkspace(context: any) {
  const trace = context?.requestContext?.get?.("augmentTrace") as
    | { sessionId?: string }
    | undefined;
  const sessionId = trace?.sessionId;
  if (!sessionId) return null;
  return sessionWorkspaceRegistry.get(sessionId) ?? null;
}

function normalizeExpected(
  input?: z.input<typeof expectedEnvSchema>[],
): WorkspaceEnvExpectedVar[] {
  return (input ?? []).map((item) => {
    const normalized: WorkspaceEnvExpectedVar = {
      name: item.name,
      required: item.required ?? true,
      secret: item.secret ?? true,
    };
    if (item.description) normalized.description = item.description;
    if (item.envFile) normalized.envFile = item.envFile;
    return normalized;
  });
}

export const listWorkspaceEnvStatus = createTool({
  id: "list_workspace_env_status",
  description:
    "Read .env.local and .env status for a generated app folder in the current workspace. " +
    "Returns key names and hasValue only; it never returns environment variable values.",
  inputSchema: z.object({
    appPath: z
      .string()
      .describe(
        "Workspace app folder to inspect. Use the scaffolded workspaceRoot when in doubt.",
      ),
    expected: z
      .array(expectedEnvSchema)
      .optional()
      .describe("Recipe env keys expected for this app."),
  }),
  execute: async (input, context) => {
    const provisioned = getSessionWorkspace(context);
    if (!provisioned) {
      return {
        ok: false as const,
        status: "failed" as const,
        error:
          "No workspace is provisioned for this session. Call request_workspace first.",
      };
    }
    const appPath = resolveWorkspaceAppPath(provisioned, input.appPath);
    return {
      ok: true as const,
      status: "ready" as const,
      ...(await getWorkspaceEnvStatus({
        workspace: provisioned.workspace,
        appPath,
        expected: normalizeExpected(input.expected),
      })),
    };
  },
});

export const requestWorkspaceEnv = createTool({
  id: "request_workspace_env",
  description:
    "Ask the user to add missing environment values for a generated app folder. " +
    "Use this instead of ask_user for API keys or secrets. " +
    "This opens an async composer-level UI and returns immediately with key names/status only. " +
    "After the user submits values, the agent receives a sanitized update and should restart affected running processes before verification.",
  inputSchema: z.object({
    appPath: z
      .string()
      .describe(
        "Workspace app folder where .env.local or .env should be written.",
      ),
    reason: z
      .string()
      .describe(
        "Short user-facing reason these environment values are needed.",
      ),
    required: z.array(expectedEnvSchema).optional(),
    optional: z.array(expectedEnvSchema).optional(),
  }),
  execute: async (input, context) => {
    const provisioned = getSessionWorkspace(context);
    if (!provisioned) {
      return {
        ok: false as const,
        status: "failed" as const,
        error:
          "No workspace is provisioned for this session. Call request_workspace first.",
      };
    }

    const appPath = resolveWorkspaceAppPath(provisioned, input.appPath);
    const expected = [
      ...normalizeExpected(input.required),
      ...normalizeExpected(input.optional).map((item) => ({
        ...item,
        required: false,
      })),
    ];

    const currentStatus = await getWorkspaceEnvStatus({
      workspace: provisioned.workspace,
      appPath,
      expected,
    });
    const missingRequired = currentStatus.vars
      .filter((item) => item.required && !item.hasValue)
      .map((item) => item.name);

    const trace = context?.requestContext?.get?.("augmentTrace") as
      | { sessionId?: string }
      | undefined;
    const sessionId = trace?.sessionId;
    if (!sessionId) {
      return {
        ok: false as const,
        status: "failed" as const,
        error: "Cannot create workspace env request without a session id.",
        appPath,
        missingRequired,
      };
    }

    const request = createWorkspaceEnvRequest({
      sessionId,
      appPath,
      reason: input.reason,
      required: normalizeExpected(input.required),
      optional: normalizeExpected(input.optional).map((item) => ({
        ...item,
        required: false,
      })),
    });

    return {
      ok: true as const,
      status: "requested" as const,
      requestId: request.requestId,
      appPath,
      requestedKeys: [
        ...new Set(
          [...request.required, ...request.optional].map((item) => item.name),
        ),
      ],
      missingRequired,
      env: currentStatus,
      message:
        "Workspace env request opened for the user. Continue non-secret work and check env status before verifying.",
    };
  },
});

export const WORKSPACE_ENV_TOOLS = {
  list_workspace_env_status: listWorkspaceEnvStatus,
  request_workspace_env: requestWorkspaceEnv,
};
