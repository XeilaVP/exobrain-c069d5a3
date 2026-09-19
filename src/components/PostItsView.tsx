import { useMemo, useState } from "react";
import { ExternalLink, ListChecks, X } from "lucide-react";
import { useNotes } from "@/contexts/NotesContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Note } from "@/types/notes";

interface PostItsViewProps { onOpenNote: (id: string) => void; }

type SortKey = "updated" | "created" | "title" | "due" | "priority";

const plainText = (html: string) => {
  const documentNode = new DOMParser().parseFromString(html, "text/html");
  return documentNode.body.textContent?.trim() ?? "";
};

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

const noteDue = (note: Note) => {
  const dates = note.checklist.filter(i => !i.completed && i.dueAt).map(i => new Date(i.dueAt as string).getTime()).filter(t => !Number.isNaN(t));
  return dates.length ? Math.min(...dates) : Number.POSITIVE_INFINITY;
};

const notePriority = (note: Note) => {
  const ranks = note.checklist.filter(i => !i.completed && i.priority).map(i => PRIORITY_RANK[i.priority as string]);
  return ranks.length ? Math.min(...ranks) : Number.POSITIVE_INFINITY;
};

const NotePreview = ({ note }: { note: Note }) => note.noteType === "checklist" ? (
  <div className="space-y-1.5">{note.checklist.slice(0, 5).map(item => <div key={item.id} className="flex items-start gap-2 text-sm"><span className={`mt-0.5 h-3.5 w-3.5 shrink-0 rounded-sm border ${item.completed ? "bg-primary border-primary" : "border-muted-foreground/50"}`} /><span className={item.completed ? "line-through text-muted-foreground" : ""}>{item.text}</span></div>)}</div>
) : <p className="line-clamp-6 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{plainText(note.content) || "Sin contenido"}</p>;

const PostItsView = ({ onOpenNote }: PostItsViewProps) => {
  const { notes } = useNotes();
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("updated");
  const [branchId, setBranchId] = useState<string>("all");
  const [subBranchId, setSubBranchId] = useState<string>("all");

  const roots = useMemo(() => notes.filter(n => !n.parentNoteId), [notes]);
  const subBranches = useMemo(() => branchId === "all" ? [] : notes.filter(n => n.parentNoteId === branchId), [notes, branchId]);

  const descendants = useMemo(() => {
    const withDescendants = (rootId: string) => {
      const ids = new Set<string>([rootId]);
      let added = true;
      while (added) {
        added = false;
        notes.forEach(n => {
          if (n.parentNoteId && ids.has(n.parentNoteId) && !ids.has(n.id)) { ids.add(n.id); added = true; }
        });
      }
      return ids;
    };
    const scope = subBranchId !== "all" ? subBranchId : branchId !== "all" ? branchId : null;
    return scope ? withDescendants(scope) : null;
  }, [notes, branchId, subBranchId]);

  const visible = useMemo(() => {
    const list = descendants ? notes.filter(n => descendants.has(n.id)) : [...notes];
    const byDate = (a?: string, b?: string) => new Date(b ?? 0).getTime() - new Date(a ?? 0).getTime();
    switch (sortBy) {
      case "created": return list.sort((a, b) => byDate(a.createdAt, b.createdAt));
      case "title": return list.sort((a, b) => a.title.localeCompare(b.title, "es"));
      case "due": return list.sort((a, b) => noteDue(a) - noteDue(b) || byDate(a.updatedAt, b.updatedAt));
      case "priority": return list.sort((a, b) => notePriority(a) - notePriority(b) || byDate(a.updatedAt, b.updatedAt));
      default: return list.sort((a, b) => byDate(a.updatedAt, b.updatedAt));
    }
  }, [notes, descendants, sortBy]);

  const preview = useMemo(() => notes.find(n => n.id === previewId), [notes, previewId]);
  const filtered = branchId !== "all" || sortBy !== "updated";

  return (
    <section className="h-full overflow-y-auto bg-background px-8 py-7 scrollbar-thin">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5"><h2 className="text-3xl font-semibold">Post-its</h2><p className="mt-1 text-sm text-muted-foreground">Una lectura visual rápida de todas tus notas</p></div>

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Select value={sortBy} onValueChange={v => setSortBy(v as SortKey)}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Ordenar por" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="updated">Actualización reciente</SelectItem>
              <SelectItem value="created">Creación</SelectItem>
              <SelectItem value="title">Título</SelectItem>
              <SelectItem value="due">Fecha más próxima</SelectItem>
              <SelectItem value="priority">Prioridad más alta</SelectItem>
            </SelectContent>
          </Select>

          <Select value={branchId} onValueChange={v => { setBranchId(v); setSubBranchId("all"); }}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Todas las ramas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las ramas</SelectItem>
              {roots.map(r => <SelectItem key={r.id} value={r.id}>{r.icon ? `${r.icon} ` : ""}{r.title}</SelectItem>)}
            </SelectContent>
          </Select>

          {subBranches.length > 0 && (
            <Select value={subBranchId} onValueChange={setSubBranchId}>
              <SelectTrigger className="w-56"><SelectValue placeholder="Toda la rama" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toda la rama</SelectItem>
                {subBranches.map(s => <SelectItem key={s.id} value={s.id}>{s.icon ? `${s.icon} ` : ""}{s.title}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          {filtered && <Button variant="ghost" onClick={() => { setSortBy("updated"); setBranchId("all"); setSubBranchId("all"); }}>Limpiar</Button>}
          <span className="text-sm text-muted-foreground">{visible.length} notas</span>
        </div>

        <div className="columns-2 gap-4 xl:columns-3 2xl:columns-4">
          {visible.map(note => <button key={note.id} onClick={() => setPreviewId(note.id)} className="mb-4 block w-full break-inside-avoid rounded-lg border border-border bg-card p-4 text-left shadow-soft transition-transform hover:-translate-y-0.5" style={{ borderTopColor: note.color ? `hsl(${note.color})` : undefined, borderTopWidth: 4 }}>
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
