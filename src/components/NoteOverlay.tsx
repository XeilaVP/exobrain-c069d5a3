import { useEffect, useState } from "react";
import NotePostIt from "./NotePostIt";

interface NoteOverlayProps {
  noteId: string | null;
  onClose: () => void;
}

const NoteOverlay = ({ noteId, onClose }: NoteOverlayProps) => {
  const [current, setCurrent] = useState<string | null>(noteId);
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    setCurrent(noteId);
    setHistory([]);
  }, [noteId]);

  if (!noteId || !current) return null;

  const navigate = (id: string) => {
    setHistory(prev => [...prev, current]);
    setCurrent(id);
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
      <NotePostIt
        key={current}
        noteId={current}
        position={{ x: 0, y: 0 }}
        onClose={onClose}
        presentation="overlay"
        onNavigate={navigate}
        onBack={history.length ? back : undefined}
      />
    </div>
  );
};

export default NoteOverlay;
