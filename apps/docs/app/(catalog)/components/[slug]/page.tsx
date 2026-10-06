import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DemoStage } from "@/components/demo/elements/demo-stage";
import { demoCanvasClass } from "@/components/demo/utils/canvas";
import { DemoCard } from "@/components/pages/elements/demo-card";
import { getElement } from "@/components/pages/elements/registry";
import { AddToCartButton } from "@/components/pages/shop/add-to-cart-button";
import { StartSetupDialog } from "@/components/shared/start-setup-dialog";
import { NavGlyph } from "@/components/shared/nav-glyph";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typePage } from "@/components/shared/type";
import { Step, Steps } from "@/components/ui/steps";
import { CATALOG, formatMinutes, getProduct } from "@/lib/catalog";
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
  const title = `${product.name} | Components`;
  return {
    title,
    description: product.tagline,
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
  const preview = product.preview ? getElement(product.preview) : undefined;
  const bundle = (product.bundle ?? []).flatMap((element) => {
    const entry = getElement(element);
    return entry && entry.slug !== preview?.slug ? [entry] : [];
  });

  return (
    <PageFrame pad="sub">
      <header className="group/navlink">
        <NavGlyph kind={product.glyph} />
        <h1 className={cn("mt-6", typePage)}>{product.name}</h1>
        <p className={cn("mt-4", typeDeck)}>{product.description}</p>
        <p className="text-muted-foreground mt-2 text-sm">
          {product.license}
          {product.oss ? " · Open source" : ""} · For {product.audience}. Agent
          time {formatMinutes(product.agentMinutes)}.
        </p>
        <div className="mt-8">
          {product.purchase === "cart" ? (
            <AddToCartButton
              slug={product.slug}
              name={product.name}
              size="default"
            />
          ) : (
            <StartSetupDialog location="shop_product">
              Start setup
            </StartSetupDialog>
          )}
        </div>
      </header>

      {preview ? (
        <figure className="mt-12">
          <div
            className={cn(
              demoCanvasClass,
              preview.wide ? "h-[520px]" : "h-[360px]",
            )}
          >
            <DemoStage replay={preview.replay !== false}>
              <preview.Component />
            </DemoStage>
          </div>
          <figcaption className="text-muted-foreground mt-2.5 font-mono text-[11px]">
            fig. 01 · {preview.title}, live
          </figcaption>
        </figure>
      ) : null}

      {product.features ? (
        <section
          aria-labelledby="features-heading"
          className="border-foreground/10 mt-14 border-t pt-8"
        >
          <h2 id="features-heading" className="text-sm font-medium">
            Works out of the box
          </h2>
          <ul role="list" className="mt-4 gap-x-10 sm:columns-2">
            {product.features.map((feature) => (
              <li
                key={feature}
                className="text-foreground/90 flex break-inside-avoid gap-2.5 pb-2 text-[0.9375rem] leading-relaxed"
              >
                <span
                  aria-hidden
                  className="bg-foreground/30 mt-[0.65em] size-1 shrink-0 rounded-full"
                />
                {feature}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {bundle.length > 0 ? (
        <section
          aria-labelledby="bundle-heading"
          className="border-foreground/10 mt-14 border-t pt-8"
        >
          <h2 id="bundle-heading" className="text-sm font-medium">
            In the bundle
          </h2>
          <p className="text-muted-foreground mt-3 max-w-[52ch] text-sm leading-relaxed">
            {preview?.title ?? product.name} installs with these elements, each
            as source in your project.
          </p>
          <ul
            role="list"
            className="mt-8 grid gap-x-6 gap-y-12 md:grid-cols-2 xl:grid-cols-3"
          >
            {bundle.map((element, index) => (
              <li
                key={element.slug}
                className={cn(element.wide && "md:col-span-2 xl:col-span-3")}
              >
                <DemoCard
                  href={`/elements/${element.slug}`}
                  {...(element.wide ? { wide: true } : {})}
                  index={index + 2}
                  title={element.title}
                  description={element.description}
                >
                  <element.Component />
                </DemoCard>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section
        aria-labelledby="includes-heading"
        className="border-foreground/10 mt-14 border-t pt-8"
      >
        <h2 id="includes-heading" className="text-sm font-medium">
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

      {product.requires.length > 0 ? (
        <section
          aria-labelledby="requires-heading"
          className="border-foreground/10 mt-14 border-t pt-8"
        >
          <h2 id="requires-heading" className="text-sm font-medium">
            Requires
          </h2>
          <ul role="list" className="mt-4 flex flex-col gap-2">
            {product.requires.map((item) => (
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
      ) : null}

      <section
        aria-labelledby="install-heading"
        className="border-foreground/10 mt-14 border-t pt-8"
      >
        <h2 id="install-heading" className="text-sm font-medium">
          How it installs
        </h2>
        <p className="text-muted-foreground mt-3 max-w-[52ch] text-sm leading-relaxed">
          {product.purchase === "cart"
            ? "Add it to your setup and start from the cart: your coding agent works through these steps."
            : "Start setup and your coding agent works through these steps."}{" "}
          You can also follow them by hand.
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
