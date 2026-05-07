export interface ServerEvent<TPayload = unknown> {
  id: string;
  sessionId: string;
  threadId?: string | null;
  type: string;
  payload: TPayload;
  createdAt: string;
}
