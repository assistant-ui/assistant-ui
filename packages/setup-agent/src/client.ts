import { StatewireClient, StatewireHttp, StatewireWebsocket } from "statewire";
import type { Checkout } from "./protocol";

export type CheckoutClient = StatewireClient<
  Checkout.State | undefined,
  Checkout.Commands
>;

/**
 * A WebSocket where the runtime has one (Node 22 and later), as the setup page
 * uses: the setup server's Durable Object hibernates between messages on a
 * socket, while an open SSE stream keeps it awake. Node 20 has no global
 * WebSocket and stays on SSE.
 */
const checkoutTransport = (url: string) =>
  typeof globalThis.WebSocket === "function"
    ? StatewireWebsocket<Checkout.State, Checkout.Commands>({ url })
    : StatewireHttp<Checkout.State, Checkout.Commands>({ url });

/** Attach to a setup by its base URL and resolve once its state has arrived. */
export const connectCheckout = (url: string): Promise<CheckoutClient> =>
  new Promise((resolve, reject) => {
    let settled = false;
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      unsubscribe();
      client.dispose();
      reject(error);
    };
    const client: CheckoutClient = new StatewireClient({
      transport: checkoutTransport(url),
      onError: fail,
    });
    const settle = () => {
      if (settled) return;
      if (client.state === undefined) {
        if (client.connection.status !== "stopped") return;
        fail(
          new Error(
            `setup unreachable: ${client.connection.reason}${
              client.connection.message ? ` (${client.connection.message})` : ""
            }`,
          ),
        );
        return;
      }
      settled = true;
      unsubscribe();
      resolve(client);
    };
    const unsubscribe = client.subscribe(settle);
    settle();
  });
