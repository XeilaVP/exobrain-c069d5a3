import { useMemo, useState } from "react";
import { addDays, addMonths, addWeeks, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek, subMonths, subWeeks } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, ExternalLink, Flag, X } from "lucide-react";
import { useNotes } from "@/contexts/NotesContext";
import { Button } from "@/components/ui/button";
import { ChecklistItem, Note } from "@/types/notes";

interface PlannerViewProps { onOpenNote: (id: string) => void; }
type CalendarTask = { note: Note; item: ChecklistItem };

const PlannerView = ({ onOpenNote }: PlannerViewProps) => {
  const { notes, updateNote } = useNotes();
  const [mode, setMode] = useState<"month" | "week">("month");
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState<CalendarTask | null>(null);
  const tasks = useMemo(() => notes.flatMap(note => note.checklist.filter(i => i.dueAt && i.style !== "bullet").map(item => ({ note, item }))), [notes]);
  const range = mode === "month"
    ? { start: startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }) }
    : { start: startOfWeek(cursor, { weekStartsOn: 1 }), end: endOfWeek(cursor, { weekStartsOn: 1 }) };
  const days = eachDayOfInterval(range);
  const navigate = (direction: -1 | 1) => setCursor(current => mode === "month" ? (direction < 0 ? subMonths(current, 1) : addMonths(current, 1)) : (direction < 0 ? subWeeks(current, 1) : addWeeks(current, 1)));
  const patchSelected = (patch: Partial<ChecklistItem>) => {
    if (!selected) return;
    updateNote(selected.note.id, { checklist: selected.note.checklist.map(i => i.id === selected.item.id ? { ...i, ...patch } : i) });
    setSelected(prev => prev ? { ...prev, item: { ...prev.item, ...patch } } : null);
  };
  return (
    <section className="h-full overflow-y-auto bg-background px-6 py-6 scrollbar-thin">
      <div className="mx-auto max-w-7xl">
        <header className="mb-5 flex flex-wrap items-center gap-3">
          <div className="mr-auto"><h2 className="text-3xl font-semibold">Planificador</h2><p className="mt-1 text-sm text-muted-foreground">Tareas con fecha</p></div>
          <Button variant="outline" onClick={() => setCursor(new Date())}>Hoy</Button>
          <div className="flex rounded-md border border-border bg-card p-0.5"><Button variant={mode === "month" ? "secondary" : "ghost"} size="sm" onClick={() => setMode("month")}>Mes</Button><Button variant={mode === "week" ? "secondary" : "ghost"} size="sm" onClick={() => setMode("week")}>Semana</Button></div>
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Anterior"><ChevronLeft /></Button><Button variant="ghost" size="icon" onClick={() => navigate(1)} aria-label="Siguiente"><ChevronRight /></Button>
          <h3 className="w-44 text-right font-display text-lg font-semibold capitalize">{format(cursor, mode === "month" ? "MMMM yyyy" : "d MMM yyyy", { locale: es })}</h3>
        </header>
        <div className={`grid grid-cols-7 overflow-hidden rounded-lg border border-border bg-card ${mode === "week" ? "min-h-[70vh]" : ""}`}>
          {Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), i)).map(day => <div key={day.toISOString()} className="border-b border-r border-border bg-muted/50 px-2 py-2 text-center text-xs font-semibold uppercase text-muted-foreground last:border-r-0">{format(day, "EEE", { locale: es })}</div>)}
          {days.map((day, index) => {
            const dayTasks = tasks.filter(({ item }) => item.dueAt && isSameDay(new Date(item.dueAt), day));
            return <div key={day.toISOString()} className={`min-h-28 border-b border-r border-border p-1.5 ${index % 7 === 6 ? "border-r-0" : ""} ${mode === "month" && !isSameMonth(day, cursor) ? "bg-muted/30" : ""}`}>
              <div className={`mb-1 flex h-7 w-7 items-center justify-center rounded-full text-xs ${isSameDay(day, new Date()) ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{format(day, "d")}</div>
              <div className="space-y-1">{dayTasks.map(task => <button key={`${task.note.id}-${task.item.id}`} onClick={() => setSelected(task)} className="block w-full truncate rounded px-2 py-1 text-left text-xs font-medium text-foreground" style={{ backgroundColor: task.note.color ? `hsl(${task.note.color} / 0.2)` : "hsl(var(--muted))", borderLeft: `3px solid ${task.note.color ? `hsl(${task.note.color})` : "hsl(var(--primary))"}` }}>{task.item.hasTime && task.item.dueAt ? `${format(new Date(task.item.dueAt), "HH:mm")} ` : ""}{task.item.text}</button>)}</div>
            </div>;
          })}
        </div>
      </div>
      {selected && <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/55 backdrop-blur-sm" onClick={() => setSelected(null)}><div className="w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-float" onClick={e => e.stopPropagation()}>
        <header className="mb-4 flex items-start gap-3"><CalendarDays className="mt-1 text-primary" /><div className="min-w-0 flex-1"><h3 className="font-display text-xl font-semibold">{selected.item.text}</h3><p className="text-sm text-muted-foreground">{selected.note.title}</p></div><Button variant="ghost" size="icon" onClick={() => setSelected(null)} aria-label="Cerrar"><X /></Button></header>
        {selected.item.notes && <p className="mb-4 whitespace-pre-wrap text-sm text-muted-foreground">{selected.item.notes}</p>}
        <div className="mb-5 flex items-center gap-2 text-sm"><CalendarDays className="h-4 w-4" />{selected.item.dueAt && format(new Date(selected.item.dueAt), selected.item.hasTime ? "EEEE d MMMM · HH:mm" : "EEEE d MMMM", { locale: es })}</div>
        <div className="flex items-center justify-between"><select value={selected.item.priority ?? ""} onChange={e => patchSelected({ priority: (e.target.value || undefined) as ChecklistItem["priority"] })} className="h-9 rounded-md border border-input bg-background px-3 text-sm"><option value="">Sin prioridad</option><option value="high">Prioridad alta</option><option value="medium">Prioridad media</option><option value="low">Prioridad baja</option></select><Button onClick={() => { const id = selected.note.id; setSelected(null); onOpenNote(id); }}><ExternalLink /> Ver nota</Button></div>
      </div></div>}
    </section>
  );
};

export default PlannerView;