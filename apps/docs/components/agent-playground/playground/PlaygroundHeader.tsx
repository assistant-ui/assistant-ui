import { BookOpen, Bug, Download, ExternalLink, LayoutGrid, Loader2, Moon, Plus, Sun } from 'lucide-react';
import { useProduct } from '@/components/agent-playground/contexts/ProductContext';
import { useTheme } from '@/components/agent-playground/lib/useTheme';
import { StatusIndicator } from '../shell/StatusIndicator';
import { Button } from '@/components/agent-playground/ui/button';
import type { PlaygroundHeaderState } from './types';

type ExportStatus = 'idle' | 'exporting' | 'error';

export function PlaygroundHeader({
  headerState,
  debugOpen,
  onToggleDebug,
  onNewChat,
  onShowTemplates,
  onExportWorkspace,
  exportStatus = 'idle',
  exportError = null,
}: {
  headerState: PlaygroundHeaderState;
  debugOpen?: boolean | undefined;
  onToggleDebug?: (() => void) | undefined;
  onNewChat?: (() => void) | undefined;
  onShowTemplates?: (() => void) | undefined;
  onExportWorkspace?: (() => void | Promise<void>) | undefined;
  exportStatus?: ExportStatus | undefined;
  exportError?: string | null | undefined;
}) {
  const product = useProduct();
  const { theme, toggleTheme } = useTheme();
  const exportDisabled = !headerState.sessionId || !headerState.hasWorkspace || exportStatus === 'exporting';
  const exportInfoTooltip = 'Exports exclude env files, secrets, dependencies, and build/cache output.';
  const exportTitle = !headerState.sessionId
    ? 'Start a session before exporting.'
    : !headerState.hasWorkspace
      ? 'Create or attach a workspace before exporting.'
      : exportInfoTooltip;

  return (
    <header className="shrink-0 border-b bg-background">
      <div className="flex h-12 min-w-0 items-center">
        <div
          data-slot="playground-header-chat-zone"
          className="flex w-[calc(var(--playground-chat-fraction)*100%)] min-w-[280px] items-center gap-2 px-4"
        >
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={onNewChat}
              className="flex shrink-0 items-center gap-2 rounded-md px-1 cursor-pointer hover:opacity-70 transition-opacity"
              aria-label="Go to home"
            >
              <img
                src={product.branding.logoUrl}
                alt={`${product.branding.name} logo`}
                className={`${product.branding.logoIncludesName ? 'h-6' : 'h-5 w-5'} ${product.id === 'assistant-ui' ? 'dark:invert' : ''}`}
              />
              {!product.branding.logoIncludesName && (
                <span className="font-medium tracking-tight text-foreground">{headerState.title}</span>
              )}
            </button>
            <span className="text-muted-foreground/40">/</span>
            <span className="truncate font-medium tracking-tight text-muted-foreground">{headerState.subtitle}</span>
          </div>
        </div>

        <div
          data-slot="playground-header-canvas-zone"
          className="flex min-w-0 flex-1 items-center justify-between gap-4 px-3"
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {exportError ? (
              <span className="hidden max-w-[260px] truncate text-xs text-destructive md:inline" title={exportError}>
                {exportError}
              </span>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1 self-center">
            <span title={exportTitle}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 px-2.5 text-xs"
                onClick={onExportWorkspace}
                disabled={exportDisabled}
                title={exportTitle}
              >
                {exportStatus === 'exporting' ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
                {exportStatus === 'exporting' ? 'Exporting' : 'Export'}
              </Button>
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 px-2.5 text-xs"
              onClick={onShowTemplates}
            >
              <LayoutGrid className="size-3.5" />
              Templates
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 px-2.5 text-xs"
              onClick={onNewChat}
            >
              <Plus className="size-3.5" />
              New chat
            </Button>
            <div className="mx-0.5 h-4 w-px bg-border" />
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
            <StatusIndicator connectionState={headerState.connectionState} isRunning={headerState.isRunning} />
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
      </div>
    </header>
  );
}
