import { NotesProvider } from "@/contexts/NotesContext";
import ChatPanel from "@/components/ChatPanel";
import GraphView from "@/components/GraphViewV2";

const Index = () => {
  return (
    <NotesProvider>
      <div className="h-[100dvh] flex overflow-hidden relative">
        <GraphView />
        <ChatPanel />
      </div>
    </NotesProvider>
  );
};

export default Index;
