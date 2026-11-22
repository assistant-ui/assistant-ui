import { StatewireClient, StatewireHttp, StatewireWebsocket } from "statewire";
import type { Checkout } from "./protocol";

export type CheckoutClient = StatewireClient<
  Checkout.State | undefined,
  Checkout.Commands
>;

const attach = (url: string, websocket: boolean): Promise<CheckoutClient> =>
  new Promise((resolve, reject) => {
    let settled = false;
    const finish = (outcome: () => void) => {
      if (settled) return;
      settled = true;
      unsubscribe();
      outcome();
    };
    const fail = (error: unknown) =>
      finish(() => {
        client.dispose();
        reject(error);
      });
    const client: CheckoutClient = new StatewireClient({
      transport: websocket
        ? StatewireWebsocket<Checkout.State, Checkout.Commands>({ url })
        : StatewireHttp<Checkout.State, Checkout.Commands>({ url }),
      onError: fail,
    });
    const settle = () => {
      if (settled) return;
      if (client.state === undefined) {
        const { connection } = client;
        // A refused upgrade (a wrong link or host) looks like a dropped
        // socket, which statewire retries without end. SSE sees the HTTP
        // status, so a socket that fails before any state hands over to it.
        if (websocket && connection.status === "retrying") {
          finish(() => {
            client.dispose();
            resolve(attach(url, false));
          });
          return;
        }
        if (connection.status !== "stopped") return;
        fail(
          new Error(
            `setup unreachable: ${connection.reason}${
              connection.message ? ` (${connection.message})` : ""
            }`,
          ),
        );
        return;
      }
      finish(() => resolve(client));
    };
    const unsubscribe = client.subscribe(settle);
    settle();
  });

/**
 * Attach to a setup by its base URL and resolve once its state has arrived.
 * Uses a WebSocket where the runtime has one (Node 22 and later), as the
 * setup page does: the setup server's Durable Object hibernates between
 * messages on a socket, while an open SSE stream keeps it awake. Node 20 has
 * no global WebSocket and uses SSE.
 */
export const connectCheckout = (url: string): Promise<CheckoutClient> =>
  attach(url, typeof globalThis.WebSocket === "function");
