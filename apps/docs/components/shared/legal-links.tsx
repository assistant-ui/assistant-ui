import Link from "next/link";
import { CookieSettingsLink } from "@/components/cookie-settings-link";

const linkClassName = "hover:text-foreground transition-colors";

export function LegalLinks() {
  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      <a
        href="https://www.agentbase.dev"
        target="_blank"
        rel="noopener noreferrer"
        className={linkClassName}
      >
        &copy; {new Date().getFullYear()} AgentbaseAI Inc.
      </a>
      <div className="flex items-center gap-2">
        <Link href="/privacy-policy" className={linkClassName}>
          Privacy
        </Link>
        <span aria-hidden>·</span>
        <Link href="/terms-of-service" className={linkClassName}>
          Terms
        </Link>
        <CookieSettingsLink separator className={linkClassName} />
      </div>
    </div>
  );
}
