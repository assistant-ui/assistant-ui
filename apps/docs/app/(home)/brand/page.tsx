import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageCopy, PageFrame } from "@/components/shared/page-frame";

export const metadata: Metadata = {
  title: "Brand Guidelines — assistant-ui",
  description: "Guidelines for using the assistant-ui brand assets.",
};

export default function BrandPage() {
  return (
    <PageFrame pad="sub">
      <PageCopy className="max-w-2xl">
        <h1 className="text-3xl font-medium tracking-tight text-balance">
          Brand Guidelines
        </h1>

        <section className="mt-10">
          <h2 className="text-xl font-medium tracking-tight">Usage</h2>
          <p className="text-muted-foreground mt-3 leading-relaxed">
            You are free to use the assistant-ui logo and brand assets to
            reference assistant-ui in your projects, blog posts, talks, and
            social media. Please follow these guidelines:
          </p>
          <ul className="text-muted-foreground mt-4 list-disc space-y-2 pl-6 leading-relaxed">
            <li>Use the original, unmodified logo files from the brand kit.</li>
            <li>
              Do not alter the colors, proportions, or orientation of the logo.
            </li>
            <li>
              Maintain sufficient spacing around the logo — avoid crowding it
              with other elements.
            </li>
            <li>
              Do not use the assistant-ui logo to imply endorsement or
              affiliation without permission.
            </li>
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-medium tracking-tight">Attribution</h2>
          <p className="text-muted-foreground mt-3 leading-relaxed">
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
          <Button
            nativeButton={false}
            render={<a href="/assistant-ui-brand.zip" download />}
          >
            Download brand assets
          </Button>
        </section>
      </PageCopy>
    </PageFrame>
  );
}
