import { subscribe } from "node:diagnostics_channel";
import { randomBytes } from "node:crypto";

type StartMessage = {
  request?: { url?: string; headers?: Record<string, unknown> };
  socket?: { remoteAddress?: string | undefined };
};

type PeerTag = { header: string; installed: boolean };

const KEY = Symbol.for("@assistant-ui/variants/peer-tag");

/**
 * Route handlers that see only a Web `Request` (Next.js) have no socket, and
 * `x-forwarded-for` is whatever the client sent. Node publishes every incoming
 * HTTP request on `http.server.request.start` before any handler runs, so this
 * copies the socket's address into a header whose name is random per process.
 * A client can't set a header it can't name, so a request without it arrived
 * before the subscriber was installed, or through a server that isn't Node's.
 */
export const peerTag = (): PeerTag => {
  const store = globalThis as { [KEY]?: PeerTag };
  const existing = store[KEY];
  if (existing) return existing;
  const tag: PeerTag = {
    header: `x-variants-peer-${randomBytes(16).toString("hex")}`,
    installed: false,
  };
  store[KEY] = tag;
  try {
    subscribe("http.server.request.start", (message) => {
      const { request, socket } = (message ?? {}) as StartMessage;
      // Only the variants endpoints read it; other routes keep their headers.
      if (!request?.headers || !request.url?.includes("/__variants")) return;
      request.headers[tag.header] = socket?.remoteAddress ?? "";
    });
    tag.installed = true;
  } catch {}
  return tag;
};
