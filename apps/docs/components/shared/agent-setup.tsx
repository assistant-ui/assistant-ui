"use client";

import { BotIcon } from "lucide-react";
import { AddToCartButton } from "@/components/pages/shop/add-to-cart-button";
import { Button } from "@/components/ui/button";
import { useBeginSetup } from "@/components/shared/setup-navigation";
import { getCatalogItem } from "@/lib/catalog";
import { useCheckoutSession } from "@/lib/checkout/session-store";

/** Docs banner that hands the page's setup to the reader's coding agent; prominent where the agent is the main way to install. */
export function AgentSetup({
  product: slug,
  prominent = false,
}: {
  product: string;
  prominent?: boolean;
}) {
  const product = getCatalogItem(slug);
  const session = useCheckoutSession();
  const beginSetup = useBeginSetup();
  if (product === undefined) return null;
  const held = session?.products.includes(product.slug) ?? false;
  const collects = product.purchase === "cart" && !held;
  const begin =
    session && collects ? null : (
      <Button
        size={prominent ? "default" : "sm"}
        variant={prominent && collects ? "outline" : "default"}
        onClick={() => beginSetup([product.slug])}
      >
        {session ? "Continue setup" : "Begin setup"}
      </Button>
    );

  if (prominent)
    return (
      <aside
        aria-label="Set up with your coding agent"
        className="not-prose border-foreground/15 bg-muted/40 my-6 flex flex-wrap items-center gap-x-6 gap-y-4 rounded-lg border p-5"
      >
        <div className="min-w-0 flex-1 basis-64">
          <p className="text-base font-medium">
            Install {product.name} with your coding agent
          </p>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            {!collects
              ? "Your agent installs it and wires it into your project."
              : session
                ? "A setup is running. Add this to your next setup and your agent installs it then."
                : "Add it to your setup. Your agent installs everything in the setup and wires it into your project."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {collects ? (
            <AddToCartButton
              slug={product.slug}
              name={product.name}
              size="default"
            />
          ) : null}
          {begin}
        </div>
      </aside>
    );

  return (
    <aside
      aria-label="Set up with your coding agent"
      className="not-prose border-foreground/15 bg-muted/40 my-6 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border px-4 py-3 text-sm"
    >
      <BotIcon aria-hidden className="size-4 shrink-0" />
      <p className="min-w-0 flex-1 basis-56">
        You can also use your coding agent to set this up.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {collects ? (
          <AddToCartButton
            slug={product.slug}
            name={product.name}
            variant="outline"
          />
        ) : null}
        {begin}
      </div>
    </aside>
  );
}
