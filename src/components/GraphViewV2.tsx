import { useNotes } from "@/contexts/NotesContext";
import { useAuth } from "@/hooks/useAuth";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  User as UserIcon,
  LogOut,
  LogIn,
  Brain,
  TreePine,
  Save,
  Sun,
  Moon,
  History,
  Download,
  Lock,
  LockOpen,
  Expand,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import NotePostIt from "./NotePostIt";
import BrainNameDialog from "./BrainNameDialog";
import CreateNodeDialog from "./CreateNodeDialog";
import GoogleCalendarMenuItem from "./GoogleCalendarMenuItem";
import HistoryDialog from "./HistoryDialog";
import ExportDialog from "./ExportDialog";
import { CATEGORY_COLORS, DEFAULT_CATEGORY_COLOR } from "@/lib/categoryColors";
import { Note } from "@/types/notes";
import { useNavigate } from "react-router-dom";
import { motifPath, pickMotif, type BranchMotif } from "@/lib/treeGeometry";

/** Grosor de rama según profundidad. */
const widthForDepth = (depth: number, isMain?: boolean) => {
  if (isMain) return 2.6;
  return Math.max(0.8, 2.2 - depth * 0.35);
};

const branchPath = (
  from: { x: number; y: number },
  to: { x: number; y: number },
  kind: "trunk" | "branch" = "branch",
) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (kind === "trunk") {
    return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  }
  const c1 = { x: from.x + dx * 0.35, y: from.y + dy * 0.15 };
  const c2 = { x: from.x + dx * 0.65, y: from.y + dy * 0.85 };
  return `M ${from.x} ${from.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${to.x} ${to.y}`;
};

type NodeType = "root" | "category" | "note";

interface NodePos {
  id: string;
  x: number;
  y: number;
  type: NodeType;
  label: string;
  color: string; // hsl string
  categoryId?: string;
  noteId?: string;
  parentNoteId?: string | null;
  noteType?: "text" | "checklist";
  hasChildren?: boolean;
  isCollapsed?: boolean;
  isMain?: boolean;
  depth: number;
  isVirtual?: boolean;
  branchRootId?: string;
  side?: -1 | 1;
  z?: number;
}

interface Edge {
  from: string;
  to: string;
  kind?: "trunk" | "branch";
  /** trazo curvo precalculado a partir del motivo Bézier (ver treeGeometry.ts) */
  d?: string;
  motif?: BranchMotif;
  mirror?: boolean;
}

const ROOT_R = 30;
const CAT_R = 22;
const NOTE_R = 12;

const TREE_BRANCH_PALETTE = [
  { start: "316 66% 68%", end: "316 73% 82%" }, // pink — Psico
  { start: "262 84% 68%", end: "255 92% 80%" }, // violet — Ideas
  { start: "188 58% 55%", end: "188 62% 76%" }, // teal — Reflexiones
  { start: "31 74% 62%", end: "31 82% 79%" }, // orange — Tareas
  { start: "145 38% 55%", end: "145 42% 75%" }, // green
  { start: "220 84% 69%", end: "220 88% 82%" }, // blue
];

const svgSafeId = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, "-");

