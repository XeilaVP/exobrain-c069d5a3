import type { ChecklistItem, Note } from "@/types/notes";
import type { PriorityEntry } from "./taskLevels";

export interface NoteDestination { noteId: string; subtaskId?: string; }

export const destinationForEntry = (entry: PriorityEntry): NoteDestination =>
  entry.kind === "subtask" ? { noteId: entry.note.id, subtaskId: entry.item.id } : { noteId: entry.note.id };

export const initialExpandedEntries = (): Set<string> => new Set();

export function noteAncestors(notes: Note[], noteId: string): Note[] {
  const chain: Note[] = [];
  const visited = new Set<string>();
  let current = notes.find(n => n.id === noteId);
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    chain.unshift(current);
    current = notes.find(n => n.id === current?.parentNoteId);
  }
  return chain;
}

export function patchChecklistItem(items: ChecklistItem[], id: string, patch: Partial<ChecklistItem>): ChecklistItem[] {
  return items.map(item => item.id === id ? { ...item, ...patch } : item);
}

/** Replace only the target's direct checklist items, leaving every other item untouched. */
export function replaceSubtaskItems(items: ChecklistItem[], subtaskId: string, children: ChecklistItem[]): ChecklistItem[] {
  if (!items.some(item => item.id === subtaskId)) return items;
  const rest = items.filter(item => item.parentId !== subtaskId);
  const at = rest.findIndex(item => item.id === subtaskId) + 1;
  return [...rest.slice(0, at), ...children.map(item => ({ ...item, parentId: subtaskId })), ...rest.slice(at)];
}