import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import type { ReactNode } from "react";
import { WaterfallSample } from "@/components/pages/docs/samples/o11y/waterfall.lazy";
import { CopyInstall } from "@/components/pages/utilities/copy-install";
import { HeatGraphPreview } from "@/components/pages/utilities/heat-graph-preview";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typePage } from "@/components/shared/type";
import { highlightElementSource } from "@/lib/element-source";
import { installCommand } from "@/lib/library/catalog";
import { getLibraryItems } from "@/lib/library/items";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Utilities",
  description:
    "Seven packages from the assistant-ui repo for the parts around a chat: loading states, activity graphs, run traces, sandboxed HTML, streamed widgets, design review, and runtime inspection.",
};

/** Abridged from each package's README. */
const SNIPPETS = {
  "generative-frame": `import { Widget, useThemeTokens } from "generative-frame/react";

function ToolCall({ args, status }) {
  const tokens = useThemeTokens();
  return (
    <Widget
      code={args.widget_code ?? ""}
      streaming={status.type === "running"}
      tokens={tokens}
    />
  );
}`,
  variants: `import { Variant, Variants } from "@assistant-ui/variants";

<Variants id="pricing" label="Feature list" default="cards">
  <Variant id="grid" label="Three-column grid">
    <FeatureGrid />
  </Variant>
  <Variant id="cards" label="Field cards">
    <FeatureCards />
  </Variant>
</Variants>;`,
  devtools: `import { DevToolsModal } from "@assistant-ui/react-devtools";

export function App() {
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <DevToolsModal />
      {/* ...your assistant-ui... */}
    </AssistantRuntimeProvider>
  );
}`,
} as const;

/** Each frame's origin, as the safe-content-frame page draws them. */
const FRAME_HOSTS = [
  "k3f9…-h184756.scf.auiusercontent.com",
  "0qzm…-h184756.scf.auiusercontent.com",
  "x81d…-h184756.scf.auiusercontent.com",
];

type Utility = {
  /** The library item this tile installs. */
  id: string;
  title: string;
  description: string;
  href: string;
  /** Spans two columns from `md`, for a preview that needs the room. */
  wide?: boolean;
  /** Spans two columns at `md` only, so the last row of the two-column grid is full. */
  closesMd?: boolean;
  /** Pins a tall preview (code, a trace) to the top of its stage instead of centering it. */
  top?: boolean;
};

const UTILITIES: readonly Utility[] = [
  {
    id: "utilities/heat-graph",
    title: "A year, cell by cell.",
    description:
      "GitHub-style activity heatmaps for React. Headless, Radix-style, and composable.",
    href: "/heat-graph",
    wide: true,
  },
  {
    id: "utilities/tw-shimmer",
    title: "Loading, pure CSS.",
    description:
      "Zero-dependency shimmer for Tailwind CSS v4, for text and skeletons.",
    href: "/tw-shimmer",
  },
  {
    id: "utilities/safe-content-frame",
    title: "Sandboxes for HTML.",
    description:
      "Every render gets its own iframe and origin, away from your app's DOM, cookies, and storage.",
    href: "/safe-content-frame",
  },
  {
    id: "utilities/react-o11y",
    title: "The anatomy of a run.",
    description:
      "Headless primitives for agent traces, sub-agent trees, and run timelines.",
    href: "/react-o11y",
    wide: true,
    top: true,
  },
  {
    id: "utilities/generative-frame",
    title: "Widgets that stream from the model.",
    description:
      "Model-written HTML and SVG, rendered while it streams, in your app's theme.",
    href: "/generative-frame",
    top: true,
  },
  {
    id: "utilities/variants",
    title: "Pick designs in your app.",
    description:
      "Your coding agent adds design options to the running page. Keep the one you like.",
    href: "/variants",
    top: true,
  },
  {
    id: "utilities/devtools",
    title: "See inside the runtime.",
    description: "Inspect runtime state, context, and events in the browser.",
    href: "/docs/devtools",
    closesMd: true,
    top: true,
  },
];

