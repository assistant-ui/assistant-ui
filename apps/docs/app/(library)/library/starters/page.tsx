import type { Metadata } from "next";
import Link from "next/link";
import { CopyButton } from "@/components/shared/copy-button";
import { NewTabCue } from "@/components/shared/new-tab-cue";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typePage, typeSection } from "@/components/shared/type";
import { createOgMetadata } from "@/lib/og";
import {
  EXAMPLES,
  TEMPLATES,
  starterCommand,
  starterSourceHref,
  type Starter,
} from "./starters-data";

const title = "Starters";
const description =
  "Templates and example apps that the assistant-ui CLI creates as a new project.";

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

const SECTIONS = [
  {
    id: "templates",
    title: "Templates",
    description: "Complete apps to build on.",
    starters: TEMPLATES,
  },
  {
    id: "examples",
    title: "Examples",
    description: "Apps that each show one integration or feature.",
    starters: EXAMPLES,
  },
];

function StarterItem({ starter }: { starter: Starter }) {
  const command = starterCommand(starter);
  return (
    <li className="rounded-document hover:bg-foreground/[0.025] -mx-3 flex flex-col gap-3 px-3 py-4 transition-colors">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-medium">{starter.label}</h3>
        <a
          href={starterSourceHref(starter)}
          target="_blank"
          rel="noreferrer"
          className="text-muted-foreground hover:text-foreground inline-flex shrink-0 items-center gap-0.5 text-sm transition-colors [&_svg]:size-3.5"
        >
          View source
          <NewTabCue />
        </a>
      </div>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {starter.description}
      </p>
      <div className="rounded-document bg-foreground/[0.025] dark:bg-foreground/[0.04] flex items-center gap-2 py-1 pr-1 pl-3">
        <span className="min-w-0 flex-1 overflow-x-auto font-mono text-xs whitespace-nowrap [font-variant-ligatures:none]">
          {command}
        </span>
        <CopyButton text={command} label="Copy command" />
      </div>
    </li>
  );
}

export default function StartersPage(): React.ReactElement {
  return (
    <PageFrame pad="sub">
      <div className="mb-12 flex flex-col gap-3">
        <nav aria-label="Breadcrumb" className="text-sm">
          <Link
            href="/library"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Library
          </Link>
        </nav>
        <h1 className={typePage}>Start from a working app.</h1>
        <p className={typeDeck}>
          {TEMPLATES.length} templates and {EXAMPLES.length} example apps, each
          created with one command.
        </p>
      </div>
      <div className="flex flex-col">
        {SECTIONS.map((section, index) => (
          <section
            key={section.id}
            aria-labelledby={section.id}
            className={index > 0 ? "border-t pt-12" : "pb-12"}
          >
            <div className="mb-6 flex flex-col gap-2">
              <h2 id={section.id} className={typeSection}>
                {section.title}
              </h2>
              <p className={typeDeck}>{section.description}</p>
            </div>
            <ul className="grid grid-cols-1 gap-x-8 gap-y-2 md:grid-cols-2">
              {section.starters.map((starter) => (
                <StarterItem key={starter.name} starter={starter} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </PageFrame>
  );
}
