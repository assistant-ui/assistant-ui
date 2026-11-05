import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typePage, typeSection } from "@/components/shared/type";
import { cn } from "@/lib/utils";
import {
  BookingDemo,
  StarsDemo,
} from "@/components/pages/docs/samples/remote-components/demos";
import { Code } from "@/components/pages/docs/samples/remote-components/remote-source";

const STEP_COMPONENT = `type Props = {
  value?: number;
  onRate: (n: number) => Promise<void>;
};

export default function Rating({
  value = 0,
  onRate,
}: Props) {
  return (
    <div className="stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} onClick={() => onRate(n)}>
          {n <= value ? "★" : "☆"}
        </button>
      ))}
    </div>
  );
}`;

const STEP_CONFIG = `import react from "@vitejs/plugin-react";
import {
  remoteComponents,
} from "@assistant-ui/remote-components-vite";

export default {
  plugins: [
    react(),
    remoteComponents({
      components: "src/remotes",
      singleFile: { plugins: [react()] },
    }),
  ],
};`;

const STEP_OUTPUT = `$ vite build
dist/rating/single.html`;

const STEP_HOST = `import { useState } from "react";
import {
  RemoteComponent,
} from "@assistant-ui/remote-components-host-react";
import rating from
  "widgets/dist/rating/single.html?raw";

export function Review() {
  const [stars, setStars] = useState(3);
  return (
    <RemoteComponent
      html={rating}
      value={stars}
      onRate={async (n) => setStars(n)}
    />
  );
}`;

const STEPS = [
  {
    title: "Export a component",
    body: "A React component, default export. Props come from the host.",
    blocks: [
      { file: "src/remotes/rating.tsx", code: STEP_COMPONENT, lang: "tsx" },
    ],
  },
  {
    title: "Build it to one file",
    body: "The Vite plugin inlines React, your code, CSS and the runtime.",
    blocks: [
      { file: "vite.config.ts", code: STEP_CONFIG, lang: "ts" },
      { file: "terminal", code: STEP_OUTPUT, lang: "txt" },
    ],
  },
  {
    title: "Import it in another app",
    body: "Pass the file to RemoteComponent. Callbacks are async functions.",
    blocks: [{ file: "App.tsx", code: STEP_HOST, lang: "tsx" }],
  },
] as const;

const PLAIN_PAGE = `<h3>Weather in <span id="city">Berlin</span></h3>
<button>Monday</button>
<script>
  rc.addEventListener("props-changed", () => (city.textContent = rc.props.city));
  document.querySelector("button").onclick = () => rc.props.onSelect("mon");
</script>`;

const PLAIN_HOST = `<RemoteComponent
  src="https://widgets.example/weather.html"
  city="Lisbon"
  onSelect={async (day) => setDay(day)}
/>`;

const FACTS = [
  {
    title: "Its own origin",
    body: "The iframe can't read your DOM, cookies or storage. Generated HTML runs on an opaque origin.",
    href: "/remote-components/docs/security",
  },
  {
    title: "Network you control",
    body: 'Remotes call public APIs directly, without your cookies. Turn it off with network="none", or allow a list of origins.',
    href: "/remote-components/docs/network",
  },
  {
    title: "Data across the boundary",
    body: "Props and arguments are structured-clone data. Functions only go one way, as props.",
    href: "/remote-components/docs/props",
  },
  {
    title: "Safe Content Frames",
    body: "For code you don't trust, each publisher gets a hashed origin on a public-suffix domain.",
    href: "/remote-components/docs/serving#safe-content-frames",
  },
] as const;

const PATHS = [
  {
    title: "Vite plugin",
    body: "Component files in, HTML files out.",
    href: "/remote-components/docs/vite",
  },
  {
    title: "Generated HTML",
    body: "Show a model's output without a server.",
    href: "/remote-components/docs/html",
  },
  {
    title: "Security",
    body: "What a remote can reach, and the threat model.",
    href: "/remote-components/docs/security",
  },
] as const;

const field =
  "bg-foreground/[0.025] dark:bg-foreground/[0.04] rounded-document";

