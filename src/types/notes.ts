export type ChecklistItemStyle = "task" | "bullet";

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  style?: ChecklistItemStyle; // "task" (default) shows checkbox, "bullet" shows • only
  // Task-style extensions (optional for backwards compatibility)
  notes?: string;
  dueAt?: string | null;      // ISO date or datetime
  hasTime?: boolean;
  remindAt?: string | null;
  parentId?: string | null;   // nested subtasks within the list
  googleTaskId?: string;
  googleEventId?: string;
  updatedAt?: string;
}

export type NoteType = "text" | "checklist";

export interface Note {
  id: string;
  title: string;
  content: string;
  categoryId: string | null;
  parentNoteId: string | null;
  color?: string | null;
  posDx?: number | null;
  posDy?: number | null;
  /** Posición absoluta fija en el mapa. Nunca se recalcula una vez asignada. */
  posX?: number | null;
  posY?: number | null;
  linkedNoteIds: string[];
  checklist: ChecklistItem[];
  noteType: NoteType;
  isCollapsed: boolean;
  icon?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  parentId: string | null;
  isCollapsed: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
