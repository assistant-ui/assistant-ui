import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRightIcon } from "lucide-react";
import { AddToCartButton } from "@/components/pages/catalog/add-to-cart-button";
import { ProductMeta } from "@/components/pages/catalog/product-meta";
import { NavGlyph } from "@/components/shared/nav-glyph";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typeEyebrow, typePage } from "@/components/shared/type";
import { Button } from "@/components/ui/button";
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

function List({ heading, items }: { heading: string; items: string[] }) {
  return (
    <div>
      <h2 className={typeEyebrow}>{heading}</h2>
      <ul role="list" className="mt-3 flex flex-col gap-2">
        {items.map((item) => (
          <li
            key={item}
            className="text-foreground/90 flex gap-2.5 text-sm leading-relaxed"
          >
            <span
              aria-hidden
              className="bg-foreground/30 mt-[0.6em] size-1 shrink-0 rounded-full"
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
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
    <PageFrame pad="sub">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <header className="group/navlink">
          <p className={typeEyebrow}>
            <Link
              href="/catalog"
              className="hover:text-foreground transition-colors"
            >
              Catalog
            </Link>
          </p>
          <div className="mt-6">
            <NavGlyph kind={product.glyph} size="lg" />
          </div>
          <h1 className={cn("mt-6", typePage)}>{product.name}</h1>
          <div className="mt-3">
            <ProductMeta product={product} />
          </div>
          <p className={cn("mt-5", typeDeck)}>{product.description}</p>
          <p className="text-muted-foreground mt-3 text-sm">
            For {product.audience}.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <AddToCartButton
              slug={product.slug}
              name={product.name}
              size="default"
            />
            <Button
              variant="ghost"
              nativeButton={false}
              render={<Link href={product.docs} />}
            >
              Read the docs
              <ArrowUpRightIcon data-icon="inline-end" />
            </Button>
          </div>

          <dl className="border-foreground/10 mt-10 grid grid-cols-2 gap-x-6 gap-y-5 border-t pt-6 text-sm">
            <div>
              <dt className={typeEyebrow}>Price</dt>
              <dd className="mt-1.5">Free</dd>
            </div>
            <div>
              <dt className={typeEyebrow}>License</dt>
              <dd className="mt-1.5">{product.license}</dd>
            </div>
            <div className="col-span-2">
              <dt className={typeEyebrow}>Packages</dt>
              <dd className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[0.8125rem]">
                {product.packages.map((pkg) => (
                  <span key={pkg}>{pkg}</span>
                ))}
              </dd>
            </div>
            {product.repo ? (
              <div className="col-span-2">
                <dt className={typeEyebrow}>Source</dt>
                <dd className="mt-1.5">
                  <a
                    href={product.repo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                  >
                    GitHub
                    <ArrowUpRightIcon className="size-3.5 opacity-50" />
                  </a>
                </dd>
              </div>
            ) : null}
          </dl>
        </header>

        <div className="flex min-w-0 flex-col gap-12">
          <div className="grid gap-10 sm:grid-cols-2">
            <List heading="What you get" items={product.includes} />
            <List heading="Requires" items={product.requires} />
          </div>

          <section aria-labelledby="install-heading">
            <h2 id="install-heading" className={typeEyebrow}>
              Install by hand
            </h2>
            <Steps className="mt-5">
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

          <section aria-labelledby="agent-heading">
            <h2 id="agent-heading" className={typeEyebrow}>
              What the agent prompt says
            </h2>
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
              Adding this product to your cart adds these instructions to the
              generated install prompt.
            </p>
            <pre className="border-foreground/10 bg-foreground/[0.025] dark:bg-foreground/[0.04] mt-4 max-h-96 overflow-auto rounded-sm border p-4 font-mono text-[0.8125rem] leading-relaxed whitespace-pre-wrap">
              {product.agent}
            </pre>
          </section>
        </div>
      </div>
    </PageFrame>
  );
}
