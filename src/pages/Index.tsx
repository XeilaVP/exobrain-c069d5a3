import { NotesProvider } from "@/contexts/NotesContext";
import ChatPanel from "@/components/ChatPanel";
import GraphView from "@/components/GraphViewV2";
import AppShell from "@/components/AppShell";

const Index = () => {
  return (
    <NotesProvider>
      <AppShell />
      <div className="h-[100dvh] flex overflow-hidden relative md:hidden">
        <GraphView />
        <ChatPanel />
      </div>
    </NotesProvider>
  );
};

export default Index;
