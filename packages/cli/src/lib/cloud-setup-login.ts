import { randomUUID } from "node:crypto";
import type { DeviceAuthorization } from "aui-auth/device";
import { StatewireClient, StatewireHttp } from "statewire";
import { abortable } from "./cloud-abort";
import { validateCloudUrl } from "./cloud-url";

type SetupState = {
  version: number;
  id: string | null;
  status: string;
  inputs: {
    id: string;
    status: string;
    preset?: string;
    help?: { href?: string };
  }[];
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

const validInputs = (inputs: unknown): inputs is SetupState["inputs"] =>
  Array.isArray(inputs) &&
  inputs.every(
    (input) =>
      input !== null &&
      typeof input === "object" &&
      typeof input.id === "string" &&
      typeof input.status === "string",
  );

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
  const target = validateCloudUrl(url);
  const controller = new AbortController();
  const client = new StatewireClient<SetupState | undefined, SetupCommands>({
    transport: StatewireHttp({ url: target }),
    onError: (error) => controller.abort(error),
  });
  let unsubscribe = () => {};
  let inputId: string | undefined;
  let sessionId: string;
  let pendingHref: string | undefined;
  let pendingAsk: Promise<{ inputId: string }> | undefined;
  let terminalResult: "signed-in" | "cancelled" | "failed" | undefined;
  let completion: Promise<void> | undefined;
  let disposed = false;
  const reconcile = () => {
    const state = client.state;
    if (state && !validInputs(state.inputs)) {
      controller.abort(new Error("The setup returned invalid inputs."));
      return Promise.resolve();
    }
    if (
      disposed ||
      inputId === undefined ||
      terminalResult === undefined ||
      state?.id !== sessionId ||
      !Array.isArray(state.inputs) ||
      !["planning", "installing"].includes(state.status) ||
      ["dismissed", "answered"].includes(
        state.inputs.find((input) => input.id === inputId)?.status ?? "",
      )
    )
      return Promise.resolve();
    completion ??= abortable(
      client.commands["checkout/answer"]({ inputId, answer: terminalResult }),
      AbortSignal.timeout(10_000),
    );
    return completion;
  };
  const checkSession = () => {
    const next = client.state;
    if (next && !validInputs(next.inputs)) {
      controller.abort(new Error("The setup returned invalid inputs."));
      return;
    }
    if (next?.id === sessionId && Array.isArray(next.inputs) && pendingHref) {
      inputId ??= next.inputs.find(
        (input) =>
          input.preset === "assistant-ui-cli-login" &&
          input.help?.href === pendingHref,
      )?.id;
    }
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
    void reconcile().catch(() => {});
  };
  const dispose = async () => {
    try {
      if (pendingAsk && terminalResult) {
        await abortable(pendingAsk, AbortSignal.timeout(10_000)).catch(
          () => {},
        );
        await reconcile().catch(() => {});
      }
    } finally {
      disposed = true;
      unsubscribe();
      client.dispose();
    }
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
      state?.version !== 2 ||
      !state.id ||
      !validInputs(state.inputs) ||
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
    await dispose();
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
      controller.signal.throwIfAborted();
      const href = setupLoginUrl(authorization, issuer);
      pendingHref = href;
      pendingAsk = client.commands["agent/ask"]({
        kind: "text",
        preset: "assistant-ui-cli-login",
        prompt: "Sign in to Assistant Cloud",
        help: {
          summary:
            "Authorize the CLI in your browser, then return to this setup.",
          href,
        },
      }).then(async (result) => {
        if (!disposed && client.state?.id === sessionId) {
          inputId = result.inputId;
          checkSession();
          await reconcile().catch(() => {});
        }
        return result;
      });
      try {
        await command(() => pendingAsk!);
        checkSession();
        controller.signal.throwIfAborted();
      } catch (error) {
        terminalResult = controller.signal.aborted ? "cancelled" : "failed";
        await reconcile().catch(() => {});
        throw error;
      }
      return href;
    },
    async complete(result: "signed-in" | "cancelled" | "failed") {
      terminalResult = result;
      await reconcile();
    },
    dispose,
  };
};
