import { useMemo, useState } from "react";
import { ExternalLink, ListChecks, X } from "lucide-react";
import { useNotes } from "@/contexts/NotesContext";
import { Button } from "@/components/ui/button";
import { Note } from "@/types/notes";

interface PostItsViewProps { onOpenNote: (id: string) => void; }

const plainText = (html: string) => {
  const documentNode = new DOMParser().parseFromString(html, "text/html");
  return documentNode.body.textContent?.trim() ?? "";
};

const NotePreview = ({ note }: { note: Note }) => note.noteType === "checklist" ? (
  <div className="space-y-1.5">{note.checklist.slice(0, 5).map(item => <div key={item.id} className="flex items-start gap-2 text-sm"><span className={`mt-0.5 h-3.5 w-3.5 shrink-0 rounded-sm border ${item.completed ? "bg-primary border-primary" : "border-muted-foreground/50"}`} /><span className={item.completed ? "line-through text-muted-foreground" : ""}>{item.text}</span></div>)}</div>
) : <p className="line-clamp-6 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{plainText(note.content) || "Sin contenido"}</p>;

const PostItsView = ({ onOpenNote }: PostItsViewProps) => {
  const { notes } = useNotes();
  const [previewId, setPreviewId] = useState<string | null>(null);
  const preview = useMemo(() => notes.find(n => n.id === previewId), [notes, previewId]);
  return (
    <section className="h-full overflow-y-auto bg-background px-8 py-7 scrollbar-thin">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7"><h2 className="text-3xl font-semibold">Post-its</h2><p className="mt-1 text-sm text-muted-foreground">Una lectura visual rápida de todas tus notas</p></div>
        <div className="columns-2 gap-4 xl:columns-3 2xl:columns-4">
          {notes.map(note => <button key={note.id} onClick={() => setPreviewId(note.id)} className="mb-4 block w-full break-inside-avoid rounded-lg border border-border bg-card p-4 text-left shadow-soft transition-transform hover:-translate-y-0.5" style={{ borderTopColor: note.color ? `hsl(${note.color})` : undefined, borderTopWidth: 4 }}>
            <div className="mb-3 flex items-center gap-2"><span>{note.icon || (note.noteType === "checklist" ? "☑" : "•")}</span><h3 className="min-w-0 flex-1 truncate font-display text-lg font-semibold">{note.title}</h3>{note.noteType === "checklist" && <ListChecks className="h-4 w-4 text-muted-foreground" />}</div><NotePreview note={note} />
          </button>)}
        </div>
      </div>
      {preview && <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/55 p-8 backdrop-blur-sm" onClick={() => setPreviewId(null)}>
        <article className="max-h-[75vh] w-full max-w-xl overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-float" onClick={e => e.stopPropagation()} style={{ borderTopColor: preview.color ? `hsl(${preview.color})` : undefined, borderTopWidth: 5 }}>
          <header className="mb-5 flex items-center gap-3"><span className="text-xl">{preview.icon || "•"}</span><h3 className="min-w-0 flex-1 font-display text-2xl font-semibold">{preview.title}</h3><Button variant="ghost" size="icon" onClick={() => setPreviewId(null)} aria-label="Cerrar"><X /></Button></header>
          <NotePreview note={preview} />
          <div className="mt-6 flex justify-end"><Button onClick={() => { setPreviewId(null); onOpenNote(preview.id); }}><ExternalLink /> Ver nota</Button></div>
        </article>
      </div>}
    </section>
  );
};

export default PostItsView;