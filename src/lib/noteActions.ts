import type { Note } from "@/types/notes";

export function favoritePathIds(notes: Note[]): Set<string> {
  const byId = new Map(notes.map(note => [note.id, note]));
  const ids = new Set<string>();
  for (const note of notes.filter(note => note.isFavorite)) {
    let current: Note | undefined = note;
    const visited = new Set<string>();
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      ids.add(current.id);
      current = current.parentNoteId ? byId.get(current.parentNoteId) : undefined;
    }
  }
  return ids;
}

export function duplicateNoteData(note: Note, newId: () => string = () => crypto.randomUUID()) {
  const ids = new Map(note.checklist.map(item => [item.id, newId()]));
  return {
    title: `${note.title} (copia)`, content: note.content,
    category_id: note.categoryId, parent_note_id: note.parentNoteId,
    note_type: note.noteType, color: note.color, icon: note.icon,
    priority: note.priority, calendar_at: note.calendarAt,
    calendar_has_time: note.calendarHasTime ?? false,
    is_favorite: false, in_tasks: false, in_postits: false,
    linked_note_ids: [],
    pos_x: note.posX != null ? note.posX + 90 : null,
    pos_y: note.posY != null ? note.posY + 60 : null,
    checklist: note.checklist.map(item => {
      const { googleTaskId, googleEventId, ...rest } = item;
      return { ...rest, id: ids.get(item.id), parentId: item.parentId ? ids.get(item.parentId) ?? item.parentId : item.parentId };
    }),
  };
}

export function plainNoteText(note: Note): string {
  const plain = (value: string) => {
    const doc = new DOMParser().parseFromString(value.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|h[1-6]|li)>/gi, "\n"), "text/html");
    return (doc.body.textContent ?? "").trim();
  };
  const lines = [note.title, plain(note.content)];
  for (const item of note.checklist) {
    const indent = item.parentId ? "  " : "";
    lines.push(`${indent}${item.style === "bullet" ? "•" : item.completed ? "[x]" : "[ ]"} ${plain(item.text)}`);
    if (item.notes) lines.push(`${indent}  ${plain(item.notes)}`);
  }
  return lines.filter(Boolean).join("\n");
}