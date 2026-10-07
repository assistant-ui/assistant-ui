"use client";

import { useState } from "react";
import {
  ChevronRightIcon,
  ExternalLinkIcon,
  ListChecksIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CheckoutContextValue } from "@/components/shared/checkout-provider";
import { NavGlyph } from "@/components/shared/nav-glyph";
import { useWizardNext } from "@/components/pages/shop/wizard-actions";
import {
  followedUpSinceProposal,
  parsePreviewUrl,
  type Checkout,
} from "@/lib/checkout/protocol";
import { getCatalogItem, getProduct } from "@/lib/catalog";

function InstalledProducts({ products }: { products: Checkout.Product[] }) {
  return (
    <Collapsible className="flex min-w-0 flex-col items-start">
      <CollapsibleTrigger className="text-muted-foreground hover:text-foreground group flex max-w-full items-center gap-1.5 text-sm">
        <ListChecksIcon className="size-3.5 shrink-0" />
        <span className="truncate">See what was added in this session.</span>
        <ChevronRightIcon className="size-3.5 shrink-0 transition-transform group-data-[panel-open]:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent className="border-foreground/10 mt-3 w-full border-t pt-3">
        <ul className="grid gap-1 @lg:grid-cols-2">
          {products.map((product) => {
            const item = getProduct(product.slug);
            const glyph = getCatalogItem(product.slug)?.glyph;
            return (
              <li
                key={product.slug}
                className="flex min-w-0 items-center gap-2 text-sm"
              >
                {glyph ? <NavGlyph kind={glyph} /> : null}
                <span className="shrink-0">{product.name}</span>
                {item?.packages.length ? (
                  <span className="text-muted-foreground min-w-0 truncate text-xs">
                    {item.packages.join(", ")}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function FinishProposal({
  checkout,
  agentName,
  onClosed,
  summary,
}: {
  checkout: CheckoutContextValue;
  agentName: string;
  onClosed: () => void;
  summary?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [closing, setClosing] = useState(false);
  const followedUp =
    checkout.state !== undefined && followedUpSinceProposal(checkout.state);
  const preview = parsePreviewUrl(checkout.state?.completion?.preview);
  const close = async () => {
    setClosing(true);
    try {
      await checkout.commands["checkout/finish"]();
      onClosed();
    } catch {
      toast.error("Could not close the setup. Try again.");
      setClosing(false);
    }
  };
  useWizardNext({
    label: "Finish",
    disabled: closing || checkout.degraded,
    onClick: () => {
      if (followedUp) setConfirming(true);
      else void close();
    },
  });
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg bg-[color-mix(in_oklab,var(--color-emerald-500)_8%,var(--color-background))] p-4">
        <p className="min-w-0 text-sm">
          {preview
            ? "Your dev server is running."
            : "Finish the setup, or send a message to keep going."}
        </p>
        {preview ? (
          <a
            href={preview.href}
            target="_blank"
            rel="noreferrer"
            className="bg-background/60 hover:bg-background flex min-h-11 w-full min-w-0 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
          >
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full bg-emerald-500"
            />
            <span className="min-w-0 flex-1 truncate font-mono">
              {preview.host}
              {preview.pathname === "/" ? "" : preview.pathname}
            </span>
            <span className="flex shrink-0 items-center gap-1.5 font-medium">
              Open
              <ExternalLinkIcon className="size-3.5" />
            </span>
          </a>
        ) : null}
        <Dialog open={confirming} onOpenChange={setConfirming}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Finish now?</DialogTitle>
              <DialogDescription>
                {agentName} has not picked up your last message yet. Finishing
                ends the session.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Keep going
              </DialogClose>
              <Button disabled={closing} onClick={() => void close()}>
                Finish anyway
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {summary ? (
        <InstalledProducts products={checkout.state?.products ?? []} />
      ) : null}
    </div>
  );
}
