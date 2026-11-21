"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SetupWizard } from "@/components/wizard/setup-wizard";
import { useCheckout, useCheckoutFailed } from "@/components/checkout-provider";
import { PromptCopy } from "@/components/prompt-copy";
import {
  pageColumnClassName,
  pageTitleClassName,
} from "@/components/setup-frame";
import { abandonCheckout, connectAgentSetup } from "@/lib/checkout/flow";
import {
  parseAgentFragment,
  useCheckoutSession,
} from "@/lib/checkout/session-store";
import { AgentLinkConfirm } from "@/components/wizard/agent-link-confirm";
import { DOCS_URL } from "@/lib/config";
import { analytics } from "@/lib/analytics";
import { useHydrated } from "@/hooks/use-hydrated";

/** What the page shows without a setup: the one line that starts one. */
function Landing() {
  return (
    <section
      aria-labelledby="setup-landing-title"
      className={pageColumnClassName}
    >
      <h1 id="setup-landing-title" className={pageTitleClassName}>
        Set up assistant-ui with your coding agent
      </h1>
      <p className="text-muted-foreground mt-4 max-w-[60ch] text-sm leading-relaxed">
        Tell your agent the line below. It runs the setup and opens it here,
        where you answer its questions and approve the plan.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
        <PromptCopy />
        <a
          href={`${DOCS_URL}/docs/manual-installation`}
          className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 transition-colors hover:underline"
        >
          Install manually
        </a>
      </div>
    </section>
  );
}

function UnreadableState() {
  return (
    <section
      aria-labelledby="setup-unreadable-title"
      className={pageColumnClassName}
    >
      <h1 id="setup-unreadable-title" className={pageTitleClassName}>
        This setup cannot be read.
      </h1>
      <p className="text-muted-foreground mt-4 max-w-[60ch] text-sm leading-relaxed">
        The session sent something this page does not understand, most likely
        from a different version. End it and ask your agent to start again.
      </p>
      <Button className="mt-8" onClick={() => abandonCheckout()}>
        End setup
      </Button>
    </section>
  );
}

type AgentFragment = NonNullable<ReturnType<typeof parseAgentFragment>>;
const pendingKey = "aui-agent-link-pending";

const readPending = (): AgentFragment | null => {
  try {
    return parseAgentFragment(sessionStorage.getItem(pendingKey) ?? "");
  } catch {
    return null;
  }
};

const writePending = (fragment: string | null) => {
  try {
    if (fragment === null) sessionStorage.removeItem(pendingKey);
    else sessionStorage.setItem(pendingKey, fragment);
  } catch {
    // Storage can be blocked; the request then lives until the tab reloads.
  }
};

/**
 * The setup a coding agent opened this page on (`#link=…&setup=…`), waiting
 * for the user to connect to it. The fragment leaves the address bar at
 * once; the request is kept for this tab only.
 */
function usePendingAgentLink() {
  const [pending, setPending] = useState<AgentFragment | null>(() =>
    typeof window === "undefined"
      ? null
      : (parseAgentFragment(window.location.hash) ?? readPending()),
  );
  useEffect(() => {
    if (parseAgentFragment(window.location.hash) === null) return;
    writePending(window.location.hash);
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
  }, []);
  const settle = () => {
    writePending(null);
    setPending(null);
  };
  return { pending, settle };
}

export function CheckoutView() {
  const { pending, settle } = usePendingAgentLink();
  const hydrated = useHydrated();
  const session = useCheckoutSession();
  const checkout = useCheckout();
  const failed = useCheckoutFailed();

  if (!hydrated) return null;
  if (pending !== null && session?.link !== pending.link)
    return (
      <AgentLinkConfirm
        link={pending.link}
        onConnect={() => {
          analytics.setup.linkConfirmed();
          connectAgentSetup(pending.link, pending.setup);
          settle();
        }}
        onCancel={() => {
          analytics.setup.linkDeclined();
          settle();
        }}
      />
    );
  if (checkout !== null)
    return <SetupWizard key={checkout.session.id} checkout={checkout} />;
  if (session !== null && !failed)
    return (
      <p
        role="status"
        className={`${pageColumnClassName} text-muted-foreground text-sm`}
      >
        Connecting to your setup…
      </p>
    );
  return failed ? <UnreadableState /> : <Landing />;
}
