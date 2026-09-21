"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBagIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverTitle,
  PopoverDescription,
} from "@/components/ui/popover";
import {
  SetupLink,
  useSetupNavigation,
} from "@/components/shared/setup-navigation";
import { NavGlyph } from "@/components/shared/nav-glyph";
import { AgentKindIcon } from "@/components/shared/agent-kind-icon";
import {
  useCheckout,
  type CheckoutContextValue,
} from "@/components/shared/checkout-provider";
import {
  dismissLastAdded,
  getLastAdded,
  subscribeCart,
  useCart,
  useLastAdded,
} from "@/lib/catalog/cart-store";
import { getCatalogItem, resolveProducts } from "@/lib/catalog";
import { checkoutEnabled } from "@/lib/checkout/config";
import { checkoutCart } from "@/lib/checkout/flow";
import { cn } from "@/lib/utils";

const checkoutLabel = (checkout: CheckoutContextValue) => {
  if (checkout.state === undefined) return "Connecting";
  const status = checkout.state.status;
  if (status === "done") return "Installed";
  if (status === "cancelled") return "Cancelled";
  if (checkout.degraded) return "Reconnecting";
  if (checkout.planPending) return "Review the plan";
  if (checkout.openInputs.length > 0) return "Needs your input";
  if (
    checkout.state?.agent.lastSeenAt === null &&
    checkout.state?.agent.introducedAt == null
  ) {
    return "Connect your agent";
  }
  if (!checkout.agentPresent) return "Waiting for agent";
  return status === "installing" ? "Installing" : "Planning";
};

const needsUser = (checkout: CheckoutContextValue) =>
  checkout.state?.status !== "done" &&
  checkout.state?.status !== "cancelled" &&
  (checkout.planPending ||
    checkout.openInputs.length > 0 ||
    (checkout.state?.agent.lastSeenAt === null &&
      checkout.state?.agent.introducedAt == null));

