"use client";

import { useSaveMessageEdit } from "../../actions/useSaveMessageEdit";
import { createActionButton } from "../../utils/createActionButton";

export const EditBarSave = createActionButton(useSaveMessageEdit);
