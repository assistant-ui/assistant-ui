"use client";

import { useCancelMessageEdit } from "../../actions/useCancelMessageEdit";
import { createActionButton } from "../../utils/createActionButton";

export const EditBarCancel = createActionButton(useCancelMessageEdit);
