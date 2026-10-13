import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, ChevronDown, Flag } from "lucide-react";
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

const localValue = (iso?: string | null, hasTime?: boolean) => {
  if (!iso) return "";
  return format(new Date(iso), hasTime ? "yyyy-MM-dd'T'HH:mm" : "yyyy-MM-dd");
};

export const PriorityControl = ({ priority, onChange }: { priority?: Priority | null; onChange: (priority: Priority | null) => void }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" size="sm" aria-label={`Prioridad: ${priority ? priorityLabel[priority] : "sin prioridad"}`} className="h-9 shrink-0 justify-start gap-2 px-2.5 text-xs font-normal text-foreground">
        <Flag className={`h-4 w-4 ${priority ? `priority-${priority}` : "text-muted-foreground"}`} />
        {priority ? priorityLabel[priority] : "Prioridad"}
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" className="z-[80]">
      <DropdownMenuItem onSelect={() => onChange(null)}>Sin prioridad</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onChange("high")}><Flag className="priority-high mr-2 h-4 w-4" />Alta</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onChange("medium")}><Flag className="priority-medium mr-2 h-4 w-4" />Media</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onChange("low")}><Flag className="priority-low mr-2 h-4 w-4" />Baja</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

export const DateControl = ({ dueAt, hasTime, onDateChange }: Pick<TaskMetaControlsProps, "dueAt" | "hasTime" | "onDateChange">) => {
  const [open, setOpen] = useState(false);
  const [withTime, setWithTime] = useState(!!hasTime);
  const [value, setValue] = useState(localValue(dueAt, hasTime));

  const saveDate = () => {
    onDateChange(dateInputToISO(value, withTime), !!value && withTime);
    setOpen(false);
  };

  const dateLabel = dueAt
    ? format(new Date(dueAt), hasTime ? "d MMM · HH:mm" : "d MMM", { locale: es })
    : "Añadir fecha/hora";

  return (
      <Popover open={open} onOpenChange={(nextOpen) => {
        if (nextOpen) { setValue(localValue(dueAt, hasTime)); setWithTime(!!hasTime); }
        setOpen(nextOpen);
      }}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 max-w-full shrink-0 justify-start gap-2 px-2.5 text-xs font-normal text-foreground">
            <CalendarDays className="h-4 w-4" />
            <span className="whitespace-nowrap">{dateLabel}</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="z-[80] w-72 space-y-3 p-3">
          <input
            type={withTime ? "datetime-local" : "date"}
            aria-label="Fecha y hora"
            value={withTime ? (value.length === 10 ? `${value}T09:00` : value) : value.slice(0, 10)}
            onChange={(event) => setValue(event.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground"
          />
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={withTime} onChange={(event) => {
              const nextWithTime = event.target.checked;
              setWithTime(nextWithTime);
              setValue(previous => nextWithTime && previous.length === 10 ? `${previous}T09:00` : nextWithTime ? previous : previous.slice(0, 10));
            }} className="accent-primary" />
            Con hora
          </label>
          <div className="flex justify-end gap-2">
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