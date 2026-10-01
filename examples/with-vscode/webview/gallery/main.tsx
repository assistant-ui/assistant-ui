import { recordIssue } from "./recorder";
import "../zod-jitless";
import "./gallery.css";
import {
  Component,
  useEffect,
  useSyncExternalStore,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import { installLinkInterceptor } from "@assistant-ui/vscode/webview";
import { cn } from "@/lib/utils";
import {
  BOOT_ATTRIBUTE,
  type GalleryView,
  type WebviewBootConfig,
} from "../../src/protocol";
import { startGalleryListener } from "./probes";
import { SECTIONS, type RegisteredSection } from "./registry";
import { GALLERY_CATEGORIES } from "./types";
import { galleryView } from "./view";

const boot = JSON.parse(
  document.body.getAttribute(BOOT_ATTRIBUTE) ?? "null",
) as WebviewBootConfig;

installLinkInterceptor();
galleryView.set(boot.gallery ?? { section: null, width: null });

class SectionBoundary extends Component<
  { section: string; children: ReactNode },
  { error: Error | null }
> {
  override state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    const component = /^\s*at (\S+)/m.exec(info.componentStack ?? "")?.[1];
    recordIssue(
      "boundary",
      `${error.name}: ${error.message.split("\n", 1)[0]}${component ? ` (in ${component})` : ""}`,
      this.props.section,
    );
  }

  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        role="alert"
        data-gallery-error
        className="border-destructive text-destructive rounded-md border p-3 font-mono text-xs"
      >
        {this.state.error.name}: {this.state.error.message}
      </div>
    );
  }
}

function SectionCard({
  section,
  width,
}: {
  section: RegisteredSection;
  width: number | null;
}) {
  return (
    <section
      id={`section-${section.id}`}
      data-gallery-section={section.id}
      aria-labelledby={`section-${section.id}-title`}
      className={cn(
        "bg-background flex flex-col rounded-lg border",
        width === null && "w-full",
      )}
      style={width === null ? undefined : { width }}
    >
      <header className="flex flex-wrap items-baseline gap-x-2 border-b px-3 py-2">
        <h3 id={`section-${section.id}-title`} className="text-sm font-medium">
          <a href={`#section-${section.id}`} className="hover:underline">
            {section.title}
          </a>
        </h3>
        <code className="text-muted-foreground text-xs">{section.id}</code>
        {section.notes && (
          <p className="text-muted-foreground w-full text-xs">
            {section.notes}
          </p>
        )}
      </header>
      <div data-gallery-body className="min-w-0 p-3">
        <SectionBoundary section={section.id}>
          {section.render()}
        </SectionBoundary>
      </div>
    </section>
  );
}

function Gallery({ view }: { view: GalleryView }) {
  if (view.section !== null) {
    const section = SECTIONS.find((s) => s.id === view.section);
    return section ? (
      <SectionCard key={section.id} section={section} width={view.width} />
    ) : (
      <p role="alert">No gallery section {view.section}</p>
    );
  }
  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold">Component gallery</h1>
        <nav aria-label="Categories" className="flex gap-3 text-sm">
          {GALLERY_CATEGORIES.map((category) => (
            <a key={category} href={`#category-${category}`}>
              {category} (
              {SECTIONS.filter((s) => s.category === category).length})
            </a>
          ))}
        </nav>
      </header>
      {GALLERY_CATEGORIES.map((category) => (
        <section
          key={category}
          id={`category-${category}`}
          aria-label={category}
          className="flex flex-col gap-3"
        >
          <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            {category}
          </h2>
          {SECTIONS.filter((s) => s.category === category).map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              width={view.width}
            />
          ))}
        </section>
      ))}
    </>
  );
}

function App() {
  const view = useSyncExternalStore(galleryView.subscribe, galleryView.get);
  useEffect(() => galleryView.committed(view), [view]);
  return (
    <main
      data-gallery-root
      className={cn(
        "flex flex-col gap-6 p-4",
        view.noMotion && "aui-gallery-no-motion",
      )}
    >
      <Gallery view={view} />
    </main>
  );
}

const root = document.getElementById("root");
if (root) {
  createRoot(root, {
    // SectionBoundary records what it catches, with its section.
    onCaughtError: () => {},
    onUncaughtError: (error) =>
      recordIssue(
        "error",
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : String(error),
      ),
  }).render(<App />);
}
startGalleryListener(boot);
