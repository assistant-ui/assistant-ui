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
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm transition-colors"
    >
      <ExternalLink className="size-4" />
      View full source on GitHub
    </Link>
  );
}
