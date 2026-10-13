import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ListChecks, SquareArrowOutUpRight } from "lucide-react";
import { useNotes } from "@/contexts/NotesContext";
import { Button } from "@/components/ui/button";
import { ChecklistItem, Note } from "@/types/notes";
import { prioritizedEntries, itemsOf, isSubtask } from "@/lib/taskLevels";
import { sortChecklistByCompletion } from "@/lib/checklistOrder";
import { destinationForEntry, initialExpandedEntries } from "@/lib/taskNavigation";
import TaskMetaControls from "@/components/TaskMetaControls";

interface TasksViewProps { onOpenNote: (id: string, subtaskId?: string) => void; }
const TasksView = ({ onOpenNote }: TasksViewProps) => {
  const { notes, updateNote, setViewMembership } = useNotes();
  const entries = useMemo(() => prioritizedEntries(notes), [notes]);
  const [expanded, setExpanded] = useState<Set<string>>(initialExpandedEntries);
  const toggle = (id: string) => setExpanded(previous => {
    const next = new Set(previous);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const patchItem = (note: Note, itemId: string, patch: Partial<ChecklistItem>) => {
    const next = note.checklist.map(i => i.id === itemId ? { ...i, ...patch, updatedAt: new Date().toISOString() } : i);
    updateNote(note.id, { checklist: patch.completed !== undefined ? sortChecklistByCompletion(next) : next });
  };
  const controlsForNote = (note: Note) => <TaskMetaControls
    dueAt={note.calendarAt}
    hasTime={note.calendarHasTime}
    priority={note.priority}
    onDateChange={(calendarAt, calendarHasTime) => setViewMembership(note.id, { calendarAt, calendarHasTime, inCalendar: !!calendarAt })}
    onPriorityChange={(priority) => updateNote(note.id, { priority })}
  />;
  const controlsForItem = (note: Note, item: ChecklistItem) => <TaskMetaControls
    dueAt={item.dueAt}
    hasTime={item.hasTime}
    priority={item.priority}
    onDateChange={(dueAt, hasTime) => patchItem(note, item.id, { dueAt, hasTime })}
    onPriorityChange={(priority) => patchItem(note, item.id, { priority: priority ?? undefined })}
  />;
  const row = (note: Note, task: ChecklistItem, child = false) => <div key={task.id} className={`flex min-h-10 items-center gap-3 py-1.5 ${child ? "ml-7" : ""}`}>
    <input type="checkbox" checked={task.completed} onChange={() => patchItem(note, task.id, { completed: !task.completed })} className="h-4 w-4 accent-primary" />
    <span className={`min-w-0 flex-1 text-sm ${task.completed ? "line-through text-muted-foreground" : ""}`}>{task.text}</span>
    {!child && controlsForItem(note, task)}
  </div>;

  return (
    <section className="h-full overflow-y-auto bg-background px-3 pb-7 pt-16 md:px-8 md:py-7 scrollbar-thin">
      <div className="mx-auto max-w-5xl">
        <div className="mb-7 flex items-end justify-between"><div><h2 className="text-3xl font-semibold">Tasks</h2><p className="mt-1 text-sm text-muted-foreground">Tareas y subtareas con fecha o prioridad</p></div><span className="text-sm text-muted-foreground">{entries.length} prioritarias</span></div>
        <div className="space-y-3">
          {entries.map(e => {
            const key = e.kind === "task" ? e.note.id : `${e.note.id}-${e.item.id}`;
            const isOpen = expanded.has(key);
            const destination = destinationForEntry(e);
            return (
            <article key={key} className="rounded-lg border border-border bg-card shadow-soft">
              <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2 border-b border-border px-3 py-2">
                <Button variant="ghost" size="icon" aria-expanded={isOpen} aria-label={`${isOpen ? "Plegar" : "Desplegar"} ${e.kind === "task" ? e.note.title : e.item.text}`} onClick={() => toggle(key)}>{isOpen ? <ChevronDown /> : <ChevronRight />}</Button>
                {e.kind === "subtask" && <input type="checkbox" checked={e.item.completed} onChange={() => patchItem(e.note, e.item.id, { completed: !e.item.completed })} className="col-start-3 row-start-1 mt-3 h-4 w-4 accent-primary" />}
                <div className={e.kind === "subtask" ? "col-start-2 row-start-1 min-w-0" : "col-span-2 min-w-0"}>
                  <Button variant="ghost" onClick={() => onOpenNote(destination.noteId, destination.subtaskId)} className="h-auto min-h-9 max-w-full justify-start gap-1 px-1.5 text-left font-display font-semibold hover:text-primary">
                    {e.kind === "task" && <ListChecks className="h-4 w-4 shrink-0 text-primary" />}
                    <span className={`truncate ${e.kind === "subtask" && e.item.completed ? "line-through text-muted-foreground" : ""}`}>{e.kind === "task" ? e.note.title : e.item.text}</span>
                    <SquareArrowOutUpRight className="h-3.5 w-3.5 shrink-0" />
                  </Button>
                  {e.kind === "task" ? controlsForNote(e.note) : controlsForItem(e.note, e.item)}
                </div>
              </header>
              {isOpen && <div className="divide-y divide-border/70 px-3">
                {e.kind === "task"
                  ? e.note.checklist.filter(isSubtask).map(s => <div key={s.id}>{row(e.note, s)}{itemsOf(e.note, s.id).map(c => row(e.note, c, true))}</div>)
                  : itemsOf(e.note, e.item.id).map(c => row(e.note, c, true))}
              </div>}
            </article>
          ); })}
          {entries.length === 0 && <div className="py-24 text-center text-muted-foreground"><ListChecks className="mx-auto mb-3 h-8 w-8" /><p>No hay tareas ni subtareas con fecha o prioridad.</p></div>}
        </div>
      </div>
    </section>
  );
};

export default TasksView;
