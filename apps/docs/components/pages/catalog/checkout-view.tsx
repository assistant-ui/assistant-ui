"use client";

import {
  useEffect,
  useState,
  type ComponentType,
  type FormEvent,
  type SVGProps,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeftIcon,
  BotIcon,
  CheckIcon,
  CircleDashedIcon,
  CopyIcon,
  LoaderCircleIcon,
  MinusIcon,
  OctagonAlertIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ClaudeIcon } from "@/components/icons/claude";
import { GeminiIcon } from "@/components/icons/gemini";
import { NavGlyph } from "@/components/shared/nav-glyph";
import {
  useCheckout,
  type CheckoutContextValue,
} from "@/components/shared/checkout-provider";
import { typeDeck, typePage } from "@/components/shared/type";
import { getProduct, resolveProducts } from "@/lib/catalog";
import { parseCartItems } from "@/lib/catalog/install-prompt";
import { replaceCart, useCart } from "@/lib/catalog/cart-store";
import { useShippingMethod } from "@/lib/catalog/shipping-store";
import {
  endCheckout,
  getCheckoutSession,
  startCheckout,
} from "@/lib/checkout/session-store";
import type { Checkout } from "@/lib/checkout/protocol";
import { useHydrated } from "@/hooks/use-hydrated";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { cn } from "@/lib/utils";

const agentCommand = (url: string) => `npx agent-checkout ${url}`;

function EmptyState() {
  return (
    <div className="max-w-xl">
      <h1 className={typePage}>Nothing here yet.</h1>
      <p className={cn("mt-4", typeDeck)}>
        Add a product from the catalog, then check out to have your coding agent
        install it.
      </p>
      <Button
        nativeButton={false}
        className="mt-8"
        render={<Link href="/shop" />}
      >
        <ArrowLeftIcon data-icon="inline-start" />
        Browse the catalog
      </Button>
    </div>
  );
}

function StartState({ slugs }: { slugs: readonly string[] }) {
  const products = resolveProducts(slugs);
  return (
    <div className="max-w-xl">
      <h1 className={typePage}>Ready to check out.</h1>
      <p className={cn("mt-4", typeDeck)}>
        Checkout opens a live session your coding agent joins from your machine.
        You watch every step here and answer when it asks.
      </p>
      <ul role="list" className="divide-foreground/10 mt-8 divide-y">
        {products.map((product) => (
          <li key={product.slug} className="flex items-center gap-4 py-3">
            <NavGlyph kind={product.glyph} />
            <span className="text-[0.9375rem] font-medium">{product.name}</span>
          </li>
        ))}
      </ul>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button onClick={() => startCheckout(slugs)}>Start checkout</Button>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/shop/cart" />}
        >
          Back to cart
        </Button>
      </div>
    </div>
  );
}

