"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeftIcon, BotIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SetupLink } from "@/components/shared/setup-navigation";
import { NavGlyph } from "@/components/shared/nav-glyph";
import { typeDeck, typePage } from "@/components/shared/type";
import {
  estimateAgentMinutes,
  formatMinutes,
  resolveProducts,
  getCatalogItem,
} from "@/lib/catalog";
import { parseItemSlugs } from "@/lib/catalog/install-guide";
import {
  removeFromCart,
  replaceCart,
  useCartEntries,
  useCartInstructions,
  setCartInstructions,
} from "@/lib/catalog/cart-store";
import { AgentMarks } from "@/components/pages/shop/agent-status";
import { checkoutCart } from "@/lib/checkout/flow";
import { useCheckoutSession } from "@/lib/checkout/session-store";
import { useHydrated } from "@/hooks/use-hydrated";
import { cn } from "@/lib/utils";
import { cartEntryId, cartEntrySlug } from "@/lib/catalog/agent-tool-config";
import { AgentToolDialog } from "./agent-tool-dialog";

function ActiveCheckoutBanner() {
  return (
    <div
      role="status"
      className="border-foreground/15 bg-muted/40 mb-8 flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 text-sm"
    >
      <BotIcon className="size-4 shrink-0" />
      <span className="min-w-0 flex-1">
        Setup is in progress. Finish it before starting another one.
      </span>
      <Button
        size="sm"
        variant="outline"
        nativeButton={false}
        render={<SetupLink />}
      >
        Continue setup
      </Button>
    </div>
  );
}

