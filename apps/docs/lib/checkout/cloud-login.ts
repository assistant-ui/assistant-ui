import type { Checkout } from "./protocol";

const ATTEMPT =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACCOUNTS_ORIGINS = new Set([
  "https://accounts.assistant-ui.com",
  "https://accounts.aui.dev",
]);

export const isCloudLoginInput = (input: Checkout.Input) =>
  input.kind === "text" && input.preset === "assistant-ui-cli-login";

export const cloudLoginDetails = (input: Checkout.Input) => {
  if (!isCloudLoginInput(input) || !input.help?.href) return undefined;
  let url: URL;
  try {
    url = new URL(input.help.href);
  } catch {
    return undefined;
  }
  const code = url.searchParams.get("user_code");
  const attempt = url.searchParams.get("setup_attempt");
  const expiry = url.searchParams.get("setup_expires");
  if (
    !ACCOUNTS_ORIGINS.has(url.origin) ||
    url.pathname !== "/device" ||
    url.username ||
    url.password ||
    url.hash ||
    !code ||
    !/^[A-Z0-9-]{4,32}$/.test(code) ||
    !attempt ||
    !ATTEMPT.test(attempt) ||
    !expiry ||
    !/^\d{13}$/.test(expiry) ||
    Number(expiry) > Date.now() + 10 * 60 * 1000 ||
    [...url.searchParams.keys()].some(
      (key) => !["user_code", "setup_attempt", "setup_expires"].includes(key),
    ) ||
    ["user_code", "setup_attempt", "setup_expires"].some(
      (key) => url.searchParams.getAll(key).length !== 1,
    )
  ) {
    return undefined;
  }
  return {
    href: url.href,
    code,
    attempt,
    expiresAt: Number(expiry),
    host: url.host,
  };
};

const storageKey = (attempt: string) => `aui-cloud-login:${attempt}`;

export const rememberCloudLogin = (
  input: Checkout.Input,
  sessionId: string,
  storage: Pick<Storage, "setItem">,
) => {
  const details = cloudLoginDetails(input);
  if (!details || details.expiresAt <= Date.now()) return false;
  try {
    storage.setItem(
      storageKey(details.attempt),
      JSON.stringify({
        sessionId,
        inputId: input.id,
        expiresAt: details.expiresAt,
      }),
    );
    return true;
  } catch {
    return false;
  }
};

export const returnedToCloudLogin = (
  input: Checkout.Input,
  sessionId: string,
  hash: string,
  storage: Pick<Storage, "getItem">,
) => {
  const details = cloudLoginDetails(input);
  if (!details || details.expiresAt <= Date.now()) return false;
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  if (params.getAll("setup-login").length !== 1) return false;
  const returned = params.get("setup-login");
  if (returned !== details.attempt) return false;
  try {
    const saved: unknown = JSON.parse(
      storage.getItem(storageKey(returned)) ?? "null",
    );
    if (typeof saved !== "object" || saved === null) return false;
    const attempt = saved as Record<string, unknown>;
    return (
      attempt.sessionId === sessionId &&
      attempt.inputId === input.id &&
      attempt.expiresAt === details.expiresAt
    );
  } catch {
    return false;
  }
};
