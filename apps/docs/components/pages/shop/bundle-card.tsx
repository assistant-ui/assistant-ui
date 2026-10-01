import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { typeSection } from "@/components/shared/type";
import { bundleHref, type ExampleBundle } from "@/lib/example-bundles";
import { BundlePreview } from "./bundle-preview";

export function BundleCard({
  example,
  index,
}: {
  example: ExampleBundle;
  index: number;
}) {
  return (
    <article className="min-w-0">
      <BundlePreview slug={example.slug} title={example.title} compact />
      <div className="mt-5 flex items-baseline gap-3">
        <span className="text-muted-foreground font-mono text-xs">
          {String(index).padStart(2, "0")}
        </span>
        <h2 className={typeSection}>
          <Link
            href={bundleHref(example.slug)}
            className="underline-offset-4 hover:underline"
          >
            {example.title}
          </Link>
        </h2>
      </div>
      <p className="text-muted-foreground mt-3 max-w-[48ch] text-sm leading-relaxed">
        {example.summary}
      </p>
      <Link
        href={bundleHref(example.slug)}
        className="group mt-5 inline-flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline"
      >
        Explore this bundle
        <ArrowRight
          aria-hidden
          className="size-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
        />
      </Link>
    </article>
  );
}