const GraphView = () => {
  const {
    notes,
    categories,
    addNote,
    deleteNote,
    moveNote,
    canMoveTo,
    updateNote,
    updateNotePosition,
    saveAbsolutePositions,
    brainPos,
    setBrainPos,
    linkNotes,
    setSelectedNoteId,
    selectedNoteId,
    brainName,
    setBrainName,
    onboarded,
    setOnboarded,
    loading,
  } = useNotes();

  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1200, h: 800 });
  const [openPostIt, setOpenPostIt] = useState<{ noteId: string; x: number; y: number } | null>(null);
  const [showBrainDialog, setShowBrainDialog] = useState(false);
  const [focusNoteId, setFocusNoteId] = useState<string | null>(null);
  const [isolatedRootId, setIsolatedRootId] = useState<string | null>(null);
  const [createDialog, setCreateDialog] = useState<{ x: number; y: number } | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [viewZoom, setViewZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);

  const didDrag = useRef(false);
  const didPan = useRef(false);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didInitialFitRef = useRef(false);
  const viewZoomRef = useRef(1);
  // Vista en vivo durante gestos: refs como fuente de verdad + transform imperativo.
  const panRef = useRef({ x: 0, y: 0 });
  const worldRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  // Drag offsets per node id (session-local, hasta que se guarden)
  const [offsets, setOffsets] = useState<Record<string, { dx: number; dy: number }>>({});
  const notesRef = useRef(notes);
  notesRef.current = notes;
  const offsetsRef = useRef(offsets);
  offsetsRef.current = offsets;
  const dragState = useRef<{ nodeId: string; startX: number; startY: number; baseDx: number; baseDy: number } | null>(
    null,
  );
  const panState = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  // Punteros originados dentro de una zona [data-no-pan] (post-it): se ignoran en el canvas.
  const ignoredPointers = useRef<Set<number>>(new Set());

  const pinchState = useRef<{
    startDist: number;
    startZoom: number;
    startPanX: number;
    startPanY: number;
    centerX: number;
    centerY: number;
  } | null>(null);

  // Hidden main-branch filter
  const [hiddenCategoryIds, setHiddenCategoryIds] = useState<Set<string>>(new Set());
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Candado de posiciones: por defecto bloqueado para evitar arrastres accidentales
  // al hacer zoom/pan, especialmente en móvil.
  const [positionsLocked, setPositionsLocked] = useState(() => {
    try {
      const saved = localStorage.getItem("exobrain-positions-locked");
      return saved === null ? true : saved === "true";
    } catch {
      return true;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("exobrain-positions-locked", String(positionsLocked));
    } catch {
      // ignore
    }
  }, [positionsLocked]);

  const rootNotes = useMemo(() => notes.filter((n) => !n.parentNoteId), [notes]);
  const visibleRoots = useMemo(
    () => rootNotes.filter((n) => !hiddenCategoryIds.has(n.id)),
    [rootNotes, hiddenCategoryIds],
  );

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    viewZoomRef.current = viewZoom;
  }, [viewZoom]);

  // First-time onboarding modal
  useEffect(() => {
    if (!loading && !onboarded) setShowBrainDialog(true);
  }, [loading, onboarded]);

  // Sync open post-it with selectedNoteId (navigation via links inside post-it)
  useEffect(() => {
    if (!openPostIt) return;
    if (selectedNoteId && selectedNoteId !== openPostIt.noteId) {
      setOpenPostIt((prev) => (prev ? { ...prev, noteId: selectedNoteId } : prev));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNoteId]);

  // POSICIONES FIJAS.
  // Cada nota guarda su posición absoluta (note.posX/posY) en la base de datos y
  // esa posición NO se recalcula nunca: ni al seleccionar, ni al plegar, ni al
  // hacer zoom, ni al crear o borrar otras notas, ni al cambiar el tamaño de la
  // ventana. Lo único automático es proponer una posición a una nota que todavía
  // no tiene ninguna (recién creada o heredada de la versión anterior).
  const { positions, edges, parentMap, seeds, baseNeedsSave } = useMemo(() => {
    const pos: NodePos[] = [];
    const eds: Edge[] = [];
    const parent: Record<string, string> = {};
    const seedList: { id: string; x: number; y: number }[] = [];

    if (notes.length === 0) {
      return { positions: pos, edges: eds, parentMap: parent, seeds: seedList, baseNeedsSave: false };
    }

    const colorForRoot = (rootId: string) => {
      const originalIndex = Math.max(
        0,
        rootNotes.findIndex((root) => root.id === rootId),
      );
      return TREE_BRANCH_PALETTE[originalIndex % TREE_BRANCH_PALETTE.length].start;
    };

    const childrenOf = new Map<string | null, Note[]>();
    notes.forEach((n) => {
      const key = n.parentNoteId ?? null;
      const arr = childrenOf.get(key);
      if (arr) arr.push(n);
      else childrenOf.set(key, [n]);
    });

    // --- Base del árbol (ExoBrain): posición fija guardada en el perfil. ---
    const positioned = notes.filter((n) => n.posX != null && n.posY != null);
    let base = brainPos;
    let needsBaseSave = false;
    if (!base) {
      if (positioned.length > 0) {
        const xs = positioned.map((n) => Number(n.posX));
        const ys = positioned.map((n) => Number(n.posY));
        base = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: Math.max(...ys) + 130 };
      } else {
        base = { x: size.w / 2, y: size.h - 96 };
      }
      needsBaseSave = positioned.length > 0;
    }

    // --- Coordenadas: guardadas o, si faltan, propuestas una sola vez. ---
    const coord = new Map<string, { x: number; y: number }>();
    const taken: { x: number; y: number }[] = [];
    positioned.forEach((n) => {
      const p = { x: Number(n.posX), y: Number(n.posY) };
      coord.set(n.id, p);
      taken.push(p);
    });

    const farEnough = (p: { x: number; y: number }, min = 62) =>
      taken.every((t) => Math.hypot(t.x - p.x, t.y - p.y) >= min);

    const seedFor = (note: Note) => {
      const parentPos = note.parentNoteId ? coord.get(note.parentNoteId) : null;
      let candidate: { x: number; y: number } | null = null;

      if (!parentPos) {
        // Raíz nueva: se cuelga del tronco por encima de la última raíz, alternando lado.
        const rootYs = (childrenOf.get(null) ?? [])
          .map((r) => coord.get(r.id))
          .filter(Boolean)
          .map((p) => p!.y);
        const topY = rootYs.length ? Math.min(...rootYs) : base!.y - 140;
        const side = (childrenOf.get(null) ?? []).findIndex((r) => r.id === note.id) % 2 === 0 ? 1 : -1;
        for (let k = 0; k < 12 && !candidate; k++) {
          const c = { x: base!.x + side * (150 + k * 24), y: topY - 120 - k * 18 };
          if (farEnough(c)) candidate = c;
        }
        candidate = candidate ?? { x: base!.x + side * 170, y: topY - 130 };
      } else {
        // Hija nueva: se propone junto a su madre, siguiendo su dirección de crecimiento.
        const grandPos = (() => {
          const p = notes.find((n) => n.id === note.parentNoteId);
          return p?.parentNoteId ? coord.get(p.parentNoteId) : null;
        })();
        const dirX = grandPos ? parentPos.x - grandPos.x : parentPos.x - base!.x;
        const dirY = grandPos ? parentPos.y - grandPos.y : -120;
        const baseAngle = Math.atan2(dirY, dirX || 0.001);
        const siblings = childrenOf.get(note.parentNoteId!) ?? [];
        const idx = Math.max(
          0,
          siblings.findIndex((s) => s.id === note.id),
        );
        const spread = 0.9;
        const step = siblings.length > 1 ? spread / (siblings.length - 1) : 0;
        const offset = siblings.length > 1 ? -spread / 2 + idx * step : 0;
        for (let k = 0; k < 16 && !candidate; k++) {
          const a = baseAngle + offset + (k % 2 === 0 ? 1 : -1) * Math.ceil(k / 2) * 0.22;
          const len = 105 + Math.floor(k / 4) * 26;
          const c = { x: parentPos.x + Math.cos(a) * len, y: parentPos.y + Math.sin(a) * len };
          if (farEnough(c)) candidate = c;
        }
        candidate = candidate ?? {
          x: parentPos.x + Math.cos(baseAngle) * 110,
          y: parentPos.y + Math.sin(baseAngle) * 110,
        };
      }

      coord.set(note.id, candidate);
      taken.push(candidate);
      seedList.push({ id: note.id, x: candidate.x, y: candidate.y });
      return candidate;
    };

    // Sembrar en orden padre→hijo para que las hijas conozcan la posición de su madre.
    const seedTree = (parentId: string | null) => {
      (childrenOf.get(parentId) ?? []).forEach((n) => {
        if (!coord.has(n.id)) seedFor(n);
        seedTree(n.id);
      });
    };
    seedTree(null);

    // --- Qué notas se pintan: raíces ocultas y subárboles plegados quedan fuera. ---
    const visible = new Set<string>();
    const depthOf = new Map<string, number>();
    const branchRootOf = new Map<string, string>();
    const walk = (note: Note, depth: number, branchRootId: string) => {
      visible.add(note.id);
      depthOf.set(note.id, depth);
      branchRootOf.set(note.id, branchRootId);
      (childrenOf.get(note.id) ?? []).forEach((c) => walk(c, depth + 1, branchRootId));
    };
    (childrenOf.get(null) ?? []).forEach((root) => {
      if (hiddenCategoryIds.has(root.id)) return;
      walk(root, 1, root.id);
    });

    // --- Tronco recto: de la base hasta la intersección de la raíz más alta. ---
    // La rama nace por debajo de su nota para subir ~27° en vez de salir horizontal.
    const BRANCH_RISE = Math.tan((27 * Math.PI) / 180);
    const visibleRootList = (childrenOf.get(null) ?? []).filter((r) => visible.has(r.id));
    const attachments = visibleRootList
      .map((r) => {
        const p = coord.get(r.id)!;
        const drop = Math.abs(p.x - base!.x) * BRANCH_RISE;
        return { root: r, y: Math.min(p.y + drop, base!.y - 40) };
      })
      .sort((a, b) => b.y - a.y); // de abajo (mayor y) hacia arriba

    pos.push({
      id: "root",
      x: base.x,
      y: base.y,
      type: "root",
      label: brainName || "ExoBrain",
      color: "220 78% 58%",
      depth: -1,
      z: 1,
    });

    let prevId = "root";
    attachments.forEach(({ root, y }) => {
      const attachId = `attach-${root.id}`;
      pos.push({
        id: attachId,
        x: base!.x,
        y,
        type: "category",
        label: "",
        color: "258 74% 68%",
        depth: -1,
        isVirtual: true,
        z: 1,
      });
      eds.push({ from: prevId, to: attachId, kind: "trunk" });
      parent[attachId] = prevId;
      prevId = attachId;
    });

    // --- Nodos-nota en sus posiciones fijas + ramas curvas entre madre e hija. ---
    notes.forEach((note) => {
      if (!visible.has(note.id)) return;
      const p = coord.get(note.id)!;
      const depth = depthOf.get(note.id) ?? 1;
      const branchRootId = branchRootOf.get(note.id) ?? note.id;
      const children = childrenOf.get(note.id) ?? [];
      pos.push({
        id: `note-${note.id}`,
        x: p.x,
        y: p.y,
        type: "note",
        label: note.title,
        color: colorForRoot(branchRootId),
        categoryId: note.categoryId ?? undefined,
        noteId: note.id,
        parentNoteId: note.parentNoteId,
        noteType: note.noteType,
        hasChildren: children.length > 0,
        isCollapsed: children.length === 0,
        isMain: depth === 1,
        depth: Math.max(0, depth - 1),
        branchRootId,
        z: Math.max(0.6, 1 - Math.max(0, depth - 1) * 0.035),
      });

      const fromId = note.parentNoteId ? `note-${note.parentNoteId}` : `attach-${note.id}`;
      const motif = pickMotif(`${note.id}-${depth}`, depth <= 1 ? 0.09 : 0.16);
      const mirror = note.id.charCodeAt(0) % 2 === 0;
      eds.push({ from: fromId, to: `note-${note.id}`, kind: "branch", motif, mirror });
      parent[`note-${note.id}`] = fromId;
    });

    return { positions: pos, edges: eds, parentMap: parent, seeds: seedList, baseNeedsSave: needsBaseSave };
  }, [notes, rootNotes, brainName, brainPos, size.w, size.h, hiddenCategoryIds]);

  // Persistencia de la única asignación automática que existe: notas sin posición.
  const seededRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const pending = seeds.filter((s) => !seededRef.current.has(s.id));
    if (pending.length === 0) return;
    pending.forEach((s) => seededRef.current.add(s.id));
    void saveAbsolutePositions(pending);
  }, [seeds, saveAbsolutePositions]);

  const baseSavedRef = useRef(false);
  useEffect(() => {
    if (!baseNeedsSave || baseSavedRef.current) return;
    const rootPos = positions.find((p) => p.id === "root");
    if (!rootPos) return;
    baseSavedRef.current = true;
    void setBrainPos({ x: rootPos.x, y: rootPos.y });
  }, [baseNeedsSave, positions, setBrainPos]);

  // Apply drag offsets — propagate ancestor offsets to descendants so dragging a
  // node moves its whole subtree along with it.
  const positionsWithOffsets = useMemo(() => {
    const accumulated: Record<string, { dx: number; dy: number }> = {};
    const compute = (id: string): { dx: number; dy: number } => {
      if (accumulated[id]) return accumulated[id];
      const own = offsets[id] || { dx: 0, dy: 0 };
      const parentId = parentMap[id];
      if (!parentId) {
        accumulated[id] = own;
        return own;
      }
      const par = compute(parentId);
      const total = { dx: own.dx + par.dx, dy: own.dy + par.dy };
      accumulated[id] = total;
      return total;
    };
    return positions.map((p) => {
      const off = compute(p.id);
      const nx = p.x + off.dx;
      const ny = p.y + off.dy;
      return off.dx !== 0 || off.dy !== 0 ? { ...p, x: nx, y: ny } : p;
    });
  }, [positions, offsets, parentMap]);

  const getPos = (id: string) => positionsWithOffsets.find((p) => p.id === id);

  const getNodeRadius = useCallback((node: NodePos) => {
    if (node.isVirtual) return 0;
    if (node.type === "root") return ROOT_R;
    if (node.type === "note" && node.isMain) return CAT_R;
    return NOTE_R;
  }, []);

  const getSubtreeIds = useCallback(
    (nodeId: string) => {
      const ids = new Set<string>();
      const visitNote = (noteId: string) => {
        ids.add(`note-${noteId}`);
        notes.filter((n) => n.parentNoteId === noteId).forEach((child) => visitNote(child.id));
      };

      if (nodeId.startsWith("note-")) {
        visitNote(nodeId.replace("note-", ""));
      } else if (nodeId.startsWith("cat-")) {
        const categoryId = nodeId.replace("cat-", "");
        ids.add(nodeId);
        notes.filter((n) => n.categoryId === categoryId && !n.parentNoteId).forEach((note) => visitNote(note.id));
      } else {
        positionsWithOffsets.forEach((node) => ids.add(node.id));
      }

      return ids;
    },
    [notes, positionsWithOffsets],
  );

  const getNodesBounds = useCallback(
    (nodes: NodePos[]) => {
      if (nodes.length === 0) return null;
      return nodes.reduce(
        (bounds, node) => {
          const r = getNodeRadius(node);
          const labelPadX = node.isVirtual ? 0 : node.type === "root" ? 86 : node.isMain ? 92 : 78;
          const labelPadY = node.isVirtual ? 0 : node.type === "root" ? 24 : node.isMain ? 20 : 16;
          return {
            minX: Math.min(bounds.minX, node.x - Math.max(r, labelPadX)),
            maxX: Math.max(bounds.maxX, node.x + Math.max(r, labelPadX)),
            minY: Math.min(bounds.minY, node.y - Math.max(r, labelPadY)),
            maxY: Math.max(bounds.maxY, node.y + Math.max(r, labelPadY)),
          };
        },
        { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
      );
    },
    [getNodeRadius],
  );

  const fitFullTree = useCallback(() => {
    const bounds = getNodesBounds(positionsWithOffsets);
    if (!bounds) return;

    const isMobile = size.w < 640;
    const sideMargin = isMobile ? 12 : 36;
    const topMargin = isMobile ? 48 : 56;
    const bottomMargin = isMobile ? 48 : 56;
    const availableW = Math.max(1, size.w - sideMargin * 2);
    const availableH = Math.max(1, size.h - topMargin - bottomMargin);
    const treeW = Math.max(1, bounds.maxX - bounds.minX);
    const treeH = Math.max(1, bounds.maxY - bounds.minY);
    const zoom = Math.min(1, Math.max(0.25, Math.min(availableW / treeW, availableH / treeH)));
    const treeCenterX = (bounds.minX + bounds.maxX) / 2;
    const treeCenterY = (bounds.minY + bounds.maxY) / 2;
    const targetX = size.w / 2;
    const targetY = (topMargin + (size.h - bottomMargin)) / 2;

    setViewZoom(zoom);
    setPan({ x: targetX - treeCenterX * zoom, y: targetY - treeCenterY * zoom });
  }, [getNodesBounds, positionsWithOffsets, size.w, size.h]);

  const fitNodesToView = useCallback(
    (nodesToFit: NodePos[]) => {
      const bounds = getNodesBounds(nodesToFit);
      if (!bounds) return;
      const isMobile = size.w < 640;
      const sideMargin = isMobile ? 16 : 56;
      const topMargin = isMobile ? 64 : 72;
      const bottomMargin = isMobile ? 56 : 64;
      const availableW = Math.max(1, size.w - sideMargin * 2);
      const availableH = Math.max(1, size.h - topMargin - bottomMargin);
      const treeW = Math.max(1, bounds.maxX - bounds.minX);
      const treeH = Math.max(1, bounds.maxY - bounds.minY);
      const zoom = Math.min(1.35, Math.max(0.3, Math.min(availableW / treeW, availableH / treeH)));
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;
      const nextPan = {
        x: size.w / 2 - centerX * zoom,
        y: (topMargin + (size.h - bottomMargin)) / 2 - centerY * zoom,
      };
      setViewZoom(zoom);
      setPan(nextPan);
      viewZoomRef.current = zoom;
      panRef.current = nextPan;
    },
    [getNodesBounds, size.w, size.h],
  );

  const layoutSignature = useMemo(() => {
    return positions.map((node) => `${node.id}:${Math.round(node.x)}:${Math.round(node.y)}`).join("|");
  }, [positions]);

  // Solo encuadramos el árbol la primera vez que hay layout. A partir de ahí la
  // navegación es siempre manual: ni la selección ni el plegado tocan pan/zoom.
  useEffect(() => {
    if (positionsWithOffsets.length === 0) return;
    if (didInitialFitRef.current) return;
    fitFullTree();
    didInitialFitRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutSignature, size.w, size.h]);

  // Mantener los refs sincronizados cuando pan/zoom cambian por vías declarativas.
  useEffect(() => {
    panRef.current = pan;
  }, [pan]);
  useEffect(() => {
    viewZoomRef.current = viewZoom;
  }, [viewZoom]);

  // Aplicación imperativa del transform (1 vez por frame, sin re-render de nodos).
  const applyViewTransform = useCallback(() => {
    rafRef.current = null;
    const el = worldRef.current;
    if (!el) return;
    const z = viewZoomRef.current;
    el.style.transform = `matrix(${z}, 0, 0, ${z}, ${panRef.current.x}, ${panRef.current.y})`;
  }, []);

  const scheduleView = useCallback(() => {
    if (rafRef.current == null) rafRef.current = requestAnimationFrame(applyViewTransform);
  }, [applyViewTransform]);

  // Sincroniza React con la vista final del gesto (una sola vez).
  const commitView = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    applyViewTransform();
    setPan({ ...panRef.current });
    setViewZoom(viewZoomRef.current);
  }, [applyViewTransform]);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Zoom con rueda / pinch de trackpad anclado al cursor (listener nativo no pasivo).
  const zoomAt = useCallback(
    (px: number, py: number, factor: number) => {
      const z = viewZoomRef.current || 1;
      const next = Math.max(0.2, Math.min(4, z * factor));
      const k = next / z;
      const p = panRef.current;
      panRef.current = { x: px - (px - p.x) * k, y: py - (py - p.y) * k };
      viewZoomRef.current = next;
      scheduleView();
    },
    [scheduleView],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let commitTimer: ReturnType<typeof setTimeout> | null = null;
    const onWheel = (e: WheelEvent) => {
      // Rueda sobre el post-it: scroll de la nota, sin zoom del árbol.
      if (e.target instanceof Element && e.target.closest("[data-no-pan]")) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const factor = Math.exp(-dy * (e.ctrlKey ? 0.0025 : 0.0015));
      setIsPanning(true);
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, factor);
      if (commitTimer) clearTimeout(commitTimer);
      commitTimer = setTimeout(() => {
        commitTimer = null;
        commitView();
      }, 140);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      if (commitTimer) clearTimeout(commitTimer);
      el.removeEventListener("wheel", onWheel);
    };
  }, [zoomAt, commitView]);

  // Al soltar una nota arrastrada se guarda su posición absoluta y la de toda su
  // descendencia con el mismo desplazamiento: las hijas conservan exactamente la
  // colocación relativa que tenían respecto a su madre. Ninguna otra nota se toca.
  const persistDragged = useCallback(
    (nodeId: string, dx: number, dy: number) => {
      if (!nodeId.startsWith("note-")) return;
      const noteId = nodeId.replace("note-", "");
      const all = notesRef.current;
      const note = all.find((n) => n.id === noteId);
      if (!note) return;

      const subtree: typeof all = [];
      const collect = (id: string) => {
        const n = all.find((x) => x.id === id);
        if (!n) return;
        subtree.push(n);
        all.filter((c) => c.parentNoteId === id).forEach((c) => collect(c.id));
      };
      collect(noteId);

      const entries = subtree
        .filter((n) => n.posX != null && n.posY != null)
        .map((n) => ({ id: n.id, x: Number(n.posX) + dx, y: Number(n.posY) + dy }));

      setOffsets((prev) => {
        const next = { ...prev };
        delete next[nodeId];
        return next;
      });
      if (entries.length > 0) void saveAbsolutePositions(entries);
    },
    [saveAbsolutePositions],
  );
  const persistDraggedRef = useRef(persistDragged);
  persistDraggedRef.current = persistDragged;

  // Zona excluida: el post-it y cualquier overlay marcado con data-no-pan.
  const isInNoPan = (target: EventTarget | null) => !!(target instanceof Element && target.closest("[data-no-pan]"));

  // Drag / pan / pinch pointer handlers (window-level)
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (isInNoPan(e.target)) {
        ignoredPointers.current.add(e.pointerId);
        return;
      }
      if (pointersRef.current.has(e.pointerId)) return;
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      // El segundo puntero gana siempre: cancela cualquier drag de nodo y activa pinch/pan.
      if (pointersRef.current.size >= 2 && !pinchState.current) {
        const [p1, p2] = Array.from(pointersRef.current.values());
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        pinchState.current = {
          startDist: dist,
          startZoom: viewZoomRef.current || 1,
          startPanX: panRef.current.x,
          startPanY: panRef.current.y,
          centerX: (p1.x + p2.x) / 2,
          centerY: (p1.y + p2.y) / 2,
        };
        panState.current = null;
        dragState.current = null;
        didPan.current = true;
        setIsPanning(true);
      }
    };

    const onMove = (e: PointerEvent) => {
      if (ignoredPointers.current.has(e.pointerId)) return;
      if (pointersRef.current.has(e.pointerId)) {
        pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }

      if (pinchState.current && pointersRef.current.size >= 2) {
        const [p1, p2] = Array.from(pointersRef.current.values());
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const cx = (p1.x + p2.x) / 2;
        const cy = (p1.y + p2.y) / 2;
        const ps = pinchState.current;
        if (ps.startDist > 0) {
          const scale = dist / ps.startDist;
          const newZoom = Math.max(0.3, Math.min(3, ps.startZoom * scale));
          const worldX = (ps.centerX - ps.startPanX) / ps.startZoom;
          const worldY = (ps.centerY - ps.startPanY) / ps.startZoom;
          viewZoomRef.current = newZoom;
          panRef.current = { x: cx - worldX * newZoom, y: cy - worldY * newZoom };
          scheduleView();
        }
        return;
      }

      const ds = dragState.current;
      if (ds) {
        const rawDx = e.clientX - ds.startX;
        const rawDy = e.clientY - ds.startY;
        if (!didDrag.current && Math.hypot(rawDx, rawDy) > 5) didDrag.current = true;
        if (didDrag.current) {
          const zoom = viewZoomRef.current || 1;
          const dx = rawDx / zoom;
          const dy = rawDy / zoom;
          setOffsets((prev) => ({
            ...prev,
            [ds.nodeId]: { dx: ds.baseDx + dx, dy: ds.baseDy + dy },
          }));
        }
      }

      const ps = panState.current;
      if (!ps) return;
      const rawDx = e.clientX - ps.startX;
      const rawDy = e.clientY - ps.startY;
      if (!didPan.current && Math.hypot(rawDx, rawDy) > 5) didPan.current = true;
      if (didPan.current) {
        panRef.current = { x: ps.baseX + rawDx, y: ps.baseY + rawDy };
        scheduleView();
      }
    };

    const onUp = (e: PointerEvent) => {
      if (ignoredPointers.current.has(e.pointerId)) {
        ignoredPointers.current.delete(e.pointerId);
        return;
      }

      pointersRef.current.delete(e.pointerId);
      const ds = dragState.current;
      dragState.current = null;

      if (ds && didDrag.current) {
        const off = offsetsRef.current[ds.nodeId];
        if (off) persistDraggedRef.current(ds.nodeId, off.dx, off.dy);
      }

      if (pinchState.current && pointersRef.current.size < 2) pinchState.current = null;

      if (pointersRef.current.size === 0) {
        panState.current = null;
        commitView();
        setIsPanning(false);
      }
    };

    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [scheduleView, commitView]);

  // Click simple = selección visual / doble click = abrir nota o aislar un tema principal.
  const openIsolatedBranch = useCallback(
    (rootId: string) => {
      const noteIds = new Set<string>();
      const visit = (id: string) => {
        noteIds.add(id);
        notes.filter((n) => n.parentNoteId === id).forEach((child) => visit(child.id));
      };
      visit(rootId);
      const branchNodes = positionsWithOffsets.filter((node) => node.noteId && noteIds.has(node.noteId));
      setIsolatedRootId(rootId);
      setFocusNoteId(null);
      setOpenPostIt(null);
      fitNodesToView(branchNodes);
    },
    [notes, positionsWithOffsets, fitNodesToView],
  );

  const handleNodeClick = useCallback(
    (nodeId: string, clientX: number, clientY: number) => {
      if (didDrag.current) {
        didDrag.current = false;
        return;
      }
      if (didPan.current) {
        didPan.current = false;
        return;
      }

      if (nodeId === "root") {
        setShowBrainDialog(true);
        return;
      }

      if (!nodeId.startsWith("note-")) return;
      const nId = nodeId.replace("note-", "");
      const selected = notes.find((n) => n.id === nId);
      if (!selected) return;

      if (clickTimer.current) {
        clearTimeout(clickTimer.current);
        clickTimer.current = null;

        if (!selected.parentNoteId) {
          openIsolatedBranch(nId);
        } else {
          setSelectedNoteId(nId);
          setOpenPostIt({ noteId: nId, x: clientX, y: clientY });
        }
        return;
      }

      clickTimer.current = setTimeout(() => {
        clickTimer.current = null;
        setFocusNoteId(nId);
      }, 240);
    },
    [notes, openIsolatedBranch, setSelectedNoteId],
  );

  // Selección visual:
  // - nota normal: ella + hijas directas + notas enlazadas
  // - tema principal: toda su rama jerárquica
  const focusIds = useMemo(() => {
    if (!focusNoteId) return null;
    const selected = notes.find((n) => n.id === focusNoteId);
    if (!selected) return null;

    const ids = new Set<string>();
    ids.add(`note-${selected.id}`);

    if (!selected.parentNoteId) {
      ids.add("root");
      ids.add("trunk-top");
      ids.add(`attach-${selected.id}`);

      const visit = (id: string) => {
        notes
          .filter((n) => n.parentNoteId === id)
          .forEach((child) => {
            ids.add(`note-${child.id}`);
            visit(child.id);
          });
      };
      visit(selected.id);
    } else {
      notes.filter((n) => n.parentNoteId === selected.id).forEach((child) => ids.add(`note-${child.id}`));
      selected.linkedNoteIds.forEach((linkedId) => ids.add(`note-${linkedId}`));
    }

    return ids;
  }, [focusNoteId, notes]);

  const dimFor = useCallback((id: string) => (focusIds && !focusIds.has(id) ? 0.16 : 1), [focusIds]);

  const isolatedNodeIds = useMemo(() => {
    if (!isolatedRootId) return null;
    const ids = new Set<string>();
    const visit = (id: string) => {
      ids.add(`note-${id}`);
      notes.filter((n) => n.parentNoteId === id).forEach((child) => visit(child.id));
    };
    visit(isolatedRootId);
    return ids;
  }, [isolatedRootId, notes]);

  const visiblePositions = useMemo(
    () =>
      isolatedNodeIds ? positionsWithOffsets.filter((node) => isolatedNodeIds.has(node.id)) : positionsWithOffsets,
    [isolatedNodeIds, positionsWithOffsets],
  );

  const visibleEdges = useMemo(
    () =>
      isolatedNodeIds ? edges.filter((edge) => isolatedNodeIds.has(edge.from) && isolatedNodeIds.has(edge.to)) : edges,
    [isolatedNodeIds, edges],
  );

  const visualForRoot = useCallback(
    (rootId?: string) => {
      const index = rootId
        ? Math.max(
            0,
            rootNotes.findIndex((root) => root.id === rootId),
          )
        : 0;
      return TREE_BRANCH_PALETTE[index % TREE_BRANCH_PALETTE.length];
    },
    [rootNotes],
  );

  // Nivel de detalle según zoom: la geometría no cambia, solo la legibilidad.
  // Cada nivel de profundidad pide un poco más de acercamiento para mostrar texto.
  const labelVisibleAtDepth = useCallback((depth: number) => viewZoom >= 0.5 + Math.max(0, depth) * 0.16, [viewZoom]);

  // Link edges (horizontal between notes)
  const linkEdges = useMemo(() => {
    const out: { from: string; to: string }[] = [];
    const ids = new Set(visiblePositions.map((p) => p.id));
    notes.forEach((n) => {
      const fromKey = `note-${n.id}`;
      if (!ids.has(fromKey)) return;
      n.linkedNoteIds.forEach((lid) => {
        const toKey = `note-${lid}`;
        if (ids.has(toKey) && n.id < lid) out.push({ from: fromKey, to: toKey });
      });
    });
    return out;
  }, [notes, visiblePositions]);
  // Minimapa: representa siempre el árbol completo y la zona visible actual.
  const minimapData = useMemo(() => {
    const bounds = getNodesBounds(positionsWithOffsets);
    if (!bounds || positionsWithOffsets.length === 0) return null;

    const padding = 55;

    const minX = bounds.minX - padding;
    const minY = bounds.minY - padding;
    const maxX = bounds.maxX + padding;
    const maxY = bounds.maxY + padding;

    const width = Math.max(1, maxX - minX);
    const height = Math.max(1, maxY - minY);

    const zoom = viewZoom || 1;

    return {
      minX,
      minY,
      width,
      height,
      viewport: {
        x: -pan.x / zoom,
        y: -pan.y / zoom,
        width: size.w / zoom,
        height: size.h / zoom,
      },
    };
  }, [getNodesBounds, positionsWithOffsets, pan.x, pan.y, viewZoom, size.w, size.h]);
  return (
    <div
      ref={containerRef}
      className="flex-1 h-full w-full overflow-hidden relative select-none bg-background"
      style={{
        touchAction: "none",
      }}
      onPointerDown={(e) => {
        if (e.button !== 0 && e.pointerType === "mouse") return;
        const target = e.target as HTMLElement;
        if (target.closest("[data-no-pan]")) return;
        const onBackground = !target.closest(
          "[data-graph-node], button, input, textarea, [role='dialog'], [data-no-pan]",
        );

        // Siempre registrar el puntero: así el pinch puede empezar incluso sobre una nota.
        pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (pointersRef.current.size >= 2) {
          const [p1, p2] = Array.from(pointersRef.current.values());
          const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          pinchState.current = {
            startDist: dist,
            startZoom: viewZoomRef.current || 1,
            startPanX: panRef.current.x,
            startPanY: panRef.current.y,
            centerX: (p1.x + p2.x) / 2,
            centerY: (p1.y + p2.y) / 2,
          };
          panState.current = null;
          dragState.current = null;
          didPan.current = true;
          setIsPanning(true);
          return;
        }

        if (!onBackground) return;
        if (e.pointerType === "touch") return;

        panState.current = {
          startX: e.clientX,
          startY: e.clientY,
          baseX: panRef.current.x,
          baseY: panRef.current.y,
        };
        didPan.current = false;
        setIsPanning(true);
      }}
      onClick={(e) => {
        if (didPan.current) {
          didPan.current = false;
          return;
        }
        const target = e.target as HTMLElement;
        if (target.closest("[data-no-pan]")) return;
        const onBackground = !target.closest(
          "[data-graph-node], button, input, textarea, [role='dialog'], [data-no-pan]",
        );
        if (onBackground) {
          setFocusNoteId(null);
          if (openPostIt) setOpenPostIt(null);
        }
      }}
    >
      {/* Tree world: SVG branches + nodes */}
      <div
        ref={worldRef}
        className="absolute inset-0"
        style={{
          transform: `matrix(${viewZoom}, 0, 0, ${viewZoom}, ${pan.x}, ${pan.y})`,
          transformOrigin: "0 0",
          transition: isPanning ? "none" : "transform 400ms cubic-bezier(.2,.7,.2,1)",
          willChange: "transform",
        }}
      >
        {/* Shared trunk + organic ramifications. Thin lines, no literal tree illustration. */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0, overflow: "visible" }}>
          <defs>
            <filter id="branch-soft-depth" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2.2" />
            </filter>
            <linearGradient
              id="tree-trunk-gradient"
              gradientUnits="userSpaceOnUse"
              x1={size.w / 2}
              y1={size.h}
              x2={size.w / 2}
              y2={0}
            >
              <stop offset="0%" stopColor="hsl(220 84% 58%)" stopOpacity="0.96" />
              <stop offset="100%" stopColor="hsl(258 82% 74%)" stopOpacity="0.72" />
            </linearGradient>
            {rootNotes.map((root, index) => {
              const visual = TREE_BRANCH_PALETTE[index % TREE_BRANCH_PALETTE.length];
              return (
                <linearGradient
                  key={`gradient-${root.id}`}
                  id={`tree-branch-${svgSafeId(root.id)}`}
                  gradientUnits="userSpaceOnUse"
                  x1={0}
                  y1={size.h}
                  x2={size.w}
                  y2={0}
                >
                  <stop offset="0%" stopColor={`hsl(${visual.start})`} stopOpacity="0.98" />
                  <stop offset="100%" stopColor={`hsl(${visual.end})`} stopOpacity="0.72" />
                </linearGradient>
              );
            })}
          </defs>

          {visibleEdges.map((edge, idx) => {
            const from = getPos(edge.from);
            const to = getPos(edge.to);
            if (!from || !to) return null;

            const kind = edge.kind ?? "branch";
            const isTrunk = kind === "trunk";
            const isMain = to.type === "note" && to.isMain;
            const width = isTrunk ? 3.5 : widthForDepth(to.depth, isMain);
            const z = Math.min(from.z ?? 1, to.z ?? 1);
            const focusDim = isTrunk ? 1 : Math.min(dimFor(edge.from), dimFor(edge.to));
            const isActive = !!focusIds && focusIds.has(edge.to);
            const baseOpacity = isTrunk ? 0.72 : isMain ? 0.94 : 0.82;
            const opacity = isActive ? 1 : baseOpacity * z * focusDim;
            const rootId = to.branchRootId || from.branchRootId;
            const stroke = isTrunk
              ? "url(#tree-trunk-gradient)"
              : rootId
                ? `url(#tree-branch-${svgSafeId(rootId)})`
                : `hsl(${to.color})`;
            // La rama se traza siempre entre las posiciones ACTUALES de madre e
            // hija (incluido cualquier desplazamiento manual/arrastre), reutilizando
            // el mismo motivo Bézier ya asignado — así nunca se desconecta un trazo
            // ni cambia de forma al mover un nodo.
            const d = edge.motif ? motifPath(from, to, edge.motif, !!edge.mirror) : branchPath(from, to, kind);

            return (
              <g key={`be-${idx}`} style={{ opacity, transition: "opacity 260ms ease" }}>
                {!isTrunk && (
                  <path
                    d={d}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={width + 2.0}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={isActive ? 0.12 : 0.065}
                    filter="url(#branch-soft-depth)"
                  />
                )}
                <path
                  d={d}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            );
          })}

          {/* Punto de unión rama-tronco: suaviza el quiebre en cada intersección. */}
          {visiblePositions
            .filter((n) => n.isVirtual && n.id.startsWith("attach-"))
            .map((n) => (
              <circle
                key={`att-${n.id}`}
                cx={n.x}
                cy={n.y}
                r={10}
                fill="url(#tree-trunk-gradient)"
                style={{ opacity: dimFor(n.id), transition: "opacity 260ms ease" }}
              />
            ))}

          {/* Cross-links stay secondary to the actual hierarchy. */}
          {linkEdges.map((edge, idx) => {
            const from = getPos(edge.from);
            const to = getPos(edge.to);
            if (!from || !to) return null;
            return (
              <path
                key={`le-${idx}`}
                d={branchPath(from, to, "branch")}
                fill="none"
                stroke="hsl(var(--muted-foreground) / 0.30)"
                strokeWidth={1}
                strokeDasharray="4 6"
                strokeLinecap="round"
                style={{ opacity: Math.min(dimFor(edge.from), dimFor(edge.to)), transition: "opacity 320ms ease" }}
              />
            );
          })}
        </svg>

        {/* Labels are the nodes: small, readable and sitting directly on the ramifications. */}
        <AnimatePresence>
          {visiblePositions.map((node) => {
            if (node.isVirtual) return null;

            const isRoot = node.type === "root";
            const isMainNote = node.type === "note" && node.isMain;
            const nodeNote = node.noteId ? notes.find((n) => n.id === node.noteId) : null;
            const childCount = nodeNote ? notes.filter((n) => n.parentNoteId === nodeNote.id).length : 0;
            const dim = dimFor(node.id);
            const z = node.z ?? 1;
            const isFocused = !!focusIds && focusIds.has(node.id);
            const showChildLabel = isMainNote || isFocused || labelVisibleAtDepth(node.depth);
            const baseScale = focusIds ? (isFocused ? (isMainNote ? 1.06 : 1.025) : 0.96) : 0.96 + z * 0.04;
            const visualOpacity = dim * (focusIds ? 1 : Math.max(0.68, z));

            return (
              <motion.div
                key={node.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{
                  opacity: visualOpacity,
                  scale: baseScale,
                  left: node.x,
                  top: node.y,
                }}
                exit={{ opacity: 0, scale: 0.88 }}
                transition={
                  dragState.current?.nodeId === node.id
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 290, damping: 28 }
                }
                className={`absolute touch-none ${positionsLocked || isRoot ? "cursor-default" : "cursor-grab active:cursor-grabbing"}`}
                data-graph-node
                style={{
                  width: 1,
                  height: 1,
                  zIndex: isRoot ? 8 : isMainNote ? 6 : 4,
                  filter: dim < 1 ? "blur(0.55px)" : z < 0.82 ? "blur(0.18px)" : "none",
                  transition: "filter 300ms ease",
                }}
                onPointerDown={(e) => {
                  didDrag.current = false;
                  const cur = offsets[node.id] || { dx: 0, dy: 0 };
                  // La base ExoBrain está anclada. Con el candado activo no se inicia arrastre.
                  dragState.current =
                    isRoot || positionsLocked
                      ? null
                      : {
                          nodeId: node.id,
                          startX: e.clientX,
                          startY: e.clientY,
                          baseDx: cur.dx,
                          baseDy: cur.dy,
                        };
                  // No detenemos la propagación: el canvas debe detectar el segundo puntero
                  // aunque el gesto empiece directamente sobre una nota.
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleNodeClick(node.id, e.clientX, e.clientY);
                }}
              >
                {isRoot ? (
                  <div
                    className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-2xl border bg-card/95 px-5 py-2.5 font-display font-semibold text-foreground shadow-sm"
                    style={{
                      borderColor: "hsl(262 30% 70% / 0.70)",
                      boxShadow: "0 8px 26px hsl(262 30% 40% / 0.30)",
                    }}
                  >
                    {node.label}
                  </div>
                ) : showChildLabel ? (
                  <div
                    className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center whitespace-nowrap rounded-full border bg-card/70 backdrop-blur-sm font-body text-foreground shadow-sm transition-shadow ${
                      isMainNote
                        ? "gap-2 px-3 py-1.5 text-[14px] font-semibold"
                        : "gap-1.5 px-2.5 py-1 text-[10px] font-medium"
                    }`}
                    style={{
                      borderColor: `hsl(${node.color} / ${isFocused ? 0.52 : isMainNote ? 0.3 : 0.16})`,
                      boxShadow: isFocused
                        ? `0 5px 18px hsl(${node.color} / 0.3)`
                        : `0 3px 12px hsl(${node.color} / 0.2)`,
                    }}
                  >
                    <span
                      className={isMainNote ? "h-2 w-2 shrink-0 rounded-full" : "h-1.5 w-1.5 shrink-0 rounded-full"}
                      style={{ backgroundColor: `hsl(${node.color})` }}
                    />
                    {nodeNote?.icon && <span className="text-[10px] leading-none opacity-80">{nodeNote.icon}</span>}
                    <span className="max-w-[150px] overflow-hidden text-ellipsis">{node.label}</span>
                    {childCount > 0 && (
                      <span className="ml-0.5 text-[9px] font-normal text-muted-foreground">{childCount}</span>
                    )}
                  </div>
                ) : (
                  <span
                    className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-card"
                    style={{
                      width: 12,
                      height: 12,
                      backgroundColor: `hsl(${visualForRoot(node.branchRootId).start})`,
                      boxShadow: `0 2px 7px hsl(${node.color} / 0.16)`,
                    }}
                  />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      {/* Minimapa + volver a vista general */}
      {minimapData && positionsWithOffsets.length > 0 && (
        <div
          data-no-pan
          className="fixed bottom-3 left-3 z-30 w-[150px] h-[96px] md:w-[185px] md:h-[116px] rounded-xl border border-border/60 bg-card/80 backdrop-blur-md shadow-lg overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox={`${minimapData.minX} ${minimapData.minY} ${minimapData.width} ${minimapData.height}`}
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Ramas simplificadas */}
            {edges.map((edge, index) => {
              const from = getPos(edge.from);
              const to = getPos(edge.to);
              if (!from || !to) return null;

              const rootId = to.branchRootId || from.branchRootId;
              const color = rootId ? visualForRoot(rootId).start : "220 12% 55%";

              return (
                <line
                  key={`mini-edge-${index}`}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={`hsl(${color})`}
                  strokeWidth={2}
                  strokeLinecap="round"
                  opacity={0.6}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}

            {/* Nodos */}
            {positionsWithOffsets
              .filter((node) => !node.isVirtual)
              .map((node) => (
                <circle
                  key={`mini-node-${node.id}`}
                  cx={node.x}
                  cy={node.y}
                  r={node.type === "root" ? 7 : node.isMain ? 5 : 3}
                  fill={node.type === "root" ? "hsl(220 78% 58%)" : `hsl(${node.color})`}
                />
              ))}

            {/* Zona que está viendo el usuario */}
            <rect
              x={minimapData.viewport.x}
              y={minimapData.viewport.y}
              width={minimapData.viewport.width}
              height={minimapData.viewport.height}
              fill="hsl(var(--primary) / 0.08)"
              stroke="hsl(var(--primary))"
              strokeWidth={1.5}
              rx={8}
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {/* Volver a vista general */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsolatedRootId(null);
              setFocusNoteId(null);
              fitFullTree();
            }}
            className="absolute top-1.5 right-1.5 w-8 h-8 rounded-lg bg-background/85 border border-border/60 shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
            title="Volver a vista general"
            aria-label="Volver a vista general"
          >
            <Expand size={15} />
          </button>
        </div>
      )}
      {isolatedRootId && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsolatedRootId(null);
            setFocusNoteId(null);
            fitFullTree();
          }}
          className="fixed top-3 left-3 z-40 surface-glass rounded-xl px-3 py-2 min-h-11 md:min-h-0 text-sm md:text-xs font-body text-foreground hover:bg-muted/40 transition-colors"
          title="Volver al árbol completo"
        >
          ← Volver
        </button>
      )}

      {/* Top-right controls */}
      <div className="fixed top-3 right-3 z-30 flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleTheme();
          }}
          className="p-2.5 md:p-2 min-h-11 min-w-11 md:min-h-0 md:min-w-0 rounded-xl surface-glass hover:bg-muted/40 text-muted-foreground transition-all flex items-center justify-center"
          title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
          aria-label="Alternar modo oscuro"
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setPositionsLocked((v) => !v);
          }}
          className={`p-2.5 md:p-2 min-h-11 min-w-11 md:min-h-0 md:min-w-0 rounded-xl surface-glass hover:bg-muted/40 transition-all flex items-center justify-center ${
            positionsLocked ? "text-primary" : "text-muted-foreground"
          }`}
          title={positionsLocked ? "Desbloquear posiciones" : "Bloquear posiciones"}
          aria-label={positionsLocked ? "Desbloquear posiciones" : "Bloquear posiciones"}
        >
          {positionsLocked ? <Lock size={16} /> : <LockOpen size={16} />}
        </button>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowProfileMenu((v) => !v);
              setShowFilterPanel(false);
            }}
            className="p-2.5 md:p-2 min-h-11 min-w-11 md:min-h-0 md:min-w-0 rounded-xl surface-glass hover:bg-muted/40 text-muted-foreground transition-all flex items-center justify-center"
            title={user ? "Perfil" : "Iniciar sesión"}
          >
            <UserIcon size={16} />
          </button>
          {showProfileMenu && (
            <div
              className="absolute right-0 top-12 surface-panel rounded-2xl py-1 min-w-[200px]"
              onClick={(e) => e.stopPropagation()}
            >
              {user ? (
                <>
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-xs md:text-[10px] font-body text-muted-foreground">Sesión</p>
                    <p className="text-sm md:text-xs font-body text-foreground truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowBrainDialog(true);
                      setShowProfileMenu(false);
                    }}
                    className="w-full text-left text-sm md:text-xs px-3 py-3 md:py-2 min-h-11 md:min-h-0 hover:bg-muted flex items-center gap-2 font-body text-foreground"
                  >
                    <Brain size={12} />
                    Renombrar tu brain
                  </button>
                  <GoogleCalendarMenuItem onClose={() => setShowProfileMenu(false)} />
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      setShowHistoryDialog(true);
                    }}
                    className="w-full text-left text-sm md:text-xs px-3 py-3 md:py-2 min-h-11 md:min-h-0 hover:bg-muted flex items-center gap-2 font-body text-foreground"
                  >
                    <History size={12} />
                    Historial
                  </button>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      setShowExportDialog(true);
                    }}
                    className="w-full text-left text-sm md:text-xs px-3 py-3 md:py-2 min-h-11 md:min-h-0 hover:bg-muted flex items-center gap-2 font-body text-foreground"
                  >
                    <Download size={12} />
                    Descargar mis notas
                  </button>
                  <button
                    onClick={async () => {
                      setShowProfileMenu(false);
                      await signOut();
                      navigate("/auth");
                    }}
                    className="w-full text-left text-sm md:text-xs px-3 py-3 md:py-2 min-h-11 md:min-h-0 hover:bg-destructive/10 flex items-center gap-2 font-body text-destructive"
                  >
                    <LogOut size={12} />
                    Cerrar sesión
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate("/auth");
                  }}
                  className="w-full text-left text-sm md:text-xs px-3 py-3 md:py-2 min-h-11 md:min-h-0 hover:bg-muted flex items-center gap-2 font-body text-foreground"
                >
                  <LogIn size={12} />
                  Iniciar sesión
                </button>
              )}
            </div>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowFilterPanel((v) => !v);
          }}
          className={`p-2.5 md:p-2 min-h-11 min-w-11 md:min-h-0 md:min-w-0 rounded-xl surface-glass hover:bg-muted/40 transition-all flex items-center justify-center ${
            hiddenCategoryIds.size > 0 ? "text-primary" : "text-muted-foreground"
          }`}
          title="Filtrar temas"
        >
          {/* eye icon via emoji to avoid extra import */}
          <span className="text-sm leading-none">{hiddenCategoryIds.size > 0 ? "🙈" : "👁"}</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setCreateDialog({ x: size.w / 2, y: size.h / 2 });
            setShowFilterPanel(false);
          }}
          className="p-2.5 md:p-2 min-h-11 min-w-11 md:min-h-0 md:min-w-0 rounded-xl surface-glass hover:bg-muted/40 text-muted-foreground transition-all flex items-center justify-center"
          title="Crear nuevo"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Filter panel */}
      {showFilterPanel && (
        <div
          className="fixed top-16 right-3 z-30 surface-panel rounded-2xl p-3 space-y-2 min-w-[220px] max-h-[60vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm md:text-xs font-display font-semibold text-foreground">Mostrar temas</p>
            {hiddenCategoryIds.size > 0 && (
              <button
                onClick={() => setHiddenCategoryIds(new Set())}
                className="text-xs md:text-[10px] font-body text-primary hover:underline min-h-11 md:min-h-0 px-2 md:px-0"
              >
                Mostrar todos
              </button>
            )}
          </div>
          {rootNotes.length === 0 && (
            <p className="text-sm md:text-[11px] font-body text-muted-foreground">No hay ramas aún.</p>
          )}
          {rootNotes.map((cat) => {
            const hidden = hiddenCategoryIds.has(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setHiddenCategoryIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(cat.id)) next.delete(cat.id);
                    else next.add(cat.id);
                    return next;
                  });
                }}
                className={`w-full flex items-center gap-2 px-2 py-2.5 md:py-1.5 min-h-11 md:min-h-0 rounded-md text-sm md:text-xs font-body text-left transition-colors ${
                  hidden ? "opacity-40 hover:opacity-70" : "hover:bg-muted"
                }`}
              >
                <span
                  className="w-3.5 h-3.5 md:w-3 md:h-3 rounded-full border"
                  style={{
                    backgroundColor: `hsl(${cat.color || DEFAULT_CATEGORY_COLOR})`,
                    borderColor: `hsl(${cat.color || DEFAULT_CATEGORY_COLOR})`,
                  }}
                />
                <span className="flex-1 truncate text-foreground">
                  {cat.icon || ""} {cat.title}
                </span>
                <span className="text-xs md:text-[10px] text-muted-foreground">{hidden ? "oculto" : "visible"}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {rootNotes.length === 0 && !loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-5xl mb-3">🌳</p>
            <p className="font-display text-xl">Empieza tu árbol</p>
            <p className="text-sm mt-1 font-body">Pulsa + para crear tu primera rama</p>
          </div>
        </div>
      )}

      {/* Brain name dialog */}
      <BrainNameDialog
        open={showBrainDialog}
        initialName={brainName}
        isFirstTime={!onboarded}
        onSave={(name) => {
          setBrainName(name);
          if (!onboarded) setOnboarded(true);
        }}
        onClose={() => {
          setShowBrainDialog(false);
          if (!onboarded) setOnboarded(true);
        }}
      />

      <HistoryDialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog} />

      <ExportDialog open={showExportDialog} onOpenChange={setShowExportDialog} />

      {/* Post-it overlay */}
      <AnimatePresence>
        {openPostIt && (
          <NotePostIt
            key={openPostIt.noteId}
            noteId={openPostIt.noteId}
            position={{ x: openPostIt.x, y: openPostIt.y }}
            onClose={() => {
              setOpenPostIt(null);
              setSelectedNoteId(null);
              setFocusNoteId(null);
            }}
          />
        )}
      </AnimatePresence>

      <CreateNodeDialog
        open={createDialog !== null}
        notes={notes}
        brainName={brainName}
        onCreateNote={async (parentNoteId, type, name, color) => {
          setCreateDialog(null);
          const created = await addNote(null, parentNoteId, type, parentNoteId ? null : color);
          if (created) updateNote(created.id, { title: name });
        }}
        onCancel={() => setCreateDialog(null)}
      />
    </div>
  );
};

export default GraphView;
