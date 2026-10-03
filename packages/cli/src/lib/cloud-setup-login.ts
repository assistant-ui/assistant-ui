import { randomUUID } from "node:crypto";
import type { DeviceAuthorization } from "aui-auth/device";
import { StatewireClient, StatewireHttp } from "statewire";

type SetupState = {
  version: number;
  id: string | null;
  status: string;
  inputs: { id: string; status: string }[];
};

type SetupCommands = {
  "agent/ask": (input: {
    kind: "text";
    preset: string;
    prompt: string;
    help: { summary: string; href: string };
  }) => { inputId: string };
  "checkout/answer": (answer: { inputId: string; answer: string }) => void;
};

const abortable = <T>(promise: Promise<T>, signal: AbortSignal): Promise<T> => {
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise((resolve, reject) => {
    const abort = () => {
      signal.removeEventListener("abort", abort);
      reject(signal.reason);
    };
    signal.addEventListener("abort", abort, { once: true });
    promise.then(resolve, reject).finally(() => {
      signal.removeEventListener("abort", abort);
    });
  });
};

export const setupLoginUrl = (
  authorization: DeviceAuthorization,
  issuer: string,
  attempt: string = randomUUID(),
) => {
  const url = new URL(authorization.verificationUriComplete);
  const issuerOrigin = new URL(issuer).origin;
  if (
    !["https://accounts.assistant-ui.com", "https://accounts.aui.dev"].includes(
      issuerOrigin,
    ) ||
    url.origin !== issuerOrigin ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      attempt,
    ) ||
    !/^[A-Z0-9-]{4,32}$/.test(authorization.userCode) ||
    url.pathname !== "/device" ||
    url.username ||
    url.password ||
    url.hash ||
    url.searchParams.get("user_code") !== authorization.userCode ||
    url.searchParams.getAll("user_code").length !== 1 ||
    !Number.isFinite(authorization.expiresAt) ||
    authorization.expiresAt <= Date.now() ||
    authorization.expiresAt > Date.now() + 10 * 60 * 1000
  ) {
    throw new Error("Accounts returned an invalid device approval link.");
  }
  const publicUrl = new URL("/device", url.origin);
  publicUrl.searchParams.set("user_code", authorization.userCode);
  publicUrl.searchParams.set("setup_attempt", attempt);
  publicUrl.searchParams.set("setup_expires", String(authorization.expiresAt));
  return publicUrl.href;
};

export const connectCloudLoginSetup = async (url: string) => {
  const target = new URL(url);
  if (
    target.username ||
    target.password ||
    target.search ||
    target.hash ||
    (target.protocol !== "https:" &&
      !(
        target.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(target.hostname)
      ))
  ) {
    throw new Error("The setup URL must use HTTPS or HTTP localhost.");
  }
  const controller = new AbortController();
  const client = new StatewireClient<SetupState | undefined, SetupCommands>({
    transport: StatewireHttp({ url: target.href.replace(/\/$/, "") }),
    onError: (error) => controller.abort(error),
  });
  let unsubscribe = () => {};
  let inputId: string | undefined;
  let sessionId: string;
  const checkSession = () => {
    const next = client.state;
    if (
      next?.version !== 2 ||
      next.id !== sessionId ||
      !Array.isArray(next.inputs) ||
      !["planning", "installing"].includes(next.status) ||
      (inputId !== undefined &&
        next.inputs.find((input) => input.id === inputId)?.status ===
          "dismissed")
    ) {
      controller.abort(new Error("The setup login was cancelled."));
    }
    if (client.connection.status === "stopped")
      controller.abort(new Error("The setup connection stopped."));
  };
  const dispose = () => {
    unsubscribe();
    client.dispose();
  };
  try {
    let resolveReady!: () => void;
    const ready = new Promise<void>((resolve) => {
      resolveReady = resolve;
    });
    unsubscribe = client.subscribe(() => {
      if (client.state !== undefined) resolveReady();
      if (client.connection.status === "stopped") {
        controller.abort(new Error("The setup connection stopped."));
      }
    });
    if (client.state !== undefined) resolveReady();
    if (client.connection.status === "stopped") {
      controller.abort(new Error("The setup connection stopped."));
    }
    await abortable(
      ready,
      AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]),
    );
    const state = client.state!;
    if (
      state.version !== 2 ||
      !state.id ||
      !Array.isArray(state.inputs) ||
      !["planning", "installing"].includes(state.status)
    ) {
      throw new Error(
        "Start the setup in the wizard before signing in the CLI.",
      );
    }
    sessionId = state.id;
    unsubscribe();
    unsubscribe = client.subscribe(checkSession);
    checkSession();
  } catch (error) {
    dispose();
    throw error;
  }
  const command = <T>(run: () => Promise<T>) => {
    controller.signal.throwIfAborted();
    return abortable(
      run(),
      AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]),
    );
  };
  return {
    signal: controller.signal,
    async publish(authorization: DeviceAuthorization, issuer: string) {
      const href = setupLoginUrl(authorization, issuer);
      const result = await command(() =>
        client.commands["agent/ask"]({
          kind: "text",
          preset: "assistant-ui-cli-login",
          prompt: "Sign in to Assistant Cloud",
          help: {
            summary:
              "Authorize the CLI in your browser, then return to this setup.",
            href,
          },
        }),
      );
      inputId = result.inputId;
      checkSession();
      controller.signal.throwIfAborted();
      return href;
    },
    async complete(result: "signed-in" | "cancelled" | "failed") {
      if (inputId === undefined || controller.signal.aborted) return;
      const completedInputId = inputId;
      await command(() =>
        client.commands["checkout/answer"]({
          inputId: completedInputId,
          answer: result,
        }),
      );
    },
    dispose,
  };
};
