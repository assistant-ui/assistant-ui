export const ASSISTANT_UI_VERSIONS: Record<string, string> = {
  '@assistant-ui/react': '0.12.25',
  '@assistant-ui/react-ai-sdk': '1.3.19',
  '@assistant-ui/react-markdown': '0.12.9',
  '@assistant-ui/ui': '0.13.10',
  '@assistant-ui/react-langgraph': '0.12.10',
  '@assistant-ui/react-hook-form': '0.2.11',
  '@assistant-ui/react-a2a': '0.0.26',
  '@assistant-ui/react-ag-ui': '0.0.6',
  '@assistant-ui/react-google-adk': '0.1.11',
  '@assistant-ui/cloud-ai-sdk': '0.3.11',
  'assistant-stream': '0.0.5',
};

export const REMOVE_PACKAGES: string[] = [
  '@assistant-ui/x-buildutils',
];

export type UnknownWorkspaceDependencyPolicy = 'warn' | 'fail';
