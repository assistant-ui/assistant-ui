"use client";

import { useRef, useState } from "react";
import { ExternalLinkIcon } from "lucide-react";
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
} from "@/components/ui/dialog";
import type { CheckoutContextValue } from "@/components/shared/checkout-provider";
import {
  followedUpSinceProposal,
  parsePreviewUrl,
} from "@/lib/checkout/protocol";

export function FinishProposal({
  checkout,
  agentName,
  onClosed,
}: {
  checkout: CheckoutContextValue;
  agentName: string;
  onClosed: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [closing, setClosing] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
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
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl bg-emerald-500/[0.08] py-3 pr-3 pl-4">
      <div className="min-w-0">
        <p className="text-base font-medium sm:text-sm">{agentName} finished</p>
        <p className="text-muted-foreground text-sm">
          {preview
            ? "Your dev server is running. Try it, then close the setup or send a message to keep going."
            : "Close the setup, or send a message to keep going."}
        </p>
      </div>
      {preview ? (
        <a
          href={preview.href}
          target="_blank"
          rel="noreferrer"
          className="bg-background/60 hover:bg-background flex min-h-11 w-full min-w-0 items-center gap-3 rounded-lg py-2 pr-3 pl-3.5 text-sm transition-colors"
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
      <Button
        ref={trigger}
        disabled={closing || checkout.degraded}
        onClick={() => {
          if (followedUp) setConfirming(true);
          else void close();
        }}
      >
        {preview ? "Looks good, close setup" : "Close setup"}
      </Button>
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent finalFocus={trigger}>
          <DialogHeader>
            <DialogTitle>Close this setup?</DialogTitle>
            <DialogDescription>
              You sent a message after {agentName} finished, and it may still be
              working on it. Closing ends the session.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Keep going
            </DialogClose>
            <Button disabled={closing} onClick={() => void close()}>
              Close setup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