function Code({ html }: { html: string }) {
  return (
    <div
      className="[mask-image:linear-gradient(to_bottom,#000_65%,transparent),linear-gradient(to_right,#000_85%,transparent)] [mask-composite:intersect] text-[12.5px] leading-relaxed [&_code]:[font-variant-ligatures:none] [&_pre]:m-0 [&_pre]:bg-transparent! [&_pre]:font-mono [&_pre]:whitespace-pre"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function ShimmerPreview() {
  return (
    <div className="shimmer-container mx-auto flex w-full max-w-xs flex-col gap-5">
      <div className="shimmer shimmer-bg bg-muted h-8 w-36 self-end rounded-[16px] [--shimmer-x:200] [--shimmer-y:0]" />
      <div className="flex flex-col gap-2.5">
        <div className="shimmer shimmer-bg bg-muted h-3.5 w-full rounded [--shimmer-x:0] [--shimmer-y:44]" />
        <div className="shimmer shimmer-bg bg-muted h-3.5 w-11/12 rounded [--shimmer-x:0] [--shimmer-y:66]" />
        <div className="shimmer shimmer-bg bg-muted h-3.5 w-3/5 rounded [--shimmer-x:0] [--shimmer-y:88]" />
      </div>
      <p className="shimmer text-foreground/45 text-sm">Thinking</p>
    </div>
  );
}

function FramesPreview() {
  return (
    <ul className="mx-auto flex w-full max-w-sm flex-col gap-2.5">
      {FRAME_HOSTS.map((host, index) => (
        <li
          key={host}
          className="border-foreground/25 rounded-document flex items-center justify-between gap-3 border border-dashed px-3.5 py-3"
        >
          <span className="truncate font-mono text-xs [font-variant-ligatures:none]">
            {host}
          </span>
          <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
            frame {index + 1}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Tile({
  utility,
  package: packageName,
  install,
  preview,
}: {
  utility: Utility;
  package: string;
  install: string;
  preview: ReactNode;
}) {
  return (
    <li
      className={cn(
        "border-foreground/10 flex min-w-0 flex-col border-r border-b",
        utility.wide && "md:col-span-2",
        utility.closesMd && "md:col-span-2 lg:col-span-1",
      )}
    >
      <div
        className={cn(
          "flex h-64 overflow-hidden px-5 pt-8 sm:px-8",
          utility.top ? "items-start" : "items-center",
        )}
      >
        <div className="min-w-0 flex-1">{preview}</div>
      </div>
      <div className="flex flex-col items-start px-5 pt-5 pb-7 sm:px-8 sm:pb-9">
        <CopyInstall packageName={packageName} command={install} />
        <h2 className="mt-2 text-lg leading-snug font-medium text-balance">
          <Link
            href={utility.href}
            className="group/link focus-visible:ring-ring rounded-sm outline-none focus-visible:ring-2"
          >
            {utility.title}
            <ArrowRightIcon
              aria-hidden
              className="text-muted-foreground group-hover/link:text-foreground ms-1.5 inline size-4 align-[-0.125em] transition-transform group-hover/link:translate-x-0.5 motion-reduce:transition-none"
            />
          </Link>
        </h2>
        <p className="text-muted-foreground mt-1.5 max-w-[48ch] text-sm leading-relaxed text-pretty">
          {utility.description}
        </p>
      </div>
    </li>
  );
}

export default async function UtilitiesPage() {
  const items = new Map(getLibraryItems().map((item) => [item.id, item]));
  const code = {
    "utilities/generative-frame": await highlightElementSource(
      SNIPPETS["generative-frame"],
    ),
    "utilities/variants": await highlightElementSource(SNIPPETS.variants),
    "utilities/devtools": await highlightElementSource(SNIPPETS.devtools),
  };
  const previews: Record<string, ReactNode> = {
    "utilities/heat-graph": <HeatGraphPreview />,
    "utilities/tw-shimmer": <ShimmerPreview />,
    "utilities/safe-content-frame": <FramesPreview />,
    "utilities/react-o11y": (
      <div className="h-56 overflow-hidden [mask-image:linear-gradient(to_bottom,#000_80%,transparent)]">
        <WaterfallSample />
      </div>
    ),
    ...Object.fromEntries(
      Object.entries(code).map(([id, html]) => [
        id,
        <Code key={id} html={html} />,
      ]),
    ),
  };

  return (
    <PageFrame pad="sub">
      <header className="max-w-3xl">
        <h1 className={typePage}>
          Small packages for the parts around a chat.
        </h1>
        <p className={cn(typeDeck, "mt-4 max-w-[54ch]")}>
          Loading states, activity graphs, run traces, sandboxed HTML, streamed
          widgets, design review, and runtime inspection. Each one installs on
          its own and has its own page.
        </p>
      </header>

      <ul
        aria-label="Utilities"
        className="border-foreground/10 mt-12 grid border-t border-l md:mt-16 md:grid-cols-2 lg:grid-cols-3"
      >
        {UTILITIES.map((utility) => {
          const item = items.get(utility.id);
          if (!item?.install) return null;
          const packageName =
            item.install.kind === "command"
              ? item.name
              : item.install.names[0]!;
          return (
            <Tile
              key={utility.id}
              utility={utility}
              package={packageName}
              install={installCommand(item.install)}
              preview={previews[utility.id]}
            />
          );
        })}
      </ul>
    </PageFrame>
  );
}
