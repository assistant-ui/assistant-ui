import { BookOpen, Bug, ExternalLink, Moon, Sun } from 'lucide-react';
import { useProduct } from '@/components/agent-playground/contexts/ProductContext';
import { useTheme } from '@/components/agent-playground/lib/useTheme';

export function LandingHeader({
  debugOpen,
  onToggleDebug,
}: {
  debugOpen?: boolean | undefined;
  onToggleDebug?: (() => void) | undefined;
}) {
  const product = useProduct();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="shrink-0 border-b bg-background">
      <div className="flex h-12 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <img
            src={product.branding.logoUrl}
            alt={`${product.branding.name} logo`}
            className={`${product.branding.logoIncludesName ? 'h-6' : 'h-5 w-5'} ${product.id === 'assistant-ui' ? 'dark:invert' : ''}`}
          />
          {!product.branding.logoIncludesName && (
            <span className="font-medium tracking-tight text-foreground">{product.branding.name}</span>
          )}
          <span className="text-muted-foreground/40">/</span>
          <span className="font-medium tracking-tight text-muted-foreground">{product.branding.tagline}</span>
        </div>

        <div className="flex items-center gap-1">
          <a
            href={product.branding.repoUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-7 items-center gap-1.5 rounded px-2.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ExternalLink className="size-3.5" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
          <a
            href={product.branding.docsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-7 items-center gap-1.5 rounded px-2.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <BookOpen className="size-3.5" />
            <span className="hidden sm:inline">Docs</span>
          </a>
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex size-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
          </button>
          {onToggleDebug ? (
            <button
              type="button"
              onClick={onToggleDebug}
              className={`rounded-md p-1.5 transition-colors ${debugOpen ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              aria-label="Toggle debug panel"
            >
              <Bug className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
