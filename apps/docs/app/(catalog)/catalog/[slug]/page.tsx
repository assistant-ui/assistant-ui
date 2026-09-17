import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/pages/catalog/add-to-cart-button";
import { NavGlyph } from "@/components/shared/nav-glyph";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typeEyebrow, typePage } from "@/components/shared/type";
import { Step, Steps } from "@/components/ui/steps";
import { CATALOG, getProduct } from "@/lib/catalog";
import { createOgMetadata } from "@/lib/og";
import { cn } from "@/lib/utils";

export function generateStaticParams() {
  return CATALOG.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return {};
  const title = `${product.name} | Catalog`;
  return {
    title,
    description: product.tagline,
    robots: { index: false, follow: true },
    ...createOgMetadata(product.name, product.tagline),
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  return (
    <PageFrame pad="sub" className="max-w-3xl">
      <header className="group/navlink">
        <NavGlyph kind={product.glyph} />
        <h1 className={cn("mt-6", typePage)}>{product.name}</h1>
        <p className={cn("mt-4", typeDeck)}>{product.description}</p>
        <p className="text-muted-foreground mt-2 text-sm">
          {product.license}
          {product.oss ? " · Open source" : ""} · For {product.audience}.
        </p>
        <p className="mt-8 text-2xl font-medium tracking-tight tabular-nums">
          $0.00
        </p>
        <div className="mt-4">
          <AddToCartButton
            slug={product.slug}
            name={product.name}
            size="default"
          />
        </div>
      </header>

      <section
        aria-labelledby="includes-heading"
        className="border-foreground/10 mt-14 border-t pt-8"
      >
        <h2 id="includes-heading" className={typeEyebrow}>
          What you get
        </h2>
        <ul role="list" className="mt-4 flex flex-col gap-2">
          {product.includes.map((item) => (
            <li
              key={item}
              className="text-foreground/90 flex gap-2.5 text-[0.9375rem] leading-relaxed"
            >
              <span
                aria-hidden
                className="bg-foreground/30 mt-[0.65em] size-1 shrink-0 rounded-full"
              />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="install-heading"
        className="border-foreground/10 mt-14 border-t pt-8"
      >
        <h2 id="install-heading" className={typeEyebrow}>
          How it installs
        </h2>
        <p className="text-muted-foreground mt-3 max-w-[52ch] text-sm leading-relaxed">
          Add it to your cart and the prompt on the cart page walks a coding
          agent through these steps. You can also follow them by hand.
        </p>
        <Steps className="mt-6">
          {product.steps.map((step) => (
            <Step key={step.title}>
              <h3 className="text-base font-medium">{step.title}</h3>
              <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed text-pretty">
                {step.detail}
              </p>
              {step.command ? (
                <pre className="border-foreground/10 bg-foreground/[0.025] dark:bg-foreground/[0.04] mt-3 overflow-x-auto rounded-sm border px-3.5 py-2.5 font-mono text-[0.8125rem]">
                  {step.command}
                </pre>
              ) : null}
            </Step>
          ))}
        </Steps>
      </section>
    </PageFrame>
  );
}
