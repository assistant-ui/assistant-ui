"use client";
import { VercelRSCMessage } from "../VercelRSCMessage";

export const symbolInternalRSCExtras = Symbol("internal-rsc-extras");
export type RSCThreadExtras =
  | {
      [symbolInternalRSCExtras]?: {
        convertFn: (message: any) => VercelRSCMessage;
      };
    }
  | undefined;
