import {
  getThreadData,
  seedNewThread,
  type RemoteThreadData,
  type RemoteThreadState,
} from "./remote-thread-state";

export const isSelectedThread = (
  state: RemoteThreadState,
  left: string,
  right: string,
  matchRemoteIdentity = false,
): boolean => {
  if (left === right) return true;
  const data = getThreadData(state, left);
  if (data === undefined) return false;
  const other = getThreadData(state, right);
  return (
    data.id === right ||
    data.id === other?.id ||
    (matchRemoteIdentity &&
      other?.remoteId !== undefined &&
      (data.id === other.remoteId || data.remoteId === other.remoteId))
  );
};

export const shouldStartFallbackSwitch = (
  task: Promise<void> | undefined,
  lastAwaitedTask: Promise<void> | undefined,
): boolean => task === undefined || task === lastAwaitedTask;

export const removalFallback = (
  state: RemoteThreadState,
  baseState: RemoteThreadState,
  mainThreadId: string,
  settledIsMain: boolean,
): "none" | "draft" | "wait" => {
  const data = getThreadData(state, mainThreadId);
  if (data !== undefined && (data.status !== "archived" || !settledIsMain))
    return "none";
  if (
    data === undefined &&
    !(baseState.newThreadId !== undefined && state.newThreadId === undefined)
  )
    return "draft";
  return "wait";
};

export const selectRemovalDraft = (
  state: RemoteThreadState,
  baseState: RemoteThreadState,
): { state: RemoteThreadState; id: string } => {
  const draftId = state.newThreadId;
  if (draftId !== undefined) {
    return { state, id: getThreadData(state, draftId)?.id ?? draftId };
  }
  const seeded = seedNewThread(baseState);
  return { state: seeded.state, id: seeded.id };
};

export const switchTarget = (
  state: RemoteThreadState,
  threadId: string,
  generation: number,
  currentGeneration: number,
): RemoteThreadData | undefined => {
  if (generation !== currentGeneration) return undefined;
  const data = getThreadData(state, threadId);
  return data?.id === threadId ? data : undefined;
};

export const shouldUnarchiveSwitchTarget = (
  data: RemoteThreadData,
  options: { unarchive?: boolean } | undefined,
): data is RemoteThreadData & { status: "archived" } =>
  data.status === "archived" && options?.unarchive !== false;

export const shouldRetryControlledThread = ({
  threadId,
  targetId,
  mainThreadId,
  state,
  controlledGeneration,
  switchGeneration,
  allowMissing,
  allowUncontrolled,
  loadError,
  isLoading,
  matchRemoteIdentity,
}: {
  threadId: string | undefined;
  targetId: string | undefined;
  mainThreadId: string;
  state: RemoteThreadState;
  controlledGeneration: number | undefined;
  switchGeneration: number;
  allowMissing: boolean;
  allowUncontrolled: boolean;
  loadError: unknown;
  isLoading: boolean;
  matchRemoteIdentity?: boolean;
}): boolean =>
  threadId !== undefined &&
  !isLoading &&
  (allowUncontrolled || controlledGeneration === switchGeneration) &&
  (allowMissing || targetId !== undefined) &&
  (!allowMissing || loadError === undefined) &&
  (targetId === undefined ||
    !isSelectedThread(state, targetId, mainThreadId, matchRemoteIdentity));
