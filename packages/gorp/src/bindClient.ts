import type { GorpClient } from "./GorpClient";
import type { GorpWebSocket } from "./GorpWebSocket";

/**
 * Wire a `GorpClient` to a transport: client sends go out via `transport.send`,
 * transport messages flow into `client.apply`, and every (re)connect triggers
 * `client.resync()` so pending commands are retransmitted (server dedups
 * against session high-water).
 *
 * Returns an unsubscribe function that detaches all three hooks.
 */
export function bindClient<T extends Record<string, unknown>, C>(
  client: GorpClient<T, C>,
  transport: GorpWebSocket<C>,
): () => void {
  const offOutbox = client.onOutbox((cmd) => transport.send(cmd));
  const offMessage = transport.onMessage((msg) => client.apply(msg));
  const offConnect = transport.onConnect(() => client.resync());
  return () => {
    offOutbox();
    offMessage();
    offConnect();
  };
}
