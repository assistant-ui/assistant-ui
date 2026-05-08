import { useState, useCallback, useEffect, useRef } from 'react';
import type { useAugmentAssistantRuntime } from '@/components/agent-playground/runtime/useAugmentAssistantRuntime';
import { DEV_DEBUG_PANEL } from '@/components/agent-playground/config/env';
import { EventLogPanel } from '@/components/agent-playground/debug/EventLogPanel';
import { PlaygroundShell } from '../playground/PlaygroundShell';
import { TooltipProvider } from '@/components/agent-playground/ui/tooltip';
import { LandingPage } from '../landing/LandingPage';
import { TemplatesModal } from '../landing/TemplatesModal';
import type { Template } from '@/components/agent-playground/lib/templates';

type ViewMode = 'landing' | 'building' | 'chat' | 'preview';

export function AgentShell({ runtimeState }: { runtimeState: ReturnType<typeof useAugmentAssistantRuntime> }) {
  const [debugOpen, setDebugOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('landing');
  const [initialPrompt, setInitialPrompt] = useState<string | null>(null);
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const didAutoSwitchRef = useRef(false);

  const handleStartChat = useCallback((prompt: string) => {
    setInitialPrompt(prompt);
    setViewMode('chat');
    setTemplatesModalOpen(false);
  }, []);

  const handleSelectTemplate = useCallback((template: Template) => {
    setSelectedTemplate(template);
    setViewMode('preview');
    setTemplatesModalOpen(false);
    // Silently inject template context into the user's first follow-up so
    // the agent knows which recipe is selected without us sending a
    // message on the user's behalf. Cleared after one use.
    runtimeState.setPendingPrefix(`[Selected template: ${template.id}] `);
  }, [runtimeState]);

  const handleNewChat = useCallback(() => {
    window.location.href = window.location.pathname;
  }, []);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('sessionId')) {
      setViewMode('chat');
    }
  }, []);

  // Clear initialPrompt only once the message is confirmed in the store,
  // not on onSent (which fires before the async session creation finishes).
  useEffect(() => {
    if (initialPrompt && runtimeState.messages.length > 0) {
      setInitialPrompt(null);
    }
  }, [initialPrompt, runtimeState.messages.length]);

  // Bootstrap: once session + messages load, switch to preview if there's a live preview
  useEffect(() => {
    if (didAutoSwitchRef.current) return;
    if (runtimeState.sessionReady && runtimeState.session && runtimeState.messages.length > 0) {
      didAutoSwitchRef.current = true;
      if (runtimeState.hasLivePreview) setViewMode('preview');
      // else stay in 'chat' — correct for sessions without a preview
    }
  }, [runtimeState.sessionReady, runtimeState.session, runtimeState.messages.length, runtimeState.hasLivePreview]);

  // Chat → preview when agent produces a live preview
  useEffect(() => {
    if (viewMode === 'chat' && runtimeState.hasLivePreview) setViewMode('preview');
  }, [viewMode, runtimeState.hasLivePreview]);

  const handleShowTemplates = useCallback(() => {
    setTemplatesModalOpen(true);
  }, []);

  const handleTemplateSelect = useCallback((template: Template) => {
    handleSelectTemplate(template);
  }, [handleSelectTemplate]);

  return (
    <TooltipProvider>
      <div className="flex h-full overflow-hidden bg-background text-foreground">
        <div className="min-w-0 flex-1 flex flex-col overflow-hidden">
          {viewMode === 'landing' && (
            <LandingPage onStartChat={handleStartChat} onSelectTemplate={handleSelectTemplate} />
          )}

          {(viewMode === 'chat' || viewMode === 'preview') && (
            <PlaygroundShell
              runtimeState={runtimeState}
              debugOpen={debugOpen}
              onToggleDebug={DEV_DEBUG_PANEL ? () => setDebugOpen((v) => !v) : undefined}
              onNewChat={handleNewChat}
              onShowTemplates={handleShowTemplates}
              initialPrompt={initialPrompt}
              showCanvas={viewMode === 'preview'}
              templatePreview={selectedTemplate}
            />
          )}

          <TemplatesModal
            open={templatesModalOpen}
            onOpenChange={setTemplatesModalOpen}
            onSelect={handleTemplateSelect}
          />
        </div>
        {debugOpen ? (
          <EventLogPanel
            events={runtimeState.eventLog}
            debugState={runtimeState.debugState}
            lastCommand={runtimeState.lastCommand}
            lastCommandResult={runtimeState.lastCommandResult}
            debugLog={runtimeState.debugLog}
          />
        ) : null}
      </div>
    </TooltipProvider>
  );
}
