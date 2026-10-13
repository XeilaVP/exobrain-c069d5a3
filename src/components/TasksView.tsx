import { useMemo } from "react";
import { CalendarDays, ExternalLink, Flag, ListChecks } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useNotes } from "@/contexts/NotesContext";
import { Button } from "@/components/ui/button";
import { ChecklistItem, Note } from "@/types/notes";
import { prioritizedEntries, itemsOf, isSubtask } from "@/lib/taskLevels";
import { sortChecklistByCompletion } from "@/lib/checklistOrder";

interface TasksViewProps { onOpenNote: (id: string) => void; }
const priorityLabel: Record<string, string> = { high: "Alta", medium: "Media", low: "Baja" };

const TasksView = ({ onOpenNote }: TasksViewProps) => {
  const { notes, updateNote } = useNotes();
  const entries = useMemo(() => prioritizedEntries(notes), [notes]);
  const patchItem = (note: Note, itemId: string, patch: Partial<ChecklistItem>) => {
    const next = note.checklist.map(i => i.id === itemId ? { ...i, ...patch, updatedAt: new Date().toISOString() } : i);
    updateNote(note.id, { checklist: patch.completed !== undefined ? sortChecklistByCompletion(next) : next });
  };
  const meta = (priority?: string | null, dueAt?: string | null, hasTime?: boolean) => <>
    {dueAt && <span className="flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />{format(new Date(dueAt), hasTime ? "d MMM · HH:mm" : "d MMM", { locale: es })}</span>}
    {priority && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Flag className="h-3.5 w-3.5" />{priorityLabel[priority]}</span>}
  </>;
  const row = (note: Note, task: ChecklistItem, child = false) => <div key={task.id} className={`flex min-h-10 items-center gap-3 py-1.5 ${child ? "ml-7" : ""}`}>
    <input type="checkbox" checked={task.completed} onChange={() => patchItem(note, task.id, { completed: !task.completed })} className="h-4 w-4 accent-primary" />
    <span className={`min-w-0 flex-1 text-sm ${task.completed ? "line-through text-muted-foreground" : ""}`}>{task.text}</span>
    {!child && meta(task.priority, task.dueAt, task.hasTime)}
  </div>;

  return (
    <section className="h-full overflow-y-auto bg-background px-8 py-7 scrollbar-thin">
      <div className="mx-auto max-w-5xl">
        <div className="mb-7 flex items-end justify-between"><div><h2 className="text-3xl font-semibold">Tasks</h2><p className="mt-1 text-sm text-muted-foreground">Tareas y subtareas con fecha o prioridad</p></div><span className="text-sm text-muted-foreground">{entries.length} prioritarias</span></div>
        <div className="space-y-3">
          {entries.map(e => (
            <article key={e.kind === "task" ? e.note.id : `${e.note.id}-${e.item.id}`} className="rounded-lg border border-border bg-card shadow-soft">
              <header className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
                {e.kind === "task"
                  ? <><ListChecks className="text-primary" /><h3 className="flex-1 font-display font-semibold">{e.note.title}</h3>{meta(e.priority, e.dueAt, e.note.calendarHasTime)}</>
                  : <><input type="checkbox" checked={e.item.completed} onChange={() => patchItem(e.note, e.item.id, { completed: !e.item.completed })} className="h-4 w-4 accent-primary" />
                    <h3 className={`flex-1 font-display font-semibold ${e.item.completed ? "line-through text-muted-foreground" : ""}`}>{e.item.text} <span className="ml-1 rounded bg-muted px-1.5 py-0.5 font-body text-[10px] font-normal text-muted-foreground">{e.note.title}</span></h3>{meta(e.priority, e.dueAt, e.item.hasTime)}</>}
                <Button variant="ghost" size="sm" onClick={() => onOpenNote(e.note.id)}><ExternalLink /> Ver nota</Button>
              </header>
              <div className="divide-y divide-border/70 px-3">
                {e.kind === "task"
                  ? e.note.checklist.filter(isSubtask).map(s => <div key={s.id}>{row(e.note, s)}{itemsOf(e.note, s.id).map(c => row(e.note, c, true))}</div>)
                  : itemsOf(e.note, e.item.id).map(c => row(e.note, c, true))}
              </div>
            </article>
          ))}
          {entries.length === 0 && <div className="py-24 text-center text-muted-foreground"><ListChecks className="mx-auto mb-3 h-8 w-8" /><p>No hay tareas ni subtareas con fecha o prioridad.</p></div>}
        </div>
      </div>
    </section>
  );
};

export default TasksView;
