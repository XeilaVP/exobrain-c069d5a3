import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, Clock, Flag } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import type { ChecklistItem } from "@/types/notes";
import { dateInputToISO } from "@/lib/taskMetadata";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Priority = ChecklistItem["priority"];

interface TaskMetaControlsProps {
  dueAt?: string | null;
  hasTime?: boolean;
  priority?: Priority | null;
  onDateChange: (dueAt: string | null, hasTime: boolean) => void;
  onPriorityChange: (priority: Priority | null) => void;
}

const priorityLabel: Record<NonNullable<Priority>, string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
};


export const PriorityControl = ({ priority, onChange }: { priority?: Priority | null; onChange: (priority: Priority | null) => void }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" size="sm" aria-label={`Prioridad: ${priority ? priorityLabel[priority] : "sin prioridad"}`} title="Prioridad" className={`h-9 shrink-0 gap-2 text-xs font-normal text-foreground ${priority ? "px-2.5" : "w-9 px-0"}`}>
        <Flag className={`h-4 w-4 ${priority ? `priority-${priority}` : "text-muted-foreground"}`} />
        {priority && priorityLabel[priority]}
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" className="z-[80]">
      <DropdownMenuItem onSelect={() => onChange(null)}><Flag className="mr-2 h-4 w-4 text-muted-foreground" />Sin prioridad</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onChange("high")}><Flag className="priority-high mr-2 h-4 w-4" />Alta</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onChange("medium")}><Flag className="priority-medium mr-2 h-4 w-4" />Media</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onChange("low")}><Flag className="priority-low mr-2 h-4 w-4" />Baja</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

export const DateControl = ({ dueAt, hasTime, onDateChange }: Pick<TaskMetaControlsProps, "dueAt" | "hasTime" | "onDateChange">) => {
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState<Date | undefined>(dueAt ? new Date(dueAt) : undefined);
  const [withTime, setWithTime] = useState(!!hasTime);
  const [time, setTime] = useState(dueAt && hasTime ? format(new Date(dueAt), "HH:mm") : "09:00");

  const saveDate = () => {
    if (!day) { onDateChange(null, false); setOpen(false); return; }
    const value = format(day, "yyyy-MM-dd") + (withTime ? `T${time || "09:00"}` : "");
    onDateChange(dateInputToISO(value, withTime), withTime);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={(nextOpen) => {
      if (nextOpen) {
        setDay(dueAt ? new Date(dueAt) : undefined);
        setWithTime(!!hasTime);
        setTime(dueAt && hasTime ? format(new Date(dueAt), "HH:mm") : "09:00");
      }
      setOpen(nextOpen);
    }}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" aria-label="Fecha y hora" title="Fecha y hora" className={`h-9 max-w-full shrink-0 gap-2 text-xs font-normal text-foreground ${dueAt ? "px-2.5" : "w-9 px-0"}`}>
          <CalendarDays className={`h-4 w-4 ${dueAt ? "" : "text-muted-foreground"}`} />
          {dueAt && <span className="whitespace-nowrap">{format(new Date(dueAt), hasTime ? "d MMM · HH:mm" : "d MMM", { locale: es })}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="z-[80] w-auto space-y-2 p-2">
        <Calendar mode="single" selected={day} onSelect={setDay} locale={es} weekStartsOn={1} initialFocus className="p-1 pointer-events-auto" />
        <div className="flex items-center gap-2 px-1">
          <Button type="button" variant={withTime ? "secondary" : "outline"} size="sm" aria-pressed={withTime} aria-label={withTime ? "Quitar hora" : "Añadir hora"} title={withTime ? "Quitar hora" : "Añadir hora"}
            onClick={() => setWithTime(v => !v)} className="h-9 w-9 px-0">
            <Clock className="h-4 w-4" />
          </Button>
          {withTime && <input type="time" aria-label="Hora" value={time} onChange={e => setTime(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground" />}
        </div>
        <div className="flex justify-end gap-2 px-1 pb-1">
          {dueAt && <Button variant="ghost" size="sm" onClick={() => { onDateChange(null, false); setOpen(false); }}>Quitar</Button>}
          <Button size="sm" onClick={saveDate}>Guardar</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

const TaskMetaControls = ({ priority, onPriorityChange, ...dateProps }: TaskMetaControlsProps) => (
  <div className="flex min-w-0 flex-wrap items-center gap-2">
    <DateControl {...dateProps} />
    <PriorityControl priority={priority} onChange={onPriorityChange} />
  </div>
);

export default TaskMetaControls;