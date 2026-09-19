import NotePostIt from "./NotePostIt";

interface NoteOverlayProps {
  noteId: string | null;
  onClose: () => void;
}

const NoteOverlay = ({ noteId, onClose }: NoteOverlayProps) => {
  if (!noteId) return null;
  return (
    <div className="fixed inset-0 z-40 bg-background/55 backdrop-blur-sm" onClick={onClose}>
      <NotePostIt noteId={noteId} position={{ x: 0, y: 0 }} onClose={onClose} presentation="overlay" />
    </div>
  );
};

export default NoteOverlay;