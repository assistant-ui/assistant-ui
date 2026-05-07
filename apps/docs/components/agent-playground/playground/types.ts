export type PreviewStatus = 'empty' | 'loading' | 'ready' | 'failed';

export type HandoffStatus = 'unavailable' | 'ready';

export type ExampleCategory = 'Chat' | 'Agents' | 'UI Patterns' | 'Integrations' | 'Mobile';
export type ExampleComplexity = 'starter' | 'intermediate' | 'advanced';

export interface PlaygroundExample {
  id: string;
  label: string;
  teaser: string;
  description: string;
  tags: string[];
  category: ExampleCategory;
  complexity: ExampleComplexity;
  featured?: boolean | undefined;
  hasPreview: boolean;
  previewUrl: string;
  sourceUrl: string;
  docsUrl?: string | undefined;
  accentClassName: string;
}

export interface PreviewTarget {
  status: PreviewStatus;
  source: 'local' | 'sandbox' | 'hosted' | 'none';
  label: string;
  url?: string | undefined;
  hint?: string | undefined;
  error?: string | undefined;
  downloadUrl?: string | undefined;
  sourceUrl?: string | undefined;
}

export interface CodeHandoff {
  status: HandoffStatus;
  title: string;
  commands: string[];
  note: string;
  downloadLabel: string;
}

export interface PlaygroundHeaderState {
  title: string;
  subtitle: string;
  sessionId: string | null;
  hasWorkspace: boolean;
  connectionState: 'idle' | 'connecting' | 'open' | 'reconnecting' | 'error' | 'closed';
  isRunning: boolean;
}

export interface PlaygroundState {
  examples: PlaygroundExample[];
  selectedExampleId: string;
  selectedExample: PlaygroundExample | undefined;
  livePreview: PreviewTarget | null;
  preview: PreviewTarget;
  codeHandoff: CodeHandoff;
  selectExample: (exampleId: string) => void;
}
