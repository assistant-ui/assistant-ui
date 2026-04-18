import Link from "next/link";
import { ExternalLink } from "lucide-react";

type SourceLinkProps = {
  href: string;
};

export function SourceLink({ href }: SourceLinkProps) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground"
    >
      <ExternalLink className="size-4" />
      View full source on GitHub
    </Link>
  );
}
