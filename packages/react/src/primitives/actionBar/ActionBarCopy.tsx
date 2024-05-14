"use client";

import { useCopyMessage } from "../../actions/useCopyMessage";
import { createActionButton } from "../../utils/createActionButton";

type ActionBarCopyProps = {
  copiedDuration?: number;
};

export const ActionBarCopy =
  createActionButton<ActionBarCopyProps>(useCopyMessage);
