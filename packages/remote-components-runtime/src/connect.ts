import {
  Channel,
  isInitializeResponse,
  NONCE_PARAM,
  RemoteComponentError,
  SUPPORTED_VERSIONS,
  validateFromHost,
  type InitializeRequest,
  type InitPayload,
  type RemoteChannel,
} from "@assistant-ui/remote-components-protocol";

const RUNTIME_VERSION =
  typeof __AUI_PACKAGE_VERSION__ === "string"
    ? __AUI_PACKAGE_VERSION__
    : "0.0.0";

export interface Connection {
  channel: RemoteChannel;
  init: InitPayload;
}

/** Reads the host-assigned nonce from a URL fragment (`#…rc-nonce=…`). */
function readNonce(hash: string): string | null {
  const params = new URLSearchParams(
    hash.startsWith("#") ? hash.slice(1) : hash,
  );
  const nonce = params.get(NONCE_PARAM);
  return nonce !== null && /^[A-Za-z0-9_-]{16,128}$/.test(nonce) ? nonce : null;
}

function randomId(): string {
  const b = new Uint8Array(12);
  crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

/**
 * The remote side of the handshake (SPEC §4):
 *   1. post `rc/initialize` to the parent every 100ms (up to 30s) until
 *      answered;
 *   2. accept its result from the parent with the same nonce and a
 *      MessagePort (or its error: no common protocol version).
 *
 * Messages are accepted only from `window.parent`, with the nonce from the
 * URL fragment ("" when there is none: srcdoc and SCF documents). Which
 * pages may frame this one is the serving layer's job (CSP
 * `frame-ancestors`).
 */
export function connectToHost(win: Window = window): Promise<Connection> {
  const nonce = readNonce(win.location.hash) ?? "";
  const session = randomId();

  return new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const stop = (): void => {
      win.removeEventListener("message", onMessage);
      if (timer !== undefined) clearInterval(timer);
    };
    const onMessage = (event: MessageEvent): void => {
      if (event.source !== win.parent) return;
      const data: unknown = event.data;
      if (!isInitializeResponse(data) || data.id !== session) return;
      if ("error" in data) {
        if (data.error.data.nonce !== nonce) return;
        stop();
        reject(
          new RemoteComponentError(
            "protocol",
            `Host rejected the connection: ${data.error.message}`,
          ),
        );
        return;
      }
      const { result } = data;
      const port = event.ports[0];
      if (
        result.nonce !== nonce ||
        port === undefined ||
        result.protocol < SUPPORTED_VERSIONS.min ||
        result.protocol > SUPPORTED_VERSIONS.max
      )
        return;
      stop();
      const channel: RemoteChannel = new Channel(port, {
        validate: validateFromHost,
        onInvalid: (m) =>
          console.warn("[rc] Dropped invalid message from host", m),
      });
      resolve({ channel, init: result.init });
    };
    win.addEventListener("message", onMessage);
    const request: InitializeRequest = {
      jsonrpc: "2.0",
      id: session,
      method: "rc/initialize",
      params: {
        nonce,
        session,
        protocol: SUPPORTED_VERSIONS,
        runtime: RUNTIME_VERSION,
      },
    };
    let sent = 0;
    const send = (): void => {
      win.parent.postMessage(request, "*");
      if (++sent >= 300) {
        stop();
        reject(
          new RemoteComponentError(
            "timeout",
            "No host answered rc/initialize within 30s",
          ),
        );
      }
    };
    send();
    timer = setInterval(send, 100);
  });
}
