import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAiSettings } from "@/hooks/useAiSettings";
import { LAST_FALLBACK_KEY } from "@/lib/aiFallback";

interface AiSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AiSettingsDialog = ({ open, onOpenChange }: AiSettingsDialogProps) => {
  const { settings, loading, saveKey, saveModel, removeKey, listModels } = useAiSettings();
  const [apiKey, setApiKey] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [lastFallback, setLastFallback] = useState<string | null>(null);

  useEffect(() => {
    if (!open || settings.provider !== "openai") return;
    listModels().then(setModels).catch(() => setModels([]));
  }, [open, settings.provider, listModels]);

  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(LAST_FALLBACK_KEY);
      const meta = raw ? (JSON.parse(raw) as { fallbackMessage?: string }) : null;
      setLastFallback(meta?.fallbackMessage ?? null);
    } catch {
      setLastFallback(null);
    }
  }, [open]);

  const handleSave = async () => {
    if (!apiKey.trim()) return;
    setBusy(true);
    try {
      const result = await saveKey(apiKey.trim());
      setApiKey("");
      toast.success(`Clave guardada (····${result?.last4 ?? ""})`);
      const list = await listModels().catch(() => []);
      setModels(list);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar la clave");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    setBusy(true);
    try {
      await removeKey();
      setModels([]);
      toast.success("Clave eliminada. Vuelves a la IA incluida.");
    } catch {
      toast.error("No se pudo eliminar la clave");
    } finally {
      setBusy(false);
    }
  };

  const handleModel = async (model: string) => {
    try {
      await saveModel(model);
      toast.success(`Modelo: ${model}`);
    } catch {
      toast.error("No se pudo cambiar el modelo");
    }
  };

  const usingOwnKey = settings.provider === "openai" && !!settings.last4;
  const modelMissing = usingOwnKey && !!settings.model && models.length > 0 && !models.includes(settings.model);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajustes del asistente</DialogTitle>
          <DialogDescription>
            Conecta tu propia cuenta de OpenAI para que el chat consuma tu saldo en lugar de los créditos incluidos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
            Una suscripción de ChatGPT Plus no sirve aquí. Necesitas una clave de API creada en
            platform.openai.com, con su propio saldo.
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Clave de OpenAI</label>
            {usingOwnKey && (
              <p className="text-xs text-muted-foreground">Guardada: sk-····{settings.last4}</p>
            )}
            <Input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk-..."
              autoComplete="off"
            />
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={busy || loading || !apiKey.trim()}>
                {busy && <Loader2 className="animate-spin" />} Comprobar y guardar
              </Button>
              {usingOwnKey && (
                <Button variant="outline" onClick={handleRemove} disabled={busy}>Quitar clave</Button>
              )}
            </div>
          </div>

          {usingOwnKey && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Modelo</label>
              <Select value={settings.model ?? undefined} onValueChange={handleModel}>
                <SelectTrigger><SelectValue placeholder="Elige un modelo" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {models.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
              {modelMissing && (
                <p className="text-xs text-destructive">
                  El modelo «{settings.model}» ya no aparece en tu cuenta. Elige otro de la lista.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Solo los modelos de chat disponibles en tu cuenta. Para enviar audio necesitas un modelo con audio.
              </p>
            </div>
          )}

          {lastFallback && (
            <p className="text-xs text-muted-foreground">
              Última vez que se usó la IA incluida: {lastFallback}.
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            Estado actual: {usingOwnKey ? `Tu OpenAI · ${settings.model ?? "sin modelo"}` : "IA incluida"}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AiSettingsDialog;
