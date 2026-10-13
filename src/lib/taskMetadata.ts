import type { Note } from "@/types/notes";

const ranks: Record<string, number> = { high: 0, medium: 1, low: 2 };

/** Own note priority participates alongside pending subtasks in Post-its sorting. */
export function postItPriorityRank(note: Note): number {
  const priorities = note.checklist
    .filter(item => !item.parentId && item.style !== "bullet" && !item.completed && item.priority)
    .map(item => ranks[item.priority ?? ""]);
  return Math.min(note.priority ? ranks[note.priority] : Infinity, ...priorities);
}

export function dateInputToISO(value: string, withTime: boolean): string | null {
  if (!value) return null;
  return new Date(withTime ? value : `${value.slice(0, 10)}T12:00:00`).toISOString();
}