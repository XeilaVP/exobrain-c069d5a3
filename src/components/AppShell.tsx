import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import GraphView from "./GraphViewV2";
import ChatPanel from "./ChatPanel";
import NoteOverlay from "./NoteOverlay";
import PlannerView from "./PlannerView";
import PostItsView from "./PostItsView";
import SideNav, { WorkspaceView } from "./SideNav";
import TasksView from "./TasksView";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

const readView = (): WorkspaceView => {
  const value = new URLSearchParams(window.location.search).get("view");
  return value === "tasks" || value === "postits" || value === "planner" ? value : "tree";
};

const AppShell = () => {
  const [view, setView] = useState<WorkspaceView>(readView);
  const [overlayNoteId, setOverlayNoteId] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const url = new URL(window.location.href);
    view === "tree" ? url.searchParams.delete("view") : url.searchParams.set("view", view);
    window.history.replaceState({}, "", url);
  }, [view]);

  const selectView = (nextView: WorkspaceView) => {
    setView(nextView);
    setMobileNavOpen(false);
  };

  const openNote = (noteId: string) => {
    setOverlayNoteId(noteId);
    setMobileNavOpen(false);
  };

  return (
    <div className="relative flex h-[100dvh] w-full overflow-hidden bg-background">
      {!isMobile && <SideNav view={view} onView={selectView} onOpenNote={openNote} />}

      {isMobile && (
        <>
          <Button
            variant="secondary"
            size="icon"
            className="absolute left-3 top-3 z-40 shadow-float"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Abrir navegación"
          >
            <Menu />
          </Button>
          {mobileNavOpen && (
            <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Navegación">
              <div className="absolute inset-0 bg-background/65 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)} />
              <div className="relative h-full w-[min(18rem,calc(100vw-3rem))] shadow-float">
                <SideNav
                  view={view}
                  onView={selectView}
                  onOpenNote={openNote}
                  mobile
                  onClose={() => setMobileNavOpen(false)}
                />
              </div>
            </div>
          )}
        </>
      )}

      <main className="relative min-w-0 flex-1 overflow-hidden">
        {view === "tree" && <GraphView />}
        {view === "tasks" && <TasksView onOpenNote={openNote} />}
        {view === "postits" && <PostItsView onOpenNote={openNote} />}
        {view === "planner" && <PlannerView onOpenNote={openNote} />}
      </main>
      {view === "tree" && <ChatPanel />}
      <NoteOverlay noteId={overlayNoteId} onClose={() => setOverlayNoteId(null)} />
    </div>
  );
};

export default AppShell;