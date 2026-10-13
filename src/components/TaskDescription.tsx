import { useEffect, useRef, useState } from "react";
import { AlignLeft } from "lucide-react";
import RichTextEditor from "./RichTextEditor";

export default function TaskDescription({ value, onSave }: { value: string; onSave: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (!input.current) return;
    input.current.style.height = "auto";
    input.current.style.height = `${input.current.scrollHeight}px`;
  }, [draft]);
  return <div className="flex min-w-0 items-start gap-3 py-2">
    <AlignLeft className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
    <div className="min-w-0 flex-1">
      {/<\/?[a-z][\s\S]*>/i.test(value) ? <RichTextEditor content={value} onChange={onSave} placeholder="Añadir descripción" /> :
        <textarea ref={input} aria-label="Descripción" value={draft} rows={1} placeholder="Añadir descripción"
          onChange={event => setDraft(event.target.value)} onBlur={() => { if (draft !== value) onSave(draft); }}
          className="w-full resize-none overflow-hidden bg-transparent text-base leading-relaxed text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring" />}
    </div>
  </div>;
}