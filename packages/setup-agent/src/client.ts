import { StatewireClient, StatewireHttp } from "statewire";
import type { Checkout } from "./protocol";

export type CheckoutClient = StatewireClient<
  Checkout.State | undefined,
  Checkout.Commands
>;

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
      transport: StatewireHttp({ url }),
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
