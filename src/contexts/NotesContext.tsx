import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";
import { Note, Category, ChecklistItem, NoteType } from "@/types/notes";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface AiActionPayload {
  action: "create_note" | "update_note" | "create_category";
  title?: string;
  name?: string;
  content?: string;
  noteType?: NoteType;
  categoryId?: string | null;
  parentNoteId?: string | null;
  noteId?: string;
  appendContent?: string;
  replaceContent?: string;
  addChecklistItems?: string[];
  color?: string;
  icon?: string;
}

export interface NoteVersion {
  id: string;
  noteId: string;
  title: string;
  content: string;
  checklist: ChecklistItem[];
  categoryId: string | null;
  parentNoteId: string | null;
  linkedNoteIds: string[];
  noteType: NoteType;
  isCollapsed: boolean;
  icon?: string | null;
  color?: string | null;
  eventType: string;
  source: string;
  createdAt: string;
}

interface NotesContextType {
  notes: Note[];
  categories: Category[];
  selectedCategoryId: string | null;
  selectedNoteId: string | null;
  activeView: "notes" | "graph";
  loading: boolean;
  setActiveView: (v: "notes" | "graph") => void;
  setSelectedCategoryId: (id: string | null) => void;
  setSelectedNoteId: (id: string | null) => void;
  addNote: (categoryId: string | null, parentNoteId?: string | null, noteType?: NoteType, color?: string | null, pos?: { x: number; y: number } | null) => Promise<Note | null>;
  moveNote: (noteId: string, newParentId: string | null) => Promise<boolean>;
  getDescendantIds: (noteId: string) => Set<string>;
  canMoveTo: (noteId: string, targetId: string | null) => boolean;
  getRootNotes: () => Note[];
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  addCategory: (name: string, icon: string, color?: string, parentId?: string | null) => void;
  updateCategory: (id: string, updates: Partial<Pick<Category, "name" | "icon" | "color">>) => void;
  deleteCategory: (id: string) => void;
  addChecklistItem: (noteId: string, text: string) => void;
  toggleChecklistItem: (noteId: string, itemId: string) => void;
  deleteChecklistItem: (noteId: string, itemId: string) => void;
  toggleNoteCollapsed: (noteId: string) => void;
  toggleCategoryCollapsed: (categoryId: string) => void;
  linkNotes: (noteIdA: string, noteIdB: string) => void;
  unlinkNotes: (noteIdA: string, noteIdB: string) => void;
  filteredNotes: Note[];
  selectedNote: Note | undefined;
  createNoteFromChat: (title: string, content: string, categoryId?: string) => Note;
  getChildNotes: (noteId: string) => Note[];
  getLinkedNotes: (noteId: string) => Note[];
  getParentNote: (noteId: string) => Note | undefined;
  getSubcategories: (categoryId: string) => Category[];
  getRootCategories: () => Category[];
  getCategoryPath: (categoryId: string) => Category[];
  brainName: string;
  setBrainName: (name: string) => void;
  onboarded: boolean;
  setOnboarded: (v: boolean) => void;
  applyAiAction: (payload: AiActionPayload) => Promise<Note | Category | null>;
  getNoteVersions: (noteId: string) => Promise<NoteVersion[]>;
  restoreVersion: (noteId: string, versionId: string) => Promise<boolean>;
  recoverDeletedVersion: (versionId: string) => Promise<Note | null>;
  updateNotePosition: (id: string, dx: number | null, dy: number | null) => Promise<void>;
  saveNotePositions: (entries: { id: string; dx: number; dy: number }[]) => Promise<void>;
  clearAllPositions: () => Promise<void>;
  /** Guarda posiciones absolutas fijas (x/y) de una o varias notas. */
  saveAbsolutePositions: (entries: { id: string; x: number; y: number }[]) => Promise<void>;
  brainPos: { x: number; y: number } | null;
  setBrainPos: (pos: { x: number; y: number }) => Promise<void>;
}

const NotesContext = createContext<NotesContextType | null>(null);

export const useNotes = () => {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error("useNotes must be used within NotesProvider");
  return ctx;
};