export default function RemoteComponentsPage() {
  return (
    <PageFrame pad="sub" className="pt-24 md:pt-36">
      <header className="mx-auto max-w-2xl text-center">
        <h1 className={typePage}>Build a component. Render it anywhere.</h1>
        <p className={cn(typeDeck, "mx-auto mt-4 max-w-[54ch]")}>
          Export a React component. The Vite plugin builds it to a single HTML
          file. Import that file in another app and render it like any other
          component, sandboxed in its own frame.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
          <Link
            href="/remote-components/docs"
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center rounded-md px-4 text-sm font-medium transition-colors"
          >
            Read the docs
          </Link>
          <span className="text-muted-foreground text-sm">
            The packages are not on npm yet.
          </span>
        </div>
      </header>

      <section className="mt-16 md:mt-24" aria-label="How it works">
        <ol className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[repeat(3,minmax(0,1fr))] lg:grid-rows-[auto_auto_auto_1fr] lg:gap-x-6 lg:gap-y-0">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="flex min-w-0 flex-col lg:row-span-4 lg:grid lg:grid-rows-subgrid"
            >
              <div className="flex items-center gap-3">
                <span className="border-foreground/15 text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-full border text-xs tabular-nums">
                  {index + 1}
                </span>
                {index < STEPS.length - 1 && (
                  <span
                    aria-hidden
                    className="text-foreground/25 hidden flex-1 items-center lg:flex"
                  >
                    <span className="bg-foreground/15 h-px flex-1" />
                    <ArrowRight className="-ml-1 size-4" />
                  </span>
                )}
              </div>
              <h3 className="mt-3 font-medium">{step.title}</h3>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                {step.body}
              </p>
              <div className="mt-4 flex min-w-0 flex-1 flex-col gap-3 [&>figure:first-child]:flex-1">
                {step.blocks.map((block) => (
                  <Code
                    key={block.file}
                    code={block.code}
                    lang={block.lang}
                    title={block.file}
                    className="my-0 [&_pre]:text-[11.5px]"
                  />
                ))}
              </div>
            </li>
          ))}
        </ol>

        <figure className="mx-auto mt-12 max-w-md">
          <div className="text-muted-foreground text-center text-sm">
            Result
          </div>
          <StarsDemo />
          <figcaption className="text-muted-foreground text-center text-xs">
            fig. 01 · the rating runs in a sandboxed frame. Its value lives on
            this page.
          </figcaption>
        </figure>
      </section>

      <section className="mx-auto mt-24 max-w-6xl md:mt-32">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className={typeSection}>Plain HTML underneath</h2>
          <p className={cn(typeDeck, "mx-auto mt-3 max-w-[56ch]")}>
            The build output is an ordinary HTML page with one script in it. So
            any page works: a hand-written fragment, a page a model wrote, any
            built app. Pass it inline with html, or serve it and point src at
            the URL.
          </p>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <Code
            code={PLAIN_PAGE}
            lang="html"
            title="weather.html"
            className="my-0"
          />
          <Code code={PLAIN_HOST} lang="tsx" title="App.tsx" className="my-0" />
        </div>
      </section>

      <section className="mt-24 md:mt-32">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className={typeSection}>Laid out inline</h2>
          <p className={cn(typeDeck, "mx-auto mt-3 max-w-[56ch]")}>
            The frame sizes to its content and takes your theme. Popovers and
            dialogs render on your page, outside the frame.
          </p>
        </div>
        <figure className="mt-10">
          <BookingDemo />
          <figcaption className="text-muted-foreground mx-auto mt-4 max-w-[60ch] text-center text-xs">
            fig. 02 · the time slots are a separate document in a sandboxed
            frame. The card, the popover layer and the Book button belong to
            this page.
          </figcaption>
        </figure>
      </section>

      <section className="mt-24 md:mt-32">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className={typeSection}>Isolation, set from outside</h2>
          <p className={cn(typeDeck, "mx-auto mt-3 max-w-[56ch]")}>
            The remote is untrusted code. Sandbox, origin and network are set by
            your page and the server.
          </p>
        </div>
        <div className="mx-auto mt-8 grid max-w-5xl gap-4 sm:grid-cols-2">
          {FACTS.map((fact) => (
            <Link
              key={fact.title}
              href={fact.href}
              className={cn(
                field,
                "hover:bg-foreground/[0.05] dark:hover:bg-foreground/[0.07] flex flex-col p-6 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4",
              )}
            >
              <h3 className="font-medium">{fact.title}</h3>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                {fact.body}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <footer className="mx-auto mt-32 max-w-5xl">
        <div className="divide-foreground/10 border-foreground/10 grid border-y md:grid-cols-3 md:divide-x">
          {PATHS.map((path) => (
            <Link
              key={path.href}
              href={path.href}
              className="group hover:bg-foreground/[0.025] flex items-start justify-between gap-4 px-6 py-6 transition-colors"
            >
              <span>
                <span className="block font-medium">{path.title}</span>
                <span className="text-muted-foreground mt-1 block text-sm">
                  {path.body}
                </span>
              </span>
              <ArrowRight
                aria-hidden
                className="text-muted-foreground group-hover:text-foreground mt-1 size-4 shrink-0 transition-all group-hover:translate-x-0.5"
              />
            </Link>
          ))}
        </div>
      </footer>
    </PageFrame>
  );
}