function CheckoutProgressButton({
  checkout,
  className,
  joined,
}: {
  checkout: CheckoutContextValue;
  className?: string | undefined;
  joined: boolean;
}) {
  const needsInput = needsUser(checkout);
  const { resumeHint, dismissResumeHint } = useSetupNavigation();
  const anchorRef = useRef<HTMLAnchorElement>(null);
  const [hintOpen, setHintOpen] = useState(false);
  useEffect(() => {
    setHintOpen(resumeHint && !!anchorRef.current?.getClientRects().length);
  }, [resumeHint]);
  const { done, total } = checkout.progress;
  const label = checkoutLabel(checkout);
  const badge = needsInput ? "!" : total > 0 ? `${done}/${total}` : null;
  return (
    <Popover
      open={hintOpen}
      onOpenChange={(open) => {
        if (!open) dismissResumeHint();
      }}
    >
      <PopoverTrigger
        nativeButton={false}
        render={
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            aria-label={
              total > 0
                ? `Setup: ${label}, ${done} of ${total} steps done`
                : `Setup: ${label}`
            }
            className={cn(
              "animate-in fade-in-0 zoom-in-95 duration-200",
              needsInput && "border-foreground",
              joined && "-ml-px rounded-l-none",
              className,
            )}
            render={<SetupLink ref={anchorRef} />}
          />
        }
      >
        <span data-icon="inline-start" className="flex size-3.5 items-center">
          <AgentKindIcon
            kind={checkout.agentPresent ? checkout.state?.agent.kind : null}
            className="size-3.5"
          />
        </span>
        <span className="max-md:sr-only">Setup</span>
        {badge !== null ? (
          <span
            key={checkout.attentionKey}
            className={cn(
              "grid h-4.5 min-w-4.5 place-items-center rounded-full px-1 text-[11px] leading-none font-medium tabular-nums",
              needsInput
                ? "bg-foreground text-background animate-[pulse_1s_ease-in-out_4]"
                : "bg-muted text-foreground",
            )}
          >
            {badge}
          </span>
        ) : null}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        initialFocus={false}
        className="w-72 p-4"
      >
        <PopoverTitle>Resume setup anytime</PopoverTitle>
        <PopoverDescription>
          Your session stays open. Use this button to return to your agent,
          follow its progress, or answer a question.
        </PopoverDescription>
        <Button
          variant="outline"
          size="sm"
          className="self-end"
          onClick={dismissResumeHint}
        >
          Got it
        </Button>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Header cart and checkout, one control in two halves. Renders nothing until
 * the cart holds a product or a checkout is running.
 */
export function CartButton({ className }: { className?: string }) {
  const checkout = useCheckout();
  const count = useCart().length;
  if (!checkoutEnabled) return null;
  return (
    <div
      className={cn(
        "flex items-center",
        checkout === null && count === 0 && "hidden",
        className,
      )}
    >
      <CartPopoverButton checkoutActive={checkout !== null} />
      {checkout !== null ? (
        <CheckoutProgressButton checkout={checkout} joined={count > 0} />
      ) : null}
    </div>
  );
}

function CartPopoverButton({ checkoutActive }: { checkoutActive: boolean }) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLAnchorElement>(null);
  const pathname = usePathname();
  const slugs = useCart();
  const lastAdded = useLastAdded();
  const products = resolveProducts(slugs);
  const added = lastAdded ? getCatalogItem(lastAdded.slug) : undefined;

  // The docs header mounts one cart per breakpoint, so only the visible copy
  // may open the confirmation, and the first add has to wait for the button
  // itself to render before the anchor exists.
  useEffect(() => {
    let frame = 0;
    const unsubscribe = subscribeCart(() => {
      if (getLastAdded() === null) {
        setOpen(false);
        return;
      }
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (anchorRef.current?.getClientRects().length) setOpen(true);
      });
    });
    return () => {
      cancelAnimationFrame(frame);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    dismissLastAdded();
  }, [pathname]);

  const close = () => {
    setOpen(false);
    dismissLastAdded();
  };

  if (products.length === 0) return null;

  const count = products.length;
  const countLabel = `${count} ${count === 1 ? "item" : "items"}`;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <PopoverTrigger
        nativeButton={false}
        render={
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            aria-label={`Cart, ${countLabel}`}
            className={cn(
              "animate-in fade-in-0 zoom-in-95 duration-200",
              checkoutActive && "rounded-r-none",
            )}
            render={<Link ref={anchorRef} href="/shop/cart" />}
          />
        }
      >
        <ShoppingBagIcon data-icon="inline-start" />
        <span className="max-md:sr-only">Cart</span>
        <span className="bg-foreground text-background grid size-4.5 place-items-center rounded-full text-[11px] leading-none font-medium tabular-nums">
          {count}
        </span>
      </PopoverTrigger>
      {added ? (
        <PopoverContent align="end" sideOffset={8} className="w-80 gap-0 p-0">
          <div className="flex items-center gap-3 p-4">
            <NavGlyph kind={added.glyph} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{added.name}</p>
              <p className="text-muted-foreground text-sm">Added to cart</p>
            </div>
          </div>
          <dl className="border-foreground/10 flex flex-col gap-2 border-t px-4 py-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">In cart</dt>
              <dd className="tabular-nums">{countLabel}</dd>
            </div>
            <div className="flex justify-between gap-4 font-medium">
              <dt>Total</dt>
              <dd className="tabular-nums">$0.00</dd>
            </div>
          </dl>
          <div
            className={cn(
              "grid gap-2 px-4 pb-4",
              checkoutActive ? "grid-cols-1" : "grid-cols-2",
            )}
          >
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/shop/cart" onClick={close} />}
            >
              View cart
            </Button>
            {checkoutActive ? null : (
              <Button
                nativeButton={false}
                render={
                  <SetupLink
                    onClick={() => {
                      close();
                      checkoutCart();
                    }}
                  />
                }
              >
                Start setup
              </Button>
            )}
          </div>
        </PopoverContent>
      ) : null}
    </Popover>
  );
}
