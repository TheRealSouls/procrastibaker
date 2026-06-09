import { FormEvent, useState, type CSSProperties } from "react";
import { fallbackTagColor, maxCustomTags } from "../data/tags";
import type { StudyTag } from "../types";

type TagSelectorProps = {
  onChange: (tagId: string) => void;
  onTagsChange: (tags: StudyTag[]) => void;
  selectedTagId: string;
  tags: StudyTag[];
};

export function TagSelector({
  onChange,
  onTagsChange,
  selectedTagId,
  tags,
}: TagSelectorProps) {
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState(fallbackTagColor);
  const [error, setError] = useState("");
  const customTagCount = tags.filter((tag) => !tag.isDefault).length;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const name = tagName.trim().slice(0, 24);

    if (!name) {
      setError("Tag name cannot be empty.");
      return;
    }

    if (tags.some((tag) => tag.name.toLowerCase() === name.toLowerCase())) {
      setError("A tag with that name already exists.");
      return;
    }

    if (customTagCount >= maxCustomTags) {
      setError(`You can create up to ${maxCustomTags} custom tags.`);
      return;
    }

    const tag = {
      id: createTagId(),
      name,
      color: isHexColor(tagColor) ? tagColor : fallbackTagColor,
      isDefault: false,
    };

    onTagsChange([...tags, tag]);
    onChange(tag.id);
    setTagName("");
    setTagColor(fallbackTagColor);
    setError("");
  }

  function deleteTag(tagId: string) {
    const tag = tags.find((item) => item.id === tagId);

    if (!tag || tag.isDefault) {
      return;
    }

    const nextTags = tags.filter((item) => item.id !== tagId);
    const fallbackTagId =
      nextTags.find((item) => item.isDefault)?.id ?? nextTags[0]?.id;

    onTagsChange(nextTags);

    if (selectedTagId === tagId && fallbackTagId) {
      onChange(fallbackTagId);
    }
  }

  return (
    <section className="setup-section" aria-labelledby="tag-heading">
      <h2 id="tag-heading">Study tag</h2>
      <div className="option-grid tag-option-grid">
        {tags.map((tag) => (
          <button
            aria-pressed={tag.id === selectedTagId}
            className={
              tag.id === selectedTagId
                ? "option-button tag-option active"
                : "option-button tag-option"
            }
            key={tag.id}
            onClick={() => onChange(tag.id)}
            style={{ "--tag-color": tag.color } as CSSProperties}
            type="button"
          >
            <span className="tag-dot" aria-hidden="true" />
            <span>{tag.name}</span>
          </button>
        ))}
      </div>

      <details className="tag-manager">
        <summary>Manage tags</summary>
        <form className="tag-form" onSubmit={handleSubmit}>
          <label className="tag-form-field" htmlFor="custom-tag-name">
            Tag name
            <input
              id="custom-tag-name"
              maxLength={24}
              onChange={(event) => setTagName(event.target.value)}
              placeholder="Lab work"
              value={tagName}
            />
          </label>

          <label
            className="tag-form-field tag-form-field--color"
            htmlFor="custom-tag-color"
          >
            Colour
            <input
              className="tag-color-input"
              id="custom-tag-color"
              onChange={(event) => setTagColor(event.target.value)}
              type="color"
              value={tagColor}
            />
          </label>

          <button
            className="button primary"
            disabled={customTagCount >= maxCustomTags}
            type="submit"
          >
            Add Tag
          </button>
        </form>

        {error && (
          <p className="tag-error" role="alert">
            {error}
          </p>
        )}

        <div className="tag-list" aria-label="Available study tags">
          {tags.map((tag) => (
            <div
              className="tag-list-item"
              key={tag.id}
              style={{ "--tag-color": tag.color } as CSSProperties}
            >
              <span className="tag-pill">
                <span className="tag-dot" aria-hidden="true" />
                <span>{tag.name}</span>
              </span>
              {tag.isDefault ? (
                <span className="tag-protected">Built-in</span>
              ) : (
                <button
                  className="button tag-delete-button"
                  onClick={() => deleteTag(tag.id)}
                  type="button"
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}

function createTagId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `custom-${crypto.randomUUID()}`;
  }

  return `custom-${Date.now()}`;
}

function isHexColor(value: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}
