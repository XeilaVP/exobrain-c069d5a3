import type { ChecklistItem } from "@/types/notes";

/** Stable reorder: within each sibling group, pending first then completed; children follow their parent. */
export function sortChecklistByCompletion(items: ChecklistItem[]): ChecklistItem[] {
  const ids = new Set(items.map(i => i.id));
  const byParent = new Map<string, ChecklistItem[]>();
  for (const i of items) {
    const key = i.parentId && ids.has(i.parentId) ? i.parentId : "__root";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(i);
  }
  const out: ChecklistItem[] = [];
  const walk = (key: string) => {
    const group = byParent.get(key) ?? [];
    const sorted = [...group.filter(i => !i.completed), ...group.filter(i => i.completed)];
    for (const i of sorted) { out.push(i); walk(i.id); }
  };
  walk("__root");
  return out;
}

export function toggleAndSort(items: ChecklistItem[], id: string): ChecklistItem[] {
  return sortChecklistByCompletion(items.map(i => i.id === id ? { ...i, completed: !i.completed } : i));
}
