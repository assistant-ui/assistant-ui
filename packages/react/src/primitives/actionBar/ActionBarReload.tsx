"use client";

import { useReloadMessage } from "../../actions/useReloadMessage";
import { createActionButton } from "../../utils/createActionButton";

export const ActionBarReload = createActionButton(useReloadMessage);
