import { useState } from "react";
import { format } from "date-fns";
import { CalendarDays, ListChecks, StickyNote } from "lucide-react";
import { useNotes } from "@/contexts/NotesContext";
import { Note } from "@/types/notes";

const toLocalInput = (iso: string | null | undefined, withTime: boolean) => {
  if (!iso) return "";
  return format(new Date(iso), withTime ? "yyyy-MM-dd'T'HH:mm" : "yyyy-MM-dd");
};

/** Manual, per-note membership in Tasks, Post-its and Calendario. Never touches note content. */
const ViewMembershipBar = ({ note }: { note: Note }) => {
  const { setViewMembership } = useNotes();
  const [picking, setPicking] = useState(false);
  const [withTime, setWithTime] = useState(!!note.calendarHasTime);
  const [value, setValue] = useState(toLocalInput(note.calendarAt, !!note.calendarHasTime) || format(new Date(), "yyyy-MM-dd"));

  const chip = (active: boolean) =>
    `flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-body transition-colors min-h-9 ${
      active ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
    }`;

  const saveCalendar = () => {
    if (!value) return;
    const date = withTime ? new Date(value) : new Date(`${value.slice(0, 10)}T12:00:00`);
    setViewMembership(note.id, { inCalendar: true, calendarAt: date.toISOString(), calendarHasTime: withTime });
    setPicking(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        <button className={chip(!!note.inTasks)} onClick={() => setViewMembership(note.id, { inTasks: !note.inTasks })}>
          <ListChecks size={14} /> {note.inTasks ? "En Tasks · Quitar" : "Añadir a Tasks"}
        </button>
        <button className={chip(!!note.inPostits)} onClick={() => setViewMembership(note.id, { inPostits: !note.inPostits })}>
          <StickyNote size={14} /> {note.inPostits ? "En Post-its · Quitar" : "Añadir a Post-its"}
        </button>
        {note.inCalendar ? (
          <>
            <button className={chip(true)} onClick={() => setPicking(p => !p)}>
              <CalendarDays size={14} />
              {note.calendarAt ? format(new Date(note.calendarAt), note.calendarHasTime ? "d MMM · HH:mm" : "d MMM") : "En calendario"}
            </button>
            <button className={chip(false)} onClick={() => setViewMembership(note.id, { inCalendar: false })}>Quitar del calendario</button>
          </>
        ) : (
          <button className={chip(false)} onClick={() => setPicking(p => !p)}>
            <CalendarDays size={14} /> Añadir a calendario
          </button>
        )}
      </div>
      {picking && (
        <div className="flex flex-wrap items-center gap-2 rounded-md bg-muted p-2">
          <input
            type={withTime ? "datetime-local" : "date"}
            value={withTime ? (value.length === 10 ? `${value}T09:00` : value) : value.slice(0, 10)}
            onChange={e => setValue(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
          />
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            <input type="checkbox" checked={withTime} onChange={e => setWithTime(e.target.checked)} className="accent-primary" /> Con hora
          </label>
          <button onClick={saveCalendar} className="h-9 rounded-md bg-primary px-3 text-xs text-primary-foreground">Guardar</button>
        </div>
      )}
    </div>
  );
};

export default ViewMembershipBar;
