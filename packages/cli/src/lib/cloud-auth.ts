import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  chmod,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  createDeviceLogin,
  isAccessDenied,
  type DeviceCredentials,
} from "aui-auth/device";
import { connectCloudLoginSetup } from "./cloud-setup-login";

export type CloudAuthConfig = {
  issuer: string;
  clientId: string;
  credentialsFile: string;
};

type SavedCredentials = DeviceCredentials & {
  issuer: string;
  clientId: string;
};

export const validateCloudUrl = (value: string): string => {
  const url = new URL(value);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
      ))
  ) {
    throw new Error(
      "Cloud and accounts URLs must use HTTPS or HTTP localhost for development.",
    );
  }
  return value.replace(/\/+$/, "");
};

export const cloudAuthConfig = (): CloudAuthConfig => ({
  issuer: validateCloudUrl(
    process.env.ASSISTANT_UI_ACCOUNTS_URL ??
      "https://accounts.assistant-ui.com",
  ),
  clientId: process.env.ASSISTANT_UI_OIDC_CLIENT_ID ?? "assistant-ui-cli",
  credentialsFile: path.join(
    process.env.ASSISTANT_UI_CONFIG_DIR ??
      path.join(os.homedir(), ".assistant-ui"),
    "credentials.json",
  ),
});

export const readCloudCredentials = async (
  config: CloudAuthConfig,
  options: { matchConfig?: boolean } = {},
): Promise<SavedCredentials | null> => {
  let contents: string;
  try {
    contents = await readFile(config.credentialsFile, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  let saved: SavedCredentials;
  try {
    saved = JSON.parse(contents) as SavedCredentials;
  } catch {
    throw new Error("Invalid saved login. Run assistant-ui cloud login again.");
  }
  if (!saved || typeof saved !== "object")
    throw new Error("Invalid saved login. Run assistant-ui cloud login again.");
  if (
    options.matchConfig !== false &&
    (saved.issuer !== config.issuer || saved.clientId !== config.clientId)
  ) {
    return null;
  }
  if (
    !saved.tokens?.accessToken ||
    !saved.user?.id ||
    typeof saved.tokens.accessTokenExpiresAt !== "number"
  ) {
    throw new Error("Invalid saved login. Run assistant-ui cloud login again.");
  }
  return saved;
};

export const saveCloudCredentials = async (
  config: CloudAuthConfig,
  credentials: DeviceCredentials,
  signal?: AbortSignal,
): Promise<void> => {
  await mkdir(path.dirname(config.credentialsFile), {
    recursive: true,
    mode: 0o700,
  });
  const temporary = `${config.credentialsFile}.${randomUUID()}.tmp`;
  try {
    await writeFile(
      temporary,
      `${JSON.stringify({ ...credentials, issuer: config.issuer, clientId: config.clientId }, null, 2)}\n`,
      { mode: 0o600, flag: "wx" },
    );
    signal?.throwIfAborted();
    await rename(temporary, config.credentialsFile);
    await chmod(config.credentialsFile, 0o600);
  } finally {
    await rm(temporary, { force: true });
  }
};

const openBrowser = (url: string): void => {
  const command =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "rundll32"
        : "xdg-open";
  const args =
    process.platform === "win32" ? ["url.dll,FileProtocolHandler", url] : [url];
  const child = spawn(command, args, { detached: true, stdio: "ignore" });
  child.on("error", () => {});
  child.unref();
};

export const loginToCloud = async (
  config: CloudAuthConfig,
  options: {
    noOpen?: boolean;
    setupUrl?: string;
    print?: (text: string) => void;
  } = {},
): Promise<DeviceCredentials> => {
  if (
    options.setupUrl &&
    !["assistant-ui-cli", "assistant-ui-cli-dev"].includes(config.clientId)
  ) {
    throw new Error(
      "Wizard sign-in requires the assistant-ui CLI OAuth client.",
    );
  }
  const login = createDeviceLogin({
    issuer: config.issuer,
    clientId: config.clientId,
  });
  const print = options.print ?? console.log;
  const setup = options.setupUrl
    ? await connectCloudLoginSetup(options.setupUrl)
    : undefined;
  const signal = AbortSignal.any([
    AbortSignal.timeout(10 * 60 * 1000),
    ...(setup ? [setup.signal] : []),
  ]);
  let credentials: DeviceCredentials | undefined;
  let committed = false;
  try {
    signal.throwIfAborted();
    const authorization = await login.start();
    signal.throwIfAborted();
    const approvalUrl =
      (await setup?.publish(authorization, config.issuer)) ??
      authorization.verificationUriComplete;
    print(`Confirm code ${authorization.userCode} at ${approvalUrl}`);
    if (!options.noOpen && !setup)
      openBrowser(authorization.verificationUriComplete);
    credentials = await login.wait(authorization, { signal });
    signal.throwIfAborted();
    await saveCloudCredentials(config, credentials, signal);
    committed = true;
    await setup?.complete("signed-in").catch(() => {
      print("Signed in locally. The setup connection could not be updated.");
    });
    print(`Signed in as ${credentials.user.email || credentials.user.id}.`);
    return credentials;
  } catch (error) {
    if (credentials && !committed) {
      await login.revoke(credentials).catch(() => {
        print(
          "The cancelled login could not be revoked. End it from your Accounts Sessions page.",
        );
      });
    }
    await setup
      ?.complete(signal.aborted ? "cancelled" : "failed")
      .catch(() => {});
    throw error;
  } finally {
    setup?.dispose();
  }
};

export const cloudAccessToken = async (
  config: CloudAuthConfig,
  options: {
    noOpen?: boolean;
    setupUrl?: string;
    print?: (text: string) => void;
  } = {},
): Promise<string> => {
  const saved = await readCloudCredentials(config);
  if (!saved) return (await loginToCloud(config, options)).tokens.accessToken;
  const login = createDeviceLogin({
    issuer: config.issuer,
    clientId: config.clientId,
  });
  try {
    const credentials = await login.ensureFresh(saved);
    if (credentials !== saved) await saveCloudCredentials(config, credentials);
    return credentials.tokens.accessToken;
  } catch (error) {
    if (isAccessDenied(error)) {
      await rm(config.credentialsFile, { force: true });
      throw new Error(
        "Your login expired. Run assistant-ui cloud login again.",
      );
    }
    throw error;
  }
};

export const logoutFromCloud = async (
  config: CloudAuthConfig,
): Promise<void> => {
  const saved = await readCloudCredentials(config, { matchConfig: false });
  if (saved) {
    await createDeviceLogin({
      issuer: validateCloudUrl(saved.issuer),
      clientId: saved.clientId,
    }).revoke(saved);
  }
  await rm(config.credentialsFile, { force: true });
};
