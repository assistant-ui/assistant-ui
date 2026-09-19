"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BotIcon, ShoppingBagIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NavGlyph } from "@/components/shared/nav-glyph";
import {
  useCheckout,
  type CheckoutContextValue,
} from "@/components/shared/checkout-provider";
import {
  dismissLastAdded,
  getCart,
  getLastAdded,
  subscribeCart,
  useCart,
  useLastAdded,
} from "@/lib/catalog/cart-store";
import { getProduct, resolveProducts } from "@/lib/catalog";
import { startCheckout } from "@/lib/checkout/session-store";
import { cn } from "@/lib/utils";

const checkoutLabel = (checkout: CheckoutContextValue) => {
  if (checkout.state?.status === "done") return "Installed";
  if (checkout.state?.status === "cancelled") return "Cancelled";
  if (checkout.openInputs.length > 0) return "Needs your input";
  if (!checkout.agentPresent) return "Waiting for agent";
  return "Installing";
};

function CheckoutProgressButton({
  checkout,
  className,
}: {
  checkout: CheckoutContextValue;
  className?: string | undefined;
}) {
  const needsInput = checkout.openInputs.length > 0;
  const { done, total } = checkout.progress;
  const label = checkoutLabel(checkout);
  return (
    <Button
      variant="outline"
      size="sm"
      nativeButton={false}
      aria-label={`Checkout: ${label}, ${done} of ${total} steps done`}
      className={cn(
        "animate-in fade-in-0 zoom-in-95 duration-200",
        needsInput && "border-foreground",
        className,
      )}
      render={<Link href="/shop/checkout" />}
    >
      <BotIcon data-icon="inline-start" />
      <span className="max-md:sr-only">{label}</span>
      <span
        key={checkout.attentionKey}
        className={cn(
          "grid h-4.5 min-w-4.5 place-items-center rounded-full px-1 text-[11px] leading-none font-medium tabular-nums",
          needsInput
            ? "bg-foreground text-background animate-[pulse_1s_ease-in-out_4]"
            : "bg-muted text-foreground",
        )}
      >
        {needsInput ? "!" : `${done}/${total}`}
      </span>
    </Button>
  );
}

/** Header cart. Renders nothing until the cart holds at least one product. */
export function CartButton({ className }: { className?: string }) {
  const checkout = useCheckout();
  if (checkout !== null) {
    return <CheckoutProgressButton checkout={checkout} className={className} />;
  }
  return <CartPopoverButton className={className} />;
}

function CartPopoverButton({ className }: { className?: string | undefined }) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLAnchorElement>(null);
  const pathname = usePathname();
  const slugs = useCart();
  const lastAdded = useLastAdded();
  const products = resolveProducts(slugs);
  const added = lastAdded ? getProduct(lastAdded.slug) : undefined;

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
              className,
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
          <div className="grid grid-cols-2 gap-2 px-4 pb-4">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/shop/cart" onClick={close} />}
            >
              View cart
            </Button>
            <Button
              nativeButton={false}
              render={
                <Link
                  href="/shop/checkout"
                  onClick={() => {
                    close();
                    startCheckout(getCart());
                  }}
                />
              }
            >
              Checkout
            </Button>
          </div>
        </PopoverContent>
      ) : null}
    </Popover>
  );
}
