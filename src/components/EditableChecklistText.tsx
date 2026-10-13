import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export default function EditableChecklistText({ text, completed, onSave }: { text: string; completed: boolean; onSave: (text: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(text);
  const cancelled = useRef(false);
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (editing) input.current?.focus(); }, [editing]);
  const commit = () => {
    if (!cancelled.current && value.trim() && value.trim() !== text) onSave(value.trim());
    setEditing(false);
  };
  if (editing) return <textarea ref={input} aria-label="Editar item" rows={1} value={value}
    onChange={event => setValue(event.target.value)} onBlur={commit}
    onKeyDown={event => {
      if (event.key === "Escape") { cancelled.current = true; setEditing(false); }
      if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); commit(); }
    }} className="min-w-0 flex-1 rounded bg-muted px-2 py-1 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring" />;
  return <Button variant="ghost" onClick={() => { cancelled.current = false; setValue(text); setEditing(true); }}
    className={`h-auto min-h-9 min-w-0 flex-1 justify-start whitespace-normal break-words px-1 text-left text-sm font-normal ${completed ? "text-muted-foreground line-through" : "text-foreground"}`}>{text}</Button>;
}