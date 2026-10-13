import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, Flag } from "lucide-react";
import type { ChecklistItem } from "@/types/notes";
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

const TaskMetaControls = ({ dueAt, hasTime, priority, onDateChange, onPriorityChange }: TaskMetaControlsProps) => {
  const [withTime, setWithTime] = useState(!!hasTime);
  const [value, setValue] = useState(localValue(dueAt, hasTime));

  const saveDate = () => {
    if (!value) {
      onDateChange(null, false);
      return;
    }
    const normalized = withTime
      ? new Date(value).toISOString()
      : new Date(`${value.slice(0, 10)}T12:00:00`).toISOString();
    onDateChange(normalized, withTime);
  };

  const dateLabel = dueAt
    ? format(new Date(dueAt), hasTime ? "d MMM · HH:mm" : "d MMM", { locale: es })
    : "Añadir fecha";

  return (
    <div className="flex min-w-0 flex-col items-start gap-1">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 max-w-full justify-start gap-1 px-1.5 text-xs font-normal text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            <span className="whitespace-nowrap">{dateLabel}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 space-y-3 p-3">
          <input
            type={withTime ? "datetime-local" : "date"}
            value={withTime && value.length === 10 ? `${value}T09:00` : value}
            onChange={(event) => setValue(event.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground"
          />
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={withTime} onChange={(event) => setWithTime(event.target.checked)} className="accent-primary" />
            Con hora
          </label>
          <div className="flex justify-end gap-2">
            {dueAt && <Button variant="ghost" size="sm" onClick={() => { setValue(""); onDateChange(null, false); }}>Quitar</Button>}
            <Button size="sm" onClick={saveDate}>Guardar</Button>
          </div>
        </PopoverContent>
      </Popover>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 justify-start gap-1 px-1.5 text-xs font-normal text-muted-foreground">
            <Flag className="h-3.5 w-3.5" />
            {priority ? priorityLabel[priority] : "Prioridad"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={() => onPriorityChange(null)}>Sin prioridad</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onPriorityChange("high")}><Flag className="mr-2 h-4 w-4" />Alta</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onPriorityChange("medium")}><Flag className="mr-2 h-4 w-4" />Media</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onPriorityChange("low")}><Flag className="mr-2 h-4 w-4" />Baja</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default TaskMetaControls;