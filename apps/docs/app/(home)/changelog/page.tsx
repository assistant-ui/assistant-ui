import { fetchReleases } from "./_lib/releases";
import ReactMarkdown from "react-markdown";
import { Github, ChevronDown } from "lucide-react";

export const metadata = {
  title: "Changelog",
  description: "Release notes for all assistant-ui packages.",
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Number of latest versions to keep expanded
const MAX_OPEN = 8;

export default async function ChangelogPage() {
  const versions = await fetchReleases();

  return (
    <div className="mx-auto max-w-4xl space-y-16 py-12">
      <header className="space-y-2">
        <h1 className="font-bold text-3xl tracking-tight">Changelog</h1>
        <p className="text-muted-foreground">
          All releases published from the assistant-ui monorepo, grouped by
          version and package.
        </p>
      </header>

      {versions.map(([version, entries], index) => {
        const isOpen = index < MAX_OPEN;

        return (
          <details key={version} open={isOpen} className="group space-y-6">
            <summary className="flex cursor-pointer list-none items-center gap-2">
              <ChevronDown
                className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
              <h2
                id={`v-${version}`}
                className="font-mono font-semibold text-2xl"
              >
                v{version}
              </h2>
            </summary>

            <div className="space-y-10">
              {entries.map((r) => (
                <article
                  key={`${version}-${r.pkg}`}
                  className="relative border-l pl-6"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-3">
                    <span className="rounded bg-muted px-2 py-1 font-mono text-sm">
                      {r.pkg}
                    </span>

                    <span className="text-muted-foreground text-xs">
                      {formatDate(r.date)}
                    </span>

                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      title="View release on GitHub"
                      aria-label="View release on GitHub"
                      className="ml-auto text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Github className="h-4 w-4" />
                    </a>
                  </div>

                  <div className="prose dark:prose-invert max-w-none text-sm">
                    <ReactMarkdown>{r.body}</ReactMarkdown>
                  </div>
                </article>
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}
