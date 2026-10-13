import { ArrowLeft, ChevronRight, Link2 } from "lucide-react";
import { useNotes } from "@/contexts/NotesContext";
import { Button } from "@/components/ui/button";
import { sortChecklistByCompletion } from "@/lib/checklistOrder";
import { noteAncestors, patchChecklistItem, replaceSubtaskItems } from "@/lib/taskNavigation";
import type { ChecklistItem } from "@/types/notes";
import TaskSheet from "./TaskSheet";

interface SubtaskDetailsProps {
  noteId: string;
  subtaskId: string;
  onNavigate: (id: string) => void;
  onBack?: () => void;
  onClose: () => void;
  onMoved?: (noteId: string) => void;
}

const SubtaskDetails = ({ noteId, subtaskId, onNavigate, onBack, onClose, onMoved }: SubtaskDetailsProps) => {
  const { notes, updateNote, getLinkedNotes } = useNotes();
  const note = notes.find(n => n.id === noteId);
  const task = note?.checklist.find(i => i.id === subtaskId);
  if (!note || !task) return null;
  const children = note.checklist.filter(i => i.parentId === subtaskId);
  const saveChildren = (next: ChecklistItem[]) => updateNote(noteId, { checklist: replaceSubtaskItems(note.checklist, subtaskId, next) });
  const links = getLinkedNotes(noteId);

  return <TaskSheet
    open noteId={noteId} task={task} allItems={note.checklist} onClose={onClose}
    onMoved={onMoved}
    checklistItems
    navigation={<nav aria-label="Migas de pan" className="flex flex-wrap items-center gap-1 px-4 py-2 border-b border-border">
      {onBack && <Button variant="ghost" size="icon" aria-label="Atrás" onClick={onBack}><ArrowLeft /></Button>}
      {noteAncestors(notes, noteId).map(ancestor => <span key={ancestor.id} className="flex items-center gap-1 min-w-0">
        <Button variant="ghost" size="sm" className="max-w-full whitespace-normal text-left" onClick={() => onNavigate(ancestor.id)}>{ancestor.title}</Button>
        <ChevronRight className="h-3 w-3 shrink-0" />
      </span>)}
      <span className="text-sm font-medium break-words" aria-current="page">{task.text}</span>
    </nav>}
    relatedNotes={links.length ? <div className="border-t border-border pt-3">
      <p className="text-xs text-muted-foreground mb-2">Enlazadas de {note.title}</p>
      <div className="flex flex-wrap gap-1">{links.map(link => <Button key={link.id} variant="ghost" size="sm" className="h-auto whitespace-normal text-left" onClick={() => onNavigate(link.id)}><Link2 />{link.title}</Button>)}</div>
    </div> : undefined}
    onChange={patch => {
      const next = patchChecklistItem(note.checklist, subtaskId, { ...patch, updatedAt: new Date().toISOString() });
      updateNote(noteId, { checklist: patch.completed === undefined ? next : sortChecklistByCompletion(next) });
    }}
    onDelete={() => {
      updateNote(noteId, { checklist: note.checklist.filter(i => i.id !== subtaskId && i.parentId !== subtaskId) });
      onClose();
    }}
    onAddSubtask={text => saveChildren([...children, { id: crypto.randomUUID(), text, completed: false, parentId: subtaskId }])}
    onToggleSubtask={id => saveChildren(sortChecklistByCompletion(children.map(i => i.id === id ? { ...i, completed: !i.completed } : i)))}
    onDeleteSubtask={id => saveChildren(children.filter(i => i.id !== id))}
    onEditSubtask={(id, text) => saveChildren(patchChecklistItem(children, id, { text }))}
    onMoveSubtask={(id, direction) => {
      const from = children.findIndex(i => i.id === id);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= children.length) return;
      const next = [...children];
      [next[from], next[to]] = [next[to], next[from]];
      saveChildren(next);
    }}
    onReorderSubtasks={saveChildren}
  />;
};

export default SubtaskDetails;