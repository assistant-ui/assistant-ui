"use client";
import {
  useThread,
  useMessage,
  getExternalStoreMessage,
} from "@assistant-ui/react";
import {
  RSCThreadExtras,
  symbolInternalRSCExtras,
} from "./utils/RSCThreadExtras";
import { FC } from "react";

export const RSCDisplay: FC = () => {
  const convertFn = useThread((t) => {
    const extras = (t.extras as RSCThreadExtras)?.[symbolInternalRSCExtras];
    if (!extras)
      throw new Error(
        "This function can only be used inside a Vercel RSC runtime.",
      );
    return extras.convertFn;
  });
  return useMessage((m) => convertFn(getExternalStoreMessage(m)).display);
};
