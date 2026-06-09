import type { StudyTag } from "../types";

export const fallbackTagColor = "#C77B30";
export const maxCustomTags = 12;

export const DEFAULT_TAGS: StudyTag[] = [
  {
    id: "study",
    name: "Study",
    color: "#5B8DEF",
    isDefault: true,
  },
  {
    id: "work",
    name: "Work",
    color: "#F59E0B",
    isDefault: true,
  },
  {
    id: "break",
    name: "Break",
    color: "#10B981",
    isDefault: true,
  },
  {
    id: "revision",
    name: "Revision",
    color: "#8B5CF6",
    isDefault: true,
  },
  {
    id: "reading",
    name: "Reading",
    color: "#EC4899",
    isDefault: true,
  },
  {
    id: "project",
    name: "Project",
    color: "#EF4444",
    isDefault: true,
  },
];

export function findTagByName(tags: StudyTag[], name: string) {
  const normalizedName = name.trim().toLowerCase();

  return tags.find((tag) => tag.name.toLowerCase() === normalizedName) ?? null;
}

export function findTagById(tags: StudyTag[], id: string) {
  return tags.find((tag) => tag.id === id) ?? null;
}
