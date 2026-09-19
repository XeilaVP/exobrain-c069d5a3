import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, Reorder, useDragControls } from "framer-motion";
import { X, Calendar as CalendarIcon, Clock, Trash2, Plus, CornerDownRight, CheckSquare, Square, GripVertical, CalendarPlus, CalendarCheck2, CalendarX, Dot, ListChecks, Copy, Flag } from "lucide-react";
import { toast } from "sonner";

import { ChecklistItem } from "@/types/notes";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";

const SubtaskRow = ({ item, onToggle, onDelete }: { item: ChecklistItem; onToggle: () => void; onDelete: () => void }) => {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={item}
      id={item.id}
      dragListener={false}
      dragControls={controls}
      className="flex items-center gap-1 bg-background/60 rounded px-1 min-h-11"
    >
      <div
        onPointerDown={(e) => { e.preventDefault(); controls.start(e); }}
        style={{ touchAction: "none" }}
        aria-label="Arrastrar para reordenar"
        className="shrink-0 w-8 h-11 flex items-center justify-center text-muted-foreground/60 cursor-grab active:cursor-grabbing"
      >
        <GripVertical size={16} />
      </div>
      <button onClick={onToggle} aria-label="Completar"
        className="text-primary min-h-11 min-w-11 flex items-center justify-center">
        {item.completed ? <CheckSquare size={18} /> : <Square size={18} />}
      </button>
      <span className={`flex-1 text-sm font-body ${item.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
        {item.text}
      </span>
      <button onClick={onDelete} aria-label="Borrar"
        className="text-destructive min-h-11 min-w-11 flex items-center justify-center">
        <Trash2 size={16} />
      </button>
    </Reorder.Item>
  );
};

interface TaskSheetProps {
  open: boolean;
  noteId: string;
  task: ChecklistItem | null;
  allItems: ChecklistItem[];
  onChange: (patch: Partial<ChecklistItem>) => void;
  onDelete: () => void;
  onAddSubtask: (text: string) => void;
  onToggleSubtask: (id: string) => void;
  onDeleteSubtask: (id: string) => void;
  onMoveSubtask: (id: string, dir: -1 | 1) => void;
  onReorderSubtasks?: (newOrder: ChecklistItem[]) => void;
  onClose: () => void;
}

const TaskSheet = ({
  open, noteId, task, allItems, onChange, onDelete,
  onAddSubtask, onToggleSubtask, onDeleteSubtask, onMoveSubtask, onReorderSubtasks, onClose,
}: TaskSheetProps) => {
  const gcal = useGoogleCalendar();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [newSub, setNewSub] = useState("");
  const titleRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (task) {
      setTitle(task.text);
      setNotes(task.notes ?? "");
    }
  }, [task?.id]);

  if (!task) return null;

  const subtasks = allItems.filter(i => i.parentId === task.id);

  const commitTitle = () => {
    const t = title.trim();
    if (t && t !== task.text) onChange({ text: t });
  };
  const commitNotes = () => {
    if ((notes ?? "") !== (task.notes ?? "")) onChange({ notes });
  };

  const dueDate = task.dueAt ? new Date(task.dueAt) : null;
  const setDate = (dateStr: string) => {
    if (!dateStr) { onChange({ dueAt: null, hasTime: false }); return; }
    // Preserve time if hasTime
    if (task.hasTime && dueDate) {
      const d = new Date(dateStr);
      d.setHours(dueDate.getHours(), dueDate.getMinutes(), 0, 0);
      onChange({ dueAt: d.toISOString() });
    } else {
      const d = new Date(dateStr + "T00:00:00");
      onChange({ dueAt: d.toISOString() });
    }
  };
  const setTime = (timeStr: string) => {
    if (!timeStr) { onChange({ hasTime: false }); return; }
    const base = dueDate ?? new Date();
    const [h, m] = timeStr.split(":").map(Number);
    base.setHours(h, m, 0, 0);
    onChange({ dueAt: base.toISOString(), hasTime: true });
  };

  const addSub = () => {
    const t = newSub.trim();
    if (!t) return;
    onAddSubtask(t);
    setNewSub("");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] bg-background/60 backdrop-blur-sm flex items-end md:items-center justify-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="bg-card border border-border rounded-t-2xl md:rounded-2xl shadow-2xl w-full h-[96vh] md:h-auto md:max-w-md md:max-h-[80vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Grabber */}
            <div className="flex justify-center pt-2 pb-1 md:hidden">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/40" />
            </div>

            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
              {task.style === "bullet" ? (
                <span className="text-primary min-h-11 min-w-11 flex items-center justify-center" aria-hidden>
                  <Dot size={28} />
                </span>
              ) : (
                <button
                  onClick={() => onChange({ completed: !task.completed })}
                  aria-label={task.completed ? "Marcar pendiente" : "Completar"}
                  className="text-primary min-h-11 min-w-11 flex items-center justify-center"
                >
                  {task.completed ? <CheckSquare size={22} /> : <Square size={22} />}
                </button>
              )}
              {/* Style toggle: task ⇄ bullet */}
              <button
                onClick={() => onChange({ style: task.style === "bullet" ? "task" : "bullet" })}
                aria-label={task.style === "bullet" ? "Cambiar a tarea" : "Cambiar a viñeta"}
                title={task.style === "bullet" ? "Cambiar a tarea" : "Cambiar a viñeta"}
                className="text-muted-foreground hover:text-foreground min-h-11 min-w-11 flex items-center justify-center rounded-md hover:bg-muted"
              >
                {task.style === "bullet" ? <ListChecks size={18} /> : <Dot size={22} />}
              </button>
              <span className="text-xs text-muted-foreground font-body flex-1">
                {task.style === "bullet" ? "Viñeta" : task.completed ? "Completada" : "Pendiente"}
              </span>
              <button onClick={() => { navigator.clipboard.writeText(task.text); toast.success("Copiado"); }} aria-label="Copiar"
                className="text-muted-foreground min-h-11 min-w-11 flex items-center justify-center">
                <Copy size={18} />
              </button>
              <button onClick={onDelete} aria-label="Eliminar"
                className="text-destructive min-h-11 min-w-11 flex items-center justify-center">
                <Trash2 size={20} />
              </button>

              <button onClick={onClose} aria-label="Cerrar"
                className="text-muted-foreground min-h-11 min-w-11 flex items-center justify-center">
                <X size={22} />
              </button>
            </div>

            <div className="overflow-y-auto scrollbar-thin px-4 py-3 space-y-4 flex-1">
              {/* Title */}
              <textarea
                ref={titleRef}
                value={title}
                onChange={e => setTitle(e.target.value)}
                onBlur={commitTitle}
                rows={1}
                placeholder="Título de la tarea"
                className={`w-full font-display text-lg font-semibold bg-transparent outline-none text-foreground placeholder:text-muted-foreground resize-none ${task.completed ? "line-through opacity-60" : ""}`}
              />

              {/* Notes */}
              <div>
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider font-body">Notas</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  onBlur={commitNotes}
                  placeholder="Añade detalles..."
                  rows={3}
                  className="w-full mt-1 bg-muted rounded-md text-sm px-3 py-2 outline-none text-foreground placeholder:text-muted-foreground font-body resize-none focus:ring-1 focus:ring-ring"
                />
              </div>

              {/* Date + time (task style only) */}
              {task.style !== "bullet" && (
              <div>
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider font-body">Fecha</label>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <div className="relative flex items-center bg-muted rounded-md px-2 min-h-11">
                    <CalendarIcon size={16} className="text-muted-foreground mr-1" />
                    <input
                      type="date"
                      value={dueDate ? format(dueDate, "yyyy-MM-dd") : ""}
                      onChange={e => setDate(e.target.value)}
                      className="bg-transparent outline-none text-sm text-foreground font-body py-2"
                    />
                    {dueDate && (
                      <button onClick={() => onChange({ dueAt: null, hasTime: false })}
                        aria-label="Quitar fecha" className="ml-1 text-muted-foreground min-h-9 min-w-9 flex items-center justify-center">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  {dueDate && (
                    <div className="flex items-center bg-muted rounded-md px-2 min-h-11">
                      <Clock size={16} className="text-muted-foreground mr-1" />
                      <input
                        type="time"
                        value={task.hasTime && dueDate ? format(dueDate, "HH:mm") : ""}
                        onChange={e => setTime(e.target.value)}
                        className="bg-transparent outline-none text-sm text-foreground font-body py-2"
                      />
                      {task.hasTime && (
                        <button onClick={() => onChange({ hasTime: false })}
                          aria-label="Quitar hora" className="ml-1 text-muted-foreground min-h-9 min-w-9 flex items-center justify-center">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {dueDate && (
                  <p className="text-xs text-muted-foreground font-body mt-1.5">
                    {format(dueDate, task.hasTime ? "EEEE d 'de' MMMM, HH:mm" : "EEEE d 'de' MMMM", { locale: es })}
                  </p>
                )}
              </div>
              )}

              {task.style !== "bullet" && (
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider font-body">Prioridad</label>
                  <div className="relative mt-1 flex min-h-11 items-center rounded-md bg-muted px-3">
                    <Flag size={16} className="mr-2 text-muted-foreground" />
                    <select
                      value={task.priority ?? ""}
                      onChange={e => onChange({ priority: (e.target.value || undefined) as ChecklistItem["priority"] })}
                      className="min-h-11 flex-1 bg-transparent text-sm text-foreground outline-none font-body"
                    >
                      <option value="">Sin prioridad</option>
                      <option value="high">Alta</option>
                      <option value="medium">Media</option>
                      <option value="low">Baja</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Google Calendar */}
              {task.style !== "bullet" && dueDate && (() => {
                const mapping = gcal.mappings[task.id];
                const isSynced = mapping?.sync_status === "synced";
                const doSync = () => gcal.syncTask({
                  note_id: noteId, task_id: task.id, title: task.text,
                  notes: task.notes, due_at: task.dueAt!, has_time: task.hasTime,
                });
                return (
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider font-body">Google Calendar</label>
                    <div className="mt-1">
                      {!gcal.connected ? (
                        <button onClick={gcal.connect}
                          className="flex items-center gap-2 text-sm px-3 py-2 rounded-md bg-muted hover:bg-muted/70 min-h-11 w-full font-body text-foreground">
                          <CalendarPlus size={16} /> Conectar Google Calendar
                        </button>
                      ) : isSynced ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="flex items-center gap-1.5 text-sm text-primary font-body">
                            <CalendarCheck2 size={16} /> En tu calendario
                          </span>
                          <button onClick={doSync}
                            className="text-xs px-2 py-1.5 rounded bg-muted min-h-9 font-body">
                            Actualizar
                          </button>
                          <button onClick={() => gcal.removeTask(noteId, task.id)}
                            className="text-xs px-2 py-1.5 rounded bg-muted text-destructive min-h-9 font-body flex items-center gap-1">
                            <CalendarX size={14} /> Quitar
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          <button onClick={doSync}
                            className="flex items-center gap-2 text-sm px-3 py-2 rounded-md bg-primary text-primary-foreground min-h-11 font-body">
                            <CalendarPlus size={16} /> Añadir a Google Calendar
                          </button>
                          <button onClick={() => gcal.declineTask(noteId, task.id)}
                            className="text-xs px-2 py-1.5 rounded bg-muted min-h-9 font-body">
                            No
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}



              {/* Subtasks */}
              <div>
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider font-body flex items-center gap-1">
                  <CornerDownRight size={12} /> Subtareas {subtasks.length > 0 && <span className="text-muted-foreground/60">({subtasks.filter(s => s.completed).length}/{subtasks.length})</span>}
                </label>
                <Reorder.Group
                  axis="y"
                  values={subtasks}
                  onReorder={(newOrder: ChecklistItem[]) => onReorderSubtasks?.(newOrder)}
                  className="mt-1 space-y-1"
                >
                  {subtasks.map((s) => (
                    <SubtaskRow
                      key={s.id}
                      item={s}
                      onToggle={() => onToggleSubtask(s.id)}
                      onDelete={() => onDeleteSubtask(s.id)}
                    />
                  ))}
                </Reorder.Group>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <input
                    value={newSub}
                    onChange={e => setNewSub(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSub(); } }}
                    placeholder="Añadir subtarea..."
                    className="flex-1 bg-muted rounded-md text-sm px-3 py-2 min-h-11 outline-none text-foreground placeholder:text-muted-foreground font-body focus:ring-1 focus:ring-ring"
                  />
                  <button onClick={addSub} aria-label="Añadir subtarea"
                    className="rounded-md bg-primary text-primary-foreground min-h-11 min-w-11 flex items-center justify-center">
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TaskSheet;
