export type ThreadForkedFrom = {
  readonly threadId: string;
  readonly messageId?: string | undefined;
};

export type ThreadForkOptions = {
  fromMessageId?: string | undefined;
};
