import type { Metadata } from "next";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typePage } from "@/components/shared/type";
import { createOgMetadata } from "@/lib/og";
import { LIBRARY_TOTAL } from "./library-data";
import { LibraryCards } from "./library-cards";

const title = "Library";
const description =
  "Components, starters, skills, and editor setups for assistant-ui projects.";

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

export default function LibraryPage(): React.ReactElement {
  return (
    <PageFrame pad="sub">
      <div className="mb-12 flex flex-col gap-3">
        <h1 className={typePage}>Everything you can add to a project.</h1>
        <p className={typeDeck}>
          {LIBRARY_TOTAL} components, starters, skills, and editor setups, each
          installed with one command.
        </p>
      </div>
      <LibraryCards />
    </PageFrame>
  );
}
