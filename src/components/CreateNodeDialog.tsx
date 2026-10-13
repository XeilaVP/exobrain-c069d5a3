import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { FileText, ListChecks } from "lucide-react";
import { Note } from "@/types/notes";
import ColorPicker from "./ColorPicker";
import { DEFAULT_CATEGORY_COLOR } from "@/lib/categoryColors";

interface Props {
  open: boolean;
  childOnly?: boolean;
  notes: Note[];
  brainName: string;
  defaultParentId?: string | null;
  onCreateNote: (parentNoteId: string | null, type: "text" | "checklist", name: string, color: string) => void;
  onCancel: () => void;
}

const CreateNodeDialog = ({ open, notes, brainName, defaultParentId, childOnly = false, onCreateNote, onCancel }: Props) => {
  const [noteType, setNoteType] = useState<"text" | "checklist">("text");
  const [name, setName] = useState("");
  const [color, setColor] = useState(DEFAULT_CATEGORY_COLOR);
  const [parentNoteId, setParentNoteId] = useState<string>("");

  useEffect(() => {
    if (open) {
      setName("");
      setColor(DEFAULT_CATEGORY_COLOR);
      setParentNoteId(defaultParentId || "");
      setNoteType("text");
    }
  }, [open, defaultParentId]);

  // Flat, indented list of every note so any depth can be chosen as mother
  const options = useMemo(() => {
    const out: { id: string; label: string }[] = [];
    const walk = (parentId: string | null, depth: number) => {
      notes
        .filter(n => (n.parentNoteId ?? null) === parentId)
        .sort((a, b) => a.title.localeCompare(b.title))
        .forEach(n => {
          out.push({ id: n.id, label: `${"— ".repeat(depth)}${n.icon ? `${n.icon} ` : ""}${n.title || "(sin título)"}` });
          walk(n.id, depth + 1);
        });
    };
    walk(null, 0);
    return out;
  }, [notes]);

  if (!open) return null;

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreateNote(parentNoteId || null, noteType, trimmed, color);
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-background/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onCancel}
      onPointerDown={e => e.stopPropagation()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-xl shadow-2xl p-4 w-full max-w-sm space-y-4"
        onClick={e => e.stopPropagation()}
        role="dialog"
      >
        <h3 className="font-display text-base font-semibold text-foreground">
          {childOnly ? "Crear hija" : noteType === "checklist" ? "Nueva lista de tareas" : "Nueva nota"}
        </h3>

        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); submit(); } if (e.key === "Escape") onCancel(); }}
          placeholder={noteType === "checklist" ? "Nombre de la lista..." : "Nombre de la nota..."}
          className="w-full bg-muted rounded-md text-base md:text-sm px-3 py-3 md:py-2 min-h-11 md:min-h-0 text-foreground outline-none focus:ring-2 focus:ring-ring font-body"
        />

        <div className="flex gap-2">
          <Button
            onClick={() => setNoteType("text")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 min-h-11 md:min-h-0 rounded-md text-xs border ${noteType === "text" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
          ><FileText size={14} />Texto</Button>
          <Button
            onClick={() => setNoteType("checklist")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 min-h-11 md:min-h-0 rounded-md text-xs border ${noteType === "checklist" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
          ><ListChecks size={14} />Tasks</Button>
        </div>

        {!childOnly && <label className="block">
          <span className="text-xs text-muted-foreground">Cuelga de</span>
          <select
            value={parentNoteId}
            onChange={e => setParentNoteId(e.target.value)}
            className="mt-1 w-full bg-muted rounded-md text-sm px-3 py-2 min-h-11 md:min-h-0 text-foreground outline-none focus:ring-2 focus:ring-ring font-body"
          >
            <option value="">{brainName || "ExoBrain"} — rama principal</option>
            {options.map(o => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </label>}

        {!parentNoteId && (
          <div>
            <div className="text-xs text-muted-foreground mb-2">Color de la rama</div>
            <ColorPicker value={color} onChange={setColor} />
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Button onClick={onCancel} className="px-3 py-2 min-h-11 md:min-h-0 rounded-md text-xs text-muted-foreground hover:bg-muted">Cancelar</Button>
          <Button onClick={submit} disabled={!name.trim()} className="px-4 py-2 min-h-11 md:min-h-0 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40">Crear</Button>
        </div>
      </motion.div>
    </div>
  );
};

export default CreateNodeDialog;