export function CartView() {
  const hydrated = useHydrated();
  const params = useSearchParams();
  const linkedItems = params.get("items");
  const entries = useCartEntries();
  const session = useCheckoutSession();
  const products = entries.flatMap((entry) => {
    const product = getCatalogItem(cartEntrySlug(entry));
    return product
      ? [
          {
            ...product,
            cartId: cartEntryId(entry),
            name: typeof entry === "string" ? product.name : entry.name,
            tagline:
              typeof entry === "string" ? product.tagline : entry.purpose,
            needsConfiguration: entry === "agent-tools",
          },
        ]
      : [];
  });
  const needsConfiguration = products.some(
    (product) => product.needsConfiguration,
  );
  const instructions = useCartInstructions();

  // A shared link restores the cart it describes, then the cart owns the state
  // so removing an item here does not resurrect it on the next render.
  useEffect(() => {
    if (!hydrated || session !== null) return;
    const linked = resolveProducts(parseItemSlugs(linkedItems)).map(
      (product) => product.slug,
    );
    if (linked.length > 0) replaceCart(linked);
  }, [hydrated, linkedItems, session]);

  if (!hydrated) return null;

  if (products.length === 0) {
    return (
      <div className="max-w-xl">
        {session !== null ? <ActiveCheckoutBanner /> : null}
        <h1 className={typePage}>Your cart is empty.</h1>
        <p className={cn("mt-4", typeDeck)}>
          Open a product on the Components page and add it here. Everything is
          free.
        </p>
        <Button
          nativeButton={false}
          className="mt-8"
          render={<Link href="/components" />}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Browse components
        </Button>
      </div>
    );
  }

  const estimate = formatMinutes(estimateAgentMinutes(products));
  const includesBuildProduct = products.some(
    (product) => product.slug === "statewire" || product.slug === "harness-sdk",
  );

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-16">
      <div>
        {session !== null ? <ActiveCheckoutBanner /> : null}
        <h1 className={typePage}>Cart</h1>
        <ul
          role="list"
          className="divide-foreground/10 border-foreground/10 mt-8 divide-y border-y"
        >
          {products.map((product) => (
            <li
              key={product.cartId}
              className="group/navlink grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-5 gap-y-3 py-6 sm:gap-x-8"
            >
              <NavGlyph kind={product.glyph} />
              <div className="min-w-0">
                <Link
                  href={product.href}
                  className="text-[0.9375rem] font-medium underline-offset-4 hover:underline"
                >
                  {product.name}
                </Link>
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                  {product.tagline}
                </p>
                {product.slug === "agent-tools" ? (
                  <p className="text-muted-foreground mt-2 text-xs">
                    Agent Tool
                  </p>
                ) : null}
                <p className="text-muted-foreground mt-2 text-sm">
                  Agent time {formatMinutes(product.agentMinutes)}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label={`Remove ${product.name}`}
                  onClick={() => removeFromCart(product.cartId)}
                  className="mt-3"
                >
                  <Trash2Icon data-icon="inline-start" />
                  Remove
                </Button>
                {product.needsConfiguration ? (
                  <div className="mt-3">
                    <AgentToolDialog variant="outline" />
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>

        {includesBuildProduct ? (
          <div className="mt-6 flex flex-col gap-3">
            <label
              htmlFor="product-cart-build"
              className="text-base font-medium"
            >
              What do you want to build?
            </label>
            <p
              id="product-cart-build-help"
              className="text-muted-foreground text-base sm:text-sm"
            >
              Your agent uses this brief and your existing setup notes to build
              with the selected products.
            </p>
            <textarea
              id="product-cart-build"
              name="product-build"
              aria-describedby="product-cart-build-help"
              placeholder="Describe the shared application you want to build."
              value={instructions}
              onChange={(event) => setCartInstructions(event.target.value)}
              rows={4}
              className="border-input placeholder:text-muted-foreground focus-visible:ring-ring rounded-control w-full resize-y border bg-transparent px-3 py-3 text-base focus-visible:ring-2 focus-visible:outline-none sm:text-sm"
            />
          </div>
        ) : (
          <details className="group/instructions mt-6">
            <summary className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex w-fit cursor-pointer list-none items-center gap-2 rounded-md py-2 text-sm focus-visible:ring-2 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
              <PlusIcon
                aria-hidden="true"
                className="size-4 shrink-0 group-open/instructions:rotate-45"
              />
              {instructions.trim()
                ? "Edit special instructions"
                : "Add special instructions"}
            </summary>
            <div className="pt-2">
              <p
                id="setup-instructions-help"
                className="text-muted-foreground text-base sm:text-sm"
              >
                Your agent will inspect your project and ask about anything it
                needs.
              </p>
              <textarea
                name="setup-instructions"
                aria-label="Special instructions"
                aria-describedby="setup-instructions-help"
                placeholder="Leave this empty unless you have a very specific, unusual requirement."
                value={instructions}
                onChange={(event) => setCartInstructions(event.target.value)}
                rows={3}
                className="border-input placeholder:text-muted-foreground focus-visible:ring-ring mt-3 w-full resize-y rounded-xl border bg-transparent px-3 py-3 text-base focus-visible:ring-2 focus-visible:outline-none sm:text-sm"
              />
            </div>
          </details>
        )}
      </div>

      <aside
        aria-labelledby="summary-heading"
        className="border-foreground/10 rounded-document h-fit border p-6 lg:mt-14"
      >
        <h2 id="summary-heading" className="text-base font-medium">
          Summary
        </h2>
        <dl className="divide-foreground/10 mt-4 divide-y text-sm">
          <div className="flex items-center justify-between gap-4 py-3">
            <dt className="text-muted-foreground">Works with</dt>
            <dd>
              <AgentMarks className="size-4" />
            </dd>
          </div>
          <div className="flex justify-between gap-4 py-3">
            <dt className="text-muted-foreground">ETA</dt>
            <dd className="tabular-nums">{estimate}</dd>
          </div>
        </dl>
        {session !== null || needsConfiguration ? (
          <Button disabled className="mt-4 w-full">
            Start setup
          </Button>
        ) : (
          <Button
            nativeButton={false}
            className="mt-4 w-full"
            render={<SetupLink onClick={() => checkoutCart()} />}
          >
            Start setup
          </Button>
        )}
        <p className="text-muted-foreground mt-3 text-center text-sm">
          {needsConfiguration
            ? "Configure each agent tool before starting setup."
            : session !== null
              ? "Finish the current setup to start another."
              : "Your coding agent handles the setup."}
        </p>
      </aside>
    </div>
  );
}
