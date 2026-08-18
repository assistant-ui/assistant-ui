import type { AgUiInterrupt } from "./types";

/**
 * Where a received `responseSchema` travels when it is not an object. JSON
 * Schema allows a boolean, and `false` rejects every payload, so a schema
 * `responseSchema` cannot hold still has to be distinguishable from an absent
 * one. The carrier is a string key rather than a symbol so it survives the
 * persistence round trip, and it stays off `AgUiInterrupt` because only the
 * gate check reads it.
 */
const RAW_RESPONSE_SCHEMA = "__aui_agui_responseSchemaRaw";

type RawResponseSchemaCarrier = { [RAW_RESPONSE_SCHEMA]?: unknown };

export const withRawResponseSchema = (
  interrupt: AgUiInterrupt,
  schema: unknown,
): AgUiInterrupt => {
  const carried: AgUiInterrupt & RawResponseSchemaCarrier = {
    ...interrupt,
    [RAW_RESPONSE_SCHEMA]: schema,
  };
  return carried;
};

export const readRawResponseSchema = (interrupt: AgUiInterrupt): unknown =>
  (interrupt as RawResponseSchemaCarrier)[RAW_RESPONSE_SCHEMA];

export const withoutRawResponseSchema = <T extends AgUiInterrupt>(
  interrupt: T,
): T => {
  const { [RAW_RESPONSE_SCHEMA]: _raw, ...rest } = interrupt as T &
    RawResponseSchemaCarrier;
  return rest as T;
};
