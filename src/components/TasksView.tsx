import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ListChecks, Clock, Flag } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useNotes } from "@/contexts/NotesContext";
import { Button } from "@/components/ui/button";
import { prioritizedEntries } from "@/lib/taskLevels";
import { destinationForEntry, initialExpandedEntries } from "@/lib/taskNavigation";
import { NoteChecklist, PostItChecklistItem } from "@/components/NotePostIt";

interface TasksViewProps { onOpenNote: (id: string, subtaskId?: string) => void; }
/** Tasks embebe las mismas listas de las notas añadidas: mismas filas, mismas funciones. */
const TasksView = ({ onOpenNote }: TasksViewProps) => {
  const { notes } = useNotes();
  const entries = useMemo(() => prioritizedEntries(notes), [notes]);
  const [expanded, setExpanded] = useState<Set<string>>(initialExpandedEntries);
  const mobile = typeof window !== "undefined" && window.innerWidth < 768;
  const toggle = (id: string) => setExpanded(previous => {
    const next = new Set(previous);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  return (
    <section className="h-full overflow-y-auto bg-background px-3 pb-7 pt-16 md:px-8 md:py-7 scrollbar-thin">
      <div className="mx-auto max-w-5xl">
        <div className="mb-7 flex items-end justify-between"><div><h2 className="text-3xl font-semibold">Tasks</h2><p className="mt-1 text-sm text-muted-foreground">Notas que has añadido a Tasks</p></div><span className="text-sm text-muted-foreground">{entries.length} tareas</span></div>
        <div className="space-y-3">
          {entries.map(e => {
            const key = e.kind === "task" ? e.note.id : `${e.note.id}-${e.item.id}`;
            const isOpen = expanded.has(key);
            const destination = destinationForEntry(e);
            const chevron = <Button variant="ghost" size="icon" className="shrink-0" aria-expanded={isOpen} aria-label={`${isOpen ? "Plegar" : "Desplegar"} ${e.kind === "task" ? e.note.title : e.item.text}`} onClick={() => toggle(key)}>{isOpen ? <ChevronDown /> : <ChevronRight />}</Button>;
            return (
            <article key={key} className="rounded-lg border border-border bg-card shadow-soft">
              <header className="flex items-start gap-1 border-b border-border px-2 py-1.5">
                {chevron}
                {e.kind === "task" ? <div className="flex min-w-0 flex-1 items-start gap-2 py-1.5">
                  <button onClick={() => onOpenNote(destination.noteId, destination.subtaskId)} className="min-w-0 flex-1 text-left hover:text-primary">
                    <span className="block break-words font-display font-semibold leading-snug">{e.note.title}</span>
                    {e.note.calendarAt && <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" />{format(new Date(e.note.calendarAt), e.note.calendarHasTime ? "EEE, d MMM, HH:mm" : "EEE, d MMM", { locale: es })}</span>}
                  </button>
                  {e.note.priority && <Flag aria-label="Prioridad" className={`priority-${e.note.priority} mt-0.5 h-4 w-4 shrink-0`} />}
                </div> : <div className="min-w-0 flex-1">
                  <PostItChecklistItem compact item={e.item} noteId={e.note.id} mobile={mobile} onOpenSheet={() => onOpenNote(e.note.id, e.item.id)} />
                </div>}
              </header>
              {isOpen && <div className="px-2 py-2">
                <NoteChecklist noteId={e.note.id} mobile={mobile} rootId={e.kind === "subtask" ? e.item.id : undefined}
                  onOpenItem={id => onOpenNote(e.note.id, id)} />
              </div>}
            </article>
          ); })}
          {entries.length === 0 && <div className="py-24 text-center text-muted-foreground"><ListChecks className="mx-auto mb-3 h-8 w-8" /><p>Aún no hay tareas. Abre una nota y pulsa «Tasks».</p></div>}
        </div>
      </div>
    </section>
  );
};

export default TasksView;
