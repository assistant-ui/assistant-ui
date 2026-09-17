"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeftIcon,
  BotIcon,
  CheckIcon,
  CopyIcon,
  LinkIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NavGlyph } from "@/components/shared/nav-glyph";
import { typeDeck, typeEyebrow, typePage } from "@/components/shared/type";
import { CATALOG, resolveProducts } from "@/lib/catalog";
import {
  buildInstallPrompt,
  cartUrl,
  parseCartItems,
} from "@/lib/catalog/install-prompt";
import { removeFromCart, replaceCart, useCart } from "@/lib/catalog/cart-store";
import { useHydrated } from "@/hooks/use-hydrated";
import { analytics } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { ProductMeta } from "./product-meta";

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(null), 1800);
    return () => clearTimeout(id);
  }, [copied]);
  return {
    copied,
    copy: async (id: string, text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(id);
      } catch {
        toast.error("Could not copy to the clipboard");
      }
    },
  };
}

export function Checkout() {
  const hydrated = useHydrated();
  const params = useSearchParams();
  const linkedItems = params.get("items");
  const slugs = useCart();
  const products = resolveProducts(slugs);
  const { copied, copy } = useCopy();

  // A shared link restores the cart it describes, then the cart owns the state
  // so removing an item here does not resurrect it on the next render.
  useEffect(() => {
    const linked = parseCartItems(linkedItems);
    if (linked.length > 0) replaceCart(linked);
  }, [linkedItems]);

  const prompt = buildInstallPrompt(products);
  const shareUrl = cartUrl(slugs, { absolute: true });
  const markdownUrl = cartUrl(slugs, { markdown: true, absolute: true });

  if (hydrated && products.length === 0) {
    return (
      <div className="max-w-xl">
        <p className={typeEyebrow}>Cart</p>
        <h1 className={cn("mt-4", typePage)}>Nothing here yet.</h1>
        <p className={cn("mt-4", typeDeck)}>
          Add a product from the catalog and the install instructions for
          everything in your cart will appear here, ready for a coding agent.
        </p>
        <Button
          nativeButton={false}
          className="mt-8"
          render={<Link href="/catalog" />}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Browse the catalog
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
      <div>
        <p className={typeEyebrow}>
          <Link
            href="/catalog"
            className="hover:text-foreground transition-colors"
          >
            Catalog
          </Link>
          {" · Cart"}
        </p>
        <h1 className={cn("mt-4", typePage)}>Ready to install.</h1>
        <p className={cn("mt-4", typeDeck)}>
          Everything here is free. Hand the prompt to your coding agent, or
          follow the steps on each product page.
        </p>

        <ul role="list" className="divide-foreground/10 mt-10 divide-y">
          {products.map((product, index) => (
            <li
              key={product.slug}
              className="group/navlink flex items-start gap-4 py-4 first:pt-0"
            >
              <NavGlyph kind={product.glyph} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2.5">
                  <span className="text-muted-foreground font-mono text-[0.6875rem] tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <Link
                    href={`/catalog/${product.slug}`}
                    className="text-[0.9375rem] font-medium underline-offset-4 hover:underline"
                  >
                    {product.name}
                  </Link>
                </div>
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                  {product.tagline}
                </p>
                <div className="mt-2">
                  <ProductMeta product={product} />
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeFromCart(product.slug)}
                aria-label={`Remove ${product.name}`}
                className="text-muted-foreground hover:text-foreground hover:bg-muted relative grid size-7 shrink-0 place-items-center rounded-md"
              >
                <XIcon className="size-4" />
                <span
                  aria-hidden
                  className="absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2 pointer-fine:hidden"
                />
              </button>
            </li>
          ))}
        </ul>

        {products.length < CATALOG.length ? (
          <Link
            href="/catalog"
            className="text-muted-foreground hover:text-foreground mt-6 inline-flex items-center gap-1.5 text-sm transition-colors"
          >
            <ArrowLeftIcon className="size-3.5" />
            Add more from the catalog
          </Link>
        ) : null}
      </div>

      <section aria-labelledby="install-prompt-heading" className="min-w-0">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className={typeEyebrow}>For your coding agent</p>
            <h2
              id="install-prompt-heading"
              className="mt-2 text-lg font-medium tracking-tight"
            >
              Install prompt
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                analytics.catalog.checkoutCopied(slugs.join(","), "url");
                void copy("url", shareUrl);
              }}
            >
              {copied === "url" ? (
                <CheckIcon
                  data-icon="inline-start"
                  className="text-emerald-500"
                />
              ) : (
                <LinkIcon data-icon="inline-start" />
              )}
              {copied === "url" ? "Copied" : "Copy link"}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                analytics.catalog.checkoutCopied(slugs.join(","), "prompt");
                void copy("prompt", prompt);
              }}
            >
              {copied === "prompt" ? (
                <CheckIcon data-icon="inline-start" />
              ) : (
                <BotIcon data-icon="inline-start" />
              )}
              {copied === "prompt" ? "Copied" : "Copy prompt"}
            </Button>
          </div>
        </div>

        <div className="border-foreground/10 bg-foreground/[0.025] dark:bg-foreground/[0.04] group/code relative mt-4 overflow-hidden rounded-sm border">
          <button
            type="button"
            aria-label="Copy prompt"
            onClick={() => void copy("prompt", prompt)}
            className="bg-background/80 text-muted-foreground hover:text-foreground absolute top-2 right-2 z-10 grid size-7 place-items-center rounded-md opacity-0 backdrop-blur-sm transition-opacity group-hover/code:opacity-100 focus-visible:opacity-100 [@media(pointer:coarse)]:opacity-100"
          >
            {copied === "prompt" ? (
              <CheckIcon className="size-3.5 text-emerald-500" />
            ) : (
              <CopyIcon className="size-3.5" />
            )}
          </button>
          <pre className="max-h-[32rem] overflow-auto p-4 font-mono text-[0.8125rem] leading-relaxed whitespace-pre-wrap">
            {prompt}
          </pre>
        </div>

        <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
          Agents can also fetch this cart as markdown at{" "}
          <a
            href={markdownUrl}
            className="text-foreground font-mono text-[0.8125rem] underline-offset-4 hover:underline"
          >
            {markdownUrl.replace(/^https:\/\/www\./, "")}
          </a>
          .
        </p>
      </section>
    </div>
  );
}
