/**
 * `createPiNodeClient` — the SDK-in-process `PiClient` implementation.
 *
 * Backed by a **process-singleton** `PiThreadSupervisor` pinned to `globalThis`,
 * so Next.js dev HMR (which re-evaluates modules) doesn't silently orphan live
 * runtimes by recreating the supervisor. Browser clients are *views* over this
 * one owner; the supervisor must never be per-request.
 *
 * This is a node-only module (reaches the Pi SDK via the supervisor) and lives
 * behind the `./node` entry — never imported from `index.ts`.
 */
import {
  PiThreadSupervisor,
  type PiThreadSupervisorOptions,
} from "./PiThreadSupervisor";
import type { PiClient } from "./piTypes";

export type PiNodeClientOptions = PiThreadSupervisorOptions;

const SUPERVISOR_KEY = "__assistantUiPiThreadSupervisor";

type SupervisorHolder = typeof globalThis & {
  [SUPERVISOR_KEY]?: PiThreadSupervisor;
};

/** The process-singleton supervisor, created on first use and pinned to
 * `globalThis`. Returns the existing instance on subsequent calls (its options
 * are fixed by the first caller; per-call `workspacePath` overrides the default). */
export const getPiThreadSupervisor = (
  options: PiNodeClientOptions = {},
): PiThreadSupervisor => {
  const holder = globalThis as SupervisorHolder;
  return (holder[SUPERVISOR_KEY] ??= new PiThreadSupervisor(options));
};

export const createPiNodeClient = (
  options: PiNodeClientOptions = {},
): PiClient => {
  const supervisor = getPiThreadSupervisor(options);

  /** Apply this client's configured workspace as the default for catalog/create
   * calls that don't specify one (the singleton may be shared across clients). */
  const withWorkspace = <T extends { workspacePath?: string }>(
    input: T | undefined,
  ): T | { workspacePath: string } | undefined => {
    const workspacePath = input?.workspacePath ?? options.workspacePath;
    return workspacePath ? { ...input, workspacePath } : input;
  };

  return {
    listThreads: (input) => supervisor.listThreads(withWorkspace(input)),
    createThread: (input) => supervisor.createThread(withWorkspace(input)),
    getThread: (threadId) => supervisor.getThread(threadId),
    sendMessage: (threadId, input) => supervisor.sendMessage(threadId, input),
    cancelRun: (threadId) => supervisor.cancelRun(threadId),
    clearQueue: (threadId) => supervisor.clearQueue(threadId),
    getAvailableModels: (input) => {
      void input;
      return supervisor.getAvailableModels();
    },
    setModel: (threadId, input) => supervisor.setModel(threadId, input),
    setThinkingLevel: (threadId, level) =>
      supervisor.setThinkingLevel(threadId, level),
    renameThread: (threadId, title) => supervisor.renameThread(threadId, title),
    archiveThread: (threadId) => supervisor.archiveThread(threadId),
    unarchiveThread: (threadId) => supervisor.unarchiveThread(threadId),
    deleteThread: (threadId) => supervisor.deleteThread(threadId),
    respondToHostUiRequest: (threadId, response) =>
      supervisor.respondToHostUiRequest(threadId, response),
    subscribe: (threadId, listener, subscribeOptions) =>
      supervisor.subscribe(threadId, listener, subscribeOptions),
  };
};
