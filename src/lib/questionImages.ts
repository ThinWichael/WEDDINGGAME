const modules = import.meta.glob(
  "/src/assets/questions/*.{png,jpg,jpeg,gif,webp,svg,avif}",
  {
    eager: true,
    query: "?url",
    import: "default",
  }
) as Record<string, string>;

export interface QuestionImageEntry {
  key: string;
  url: string;
}

const entries: QuestionImageEntry[] = Object.entries(modules)
  .map(([path, url]) => {
    const key = path.split("/").pop() ?? path;
    return { key, url };
  })
  .sort((a, b) => a.key.localeCompare(b.key));

export function listQuestionImages(): QuestionImageEntry[] {
  return entries;
}

export function resolveQuestionImage(key: string): string | null {
  if (!key) return null;
  return entries.find((e) => e.key === key)?.url ?? null;
}
