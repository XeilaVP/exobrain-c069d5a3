import { useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { useNotes } from "@/contexts/NotesContext";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function SubtaskParentControl({ noteId, subtaskId, onMoved }: { noteId: string; subtaskId: string; onMoved: (noteId: string) => void }) {
  const { notes, moveSubtask } = useNotes();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const note = notes.find(n => n.id === noteId);
  const task = note?.checklist.find(i => i.id === subtaskId);
  if (!note || !task || task.parentId || task.style === "bullet") return null;
  const destinations = notes.filter(n => n.id !== noteId && n.noteType === "checklist" && n.title.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  return <Popover open={open} onOpenChange={next => { if (!saving) { setOpen(next); setSearch(""); } }}>
    <PopoverTrigger asChild><Button variant="ghost" disabled={saving} aria-label={`Mover subtarea de ${note.title}`} className="h-auto min-h-9 max-w-full justify-start gap-2 whitespace-normal px-0 text-left text-sm text-muted-foreground">
      <span className="min-w-0 break-words">{note.title}</span>{saving ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
    </Button></PopoverTrigger>
    <PopoverContent align="start" className="z-[90] w-72 space-y-2">
      <input aria-label="Buscar tarea madre" placeholder="Buscar tarea madre" disabled={saving} value={search} onChange={e => setSearch(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground" />
      <div className="max-h-64 overflow-y-auto">
        {destinations.map(destination => <Button key={destination.id} variant="ghost" disabled={saving} className="h-auto min-h-10 w-full justify-start whitespace-normal text-left" onClick={async () => {
          setSaving(true);
          const moved = await moveSubtask(noteId, destination.id, subtaskId);
          setSaving(false);
          if (moved) { setOpen(false); onMoved(destination.id); }
        }}>{destination.title}</Button>)}
        {!destinations.length && <p className="py-3 text-sm text-muted-foreground">No hay otras tareas madre.</p>}
      </div>
    </PopoverContent>
  </Popover>;
}