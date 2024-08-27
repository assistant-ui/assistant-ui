import type { CoreMessage } from "../../types";

export type LocalRuntimeOptions = {
  initialMessages?: readonly CoreMessage[] | undefined;
  maxToolRoundtrips?: number | undefined;
};
