import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { resource } from "@assistant-ui/tap";
import { AuiConfig } from "../AuiConfig";
import { AuiProvider } from "../AuiProvider";
import { useAui } from "../useAui";
import { useAssistantClientRef } from "../utils/tap-assistant-context";

type AnyClient = Record<string, any>;

const useWalletClient = () => ({
  getState: () => ({ balance: 42 }),
});
const WalletClient = resource(useWalletClient);

const useBillingClient = () => {
  const clientRef = useAssistantClientRef();
  return {
    getState: () => ({}),
    readBalance: () =>
      (clientRef.current as AnyClient).wallet.getState().balance,
  };
};
const BillingClient = resource(useBillingClient);

const config = () =>
  AuiConfig({
    wallet: WalletClient(),
    billing: BillingClient(),
  } as never);

const Consumer = () => {
  const aui = useAui() as AnyClient;
  return <span>{aui.billing.readBalance()}</span>;
};

const LegacyConsumer = () => {
  const aui = useAui({
    wallet: WalletClient(),
    billing: BillingClient(),
  } as never) as AnyClient;
  return <span>{aui.billing.readBalance()}</span>;
};

describe("client ref during a server render", () => {
  it("resolves a sibling scope from a client method called while the provider's subtree renders", () => {
    const markup = renderToStaticMarkup(
      <AuiProvider config={config()}>
        <Consumer />
      </AuiProvider>,
    );

    expect(markup).toBe("<span>42</span>");
  });

  it("resolves a sibling scope under the deprecated useAui(config) host", () => {
    const markup = renderToStaticMarkup(<LegacyConsumer />);

    expect(markup).toBe("<span>42</span>");
  });
});
