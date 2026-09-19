import { useMemo, useState } from "react";
import { CalendarDays, CheckSquare, ChevronDown, ChevronRight, Menu, Network, Search, StickyNote, X } from "lucide-react";
import { useNotes } from "@/contexts/NotesContext";
import { Button } from "@/components/ui/button";
import { Note } from "@/types/notes";

export type WorkspaceView = "tree" | "tasks" | "postits" | "planner";

interface SideNavProps {
  view: WorkspaceView;
  onView: (view: WorkspaceView) => void;
  onOpenNote: (noteId: string) => void;
}

const navItems = [
  { id: "tree" as const, label: "Árbol", icon: Network },
  { id: "tasks" as const, label: "Tasks", icon: CheckSquare },
  { id: "postits" as const, label: "Post-its", icon: StickyNote },
  { id: "planner" as const, label: "Planificador", icon: CalendarDays },
];

const SideNav = ({ view, onView, onOpenNote }: SideNavProps) => {
  const { notes, brainName } = useNotes();
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(notes.filter(n => !n.parentNoteId).map(n => n.id)));
  const roots = useMemo(() => notes.filter(n => !n.parentNoteId), [notes]);
  const results = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("es");
    if (!q) return [];
    return notes.filter(n => `${n.title} ${n.content} ${n.checklist.map(i => i.text).join(" ")}`.toLocaleLowerCase("es").includes(q)).slice(0, 8);
  }, [notes, query]);

  const toggle = (id: string) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const renderNode = (note: Note, depth = 0): React.ReactNode => {
    const children = notes.filter(n => n.parentNoteId === note.id);
    const isOpen = expanded.has(note.id);
    return (
      <div key={note.id}>
        <div className="flex items-center min-w-0" style={{ paddingLeft: depth * 12 }}>
          {children.length ? (
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => toggle(note.id)} aria-label={isOpen ? "Plegar rama" : "Desplegar rama"}>
              {isOpen ? <ChevronDown /> : <ChevronRight />}
            </Button>
          ) : <span className="w-7 shrink-0" />}
          <Button variant="ghost" className="h-8 min-w-0 flex-1 justify-start px-1.5 font-normal" onClick={() => onOpenNote(note.id)}>
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: note.color ? `hsl(${note.color})` : "hsl(var(--muted-foreground))" }} />
            <span className="truncate">{note.icon || ""} {note.title}</span>
          </Button>
        </div>
        {isOpen && children.map(child => renderNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <aside className={`${collapsed ? "w-16" : "w-72"} relative z-30 h-full shrink-0 border-r border-sidebar-border bg-sidebar transition-[width] duration-200 flex flex-col`}>
      <div className="h-16 flex items-center gap-2 border-b border-sidebar-border px-3">
        <Button variant="ghost" size="icon" onClick={() => setCollapsed(v => !v)} aria-label={collapsed ? "Abrir navegación" : "Plegar navegación"}><Menu /></Button>
        {!collapsed && <h1 className="font-display text-lg font-semibold truncate">{brainName}</h1>}
      </div>
      <nav className="p-2 space-y-1">
        {navItems.map(item => (
          <Button key={item.id} variant={view === item.id ? "secondary" : "ghost"} className={`w-full ${collapsed ? "px-0" : "justify-start"}`} onClick={() => onView(item.id)} title={item.label}>
            <item.icon /> {!collapsed && item.label}
          </Button>
        ))}
      </nav>
      {!collapsed && (
        <>
          <div className="px-3 pt-2 pb-3 border-b border-sidebar-border relative">
            <Search className="absolute left-5 top-5 h-4 w-4 text-muted-foreground" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar notas y tareas" className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-8 text-sm outline-none focus:ring-2 focus:ring-ring" />
            {query && <Button variant="ghost" size="icon" className="absolute right-3 top-3 h-8 w-8" onClick={() => setQuery("")} aria-label="Limpiar búsqueda"><X /></Button>}
            {results.length > 0 && (
              <div className="absolute left-3 right-3 top-12 z-50 rounded-md border border-border bg-popover p-1 shadow-float">
                {results.map(note => <Button key={note.id} variant="ghost" className="h-auto w-full justify-start py-2 text-left" onClick={() => { onOpenNote(note.id); setQuery(""); }}><span className="truncate">{note.icon || ""} {note.title}</span></Button>)}
              </div>
            )}
          </div>
          <div className="px-3 pt-3 pb-1 text-xs font-semibold uppercase text-muted-foreground">Ramas</div>
          <div className="flex-1 overflow-y-auto px-2 pb-3 scrollbar-thin">{roots.map(note => renderNode(note))}</div>
        </>
      )}
    </aside>
  );
};

export default SideNav;