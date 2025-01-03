"use client";

import { useContext } from "react";
import { useThreadListItem } from "../../../context/react/ThreadListItemContext";
import { CloudContext } from "./CloudContext";

export const useCloudGetOrCreateThread = () => {
  const currentId = useThreadListItem((i) => i.externalId);
  const cloudContextValue = useContext(CloudContext);
  if (!cloudContextValue) throw new Error("CloudContext not available");

  return async () => {
    let externalId = currentId;
    if (!externalId) {
      externalId = (await cloudContextValue.initialize()).externalId;
    }
    return { externalId };
  };
};
