import type { Metadata } from "next";
import Link from "next/link";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typePage } from "@/components/shared/type";
import { createOgMetadata } from "@/lib/og";
import { StartersBrowser } from "@/components/pages/library/starters-browser";
import { StartersHeroActions } from "@/components/pages/library/starters-hero-actions";
import { EXAMPLES, TEMPLATES } from "@/lib/library/starters-data";

const title = "Starters";
const description =
  "Templates and example apps that the assistant-ui CLI creates as a new project.";

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

export default function StartersPage(): React.ReactElement {
  return (
    <PageFrame pad="sub">
      <div className="mb-8 flex flex-col gap-3">
        <nav aria-label="Breadcrumb" className="text-sm">
          <Link
            href="/library"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Library
          </Link>
        </nav>
        <h1 className={typePage}>Starters</h1>
        <p className={typeDeck}>
          {TEMPLATES.length} templates and {EXAMPLES.length} example apps, each
          created with one command.
        </p>
        <StartersHeroActions />
      </div>
      <StartersBrowser />
    </PageFrame>
  );
}
