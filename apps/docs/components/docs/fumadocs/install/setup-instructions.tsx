import { ArrowUpRight } from "lucide-react";

function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-0.5 text-fd-primary underline underline-offset-2 hover:text-fd-primary/80"
    >
      {children}
      <ArrowUpRight className="size-3" />
    </a>
  );
}

export function SetupInstructions() {
  return (
    <div className="mt-6">
      <h4 className="mb-3 font-medium text-muted-foreground text-sm">
        Prerequisites
      </h4>

      <ol className="list-decimal space-y-3 pl-5 text-sm">
        <li>
          <span className="font-medium">Setup React</span>
          <p className="mt-1 text-muted-foreground">
            We recommend{" "}
            <ExternalLink href="https://nextjs.org/docs/getting-started">
              Next.js
            </ExternalLink>{" "}
            or <ExternalLink href="https://vite.dev/guide/">Vite</ExternalLink>.
          </p>
        </li>

        <li>
          <span className="font-medium">Setup shadcn/ui</span>
          <p className="mt-1 text-muted-foreground">
            Follow the{" "}
            <ExternalLink href="https://ui.shadcn.com/docs/installation/manual">
              manual installation guide
            </ExternalLink>{" "}
            to configure:
          </p>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-muted-foreground">
            <li>Tailwind CSS</li>
            <li>TypeScript path aliases</li>
            <li>tw-animate-css</li>
            <li>The cn helper</li>
            <li>components.json (for CLI usage)</li>
          </ul>
        </li>
      </ol>
    </div>
  );
}
