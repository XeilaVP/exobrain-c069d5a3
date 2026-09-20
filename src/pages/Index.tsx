import { NotesProvider } from "@/contexts/NotesContext";
import AppShell from "@/components/AppShell";

const Index = () => {
  return (
    <NotesProvider>
      <AppShell />
    </NotesProvider>
  );
};

export default Index;
