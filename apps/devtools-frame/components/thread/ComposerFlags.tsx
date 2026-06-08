import { formatBoolean } from "../common";
import type { ComposerPreview } from "./types";

export const ComposerFlags = ({ composer }: { composer: ComposerPreview }) => (
  <div className="flex flex-wrap gap-2 text-[10px] tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
    {typeof composer.isEditing === "boolean" ? (
      <span>Edit: {formatBoolean(composer.isEditing)}</span>
    ) : null}
    {typeof composer.canCancel === "boolean" ? (
      <span>Can Cancel: {formatBoolean(composer.canCancel)}</span>
    ) : null}
    {typeof composer.canSend === "boolean" ? (
      <span>Can Send: {formatBoolean(composer.canSend)}</span>
    ) : null}
    {typeof composer.isEmpty === "boolean" ? (
      <span>Empty: {formatBoolean(composer.isEmpty)}</span>
    ) : null}
  </div>
);
