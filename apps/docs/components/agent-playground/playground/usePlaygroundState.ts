import { useMemo, useState } from 'react';
import type { ServerEvent, WorkspaceRef } from '@/components/agent-playground/augment/types';
import type { AssistantThreadMessageLike } from '@/components/agent-playground/runtime/assistantTypes';
import { createCodeHandoff, createPreviewTarget } from './adapters/catalogToPlayground';
import { latestPreviewTargetFromEvents, latestPreviewTargetFromMessages } from './adapters/runtimePreviewToPlayground';
import type { PlaygroundState } from './types';
import { usePlaygroundCatalog } from './usePlaygroundCatalog';

type UsePlaygroundStateInput = {
  sessionId?: string | null | undefined;
  threadId?: string | null | undefined;
  workspace?: WorkspaceRef | undefined;
  messages?: AssistantThreadMessageLike[] | undefined;
  eventLog?: ServerEvent[] | undefined;
};

export function usePlaygroundState({
  threadId = null,
  messages = [],
  eventLog = [],
}: UsePlaygroundStateInput = {}): PlaygroundState {
  const examples = usePlaygroundCatalog();
  const [selectedExampleId, setSelectedExampleId] = useState<string>(examples[0]?.id ?? '');

  const selectedExample = useMemo(
    () => examples.find((example) => example.id === selectedExampleId) ?? examples[0],
    [examples, selectedExampleId],
  );

  const threadEvents = useMemo(
    () => eventLog.filter((event) => !threadId || !event.threadId || event.threadId === threadId),
    [eventLog, threadId],
  );
  const persistedLivePreview = useMemo(() => latestPreviewTargetFromMessages(messages), [messages]);
  const livePreview = useMemo(
    () => latestPreviewTargetFromEvents(threadEvents, persistedLivePreview),
    [persistedLivePreview, threadEvents],
  );
  const examplePreview = useMemo(
    () => (selectedExample ? createPreviewTarget(selectedExample) : null),
    [selectedExample],
  );
  const preview = livePreview ?? examplePreview ?? { status: 'empty' as const, source: 'none' as const, label: 'Preview' };
  const codeHandoff = useMemo(
    () => (selectedExample ? createCodeHandoff(selectedExample) : { status: 'unavailable' as const, title: '', commands: [], note: '', downloadLabel: '' }),
    [selectedExample],
  );

  return {
    examples,
    selectedExampleId,
    selectedExample,
    livePreview,
    preview,
    codeHandoff,
    selectExample: setSelectedExampleId,
  };
}
