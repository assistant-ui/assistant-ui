import { formatBoolean } from "../../utils/common";
import type { ComposerPreview } from "./types";

export const ComposerFlags = ({ composer }: { composer: ComposerPreview }) => (
  <div className="text-muted-foreground flex flex-wrap gap-2 text-[11px]">
    {typeof composer.isEditing === "boolean" ? (
      <span>Edit: {formatBoolean(composer.isEditing)}</span>
    ) : null}
    {typeof composer.canCancel === "boolean" ? (
      <span>Can cancel: {formatBoolean(composer.canCancel)}</span>
    ) : null}
    {typeof composer.canSend === "boolean" ? (
      <span>Can send: {formatBoolean(composer.canSend)}</span>
    ) : null}
    {typeof composer.isEmpty === "boolean" ? (
      <span>Empty: {formatBoolean(composer.isEmpty)}</span>
    ) : null}
  </div>
);
