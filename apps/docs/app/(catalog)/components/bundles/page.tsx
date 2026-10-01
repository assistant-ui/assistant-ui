import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BundleCard } from "@/components/pages/shop/bundle-card";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typePage } from "@/components/shared/type";
import { EXAMPLE_BUNDLES } from "@/lib/example-bundles";
import { createOgMetadata } from "@/lib/og";
import { cn } from "@/lib/utils";

const title = "Pre-made bundles";
const description =
  "Complete assistant-ui examples, with interactive previews, source, and the components behind them.";
export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

export default function BundlesPage() {
  return (
    <PageFrame pad="sub">
      <Link
        href="/components"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeft aria-hidden className="size-3.5" />
        Components
      </Link>
      <header className="mt-8">
        <h1 className={typePage}>Start with a complete example.</h1>
        <p className={cn(typeDeck, "mt-4 max-w-[56ch]")}>
          Choose a working UI, try it, and see how its components fit together.
          Every bundle includes source you can adapt.
        </p>
        <p className="text-muted-foreground mt-4 text-sm">
          Previews run locally with scripted responses. Connect your own model
          backend for live AI.
        </p>
      </header>
      <div className="border-foreground/10 mt-12 grid gap-x-10 gap-y-14 border-t pt-10 md:grid-cols-2">
        {EXAMPLE_BUNDLES.map((example, index) => (
          <BundleCard key={example.slug} example={example} index={index + 1} />
        ))}
      </div>
      <footer className="border-foreground/10 mt-16 border-t pt-8">
        <Link
          href="/components"
          className="text-sm font-medium underline-offset-4 hover:underline"
        >
          Choose individual components
        </Link>
      </footer>
    </PageFrame>
  );
}
