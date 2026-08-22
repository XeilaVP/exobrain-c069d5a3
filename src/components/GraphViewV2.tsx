import { useNotes } from "@/contexts/NotesContext";
import { useAuth } from "@/hooks/useAuth";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Pencil,
  Palette,
  FileText,
  ListChecks,
  Pencil as Rename,
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
  Move,
  Lock,
  LockOpen,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import NotePostIt from "./NotePostIt";
import BrainNameDialog from "./BrainNameDialog";
import NameInputDialog from "./NameInputDialog";
import CreateNodeDialog from "./CreateNodeDialog";
import ColorPicker from "./ColorPicker";
import EmojiPicker from "./EmojiPicker";
import GoogleCalendarMenuItem from "./GoogleCalendarMenuItem";
import HistoryDialog from "./HistoryDialog";
import ExportDialog from "./ExportDialog";
import MoveToDialog from "./MoveToDialog";
import { CATEGORY_COLORS, DEFAULT_CATEGORY_COLOR } from "@/lib/categoryColors";
import { Note } from "@/types/notes";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { motifPath, pickMotif, type BranchMotif } from "@/lib/treeGeometry";

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
  const [contextMenu, setContextMenu] = useState<{ nodeId: string; x: number; y: number } | null>(null);
  const [colorPickerCat, setColorPickerCat] = useState<{ id: string; x: number; y: number } | null>(null);
  const [iconPickerCat, setIconPickerCat] = useState<{ id: string; x: number; y: number } | null>(null);
  const [editingCat, setEditingCat] = useState<{ id: string; name: string } | null>(null);
  const [movingNoteId, setMovingNoteId] = useState<string | null>(null);
  const [pickTargetForId, setPickTargetForId] = useState<string | null>(null);
  const [showBrainDialog, setShowBrainDialog] = useState(false);
  const [linkingNoteId, setLinkingNoteId] = useState<string | null>(null);
  const [focusNoteId, setFocusNoteId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [newNoteDialog, setNewNoteDialog] = useState<{
    parentNoteId: string | null;
    type: "text" | "checklist";
  } | null>(null);
  const [createDialog, setCreateDialog] = useState<{ x: number; y: number } | null>(null);
  const canvasLongPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canvasLongPressStart = useRef<{ x: number; y: number } | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [viewZoom, setViewZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);
  const didDrag = useRef(false);
  const didPan = useRef(false);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didInitialFitRef = useRef(false);
  const viewZoomRef = useRef(1);

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

  // Zoom con rueda / pinch de trackpad anclado al cursor (listener nativo no pasivo).

  const zoomAt = useCallback((px: number, py: number, factor: number) => {
    setViewZoom((z) => {
      const next = Math.max(0.2, Math.min(4, z * factor));
      const k = next / z;
      setPan((p) => ({ x: px - (px - p.x) * k, y: py - (py - p.y) * k }));
      viewZoomRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const factor = Math.exp(-dy * (e.ctrlKey ? 0.0025 : 0.0015));
      setIsPanning(true);
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, factor);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  // Long-press handlers
  const startLongPress = useCallback(
    (nodeId: string, clientX: number, clientY: number) => {
      didLongPress.current = false;
      longPressTimer.current = setTimeout(() => {
        didLongPress.current = true;
        // If linking and this is a note
        if (linkingNoteId && nodeId.startsWith("note-")) {
          const targetId = nodeId.replace("note-", "");
          if (targetId !== linkingNoteId) {
            setConfirmDialog({
              message: "¿Enlazar estas dos notas?",
              onConfirm: () => {
                linkNotes(linkingNoteId, targetId);
                setLinkingNoteId(null);
                setConfirmDialog(null);
                toast.success("Notas enlazadas");
              },
            });
          }
          return;
        }
        setContextMenu({ nodeId, x: clientX, y: clientY });
      }, 550);
    },
    [linkingNoteId, linkNotes],
  );

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

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

  // Drag / pan / pinch pointer handlers (window-level)
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      // Track any pointer that we haven't seen. If it becomes the 2nd active pointer
      // and we don't yet have a pinch, initiate one from current pan/zoom state.
      if (pointersRef.current.has(e.pointerId)) return;
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointersRef.current.size >= 2 && !pinchState.current) {
        const pts = Array.from(pointersRef.current.values());
        const [p1, p2] = pts;
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        pinchState.current = {
          startDist: dist,
          startZoom: viewZoomRef.current || 1,
          startPanX: 0,
          startPanY: 0,
          centerX: (p1.x + p2.x) / 2,
          centerY: (p1.y + p2.y) / 2,
        };
        setPan((p) => {
          if (pinchState.current) {
            pinchState.current.startPanX = p.x;
            pinchState.current.startPanY = p.y;
          }
          return p;
        });
        panState.current = null;
        dragState.current = null;
        cancelLongPress();
        didPan.current = true;
        setIsPanning(true);
      }
    };
    const onMove = (e: PointerEvent) => {
      // Update tracked pointer position
      if (pointersRef.current.has(e.pointerId)) {
        pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }

      // Cancel canvas long-press if pointer moved too far
      if (canvasLongPressTimer.current && canvasLongPressStart.current) {
        const s = canvasLongPressStart.current;
        if (Math.hypot(e.clientX - s.x, e.clientY - s.y) > 8) {
          clearTimeout(canvasLongPressTimer.current);
          canvasLongPressTimer.current = null;
          canvasLongPressStart.current = null;
        }
      }

      // Pinch (two active pointers): zoom + pan following centroid
      if (pinchState.current && pointersRef.current.size >= 2) {
        const pts = Array.from(pointersRef.current.values());
        const [p1, p2] = pts;
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const cx = (p1.x + p2.x) / 2;
        const cy = (p1.y + p2.y) / 2;
        const ps = pinchState.current;
        if (ps.startDist > 0) {
          const scale = dist / ps.startDist;
          const newZoom = Math.max(0.3, Math.min(3, ps.startZoom * scale));
          // World point under original centroid should stay under current centroid
          const worldX = (ps.centerX - ps.startPanX) / ps.startZoom;
          const worldY = (ps.centerY - ps.startPanY) / ps.startZoom;
          const newPanX = cx - worldX * newZoom;
          const newPanY = cy - worldY * newZoom;
          setViewZoom(newZoom);
          setPan({ x: newPanX, y: newPanY });
        }
        return;
      }

      const ds = dragState.current;
      if (ds) {
        const rawDx = e.clientX - ds.startX;
        const rawDy = e.clientY - ds.startY;
        if (!didDrag.current && Math.hypot(rawDx, rawDy) > 5) {
          didDrag.current = true;
          cancelLongPress();
        }
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
        setPan({ x: ps.baseX + rawDx, y: ps.baseY + rawDy });
      }
    };
    const onUp = (e: PointerEvent) => {
      pointersRef.current.delete(e.pointerId);
      const ds = dragState.current;
      dragState.current = null;

      // Si se soltó tras un arrastre real, persistir la posición manual.
      if (ds && didDrag.current) {
        const off = offsetsRef.current[ds.nodeId];
        if (off) persistDraggedRef.current(ds.nodeId, off.dx, off.dy);
      }

      // Cancel canvas long-press if pointer released before timer fired
      if (canvasLongPressTimer.current) {
        clearTimeout(canvasLongPressTimer.current);
        canvasLongPressTimer.current = null;
      }
      canvasLongPressStart.current = null;

      // End pinch when going below 2 pointers; do NOT continue as pan (1-finger canvas pan disabled on touch)
      if (pinchState.current && pointersRef.current.size < 2) {
        pinchState.current = null;
      }

      if (pointersRef.current.size === 0) {
        panState.current = null;
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
  }, [cancelLongPress]);

  // Click handling with double-click detection
  // - 1 clic en nota: activa/resalta su rama (focus).
  // - 2 clics en nota: abre el post-it.
  // - 1 clic en raíz: abre el diálogo de nombre del cerebro.
  const handleNodeClick = useCallback(
    (nodeId: string, clientX: number, clientY: number) => {
      if (didDrag.current) {
        didDrag.current = false;
        return;
      }
      if (didLongPress.current) {
        didLongPress.current = false;
        return;
      }
      if (contextMenu) {
        setContextMenu(null);
        return;
      }

      // Root no activa ninguna rama: un solo clic abre su diálogo.
      if (nodeId === "root") {
        setShowBrainDialog(true);
        return;
      }

      if (!nodeId.startsWith("note-")) return;
      const nId = nodeId.replace("note-", "");

      if (clickTimer.current) {
        clearTimeout(clickTimer.current);
        clickTimer.current = null;
        // Doble clic: abrir la nota.
        setOpenPostIt({ noteId: nId, x: clientX, y: clientY });
        return;
      }

      clickTimer.current = setTimeout(() => {
        clickTimer.current = null;
        // If linking via single click on second note
        if (linkingNoteId && linkingNoteId !== nId) {
          setConfirmDialog({
            message: "¿Enlazar estas dos notas?",
            onConfirm: () => {
              linkNotes(linkingNoteId, nId);
              setLinkingNoteId(null);
              setConfirmDialog(null);
              toast.success("Notas enlazadas");
            },
          });
          return;
        }
        // Clic simple: activar/resaltar la rama.
        setFocusNoteId(nId);
      }, 240);
    },
    [contextMenu, linkingNoteId, linkNotes],
  );

  // Straight SVG segments: the layout creates the tree silhouette.
  const branchPath = (from: NodePos, to: NodePos, kind: "trunk" | "branch" = "branch") => {
    if (kind === "trunk") return `M ${from.x} ${from.y - ROOT_R * 0.55} L ${to.x} ${to.y}`;
    return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  };

  const widthForDepth = (depth: number, isMain = false) => {
    if (isMain || depth <= 0) return 3;
    if (depth <= 2) return 2.5;
    return 2;
  };

  // Rama con protagonismo: subárbol de la raíz del nodo enfocado
  const focusIds = useMemo(() => {
    if (!focusNoteId) return null;
    let cur = notes.find((n) => n.id === focusNoteId);
    if (!cur) return null;
    while (cur.parentNoteId) {
      const p = notes.find((n) => n.id === cur!.parentNoteId);
      if (!p) break;
      cur = p;
    }
    const ids = new Set<string>(["root", "trunk-top", `attach-${cur.id}`]);
    const visit = (id: string) => {
      ids.add(`note-${id}`);
      notes.filter((n) => n.parentNoteId === id).forEach((c) => visit(c.id));
    };
    visit(cur.id);
    return ids;
  }, [focusNoteId, notes]);

  const dimFor = useCallback((id: string) => (focusIds && !focusIds.has(id) ? 0.16 : 1), [focusIds]);

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
    const ids = new Set(positions.map((p) => p.id));
    notes.forEach((n) => {
      const fromKey = `note-${n.id}`;
      if (!ids.has(fromKey)) return;
      n.linkedNoteIds.forEach((lid) => {
        const toKey = `note-${lid}`;
        if (ids.has(toKey) && n.id < lid) out.push({ from: fromKey, to: toKey });
      });
    });
    return out;
  }, [notes, positions]);

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
        const onBackground = !target.closest(
          "[data-graph-node], button, input, textarea, [role='dialog'], [data-no-pan]",
        );

        // Always track pointer for pinch detection
        pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

        // Second pointer -> start pinch (cancel any in-flight pan, node drag or canvas long-press)
        if (pointersRef.current.size >= 2) {
          const pts = Array.from(pointersRef.current.values());
          const [p1, p2] = pts;
          const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          pinchState.current = {
            startDist: dist,
            startZoom: viewZoomRef.current || 1,
            startPanX: pan.x,
            startPanY: pan.y,
            centerX: (p1.x + p2.x) / 2,
            centerY: (p1.y + p2.y) / 2,
          };
          panState.current = null;
          dragState.current = null;
          cancelLongPress();
          if (canvasLongPressTimer.current) {
            clearTimeout(canvasLongPressTimer.current);
            canvasLongPressTimer.current = null;
          }
          canvasLongPressStart.current = null;
          didPan.current = true;
          setIsPanning(true);
          return;
        }

        if (!onBackground) return;

        // Long-press on empty canvas -> open "create" dialog (works for touch and mouse)
        canvasLongPressStart.current = { x: e.clientX, y: e.clientY };
        if (canvasLongPressTimer.current) clearTimeout(canvasLongPressTimer.current);
        canvasLongPressTimer.current = setTimeout(() => {
          canvasLongPressTimer.current = null;
          // Only trigger if user hasn't started panning/pinching
          if (didPan.current || pinchState.current || pointersRef.current.size >= 2) return;
          setCreateDialog({ x: e.clientX, y: e.clientY });
          // Cancel any pending pan so the click after release doesn't act
          panState.current = null;
          didPan.current = true;
        }, 550);

        // Touch: 1-finger canvas pan is disabled (use 2 fingers). Only mouse/pen pans with one pointer.
        if (e.pointerType === "touch") return;

        panState.current = {
          startX: e.clientX,
          startY: e.clientY,
          baseX: pan.x,
          baseY: pan.y,
        };
        didPan.current = false;
        setIsPanning(true);
      }}
      onClick={() => {
        if (didPan.current) {
          didPan.current = false;
          return;
        }
        if (openPostIt) {
          setOpenPostIt(null);
          setFocusNoteId(null);
        }
        if (contextMenu) setContextMenu(null);
        if (colorPickerCat) setColorPickerCat(null);
        if (linkingNoteId) {
          setLinkingNoteId(null);
          toast.info("Enlace cancelado");
        }
      }}
    >
      {/* Linking indicator */}
      {linkingNoteId && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-40 bg-primary text-primary-foreground text-xs font-body px-3 py-1.5 rounded-full shadow-lg animate-pulse">
          Selecciona otra nota para enlazar
        </div>
      )}

      {/* Tree world: SVG branches + nodes */}
      <div
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

          {edges.map((edge, idx) => {
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
          {positionsWithOffsets
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
          {positionsWithOffsets.map((node) => {
            if (node.isVirtual) return null;

            const isRoot = node.type === "root";
            const isMainNote = node.type === "note" && node.isMain;
            const nodeNote = node.noteId ? notes.find((n) => n.id === node.noteId) : null;
            const childCount = nodeNote ? notes.filter((n) => n.parentNoteId === nodeNote.id).length : 0;
            const dim = dimFor(node.id);
            const z = node.z ?? 1;
            const isFocused = !!focusIds && focusIds.has(node.id);
            const isLinkSource = linkingNoteId && node.noteId === linkingNoteId;
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
                  e.stopPropagation();
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
                  startLongPress(node.id, e.clientX, e.clientY);
                }}
                onPointerUp={cancelLongPress}
                onPointerLeave={cancelLongPress}
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
                    } ${isLinkSource ? "ring-2 ring-primary/50 ring-offset-2 ring-offset-background" : ""}`}
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

      {/* Context menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed z-50 surface-panel rounded-2xl py-1 min-w-[170px]"
            style={{ left: Math.min(contextMenu.x, size.w - 180), top: Math.min(contextMenu.y, size.h - 200) }}
            onClick={(e) => e.stopPropagation()}
          >
            {contextMenu.nodeId === "root" && (
              <button
                onClick={() => {
                  setShowBrainDialog(true);
                  setContextMenu(null);
                }}
                className="w-full text-left text-sm md:text-xs px-3 py-3 md:py-2 min-h-11 md:min-h-0 hover:bg-muted flex items-center gap-2 font-body text-foreground"
              >
                <Rename size={12} />
                Renombrar cerebro
              </button>
            )}

            {contextMenu.nodeId.startsWith("note-") &&
              (() => {
                const nId = contextMenu.nodeId.replace("note-", "");
                const note = notes.find((n) => n.id === nId);
                if (!note) return null;
                return (
                  <>
                    <button
                      onClick={() => {
                        setNewNoteDialog({ parentNoteId: nId, type: "text" });
                        setContextMenu(null);
                      }}
                      className="w-full text-left text-sm md:text-xs px-3 py-3 md:py-2 min-h-11 md:min-h-0 hover:bg-muted flex items-center gap-2 font-body text-foreground"
                    >
                      <FileText size={12} />
                      Añadir hija (texto)
                    </button>
                    <button
                      onClick={() => {
                        setNewNoteDialog({ parentNoteId: nId, type: "checklist" });
                        setContextMenu(null);
                      }}
                      className="w-full text-left text-sm md:text-xs px-3 py-3 md:py-2 min-h-11 md:min-h-0 hover:bg-muted flex items-center gap-2 font-body text-foreground"
                    >
                      <ListChecks size={12} />
                      Añadir hija (lista)
                    </button>
                    <button
                      onClick={() => {
                        setMovingNoteId(nId);
                        setContextMenu(null);
                      }}
                      className="w-full text-left text-sm md:text-xs px-3 py-3 md:py-2 min-h-11 md:min-h-0 hover:bg-muted flex items-center gap-2 font-body text-foreground"
                    >
                      <Move size={12} />
                      Mover a...
                    </button>
                    <button
                      onClick={() => {
                        setEditingCat({ id: nId, name: note.title });
                        setContextMenu(null);
                      }}
                      className="w-full text-left text-sm md:text-xs px-3 py-3 md:py-2 min-h-11 md:min-h-0 hover:bg-muted flex items-center gap-2 font-body text-foreground"
                    >
                      <Pencil size={12} />
                      Renombrar
                    </button>
                    {!note.parentNoteId && (
                      <button
                        onClick={() => {
                          setColorPickerCat({ id: nId, x: contextMenu.x, y: contextMenu.y });
                          setContextMenu(null);
                        }}
                        className="w-full text-left text-sm md:text-xs px-3 py-3 md:py-2 min-h-11 md:min-h-0 hover:bg-muted flex items-center gap-2 font-body text-foreground"
                      >
                        <Palette size={12} />
                        Cambiar color
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setIconPickerCat({ id: nId, x: contextMenu.x, y: contextMenu.y });
                        setContextMenu(null);
                      }}
                      className="w-full text-left text-sm md:text-xs px-3 py-3 md:py-2 min-h-11 md:min-h-0 hover:bg-muted flex items-center gap-2 font-body text-foreground"
                    >
                      <span className="text-sm leading-none">🙂</span>Cambiar icono
                    </button>
                    <button
                      onClick={() => {
                        setLinkingNoteId(nId);
                        setContextMenu(null);
                        toast.info("Pulsa otra nota para enlazar");
                      }}
                      className="w-full text-left text-sm md:text-xs px-3 py-3 md:py-2 min-h-11 md:min-h-0 hover:bg-muted flex items-center gap-2 font-body text-foreground"
                    >
                      🔗 Enlazar con otra nota
                    </button>
                    <button
                      onClick={() => {
                        setConfirmDialog({
                          message: "¿Eliminar esta nota?",
                          onConfirm: () => {
                            deleteNote(nId);
                            setConfirmDialog(null);
                          },
                        });
                        setContextMenu(null);
                      }}
                      className="w-full text-left text-sm md:text-xs px-3 py-3 md:py-2 min-h-11 md:min-h-0 hover:bg-destructive/10 flex items-center gap-2 font-body text-destructive"
                    >
                      <Trash2 size={12} />
                      Eliminar
                    </button>
                  </>
                );
              })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Color picker (long-press category) */}
      {colorPickerCat && (
        <div
          className="fixed z-50 surface-panel rounded-2xl p-3"
          style={{ left: Math.min(colorPickerCat.x, size.w - 180), top: Math.min(colorPickerCat.y, size.h - 140) }}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-xs font-body text-muted-foreground mb-2">Elige un color</p>
          <ColorPicker
            value={notes.find((n) => n.id === colorPickerCat.id)?.color || DEFAULT_CATEGORY_COLOR}
            onChange={(color) => {
              updateNote(colorPickerCat.id, { color });
              setColorPickerCat(null);
            }}
          />
        </div>
      )}

      {/* Icon picker (category) */}
      {iconPickerCat && (
        <div
          className="fixed z-50 surface-panel rounded-2xl p-3"
          style={{ left: Math.min(iconPickerCat.x, size.w - 280), top: Math.min(iconPickerCat.y, size.h - 260) }}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-xs font-body text-muted-foreground mb-2">Elige un icono</p>
          <EmojiPicker
            value={notes.find((n) => n.id === iconPickerCat.id)?.icon || undefined}
            onChange={(icon) => {
              updateNote(iconPickerCat.id, { icon });
              setIconPickerCat(null);
            }}
          />
        </div>
      )}

      {/* Confirm dialog */}
      <AnimatePresence>
        {confirmDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-background/60 backdrop-blur-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-card border border-border rounded-xl shadow-2xl p-5 max-w-[280px] w-full mx-4 space-y-4"
            >
              <p className="text-sm font-body text-foreground text-center">{confirmDialog.message}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="flex-1 text-sm md:text-xs py-2.5 md:py-2 min-h-11 md:min-h-0 rounded-lg bg-muted text-foreground font-body hover:bg-muted/80"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDialog.onConfirm}
                  className="flex-1 text-sm md:text-xs py-2.5 md:py-2 min-h-11 md:min-h-0 rounded-lg bg-primary text-primary-foreground font-body hover:opacity-90"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Edit category name */}
      {editingCat && (
        <div
          className="fixed top-16 right-3 z-30 surface-panel rounded-2xl p-3 space-y-2 min-w-[200px]"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            value={editingCat.name}
            onChange={(e) => setEditingCat({ ...editingCat, name: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter" && editingCat.name.trim()) {
                updateNote(editingCat.id, { title: editingCat.name.trim() });
                setEditingCat(null);
              }
            }}
            autoFocus
            className="w-full bg-muted rounded text-base md:text-xs px-2 py-2.5 md:py-1.5 min-h-11 md:min-h-0 text-foreground outline-none font-body"
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (editingCat.name.trim()) {
                  updateNote(editingCat.id, { title: editingCat.name.trim() });
                  setEditingCat(null);
                }
              }}
              className="flex-1 bg-primary text-primary-foreground rounded text-sm md:text-xs py-2.5 md:py-1.5 min-h-11 md:min-h-0 font-medium"
            >
              Guardar
            </button>
            <button
              onClick={() => setEditingCat(null)}
              className="flex-1 bg-muted text-foreground rounded text-sm md:text-xs py-2.5 md:py-1.5 min-h-11 md:min-h-0"
            >
              Cancelar
            </button>
          </div>
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

      <NameInputDialog
        open={newNoteDialog !== null}
        title={
          newNoteDialog?.type === "checklist"
            ? newNoteDialog?.parentNoteId
              ? "Nueva lista hija"
              : "Nueva lista"
            : newNoteDialog?.parentNoteId
              ? "Nueva nota hija"
              : "Nueva nota"
        }
        placeholder={newNoteDialog?.type === "checklist" ? "Nombre de la lista..." : "Nombre de la nota..."}
        onSubmit={async (name) => {
          if (!newNoteDialog) return;
          const { parentNoteId, type } = newNoteDialog;
          setNewNoteDialog(null);
          const created = await addNote(null, parentNoteId, type);
          if (created) updateNote(created.id, { title: name });
        }}
        onCancel={() => setNewNoteDialog(null)}
      />

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

      <MoveToDialog
        open={movingNoteId !== null}
        noteId={movingNoteId}
        notes={notes}
        brainName={brainName}
        onMove={async (targetId) => {
          if (!movingNoteId) return;
          const id = movingNoteId;
          setMovingNoteId(null);
          await moveNote(id, targetId);
        }}
        onCancel={() => setMovingNoteId(null)}
      />
    </div>
  );
};

export default GraphView;
