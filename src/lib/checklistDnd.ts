import type { ChecklistItem } from "@/types/notes";

export type DropPosition = "before" | "after" | "inside";

/** Two levels only: root subtasks contain plain items. A subtask with items cannot be nested. */
export function canDrop(items: ChecklistItem[], dragId: string, targetId: string, pos: DropPosition): boolean {
  if (dragId === targetId) return false;
  const drag = items.find(i => i.id === dragId);
  const target = items.find(i => i.id === targetId);
  if (!drag || !target) return false;
  const dragHasChildren = items.some(i => i.parentId === dragId);
  if (pos === "inside") return !target.parentId && !dragHasChildren;
  if (target.parentId && dragHasChildren) return false;
  return true;
}

export function moveChecklistItem(items: ChecklistItem[], dragId: string, targetId: string, pos: DropPosition): ChecklistItem[] {
  if (!canDrop(items, dragId, targetId, pos)) return items;
  const drag = items.find(i => i.id === dragId)!;
  const target = items.find(i => i.id === targetId)!;
  const bundle = [drag, ...items.filter(i => i.parentId === dragId)];
  const bundleIds = new Set(bundle.map(i => i.id));
  const rest = items.filter(i => !bundleIds.has(i.id));
  const parentId = pos === "inside" ? target.id : target.parentId;
  const moved = [{ ...drag, parentId: parentId || undefined }, ...bundle.slice(1)];
  let at: number;
  if (pos === "before") at = rest.findIndex(i => i.id === targetId);
  else {
    // after target (and after its children when target is a root item and we drop at root level / inside)
    const idx = rest.findIndex(i => i.id === targetId);
    at = idx + 1;
    if (!target.parentId) while (at < rest.length && rest[at].parentId === targetId) at++;
  }
  rest.splice(at, 0, ...moved);
  return rest;
}
