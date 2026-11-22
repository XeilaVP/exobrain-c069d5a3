import { useCallback, useEffect, useState } from "react";

export const MIN_WINDOW = { w: 360, h: 320 };
type Size = { w: number; h: number };
type Edge = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export const clampSize = (size: Size, vw: number, vh: number, margin = 16): Size => ({
  w: Math.max(Math.min(MIN_WINDOW.w, vw - margin * 2), Math.min(size.w, vw - margin * 2)),
  h: Math.max(Math.min(MIN_WINDOW.h, vh - margin * 2), Math.min(size.h, vh - margin * 2)),
});

const read = (key: string): Size | null => {
  try { const v = JSON.parse(localStorage.getItem(`exo-win-${key}`) || "null"); return v && v.w && v.h ? v : null; } catch { return null; }
};

/** Tamaño ajustable y persistente de ventanas de contenido (solo escritorio). Ventana centrada: los bordes crecen simétricamente. */
export const useResizableWindow = (key: string, defaults: Size, enabled: boolean, anchor: "center" | "right" = "center") => {
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [size, setSize] = useState<Size | null>(() => read(key));
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  const current = clampSize(size ?? defaults, vp.w, vp.h);

  const start = useCallback((edge: Edge, e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    const sx = e.clientX, sy = e.clientY, base = { ...current };
    const factor = anchor === "center" ? 2 : 1;
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      let { w, h } = base;
      if (edge.includes("e")) w = base.w + dx * factor;
      if (edge.includes("w")) w = base.w - dx * factor;
      if (edge.includes("s")) h = base.h + dy * factor;
      if (edge.includes("n")) h = base.h - dy * factor;
      setSize(clampSize({ w, h }, window.innerWidth, window.innerHeight));
    };
    const up = () => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
      setSize(s => { if (s) localStorage.setItem(`exo-win-${key}`, JSON.stringify(s)); return s; });
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  }, [current, key, anchor]);

  const reset = useCallback(() => { localStorage.removeItem(`exo-win-${key}`); setSize(null); }, [key]);

  const handles = enabled ? <ResizeHandles onStart={start} onReset={reset} /> : null;
  return { width: current.w, height: current.h, handles, vp };
};

const cls: Record<Edge, string> = {
  n: "top-0 left-3 right-3 h-1.5 cursor-ns-resize", s: "bottom-0 left-3 right-3 h-1.5 cursor-ns-resize",
  e: "right-0 top-3 bottom-3 w-1.5 cursor-ew-resize", w: "left-0 top-3 bottom-3 w-1.5 cursor-ew-resize",
  ne: "top-0 right-0 h-3 w-3 cursor-nesw-resize", sw: "bottom-0 left-0 h-3 w-3 cursor-nesw-resize",
  nw: "top-0 left-0 h-3 w-3 cursor-nwse-resize", se: "bottom-0 right-0 h-4 w-4 cursor-nwse-resize",
};

const ResizeHandles = ({ onStart, onReset }: { onStart: (e: Edge, ev: React.PointerEvent) => void; onReset: () => void }) => (
  <>
    {(Object.keys(cls) as Edge[]).map(edge => (
      <div key={edge} data-no-pan data-resize-handle={edge} aria-hidden title="Arrastra para ajustar · doble clic para restablecer"
        onPointerDown={e => onStart(edge, e)} onDoubleClick={onReset}
        className={`absolute z-20 touch-none transition-colors hover:bg-primary/60 ${cls[edge]} ${edge.length === 2 ? "rounded-full" : "rounded"}`}>
        {edge === "se" && <svg viewBox="0 0 10 10" className="pointer-events-none absolute bottom-1 right-1 h-2.5 w-2.5 text-muted-foreground"><path d="M9 3L3 9M9 6L6 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>}
      </div>
    ))}
  </>
);
