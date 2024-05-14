"use client";

import { useBeginMessageEdit } from "../../actions/useBeginMessageEdit";
import { createActionButton } from "../../utils/createActionButton";

export const ActionBarEdit = createActionButton(useBeginMessageEdit);
