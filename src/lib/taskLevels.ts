import type { ChecklistItem, Note } from "@/types/notes";

/** Levels: note = task, root checklist item = subtask, child item = plain checklist item. */
export const isSubtask = (i: ChecklistItem) => !i.parentId && i.style !== "bullet";
export const itemsOf = (note: Note, subtaskId: string) => note.checklist.filter(i => i.parentId === subtaskId);

export type PriorityEntry =
  | { kind: "task"; note: Note; priority?: string | null; dueAt?: string | null }
  | { kind: "subtask"; note: Note; item: ChecklistItem; priority?: string | null; dueAt?: string | null };

const rank = (p?: string | null) => (p === "high" ? 0 : p === "medium" ? 1 : p === "low" ? 2 : 3);

export function prioritizedEntries(notes: Note[]): PriorityEntry[] {
  const out: PriorityEntry[] = [];
  for (const note of notes) {
    // Membership is per note and manual: parents/children never inherit it.
    if (!note.inTasks) continue;
    const noteDue = note.calendarAt ?? null;
    if (note.priority || noteDue || note.noteType !== "checklist") { out.push({ kind: "task", note, priority: note.priority, dueAt: noteDue }); continue; }
    const before = out.length;
    for (const item of note.checklist) {
      if (isSubtask(item) && (item.priority || item.dueAt)) out.push({ kind: "subtask", note, item, priority: item.priority, dueAt: item.dueAt });
    }
    if (out.length === before) out.push({ kind: "task", note, priority: null, dueAt: null });
  }
  return out.sort((a, b) => rank(a.priority) - rank(b.priority)
    || (a.dueAt ? new Date(a.dueAt).getTime() : Infinity) - (b.dueAt ? new Date(b.dueAt).getTime() : Infinity));
}
