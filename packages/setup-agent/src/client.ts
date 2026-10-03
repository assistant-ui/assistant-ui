import { StatewireClient, StatewireHttp } from "statewire";
import type { Checkout } from "./protocol";

export type CheckoutClient = StatewireClient<
  Checkout.State | undefined,
  Checkout.Commands
>;

/** Attach to a setup by its base URL and resolve once its state has arrived. */
export const connectCheckout = (url: string): Promise<CheckoutClient> =>
  new Promise((resolve, reject) => {
    const client: CheckoutClient = new StatewireClient({
      transport: StatewireHttp({ url }),
      onError: (error) => reject(error),
    });
    const settle = () => {
      if (client.state === undefined) {
        if (client.connection.status !== "stopped") return;
        unsubscribe();
        client.dispose();
        reject(
          new Error(
            `setup unreachable: ${client.connection.reason}${
              client.connection.message ? ` (${client.connection.message})` : ""
            }`,
          ),
        );
        return;
      }
      unsubscribe();
      resolve(client);
    };
    const unsubscribe = client.subscribe(settle);
    settle();
  });
