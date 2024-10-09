import { Composer } from "@assistant-ui/react";
import { FC } from "react";
import { useTrieveExtras } from "../runtime/useTrieveRuntime";

const TrieveComposerTagSelector: FC = () => {
  const { tags, selectedTag, setSelectedTag } = useTrieveExtras();
  if (!tags?.length) return null;

  return (
    <div className="aui-trieve-composer-tag-selector">
      <button
        className="aui-trieve-composer-tag-selector-tag"
        {...(selectedTag === undefined && {
          "data-selected": true,
        })}
        onClick={() => setSelectedTag(undefined)}
      >
        All
      </button>
      {tags.map((tag) => (
        <button
          key={tag.value}
          className={"aui-trieve-composer-tag-selector-tag"}
          {...(selectedTag === tag.value && {
            "data-selected": true,
          })}
          onClick={() => setSelectedTag(tag.value)}
        >
          {tag.name}
        </button>
      ))}
    </div>
  );
};

const TrieveComposer: FC = () => {
  return (
    <>
      <Composer.Root>
        <Composer.Input autoFocus />
        <Composer.Action />
      </Composer.Root>
      <TrieveComposerTagSelector />
    </>
  );
};

const exports = {
  TagSelector: TrieveComposerTagSelector,
};

export default Object.assign(TrieveComposer, exports) as typeof TrieveComposer &
  typeof exports;
