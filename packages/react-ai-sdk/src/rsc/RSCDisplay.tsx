"use client";
import {
  TextContentPartComponent,
  useThread,
  useMessage,
  getExternalStoreMessage,
} from "@assistant-ui/react";
import {
  RSCThreadExtras,
  symbolInternalRSCExtras,
} from "./utils/RSCThreadExtras";

export const RSCDisplay: TextContentPartComponent = () => {
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
