import { useEffect, useState } from "react";
import GraphView from "./GraphViewV2";
import ChatPanel from "./ChatPanel";
import NoteOverlay from "./NoteOverlay";
import PlannerView from "./PlannerView";
import PostItsView from "./PostItsView";
import SideNav, { WorkspaceView } from "./SideNav";
import TasksView from "./TasksView";

const readView = (): WorkspaceView => {
  const value = new URLSearchParams(window.location.search).get("view");
  return value === "tasks" || value === "postits" || value === "planner" ? value : "tree";
};

const AppShell = () => {
  const [view, setView] = useState<WorkspaceView>(readView);
  const [overlayNoteId, setOverlayNoteId] = useState<string | null>(null);
  useEffect(() => {
    const url = new URL(window.location.href);
    view === "tree" ? url.searchParams.delete("view") : url.searchParams.set("view", view);
    window.history.replaceState({}, "", url);
  }, [view]);
  return (
    <div className="hidden h-[100dvh] overflow-hidden bg-background md:flex">
      <SideNav view={view} onView={setView} onOpenNote={setOverlayNoteId} />
      <main className="relative min-w-0 flex-1 overflow-hidden">
        {view === "tree" && <GraphView />}
        {view === "tasks" && <TasksView onOpenNote={setOverlayNoteId} />}
        {view === "postits" && <PostItsView onOpenNote={setOverlayNoteId} />}
        {view === "planner" && <PlannerView onOpenNote={setOverlayNoteId} />}
      </main>
      {view === "tree" && <ChatPanel />}
      <NoteOverlay noteId={overlayNoteId} onClose={() => setOverlayNoteId(null)} />
    </div>
  );
};

export default AppShell;