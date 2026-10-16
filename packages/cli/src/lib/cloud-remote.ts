import { validateCloudUrl } from "./cloud-url";

export const CLOUD_CLI_RUN_PATH = "/api/cli/run";

export type CloudCliAction = { type: string; [key: string]: unknown };

export type CloudCliResponse = {
  stdout?: string;
  stderr?: string;
  exitCode: number;
  actions?: CloudCliAction[];
};

const SAFE = /^[A-Za-z0-9_@%+=:,./-]+$/;

export const joinCloudArgs = (args: readonly string[]): string =>
  args
    .map((arg) => (SAFE.test(arg) ? arg : `'${arg.replaceAll("'", `'\\''`)}'`))
    .join(" ");

export const parseCloudCliResponse = (
  value: unknown,
): CloudCliResponse | null => {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  const exitCode = body["exitCode"];
  if (
    typeof exitCode !== "number" ||
    !Number.isInteger(exitCode) ||
    exitCode < 0 ||
    exitCode > 255
  ) {
    return null;
  }
  for (const key of ["stdout", "stderr"]) {
    if (body[key] !== undefined && typeof body[key] !== "string") return null;
  }
  const actions = body["actions"];
  if (
    actions !== undefined &&
    !(
      Array.isArray(actions) &&
      actions.every(
        (action) =>
          !!action &&
          typeof action === "object" &&
          typeof (action as CloudCliAction).type === "string",
      )
    )
  ) {
    return null;
  }
  return body as CloudCliResponse;
};

const cliVersion: string =
  typeof __AUI_PACKAGE_VERSION__ === "string"
    ? __AUI_PACKAGE_VERSION__
    : "0.0.0";

export const sendCloudCommand = async (
  cloudUrl: string,
  args: readonly string[],
  accessToken: string | null,
): Promise<CloudCliResponse> => {
  const url = `${validateCloudUrl(cloudUrl)}${CLOUD_CLI_RUN_PATH}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({
        command: joinCloudArgs(args),
        client: {
          name: "assistant-ui",
          version: cliVersion,
          platform: `${process.platform}-${process.arch}`,
        },
      }),
      redirect: "error",
      signal: AbortSignal.timeout(60_000),
    });
  } catch (error) {
    const cause = (error as Error).cause as NodeJS.ErrnoException | undefined;
    throw new Error(
      `Could not reach ${url}: ${cause?.message || cause?.code || (error as Error).message}`,
    );
  }
  const body = parseCloudCliResponse(await response.json().catch(() => null));
  if (!body) {
    throw new Error(
      `Unexpected response from ${url} (${response.status} ${response.statusText}).`,
    );
  }
  return body;
};

// A response naming an action this client lacks fails before printing, so the
// server can roll a new action out behind the client version it is sent.
const ACTION_HANDLERS: Record<
  string,
  (action: CloudCliAction) => Promise<number>
> = {};

export const runCloudCommand = async (
  args: readonly string[],
  deps: {
    cloudUrl: string;
    accessToken: () => Promise<string | null>;
    stdout: (text: string) => void;
    stderr: (text: string) => void;
    send?: typeof sendCloudCommand;
  },
): Promise<number> => {
  let response: CloudCliResponse;
  try {
    response = await (deps.send ?? sendCloudCommand)(
      deps.cloudUrl,
      args,
      await deps.accessToken().catch((error: unknown) => {
        deps.stderr(
          `${error instanceof Error ? error.message : String(error)}\n`,
        );
        return null;
      }),
    );
  } catch (error) {
    deps.stderr(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
  const unknown = response.actions?.find(
    (action) => !Object.hasOwn(ACTION_HANDLERS, action.type),
  );
  if (unknown) {
    deps.stderr(
      `This command needs a newer assistant-ui (unsupported action "${unknown.type}"). Update the CLI and try again.\n`,
    );
    return 1;
  }
  if (response.stdout) deps.stdout(response.stdout);
  if (response.stderr) deps.stderr(response.stderr);
  for (const action of response.actions ?? []) {
    const code = await ACTION_HANDLERS[action.type]!(action);
    if (code !== 0) return code;
  }
  return response.exitCode;
};
