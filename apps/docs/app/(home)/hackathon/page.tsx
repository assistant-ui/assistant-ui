import type { Metadata } from "next";
import Link from "next/link";
import { PageFrame } from "@/components/shared/page-frame";
import { typePage, typeSection } from "@/components/shared/type";
import {
  SPONSOR_PRODUCTS,
  sponsorAssistantUi,
} from "@/lib/catalog/products/sponsors";
import { createOgMetadata } from "@/lib/og";
import { SetupButton } from "./setup-button";

const title = "Hackathon sponsors";
const description =
  "Every product from the Build Personal Agents Hack sponsors, in one place.";

export const metadata: Metadata = {
  title,
  description,
  robots: { index: false, follow: true },
  ...createOgMetadata(title, description),
};

const products = [sponsorAssistantUi, ...SPONSOR_PRODUCTS];

export default function HackathonResourcesPage() {
  return (
    <PageFrame pad="sub" className="antialiased">
      <h1 className={typePage}>{title}.</h1>
      <div className="border-foreground/10 divide-foreground/10 mt-12 divide-y border-y">
        {products.map((product) => (
          <section
            key={product.slug}
            className="grid gap-5 py-8 sm:grid-cols-2"
          >
            <div className="flex flex-col gap-2">
              <h2 className={typeSection}>
                <Link
                  href={product.href}
                  className="underline-offset-4 hover:underline"
                >
                  {product.name}
                </Link>
              </h2>
              <p className="text-muted-foreground">{product.tagline}</p>
            </div>
            <div className="flex flex-wrap items-center gap-6 sm:justify-end sm:pr-6">
              <SetupButton slug={product.slug} />
            </div>
          </section>
        ))}
      </div>
    </PageFrame>
  );
}
