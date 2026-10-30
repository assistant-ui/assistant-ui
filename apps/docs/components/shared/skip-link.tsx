export const MAIN_CONTENT_ID = "main-content";

export function SkipLink() {
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="bg-background text-foreground rounded-control border-foreground/10 sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-100 focus:border focus:px-3 focus:py-1.5 focus:text-sm"
    >
      Skip to content
    </a>
  );
}
