import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Brand Guidelines — assistant-ui",
  description: "Guidelines for using the assistant-ui brand assets.",
};

export default function BrandPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20">
      <h1 className="font-bold text-4xl tracking-tight">Brand Guidelines</h1>

      <section className="mt-10">
        <h2 className="font-semibold text-xl">Usage</h2>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          You are free to use the assistant-ui logo and brand assets to
          reference assistant-ui in your projects, blog posts, talks, and social
          media. Please follow these guidelines:
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground leading-relaxed">
          <li>Use the original, unmodified logo files from the brand kit.</li>
          <li>
            Do not alter the colors, proportions, or orientation of the logo.
          </li>
          <li>
            Maintain sufficient spacing around the logo — avoid crowding it with
            other elements.
          </li>
          <li>
            Do not use the assistant-ui logo to imply endorsement or affiliation
            without permission.
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-semibold text-xl">Attribution</h2>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          The assistant-ui logo is based on the{" "}
          <Link
            href="https://lucide.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline underline-offset-4"
          >
            Lucide
          </Link>{" "}
          icon set, licensed under the{" "}
          <Link
            href="https://github.com/lucide-icons/lucide/blob/main/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline underline-offset-4"
          >
            ISC License
          </Link>
          .
        </p>
      </section>

      <section className="mt-10">
        <a
          href="/assistant-ui-brand.zip"
          download
          className="inline-flex items-center rounded-lg bg-foreground px-5 py-2.5 font-medium text-background text-sm transition-opacity hover:opacity-90"
        >
          Download brand assets
        </a>
      </section>
    </div>
  );
}
