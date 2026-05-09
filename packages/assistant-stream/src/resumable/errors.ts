export type ResumableStreamErrorCode =
  | "missing"
  | "exists"
  | "finalized"
  | "invalid-id";

export class ResumableStreamError extends Error {
  readonly code: ResumableStreamErrorCode;

  constructor(code: ResumableStreamErrorCode, message: string) {
    super(message);
    this.name = "ResumableStreamError";
    this.code = code;
  }
}

const STREAM_ID_PATTERN = /^[A-Za-z0-9_.:-]{1,256}$/;

export function validateStreamId(streamId: string): void {
  if (!STREAM_ID_PATTERN.test(streamId)) {
    throw new ResumableStreamError(
      "invalid-id",
      `Invalid streamId: ${streamId} (must match ${STREAM_ID_PATTERN})`,
    );
  }
}