function CopyCommand({ url }: { url: string }) {
  const { isCopied, copyToClipboard } = useCopyToClipboard({
    copiedDuration: 1800,
  });
  const command = agentCommand(url);
  return (
    <div className="border-foreground/10 bg-muted/40 flex items-center gap-2 rounded-lg border py-2 pr-2 pl-3">
      <code className="min-w-0 flex-1 truncate font-mono text-[13px]">
        {command}
      </code>
      <Button
        variant="ghost"
        size="sm"
        aria-label="Copy command"
        onClick={() => {
          if (typeof navigator === "undefined" || !navigator.clipboard) {
            toast.error("Could not copy to the clipboard");
            return;
          }
          copyToClipboard(command);
        }}
      >
        {isCopied ? (
          <CheckIcon data-icon="inline-start" />
        ) : (
          <CopyIcon data-icon="inline-start" />
        )}
        {isCopied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

const STATUS_LABEL: Record<
  Checkout.Status | "offline" | "disconnected",
  string
> = {
  waiting: "Waiting for your agent to connect",
  running: "Your agent is working",
  offline: "Your agent has gone quiet",
  done: "Everything is installed",
  cancelled: "This checkout was cancelled",
  disconnected: "Reconnecting to the checkout",
};

const statusOf = (checkout: CheckoutContextValue) => {
  const { state, connection } = checkout;
  if (connection.status !== "connected" && state === undefined) {
    return "disconnected" as const;
  }
  if (state === undefined) return "waiting" as const;
  if (state.status === "running" && !checkout.agentPresent) {
    return "offline" as const;
  }
  return state.status;
};

function StepIcon({ status }: { status: Checkout.StepStatus }) {
  const className = "size-4 shrink-0";
  switch (status) {
    case "done":
      return <CheckIcon className={cn(className, "text-foreground")} />;
    case "active":
      return (
        <LoaderCircleIcon
          className={cn(className, "text-foreground animate-spin")}
        />
      );
    case "skipped":
      return <MinusIcon className={cn(className, "text-muted-foreground")} />;
    case "blocked":
      return <OctagonAlertIcon className={cn(className, "text-destructive")} />;
    default:
      return (
        <CircleDashedIcon className={cn(className, "text-muted-foreground")} />
      );
  }
}

function InputCard({
  input,
  checkout,
}: {
  input: Checkout.Input;
  checkout: CheckoutContextValue;
}) {
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (answer.trim() === "") return;
    setBusy(true);
    try {
      await checkout.commands["checkout/answer"]({
        inputId: input.id,
        answer: answer.trim(),
      });
    } catch {
      toast.error("Could not send the answer");
    } finally {
      setBusy(false);
    }
  };
  const dismiss = async () => {
    setBusy(true);
    try {
      await checkout.commands["checkout/dismiss"]({ inputId: input.id });
    } catch {
      toast.error("Could not skip the question");
    } finally {
      setBusy(false);
    }
  };
  return (
    <form
      onSubmit={submit}
      className="border-foreground rounded-document border p-4 sm:p-5"
    >
      <p className="text-[0.9375rem] font-medium">{input.prompt}</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Input
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          placeholder={input.placeholder ?? "Type your answer"}
          aria-label={input.prompt}
          autoFocus
          disabled={busy}
          className="flex-1"
        />
        <div className="flex gap-2">
          <Button type="submit" disabled={busy || answer.trim() === ""}>
            Send
          </Button>
          {input.optional ? (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={dismiss}
            >
              Skip
            </Button>
          ) : null}
        </div>
      </div>
    </form>
  );
}

function EndSessionButton({ checkout }: { checkout: CheckoutContextValue }) {
  const router = useRouter();
  const end = async () => {
    try {
      await checkout.commands["checkout/cancel"]();
    } catch {
      // The session ends locally either way; the worker's copy expires on its own.
    }
    endCheckout();
    router.push("/shop/cart");
  };
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        End session
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel this session?</DialogTitle>
          <DialogDescription>
            Your agent will be told to stop and the progress shown here will be
            lost. Your cart stays as it is.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Keep going
          </DialogClose>
          <Button variant="destructive" onClick={end}>
            End session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const AGENT_ICONS: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  claude: ClaudeIcon,
  gemini: GeminiIcon,
};

function AgentBox({ checkout }: { checkout: CheckoutContextValue }) {
  const shipping = useShippingMethod();
  const Icon = AGENT_ICONS[shipping.id] ?? BotIcon;
  const name = shipping.id === "other" ? "Your agent" : shipping.name;
  const everConnected = checkout.state?.agent.lastSeenAt !== null;

  if (checkout.agentPresent) {
    return (
      <div className="border-foreground/10 flex items-center gap-3 rounded-lg border px-4 py-3">
        <Icon className="size-5 shrink-0" />
        <p className="flex-1 text-sm font-medium">{name} is connected</p>
        <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
          <span className="size-2 rounded-full bg-current" aria-hidden />
          Listening
        </span>
      </div>
    );
  }

  if (everConnected) {
    return (
      <div className="border-foreground/10 rounded-lg border px-4 py-3">
        <div className="flex items-center gap-3">
          <Icon className="size-5 shrink-0" />
          <p className="flex-1 text-sm font-medium">{name} has gone quiet</p>
          <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <span className="size-2 rounded-full bg-current" aria-hidden />
            Not listening
          </span>
        </div>
        <p className="text-muted-foreground mt-2 text-sm">
          Its stream stopped. If it is still working, ask it to run the command
          again.
        </p>
        <div className="mt-3">
          <CopyCommand url={checkout.url} />
        </div>
      </div>
    );
  }

  return (
    <section
      aria-labelledby="connect-heading"
      className="border-foreground rounded-document border p-5 sm:p-6"
    >
      <div className="flex items-center gap-3">
        <Icon className="size-6 shrink-0" />
        <h2 id="connect-heading" className="text-base font-medium">
          Connect {name}
        </h2>
      </div>
      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
        Paste this into {name} on the machine with your project. It joins this
        checkout, follows the steps below, and reports back here. The rest of
        the page wakes up once it is listening.
      </p>
      <div className="mt-4">
        <CopyCommand url={checkout.url} />
      </div>
    </section>
  );
}

function SessionState({ checkout }: { checkout: CheckoutContextValue }) {
  const router = useRouter();
  const { state } = checkout;
  const status = statusOf(checkout);
  const closed = status === "done" || status === "cancelled";
  const products = state?.products ?? [];
  const everConnected = state?.agent.lastSeenAt !== null;
  const dimmed = !everConnected && !closed;

  return (
    <div className="max-w-2xl">
      <h1 className={typePage}>
        {status === "done" ? "Installed." : "Checkout"}
      </h1>
      <p className={cn("mt-4", typeDeck)}>{STATUS_LABEL[status]}</p>

      {closed ? null : (
        <div className="mt-8">
          <AgentBox checkout={checkout} />
        </div>
      )}

      {checkout.openInputs.length > 0 ? (
        <div className="mt-8 flex flex-col gap-3">
          {checkout.openInputs.map((input) => (
            <InputCard key={input.id} input={input} checkout={checkout} />
          ))}
        </div>
      ) : null}

      <div
        aria-hidden={dimmed}
        className={cn(
          "transition-opacity duration-300",
          dimmed && "pointer-events-none opacity-40 select-none",
        )}
      >
        <ul role="list" className="mt-10 flex flex-col gap-8">
          {products.map((product) => {
            const catalog = getProduct(product.slug);
            return (
              <li key={product.slug}>
                <div className="flex items-center gap-3">
                  {catalog ? <NavGlyph kind={catalog.glyph} /> : null}
                  <h2 className="text-[0.9375rem] font-medium">
                    {product.name}
                  </h2>
                </div>
                <ol className="border-foreground/10 mt-4 divide-y border-y">
                  {product.steps.map((step) => (
                    <li key={step.id} className="flex items-start gap-3 py-3">
                      <span className="mt-0.5">
                        <StepIcon status={step.status} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "text-sm",
                            step.status === "skipped" &&
                              "text-muted-foreground line-through",
                          )}
                        >
                          {step.title}
                        </p>
                        {step.note ? (
                          <p className="text-muted-foreground mt-1 text-sm">
                            {step.note}
                          </p>
                        ) : step.detail ? (
                          <p className="text-muted-foreground mt-1 text-sm">
                            {step.detail}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              </li>
            );
          })}
        </ul>

        {state && state.log.length > 0 ? (
          <div className="mt-10">
            <h2 className="text-sm font-medium">Agent log</h2>
            <ol className="text-muted-foreground mt-2 flex flex-col gap-1 font-mono text-[13px]">
              {state.log.slice(-8).map((entry) => (
                <li key={entry.id}>{entry.text}</li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>

      <section
        aria-labelledby="session-heading"
        className="border-foreground/10 mt-12 border-t pt-6"
      >
        <h2 id="session-heading" className="text-sm font-medium">
          Session
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {closed
            ? status === "done"
              ? "The install is complete. Finish to unlock your cart."
              : "This checkout was cancelled. Go back to unlock your cart."
            : "Leave this tab open while your agent works. Ending the session unlocks the cart."}
        </p>
        <div className="mt-4">
          {closed ? (
            <Button
              onClick={() => {
                endCheckout();
                router.push(status === "done" ? "/shop" : "/shop/cart");
              }}
            >
              {status === "done" ? "Finish" : "Back to cart"}
            </Button>
          ) : (
            <EndSessionButton checkout={checkout} />
          )}
        </div>
      </section>
    </div>
  );
}

export function CheckoutView() {
  const hydrated = useHydrated();
  const params = useSearchParams();
  const linkedItems = params.get("items");
  const slugs = useCart();
  const checkout = useCheckout();

  // A shared link restores the cart it describes unless a checkout is running.
  useEffect(() => {
    const linked = parseCartItems(linkedItems);
    if (linked.length > 0 && getCheckoutSession() === null) replaceCart(linked);
  }, [linkedItems]);

  if (checkout !== null) return <SessionState checkout={checkout} />;
  if (!hydrated) return null;
  if (slugs.length === 0) return <EmptyState />;
  return <StartState slugs={slugs} />;
}
