import Link from "next/link";
import { CopyCommandButton } from "@/components/home/copy-command-button";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typePage } from "@/components/shared/type";
import { cn } from "@/lib/utils";
import { TerminalDemo } from "./terminal-demo";

const ANALYTICS_PAGE = "ink" as const;

const FEATURES = [
  {
    title: "Built for Ink",
    description:
      "React components, ANSI color, and terminal layout. Same component model as the web SDK.",
  },
  {
    title: "ANSI markdown",
    description:
      "Headings, tables, links, and syntax-highlighted code via @assistant-ui/react-ink-markdown.",
  },
  {
    title: "Shared runtime",
    description:
      "The same engine as the web and React Native SDKs. Tools and adapters carry over.",
  },
  {
    title: "Terminal primitives",
    description:
      "Composable, unstyled Thread, Composer, and Message primitives, plus terminal-native tool UI.",
  },
] as const;

export default function InkPage() {
  return (
    <PageFrame pad="sub" className="flex flex-col gap-20 md:gap-28">
      <header className="max-w-2xl">
        <h1 className={typePage}>Ink</h1>
        <p className={cn(typeDeck, "mt-4 max-w-[52ch]")}>
          Terminal Thread, Composer, and Message primitives. Same runtime as the
          web SDK. ANSI markdown.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
          <CopyCommandButton
            command="npx assistant-ui@latest create --ink my-app"
            analyticsContext={{ page: ANALYTICS_PAGE, section: "hero" }}
          />
          <Link
            href="/docs/ink"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            Read the docs
          </Link>
        </div>
      </header>

      <TerminalDemo />

      <dl className="grid gap-x-16 gap-y-10 sm:grid-cols-2">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="flex flex-col gap-1.5">
            <dt className="text-[15px] font-medium">{feature.title}</dt>
            <dd className="text-muted-foreground text-sm leading-relaxed text-pretty">
              {feature.description}
            </dd>
          </div>
        ))}
      </dl>

      <footer>
        <Link
          href="/docs/ink/migration"
          className="text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          Migration from web
        </Link>
      </footer>
    </PageFrame>
  );
}
