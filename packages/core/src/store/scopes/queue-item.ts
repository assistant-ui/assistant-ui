export type QueueItemState = {
  readonly id: string;
  readonly prompt: string;
};

export type QueueItemMethods = {
  getState(): QueueItemState;
  steer(): void;
  remove(): void;
};

export type QueueItemMeta = {
  source: "composer";
  query: { index: number };
};

export type QueueItemClientSchema = {
  methods: QueueItemMethods;
  meta: QueueItemMeta;
};
