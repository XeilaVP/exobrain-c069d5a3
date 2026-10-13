import { useEffect, useState } from "react";
import NotePostIt from "./NotePostIt";
import SubtaskDetails from "./SubtaskDetails";
import type { NoteDestination } from "@/lib/taskNavigation";

interface NoteOverlayProps {
  noteId: string | null;
  subtaskId?: string;
  onClose: () => void;
}

const NoteOverlay = ({ noteId, subtaskId, onClose }: NoteOverlayProps) => {
  const [current, setCurrent] = useState<NoteDestination | null>(noteId ? { noteId, subtaskId } : null);
  const [history, setHistory] = useState<NoteDestination[]>([]);

  useEffect(() => {
    setCurrent(noteId ? { noteId, subtaskId } : null);
    setHistory([]);
  }, [noteId, subtaskId]);

  if (!noteId || !current) return null;

  const navigate = (id: string) => {
    setHistory(prev => [...prev, current]);
    setCurrent({ noteId: id });
  };

  const back = () => {
    setHistory(prev => {
      const next = [...prev];
      const last = next.pop();
      if (last) setCurrent(last);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-40 bg-background/55 backdrop-blur-sm" onClick={onClose}>
      {current.subtaskId ? <SubtaskDetails
        key={`${current.noteId}-${current.subtaskId}`}
        noteId={current.noteId}
        subtaskId={current.subtaskId}
        onClose={onClose}
        onNavigate={navigate}
        onBack={history.length ? back : undefined}
        onMoved={id => {
          setCurrent({ noteId: id, subtaskId: current.subtaskId });
          setHistory(prev => prev.map(entry => entry.subtaskId === current.subtaskId ? { ...entry, noteId: id } : entry));
        }}
      /> : <NotePostIt
        key={current.noteId}
        noteId={current.noteId}
        position={{ x: 0, y: 0 }}
        onClose={onClose}
        presentation="overlay"
        onNavigate={navigate}
        onBack={history.length ? back : undefined}
      />}
    </div>
  );
};

export default NoteOverlay;