// Map DB row to app Note
const dbToNote = (row: any): Note => ({
  id: row.id,
  title: row.title,
  content: row.content,
  categoryId: row.category_id ?? null,
  parentNoteId: row.parent_note_id ?? null,
  color: row.color ?? null,
  posDx: row.pos_dx ?? null,
  posDy: row.pos_dy ?? null,
  posX: row.pos_x ?? null,
  posY: row.pos_y ?? null,
  linkedNoteIds: row.linked_note_ids ?? [],
  checklist: (row.checklist as ChecklistItem[]) ?? [],
  noteType: (row.note_type as NoteType) ?? "text",
  isCollapsed: row.is_collapsed ?? true,
  icon: row.icon ?? null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const dbToCategory = (row: any): Category => ({
  id: row.id,
  name: row.name,
  icon: row.icon,
  color: row.color,
  parentId: null,
  isCollapsed: row.is_collapsed ?? true,
});

export const NotesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"notes" | "graph">("graph");
  const [loading, setLoading] = useState(true);
  const [brainName, setBrainNameState] = useState<string>("ExoBrain");
  const [onboarded, setOnboardedState] = useState<boolean>(true);
  const [brainPos, setBrainPosState] = useState<{ x: number; y: number } | null>(null);

  // Load data from DB
  useEffect(() => {
    if (!user) { setNotes([]); setCategories([]); setLoading(false); return; }
    setLoading(true);
    const load = async () => {
      const [catsRes, notesRes, profileRes] = await Promise.all([
        supabase.from("categories").select("*").order("created_at"),
        supabase.from("notes").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("brain_name, onboarded, brain_pos_x, brain_pos_y").eq("id", user.id).maybeSingle(),
      ]);
      if (catsRes.data) setCategories(catsRes.data.map(dbToCategory));
      if (notesRes.data) setNotes(notesRes.data.map(dbToNote));
      if (profileRes.data) {
        setBrainNameState(profileRes.data.brain_name || "ExoBrain");
        setOnboardedState(profileRes.data.onboarded ?? false);
        const bx = (profileRes.data as any).brain_pos_x;
        const by = (profileRes.data as any).brain_pos_y;
        setBrainPosState(bx !== null && bx !== undefined && by !== null && by !== undefined ? { x: Number(bx), y: Number(by) } : null);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const setBrainName = useCallback(async (name: string) => {
    if (!user) return;
    setBrainNameState(name);
    await supabase.from("profiles").update({ brain_name: name }).eq("id", user.id);
  }, [user]);

  const setOnboarded = useCallback(async (v: boolean) => {
    if (!user) return;
    setOnboardedState(v);
    await supabase.from("profiles").update({ onboarded: v }).eq("id", user.id);
  }, [user]);

  // Posición fija de la base del árbol (ExoBrain). Se guarda una vez y no se recalcula.
  const setBrainPos = useCallback(async (pos: { x: number; y: number }) => {
    setBrainPosState(pos);
    if (!user) return;
    await supabase.from("profiles").update({ brain_pos_x: pos.x, brain_pos_y: pos.y } as any).eq("id", user.id);
  }, [user]);


  // Debounced save for note updates
  const updateTimers = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const addNote = useCallback(async (categoryId: string | null, parentNoteId?: string | null, noteType: NoteType = "text", color?: string | null, pos?: { x: number; y: number } | null) => {
    if (!user) return null;
    // Child notes inherit parent's category and color
    let catId = categoryId;
    let noteColor = color ?? null;
    if (parentNoteId) {
      const parent = notes.find(n => n.id === parentNoteId);
      if (parent) {
        catId = parent.categoryId;
        noteColor = parent.color ?? noteColor;
      }
    }
    const { data, error } = await supabase.from("notes").insert({
      user_id: user.id,
      category_id: catId,
      color: noteColor,
      parent_note_id: parentNoteId ?? null,
      title: noteType === "checklist" ? "Nueva lista" : "Nueva nota",
      content: "",
      checklist: [],
      linked_note_ids: [],
      note_type: noteType,
      pos_x: pos ? pos.x : null,
      pos_y: pos ? pos.y : null,
    }).select().single();
    if (error) { toast.error("Error al crear nota"); return null; }
    const note = dbToNote(data);
    setNotes(prev => [note, ...prev]);
    setSelectedNoteId(note.id);
    return note;
  }, [user, notes]);

  const updateNote = useCallback((id: string, updates: Partial<Note>) => {
    // Optimistic update locally
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n));
    // Debounce DB save
    clearTimeout(updateTimers.current[id]);
    updateTimers.current[id] = setTimeout(async () => {
      const dbUpdates: any = { updated_at: new Date().toISOString() };
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.content !== undefined) dbUpdates.content = updates.content;
      if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId;
      if (updates.parentNoteId !== undefined) dbUpdates.parent_note_id = updates.parentNoteId;
      if (updates.checklist !== undefined) dbUpdates.checklist = updates.checklist;
      if (updates.linkedNoteIds !== undefined) dbUpdates.linked_note_ids = updates.linkedNoteIds;
      if ((updates as any).icon !== undefined) dbUpdates.icon = (updates as any).icon;
      if (updates.color !== undefined) dbUpdates.color = updates.color;
      await supabase.from("notes").update(dbUpdates).eq("id", id);
    }, 500);
  }, []);

    const updateNotePosition = useCallback(async (id: string, dx: number | null, dy: number | null) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, posDx: dx, posDy: dy } : n));
    await supabase.from("notes").update({ pos_dx: dx, pos_dy: dy }).eq("id", id);
  }, []);

  const saveNotePositions = useCallback(async (entries: { id: string; dx: number; dy: number }[]) => {
    if (entries.length === 0) return;
    const map = new Map(entries.map(e => [e.id, e]));
    setNotes(prev => prev.map(n => {
      const e = map.get(n.id);
      return e ? { ...n, posDx: e.dx, posDy: e.dy } : n;
    }));
    await Promise.all(
      entries.map(e => supabase.from("notes").update({ pos_dx: e.dx, pos_dy: e.dy }).eq("id", e.id)),
    );
  }, []);

  // Posiciones absolutas fijas: se escriben al crear, al sembrar por primera vez
  // y al soltar un arrastre. Nada más las toca.
  const saveAbsolutePositions = useCallback(async (entries: { id: string; x: number; y: number }[]) => {
    if (entries.length === 0) return;
    const map = new Map(entries.map(e => [e.id, e]));
    setNotes(prev => prev.map(n => {
      const e = map.get(n.id);
      return e ? { ...n, posX: e.x, posY: e.y } : n;
    }));
    await Promise.all(
      entries.map(e => supabase.from("notes").update({ pos_x: e.x, pos_y: e.y }).eq("id", e.id)),
    );
  }, []);

  const clearAllPositions = useCallback(async () => {
    if (!user) return;
    setNotes(prev => prev.map(n => ({ ...n, posDx: null, posDy: null })));
    await supabase.from("notes").update({ pos_dx: null, pos_dy: null }).eq("user_id", user.id);
  }, [user]);

  const deleteNote = useCallback(async (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id).map(n => ({
      ...n,
      parentNoteId: n.parentNoteId === id ? null : n.parentNoteId,
      linkedNoteIds: n.linkedNoteIds.filter(lid => lid !== id),
    })));
    setSelectedNoteId(prev => prev === id ? null : prev);
    // Also update notes that referenced this one
    const affected = notes.filter(n => n.linkedNoteIds.includes(id));
    for (const n of affected) {
      await supabase.from("notes").update({ linked_note_ids: n.linkedNoteIds.filter(lid => lid !== id) }).eq("id", n.id);
    }
    // Remove orphan parent refs
    await supabase.from("notes").update({ parent_note_id: null }).eq("parent_note_id", id);
    await supabase.from("notes").delete().eq("id", id);
  }, [notes]);

  const addCategory = useCallback(async (name: string, icon: string, color?: string, _parentId?: string | null) => {
    if (!user) return;
    const { data, error } = await supabase.from("categories").insert({
      user_id: user.id, name, icon, color: color ?? "14 65% 55%",
    }).select().single();
    if (error) { toast.error("Error al crear categoría"); return; }
    setCategories(prev => [...prev, dbToCategory(data)]);
  }, [user]);

  const updateCategory = useCallback(async (id: string, updates: Partial<Pick<Category, "name" | "icon" | "color">>) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    await supabase.from("categories").update(updates).eq("id", id);
  }, []);


  const deleteCategory = useCallback(async (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
    setNotes(prev => prev.filter(n => n.categoryId !== id));
    await supabase.from("categories").delete().eq("id", id);
  }, []);

  // Debounce checklist writes per note to coalesce rapid mutations (add + delete) and
  // avoid race conditions where an older PATCH overwrites a newer one on the server.
  const checklistTimers = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const persistChecklist = useCallback((noteId: string, newChecklist: ChecklistItem[]) => {
    clearTimeout(updateTimers.current[noteId]);
    clearTimeout(checklistTimers.current[noteId]);
    checklistTimers.current[noteId] = setTimeout(() => {
      supabase.from("notes")
        .update({ checklist: newChecklist as any, updated_at: new Date().toISOString() })
        .eq("id", noteId)
        .then(({ error }) => { if (error) toast.error("No se pudo guardar la lista"); });
    }, 250);
  }, []);

  const addChecklistItem = useCallback((noteId: string, text: string) => {
    setNotes(prev => {
      const target = prev.find(n => n.id === noteId);
      if (!target) return prev;
      const newChecklist = [...target.checklist, { id: crypto.randomUUID(), text, completed: false }];
      persistChecklist(noteId, newChecklist);
      return prev.map(n => n.id === noteId ? { ...n, checklist: newChecklist, updatedAt: new Date().toISOString() } : n);
    });
  }, [persistChecklist]);

  const toggleChecklistItem = useCallback((noteId: string, itemId: string) => {
    setNotes(prev => {
      const target = prev.find(n => n.id === noteId);
      if (!target) return prev;
      const newChecklist = target.checklist.map(i => i.id === itemId ? { ...i, completed: !i.completed } : i);
      persistChecklist(noteId, newChecklist);
      return prev.map(n => n.id === noteId ? { ...n, checklist: newChecklist, updatedAt: new Date().toISOString() } : n);
    });
  }, [persistChecklist]);

  const deleteChecklistItem = useCallback((noteId: string, itemId: string) => {
    setNotes(prev => {
      const target = prev.find(n => n.id === noteId);
      if (!target) return prev;
      const newChecklist = target.checklist.filter(i => i.id !== itemId);
      persistChecklist(noteId, newChecklist);
      return prev.map(n => n.id === noteId ? { ...n, checklist: newChecklist, updatedAt: new Date().toISOString() } : n);
    });
  }, [persistChecklist]);

  const toggleNoteCollapsed = useCallback((noteId: string) => {
    setNotes(prev => prev.map(n => {
      if (n.id !== noteId) return n;
      const next = !n.isCollapsed;
      supabase.from("notes").update({ is_collapsed: next }).eq("id", noteId);
      return { ...n, isCollapsed: next };
    }));
  }, []);

  const toggleCategoryCollapsed = useCallback((categoryId: string) => {
    setCategories(prev => prev.map(c => {
      if (c.id !== categoryId) return c;
      const next = !c.isCollapsed;
      supabase.from("categories").update({ is_collapsed: next }).eq("id", categoryId);
      return { ...c, isCollapsed: next };
    }));
  }, []);


  const linkNotes = useCallback((noteIdA: string, noteIdB: string) => {
    if (noteIdA === noteIdB) return;
    setNotes(prev => {
      const updated = prev.map(n => {
        if (n.id === noteIdA && !n.linkedNoteIds.includes(noteIdB)) {
          const newLinks = [...n.linkedNoteIds, noteIdB];
          supabase.from("notes").update({ linked_note_ids: newLinks, updated_at: new Date().toISOString() }).eq("id", noteIdA);
          return { ...n, linkedNoteIds: newLinks, updatedAt: new Date().toISOString() };
        }
        if (n.id === noteIdB && !n.linkedNoteIds.includes(noteIdA)) {
          const newLinks = [...n.linkedNoteIds, noteIdA];
          supabase.from("notes").update({ linked_note_ids: newLinks, updated_at: new Date().toISOString() }).eq("id", noteIdB);
          return { ...n, linkedNoteIds: newLinks, updatedAt: new Date().toISOString() };
        }
        return n;
      });
      return updated;
    });
  }, []);

  const unlinkNotes = useCallback((noteIdA: string, noteIdB: string) => {
    setNotes(prev => prev.map(n => {
      if (n.id === noteIdA) {
        const newLinks = n.linkedNoteIds.filter(id => id !== noteIdB);
        supabase.from("notes").update({ linked_note_ids: newLinks }).eq("id", noteIdA);
        return { ...n, linkedNoteIds: newLinks };
      }
      if (n.id === noteIdB) {
        const newLinks = n.linkedNoteIds.filter(id => id !== noteIdA);
        supabase.from("notes").update({ linked_note_ids: newLinks }).eq("id", noteIdB);
        return { ...n, linkedNoteIds: newLinks };
      }
      return n;
    }));
  }, []);

  const createNoteFromChat = useCallback((title: string, content: string, categoryId?: string) => {
    const catId = categoryId || categories[0]?.id || "";
    const note: Note = {
      id: crypto.randomUUID(), title, content, categoryId: catId,
      parentNoteId: null, linkedNoteIds: [], checklist: [],
      noteType: "text", isCollapsed: true,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    return note;
  }, [categories]);

  const applyAiAction = useCallback(async (payload: AiActionPayload): Promise<Note | Category | null> => {
    if (!user) return null;
    try {
      if (payload.action === "create_note") {
        const title = payload.title || "Nueva nota";
        const noteType = payload.noteType || "text";
        let catId = payload.categoryId || categories[0]?.id || "";
        if (payload.parentNoteId) {
          const parent = notes.find(n => n.id === payload.parentNoteId);
          if (parent) catId = parent.categoryId;
        }
        const { data, error } = await supabase.from("notes").insert({
          user_id: user.id,
          category_id: catId,
          parent_note_id: payload.parentNoteId ?? null,
          title,
          content: payload.content || "",
          checklist: [],
          linked_note_ids: [],
          note_type: noteType,
        }).select().single();
        if (error) throw error;
        const note = dbToNote(data);
        setNotes(prev => [note, ...prev]);
        setSelectedNoteId(note.id);
        return note;
      }

      if (payload.action === "update_note") {
        const note = notes.find(n => n.id === payload.noteId);
        if (!note || !payload.noteId) return null;
        const updates: Partial<Note> = {};
        if (payload.title !== undefined) updates.title = payload.title;
        if (payload.replaceContent !== undefined) updates.content = payload.replaceContent;
        else if (payload.appendContent !== undefined) updates.content = note.content + "\n\n" + payload.appendContent;
        if (payload.addChecklistItems && payload.addChecklistItems.length > 0) {
          const newItems = payload.addChecklistItems.map(text => ({
            id: crypto.randomUUID(),
            text,
            completed: false,
            style: "task" as const,
          }));
          updates.checklist = [...note.checklist, ...newItems];
        }
        updateNote(payload.noteId, updates);
        return note;
      }

      if (payload.action === "create_category") {
        const name = payload.name || "Nuevo tema";
        const { data, error } = await supabase.from("categories").insert({
          user_id: user.id,
          name,
          icon: payload.icon || "📌",
          color: payload.color || "30 50% 55%",
        }).select().single();
        if (error) throw error;
        const category = dbToCategory(data);
        setCategories(prev => [...prev, category]);
        return category;
      }
      return null;
    } catch (error) {
      console.error("applyAiAction error:", error);
      toast.error("No se pudo aplicar la acción del asistente");
      return null;
    }
  }, [user, notes, categories, updateNote]);

  const getNoteVersions = useCallback(async (noteId: string): Promise<NoteVersion[]> => {
    const { data, error } = await supabase.from("note_versions")
      .select("id, note_id, title, content, checklist, category_id, parent_note_id, linked_note_ids, note_type, is_collapsed, icon, event_type, source, created_at")
      .eq("note_id", noteId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("getNoteVersions error:", error);
      return [];
    }
    return (data || []).map((row: any) => ({
      id: row.id,
      noteId: row.note_id,
      title: row.title,
      content: row.content,
      checklist: row.checklist as ChecklistItem[],
      categoryId: row.category_id,
      parentNoteId: row.parent_note_id,
      linkedNoteIds: row.linked_note_ids ?? [],
      noteType: (row.note_type as NoteType) ?? "text",
      isCollapsed: row.is_collapsed ?? true,
      icon: row.icon ?? null,
      eventType: row.event_type ?? "edit",
      source: row.source,
      createdAt: row.created_at,
    }));
  }, []);

  const restoreVersion = useCallback(async (noteId: string, versionId: string): Promise<boolean> => {
    clearTimeout(updateTimers.current[noteId]);
    clearTimeout(checklistTimers.current[noteId]);

    const { data, error } = await supabase.rpc("restore_note_version", {
      _note_id: noteId,
      _version_id: versionId,
    });

    if (error || !data) {
      console.error("restoreVersion error:", error);
      toast.error("No se pudo cargar la versión");
      return false;
    }

    const restored = dbToNote(data);
    setNotes(prev => prev.map(n => n.id === noteId ? restored : n));
    setSelectedNoteId(noteId);
    toast.success("Versión restaurada");
    return true;
  }, []);

  const recoverDeletedVersion = useCallback(async (versionId: string): Promise<Note | null> => {
    const { data, error } = await supabase.rpc("recover_deleted_note_version", {
      _version_id: versionId,
    });

    if (error || !data) {
      console.error("recoverDeletedVersion error:", error);
      toast.error("No se pudo recuperar la nota");
      return null;
    }

    const recovered = dbToNote(data);
    setNotes(prev => [recovered, ...prev]);
    setSelectedNoteId(recovered.id);
    toast.success("Nota recuperada");
    return recovered;
  }, []);

  const getDescendantIds = useCallback((noteId: string) => {
    const ids = new Set<string>();
    const walk = (id: string) => {
      for (const n of notes) {
        if (n.parentNoteId === id && !ids.has(n.id)) { ids.add(n.id); walk(n.id); }
      }
    };
    walk(noteId);
    return ids;
  }, [notes]);

  const canMoveTo = useCallback((noteId: string, targetId: string | null) => {
    if (targetId === null) return true;
    if (targetId === noteId) return false;
    return !getDescendantIds(noteId).has(targetId);
  }, [getDescendantIds]);

  const getRootNotes = useCallback(() => notes.filter(n => !n.parentNoteId), [notes]);

  const moveNote = useCallback(async (noteId: string, newParentId: string | null) => {
    if (!canMoveTo(noteId, newParentId)) {
      toast.error("No puedes mover una nota dentro de sí misma");
      return false;
    }
    const { data, error } = await supabase.rpc("move_note", {
      _note_id: noteId,
      _new_parent_id: newParentId,
    });
    if (error) {
      console.error("moveNote error:", error);
      toast.error("No se pudo mover");
      return false;
    }
    const updated = (data as any[] | null)?.map(dbToNote) ?? [];
    if (updated.length) {
      const byId = new Map(updated.map(n => [n.id, n]));
      setNotes(prev => prev.map(n => byId.get(n.id) ?? n));
    }
    toast.success("Movido");
    return true;
  }, [canMoveTo]);

  const getChildNotes = useCallback((noteId: string) => notes.filter(n => n.parentNoteId === noteId), [notes]);
  const getLinkedNotes = useCallback((noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return [];
    return notes.filter(n => note.linkedNoteIds.includes(n.id));
  }, [notes]);
  const getParentNote = useCallback((noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note?.parentNoteId) return undefined;
    return notes.find(n => n.id === note.parentNoteId);
  }, [notes]);

  const getSubcategories = useCallback((_categoryId: string) => [] as Category[], []);
  const getRootCategories = useCallback(() => categories, [categories]);
  const getCategoryPath = useCallback((categoryId: string): Category[] => {
    const cat = categories.find(c => c.id === categoryId);
    return cat ? [cat] : [];
  }, [categories]);

  const filteredNotes = selectedCategoryId
    ? notes.filter(n => n.categoryId === selectedCategoryId)
    : notes;

  const selectedNote = notes.find(n => n.id === selectedNoteId);

  return (
    <NotesContext.Provider value={{
      notes, categories, selectedCategoryId, selectedNoteId, activeView, loading,
      setActiveView, setSelectedCategoryId, setSelectedNoteId,
      addNote, moveNote, getDescendantIds, canMoveTo, getRootNotes, updateNote, deleteNote, addCategory, updateCategory, deleteCategory,
      addChecklistItem, toggleChecklistItem, deleteChecklistItem,
      toggleNoteCollapsed, toggleCategoryCollapsed,
      linkNotes, unlinkNotes,
      filteredNotes, selectedNote, createNoteFromChat,
      getChildNotes, getLinkedNotes, getParentNote,
      getSubcategories, getRootCategories, getCategoryPath,
      brainName, setBrainName, onboarded, setOnboarded,
      applyAiAction, getNoteVersions, restoreVersion, recoverDeletedVersion,
      updateNotePosition, saveNotePositions, clearAllPositions,
    }}>
      {children}
    </NotesContext.Provider>
  );
};
