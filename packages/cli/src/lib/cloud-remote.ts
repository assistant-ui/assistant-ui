import { validateCloudUrl } from "./cloud-url";

export const CLOUD_CLI_RUN_PATH = "/api/cli/run";

export type CloudCliAction = { type: string; [key: string]: unknown };

/**
 * The organization and project a command uses when it is given no --org or
 * --project, read from the `.assistant-ui/cloud.json` that setup writes.
 */
export type CloudCliDefaults = { org?: string; project?: string };

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
  defaults?: CloudCliDefaults | null,
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
          // The server sends only the actions listed here.
          actions: Object.keys(ACTION_HANDLERS),
        },
        ...(defaults && (defaults.org || defaults.project) ? { defaults } : {}),
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

type ActionContext = {
  cloudUrl: string;
  /** False when the user passed --no-open or no one is at the terminal. */
  open: boolean;
  openUrl: (url: string) => void;
  stderr: (text: string) => void;
};

type ActionHandler = {
  /** Checks the action's fields; a malformed action fails before printing. */
  valid(action: CloudCliAction): boolean;
  run(action: CloudCliAction, context: ActionContext): Promise<number> | number;
};

const httpUrl = (value: unknown): URL | null => {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
};

const urlAction = (action: CloudCliAction): boolean =>
  !!httpUrl(action["url"]) &&
  (action["label"] === undefined || typeof action["label"] === "string");

const printUrl = (action: CloudCliAction, context: ActionContext): void => {
  const label = (action["label"] as string | undefined) ?? "Open";
  context.stderr(`${label}: ${action["url"] as string}\n`);
};

// The request lists these (`client.actions`) and the server sends no others;
// a response naming one this client lacks still fails before printing.
const ACTION_HANDLERS: Record<string, ActionHandler> = {
  print_url: {
    valid: urlAction,
    run: (action, context) => {
      printUrl(action, context);
      return 0;
    },
  },
  // Prints the link, then opens it in a browser when someone is at the
  // terminal. Only links on the Cloud the command ran against are opened.
  open_url: {
    valid: urlAction,
    run: (action, context) => {
      printUrl(action, context);
      const url = httpUrl(action["url"])!;
      if (context.open && url.origin === new URL(context.cloudUrl).origin)
        context.openUrl(url.href);
      return 0;
    },
  },
};

/** Removes the client-side --no-open flag; the server never sees it. */
export const takeNoOpen = (
  args: readonly string[],
): { args: string[]; noOpen: boolean } => {
  const end = args.indexOf("--");
  const head = end === -1 ? [...args] : args.slice(0, end);
  const tail = end === -1 ? [] : args.slice(end);
  const kept = head.filter((arg) => arg !== "--no-open");
  return { args: [...kept, ...tail], noOpen: kept.length !== head.length };
};

export const runCloudCommand = async (
  rawArgs: readonly string[],
  deps: {
    cloudUrl: string;
    accessToken: () => Promise<string | null>;
    stdout: (text: string) => void;
    stderr: (text: string) => void;
    send?: typeof sendCloudCommand;
    /** The default org/project for this directory, if setup configured one. */
    defaults?: () => Promise<CloudCliDefaults | null>;
    /** Whether someone is at the terminal to see a browser open. */
    interactive?: boolean;
    openUrl?: (url: string) => void;
  },
): Promise<number> => {
  const { args, noOpen } = takeNoOpen(rawArgs);
  let response: CloudCliResponse;
  try {
    const defaults = deps.defaults
      ? await deps.defaults().catch(() => null)
      : null;
    response = await (deps.send ?? sendCloudCommand)(
      deps.cloudUrl,
      args,
      await deps.accessToken().catch((error: unknown) => {
        deps.stderr(
          `${error instanceof Error ? error.message : String(error)}\n`,
        );
        return null;
      }),
      ...(defaults ? [defaults] : []),
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
  const malformed = response.actions?.find(
    (action) => !ACTION_HANDLERS[action.type]!.valid(action),
  );
  if (malformed) {
    deps.stderr(
      `Unexpected response from the server (malformed "${malformed.type}" action).\n`,
    );
    return 1;
  }
  if (response.stdout) deps.stdout(response.stdout);
  if (response.stderr) deps.stderr(response.stderr);
  const context: ActionContext = {
    cloudUrl: deps.cloudUrl,
    open: !noOpen && !!deps.interactive && !!deps.openUrl,
    openUrl: deps.openUrl ?? (() => {}),
    stderr: deps.stderr,
  };
  for (const action of response.actions ?? []) {
    const code = await ACTION_HANDLERS[action.type]!.run(action, context);
    if (code !== 0) return code;
  }
  return response.exitCode;
};
