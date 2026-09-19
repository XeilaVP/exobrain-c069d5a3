import { useMemo, useState } from "react";
import { CalendarDays, ChevronDown, ChevronRight, ExternalLink, Flag, ListChecks } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useNotes } from "@/contexts/NotesContext";
import { Button } from "@/components/ui/button";
import { ChecklistItem, Note } from "@/types/notes";

interface TasksViewProps { onOpenNote: (id: string) => void; }

const TasksView = ({ onOpenNote }: TasksViewProps) => {
  const { notes, updateNote } = useNotes();
  const [openNotes, setOpenNotes] = useState<Set<string>>(() => new Set(notes.filter(n => n.noteType === "checklist").map(n => n.id)));
  const listNotes = useMemo(() => notes.filter(n => n.noteType === "checklist"), [notes]);
  const depthOf = (note: Note) => { let depth = 0; let parent = note.parentNoteId; const seen = new Set<string>(); while (parent && !seen.has(parent)) { seen.add(parent); depth++; parent = notes.find(n => n.id === parent)?.parentNoteId ?? null; } return depth; };
  const patchItem = (note: Note, itemId: string, patch: Partial<ChecklistItem>) => updateNote(note.id, { checklist: note.checklist.map(item => item.id === itemId ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item) });
  const priorityLabel = { high: "Alta", medium: "Media", low: "Baja" } as const;

  return (
    <section className="h-full overflow-y-auto bg-background px-8 py-7 scrollbar-thin">
      <div className="mx-auto max-w-5xl">
        <div className="mb-7 flex items-end justify-between"><div><h2 className="text-3xl font-semibold">Tasks</h2><p className="mt-1 text-sm text-muted-foreground">Tareas organizadas según las ramas de ExoBrain</p></div><span className="text-sm text-muted-foreground">{listNotes.reduce((sum, n) => sum + n.checklist.filter(i => i.style !== "bullet").length, 0)} tareas</span></div>
        <div className="space-y-3">
          {listNotes.map(note => {
            const roots = note.checklist.filter(i => !i.parentId && i.style !== "bullet");
            const isOpen = openNotes.has(note.id);
            return (
              <article key={note.id} className="rounded-lg border border-border bg-card shadow-soft" style={{ marginLeft: Math.min(depthOf(note) * 18, 90) }}>
                <header className="flex items-center gap-2 border-b border-border px-3 py-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpenNotes(prev => { const next = new Set(prev); next.has(note.id) ? next.delete(note.id) : next.add(note.id); return next; })}>{isOpen ? <ChevronDown /> : <ChevronRight />}</Button>
                  <ListChecks className="text-primary" /><h3 className="flex-1 font-display font-semibold">{note.title}</h3>
                  <Button variant="ghost" size="sm" onClick={() => onOpenNote(note.id)}><ExternalLink /> Ver nota</Button>
                </header>
                {isOpen && <div className="divide-y divide-border/70 px-3">{roots.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Sin tareas</p> : roots.map(item => {
                  const children = note.checklist.filter(i => i.parentId === item.id && i.style !== "bullet");
                  const row = (task: ChecklistItem, child = false) => <div key={task.id} className={`flex min-h-12 items-center gap-3 py-2 ${child ? "ml-8" : ""}`}>
                    <input type="checkbox" checked={task.completed} onChange={() => patchItem(note, task.id, { completed: !task.completed })} className="h-4 w-4 accent-primary" />
                    <input value={task.text} onChange={e => patchItem(note, task.id, { text: e.target.value })} className={`min-w-0 flex-1 bg-transparent text-sm outline-none ${task.completed ? "line-through text-muted-foreground" : ""}`} />
                    {task.dueAt && <span className="flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />{format(new Date(task.dueAt), task.hasTime ? "d MMM · HH:mm" : "d MMM", { locale: es })}</span>}
                    <select value={task.priority ?? ""} onChange={e => patchItem(note, task.id, { priority: (e.target.value || undefined) as ChecklistItem["priority"] })} className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground">
                      <option value="">Prioridad</option><option value="high">Alta</option><option value="medium">Media</option><option value="low">Baja</option>
                    </select>
                    {task.priority && <span className="sr-only"><Flag />{priorityLabel[task.priority]}</span>}
                  </div>;
                  return <div key={item.id}>{row(item)}{children.map(child => row(child, true))}</div>;
                })}</div>}
              </article>
            );
          })}
          {listNotes.length === 0 && <div className="py-24 text-center text-muted-foreground"><ListChecks className="mx-auto mb-3 h-8 w-8" /><p>No hay notas de tipo lista.</p></div>}
        </div>
      </div>
    </section>
  );
};

export default TasksView;