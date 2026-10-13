import { useState } from "react";
import { Brain, Download, History, LogOut, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useNotes } from "@/contexts/NotesContext";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import BrainNameDialog from "./BrainNameDialog";
import HistoryDialog from "./HistoryDialog";
import ExportDialog from "./ExportDialog";

export default function AccountMenu({ collapsed = false }: { collapsed?: boolean }) {
  const { user, signOut } = useAuth();
  const { brainName, setBrainName } = useNotes();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<"brain" | "history" | "export" | null>(null);
  const choose = (value: typeof dialog) => { setOpen(false); setDialog(value); };
  return <>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild><Button variant="ghost" className={`w-full ${collapsed ? "px-0" : "justify-start"}`} aria-label="Usuario"><User />{!collapsed && <span className="truncate">{user?.email || "Iniciar sesión"}</span>}</Button></PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-64 p-1">
        {user ? <>
          <p className="truncate border-b border-border px-3 py-2 text-sm text-muted-foreground">{user.email}</p>
          <Button variant="ghost" className="w-full justify-start" onClick={() => choose("brain")}><Brain />Renombrar tu brain</Button>
          <Button variant="ghost" className="w-full justify-start" onClick={() => choose("history")}><History />Historial</Button>
          <Button variant="ghost" className="w-full justify-start" onClick={() => choose("export")}><Download />Descargar mis notas</Button>
          <Button variant="ghost" className="w-full justify-start text-destructive" onClick={async () => { setOpen(false); await signOut(); navigate("/auth"); }}><LogOut />Cerrar sesión</Button>
        </> : <Button variant="ghost" onClick={() => navigate("/auth")}>Iniciar sesión</Button>}
      </PopoverContent>
    </Popover>
    <BrainNameDialog open={dialog === "brain"} initialName={brainName} onSave={setBrainName} onClose={() => setDialog(null)} />
    <HistoryDialog open={dialog === "history"} onOpenChange={value => !value && setDialog(null)} />
    <ExportDialog open={dialog === "export"} onOpenChange={value => !value && setDialog(null)} />
  </>;
}