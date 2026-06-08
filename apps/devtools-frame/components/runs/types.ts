export interface RunEventEntry {
  readonly time: Date;
  readonly event: string;
  readonly scope: string;
  readonly offsetMs: number;
  readonly data: unknown;
}

export interface RunPreview {
  readonly id: string;
  readonly threadId?: string;
  readonly index: number;
  readonly startTime: Date;
  readonly endTime?: Date;
  readonly durationMs?: number;
  readonly spanMs: number;
  readonly events: readonly RunEventEntry[];
}

export interface RunGrouping {
  readonly runs: readonly RunPreview[];
  readonly orphans: readonly RunEventEntry[];
}
