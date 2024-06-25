"use client";

import { createActionButton } from "../../utils/createActionButton";
import { useComposerSend } from "../../primitive-hooks/composer/useComposerSend";

export const ComposerSend = createActionButton("ComposerSend", useComposerSend);
