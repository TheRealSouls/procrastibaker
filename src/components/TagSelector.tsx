import type { StudyTag } from "../types";

type TagSelectorProps = {
  onChange: (tag: StudyTag) => void;
  selectedTag: StudyTag;
  tags: StudyTag[];
};

export function TagSelector({
  onChange,
  selectedTag,
  tags,
}: TagSelectorProps) {
  return (
    <section className="setup-section" aria-labelledby="tag-heading">
      <h2 id="tag-heading">Study tag</h2>
      <div className="option-grid">
        {tags.map((tag) => (
          <button
            aria-pressed={tag === selectedTag}
            className={
              tag === selectedTag ? "option-button active" : "option-button"
            }
            key={tag}
            onClick={() => onChange(tag)}
            type="button"
          >
            {tag}
          </button>
        ))}
      </div>
    </section>
  );
}
