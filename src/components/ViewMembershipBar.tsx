import { ListChecks, StickyNote } from "lucide-react";
import { useNotes } from "@/contexts/NotesContext";
import { Note } from "@/types/notes";
import { Button } from "@/components/ui/button";
import { DateControl, PriorityControl } from "@/components/TaskMetaControls";

const ViewMembershipBar = ({ note }: { note: Note }) => {
  const { setViewMembership, updateNote } = useNotes();
  const chip = (active: boolean) => `gap-1.5 text-xs ${active ? "border-primary bg-primary/10 text-foreground" : "text-muted-foreground"}`;
  return <div className="space-y-2">
    <div className="flex flex-wrap gap-1.5">
      <Button variant="outline" size="sm" aria-pressed={!!note.inTasks} className={chip(!!note.inTasks)} onClick={() => setViewMembership(note.id, { inTasks: !note.inTasks })}><ListChecks size={14} />Tasks</Button>
      <Button variant="outline" size="sm" aria-pressed={!!note.inPostits} className={chip(!!note.inPostits)} onClick={() => setViewMembership(note.id, { inPostits: !note.inPostits })}><StickyNote size={14} />Post-its</Button>
    </div>
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <DateControl dueAt={note.calendarAt} hasTime={note.calendarHasTime} onDateChange={(calendarAt, calendarHasTime) => setViewMembership(note.id, { calendarAt, calendarHasTime, inCalendar: !!calendarAt })} />
      <PriorityControl priority={note.priority} onChange={priority => updateNote(note.id, { priority })} />
    </div>
  </div>;
};
export default ViewMembershipBar;