import type { ExampleCategory, ExampleComplexity } from '../types';

export const CATEGORY_ORDER: ExampleCategory[] = ['Chat', 'Agents', 'UI Patterns', 'Integrations', 'Mobile'];

export const CATEGORY_DOT: Record<ExampleCategory, string> = {
  Chat: 'bg-sky-500',
  Agents: 'bg-violet-500',
  'UI Patterns': 'bg-sky-500',
  Integrations: 'bg-emerald-500',
  Mobile: 'bg-amber-500',
};

export const CATEGORY_TEXT: Record<ExampleCategory, string> = {
  Chat: 'text-sky-600 dark:text-sky-400',
  Agents: 'text-violet-600 dark:text-violet-400',
  'UI Patterns': 'text-sky-600 dark:text-sky-400',
  Integrations: 'text-emerald-600 dark:text-emerald-400',
  Mobile: 'text-amber-600 dark:text-amber-400',
};

export const COMPLEXITY_COLORS: Record<ExampleComplexity, string> = {
  starter: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950 dark:border-emerald-800',
  intermediate: 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950 dark:border-amber-800',
  advanced: 'text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-950 dark:border-rose-800',
};

const TAG_COLORS: Record<string, string> = {
  artifacts: 'text-sky-700 bg-sky-50 border-sky-200 dark:text-sky-300 dark:bg-sky-950 dark:border-sky-800',
  code: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950 dark:border-emerald-800',
  preview: 'text-cyan-700 bg-cyan-50 border-cyan-200 dark:text-cyan-300 dark:bg-cyan-950 dark:border-cyan-800',
  chat: 'text-sky-700 bg-sky-50 border-sky-200 dark:text-sky-300 dark:bg-sky-950 dark:border-sky-800',
  starter: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950 dark:border-emerald-800',
  projects: 'text-foreground bg-muted border-border',
  forms: 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950 dark:border-amber-800',
  'react-hook-form': 'text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-950 dark:border-rose-800',
  persistence: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950 dark:border-emerald-800',
  database: 'text-foreground bg-muted border-border',
  langgraph: 'text-violet-700 bg-violet-50 border-violet-200 dark:text-violet-300 dark:bg-violet-950 dark:border-violet-800',
  agents: 'text-violet-700 bg-violet-50 border-violet-200 dark:text-violet-300 dark:bg-violet-950 dark:border-violet-800',
  tools: 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950 dark:border-amber-800',
  'generative-ui': 'text-sky-700 bg-sky-50 border-sky-200 dark:text-sky-300 dark:bg-sky-950 dark:border-sky-800',
  interactables: 'text-sky-700 bg-sky-50 border-sky-200 dark:text-sky-300 dark:bg-sky-950 dark:border-sky-800',
  ui: 'text-foreground bg-muted border-border',
  mobile: 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950 dark:border-amber-800',
  expo: 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950 dark:border-amber-800',
  'react-native': 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950 dark:border-amber-800',
};

export function tagColor(tag: string) {
  return TAG_COLORS[tag] ?? 'text-foreground bg-muted border-border';
}
