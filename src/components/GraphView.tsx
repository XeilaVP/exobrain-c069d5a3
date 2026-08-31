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
  Sun,
  Moon,
  History,
  Download,
  Move,
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
}

interface Edge {
  from: string;
  to: string;
}

const ROOT_R = 30;
const CAT_R = 22;
const NOTE_R = 12;

const GraphView = () => {
  const {
    notes,
    addNote,
    deleteNote,
    moveNote,
    canMoveTo,
    updateNote,
    linkNotes,
    toggleNoteCollapsed,
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
  const lastExpandedRef = useRef<string | null>(null);
  const lastCollapsedRef = useRef<string | null>(null);
  const didInitialFitRef = useRef(false);
  const previousHasOpenBranchRef = useRef(false);
  const viewZoomRef = useRef(1);

  // Drag offsets per node id (session-local)
  const [offsets, setOffsets] = useState<Record<string, { dx: number; dy: number }>>({});
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

  // Build radial tree positions + parent map (for drag propagation)
  const { positions, edges, parentMap } = useMemo(() => {
    const pos: NodePos[] = [];
    const eds: Edge[] = [];
    const parent: Record<string, string> = {}; // childId -> parentId
    const W = size.w;
    const H = size.h;
    const isMobile = W < 640;

    if (rootNotes.length === 0) return { positions: pos, edges: eds, parentMap: parent };

    // Radii per depth (distance from parent)
    const radiusForDepth = (depth: number) => {
      if (isMobile) {
        return depth === 0 ? 92 : depth === 1 ? 84 : depth === 2 ? 76 : 70;
      }
      const base = depth === 0 ? 150 : depth === 1 ? 115 : depth === 2 ? 95 : 85;
      return base;
    };

    // Offset radial aplicado a un nodo cuando se expande, para separarlo
    // del resto de la copa y dar aire a sus hijas.
    const expansionOffset = (childCount: number) => {
      const base = isMobile ? 44 : 44;
      return base + Math.min(isMobile ? 84 : 60, childCount * (isMobile ? 10 : 8));
    };

    // Recursive note placement. `outwardAngle` is the direction (in radians,
    // screen coords with y-down) from the parent to this note. The note's own
    // children spread in a semicircle continuing outward along that angle.
    const placeNoteSubtree = (
      note: Note,
      color: string,
      parentX: number,
      parentY: number,
      outwardAngle: number,
      depth: number,
      isMain = false,
      overrideRadius?: number,
    ) => {
      const R = overrideRadius ?? radiusForDepth(depth);
      const children = notes.filter((n) => n.parentNoteId === note.id);
      const expanded = note.isCollapsed === false && children.length > 0;

      // Si la nota está expandida, alejarla un poco extra del padre.
      const extra = expanded ? expansionOffset(children.length) : 0;
      const x = parentX + (R + extra) * Math.cos(outwardAngle);
      const y = parentY + (R + extra) * Math.sin(outwardAngle);

      pos.push({
        id: `note-${note.id}`,
        x,
        y,
        type: "note",
        label: note.title,
        color,
        categoryId: note.categoryId ?? undefined,
        noteId: note.id,
        parentNoteId: note.parentNoteId,
        noteType: note.noteType,
        hasChildren: children.length > 0,
        isCollapsed: !expanded,
        isMain,
        depth,
      });

      if (!expanded) return;

      const count = children.length;
      // Spread grows with child count so opened branches keep breathing room.
      let spread = Math.min(Math.PI, Math.PI * 0.5 + count * 0.22);
      if (count >= 4) spread = Math.max(spread, Math.PI * 0.82);
      children.forEach((child, i) => {
        const t = count === 1 ? 0 : i / (count - 1) - 0.5; // -0.5..0.5
        const angle = outwardAngle + t * spread;
        eds.push({ from: `note-${note.id}`, to: `note-${child.id}` });
        parent[`note-${child.id}`] = `note-${note.id}`;
        placeNoteSubtree(child, color, x, y, angle, depth + 1);
      });
    };

    // Hub in upper-middle area; root (MyBrain) sits below with a long trunk
    // so the whole tree reads as centered on screen.
    const hubX = W / 2;
    const trunkLength = isMobile ? 210 : 220;
    const hubY = isMobile ? Math.round(H * 0.42) : Math.round(H * 0.48);
    const rootY = hubY + trunkLength;

    const baseCatRadius = isMobile ? Math.max(96, Math.min(118, W * 0.29)) : 170;
    const catCount = visibleRoots.length;

    // Radio adaptativo: garantizar separación mínima entre ramas principales
    // vecinas sobre el arco de 180°.
    let catRadius = baseCatRadius;
    if (catCount >= 2) {
      const arcStep = Math.PI / (catCount - 1);
      const minSpacing = 2 * CAT_R + (isMobile ? 32 : 70);
      const requiredRadius = minSpacing / (2 * Math.sin(arcStep / 2));
      catRadius = Math.max(baseCatRadius, requiredRadius);
    }

    visibleRoots.forEach((rootNote, i) => {
      // Angle range: -PI (left) to 0 (right), passing through -PI/2 (up).
      const t = catCount === 1 ? 0.5 : i / (catCount - 1);
      const catAngle = -Math.PI + t * Math.PI;
      parent[`note-${rootNote.id}`] = "hub";
      eds.push({ from: "hub", to: `note-${rootNote.id}` });
      placeNoteSubtree(rootNote, rootNote.color || DEFAULT_CATEGORY_COLOR, hubX, hubY, catAngle, 0, true, catRadius);
    });

    // Hub node
    pos.push({
      id: "hub",
      x: hubX,
      y: hubY,
      type: "category",
      label: "",
      color: "265 22% 52%",
      depth: -1,
    });
    parent["hub"] = "root";

    pos.push({
      id: "root",
      x: hubX,
      y: rootY,
      type: "root",
      label: brainName || "ExoBrain",
      color: "265 24% 44%",
      depth: -1,
    });
    eds.push({ from: "root", to: "hub" });
    return { positions: pos, edges: eds, parentMap: parent };
  }, [notes, rootNotes, visibleRoots, brainName, size.w, size.h]);

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
    if (node.type === "root") return ROOT_R;
    if (node.id === "hub") return 6;
    if (node.type === "category") return CAT_R;
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
          const labelPadX = node.type === "note" ? 34 : node.type === "category" ? 54 : 72;
          const labelPadTop = node.type === "note" ? 16 : 0;
          const labelPadBottom = node.type === "note" ? 0 : 22;
          return {
            minX: Math.min(bounds.minX, node.x - Math.max(r, labelPadX)),
            maxX: Math.max(bounds.maxX, node.x + Math.max(r, labelPadX)),
            minY: Math.min(bounds.minY, node.y - r - labelPadTop),
            maxY: Math.max(bounds.maxY, node.y + r + labelPadBottom),
          };
        },
        { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
      );
    },
    [getNodeRadius],
  );

  const focusBranch = useCallback(
    (nodeId: string) => {
      const subtreeIds = getSubtreeIds(nodeId);
      const branchNodes = positionsWithOffsets.filter((node) => subtreeIds.has(node.id));
      const bounds = getNodesBounds(branchNodes);
      if (!bounds) return;

      const isMobile = size.w < 640;
      const topMargin = 48;
      const bottomMargin = isMobile ? 100 : 80;
      const targetX = size.w / 2;
      const targetY = (topMargin + (size.h - bottomMargin)) / 2;
      const branchCenterX = (bounds.minX + bounds.maxX) / 2;
      const branchCenterY = (bounds.minY + bounds.maxY) / 2;

      setViewZoom(1);
      setPan({ x: targetX - branchCenterX, y: targetY - branchCenterY });
    },
    [getNodesBounds, getSubtreeIds, positionsWithOffsets, size.w, size.h],
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
    const zoom = Math.min(1, Math.max(0.4, Math.min(availableW / treeW, availableH / treeH)));
    const treeCenterX = (bounds.minX + bounds.maxX) / 2;
    const treeCenterY = (bounds.minY + bounds.maxY) / 2;
    const targetX = size.w / 2;
    const targetY = (topMargin + (size.h - bottomMargin)) / 2;

    setViewZoom(zoom);
    setPan({ x: targetX - treeCenterX * zoom, y: targetY - treeCenterY * zoom });
  }, [getNodesBounds, positionsWithOffsets, size.w, size.h]);

  const hasOpenVisibleBranch = useMemo(() => {
    return positionsWithOffsets.some(
      (node) =>
        node.id !== "hub" &&
        (node.type === "note" || node.type === "category") &&
        node.hasChildren &&
        node.isCollapsed === false,
    );
  }, [positionsWithOffsets]);

  const layoutSignature = useMemo(() => {
    return positions
      .map((node) => `${node.id}:${Math.round(node.x)}:${Math.round(node.y)}:${node.isCollapsed ? 1 : 0}`)
      .join("|");
  }, [positions]);

  useEffect(() => {
    if (positionsWithOffsets.length === 0) return;

    const expandedNodeId = lastExpandedRef.current;
    if (expandedNodeId) {
      if (!positionsWithOffsets.some((node) => node.id === expandedNodeId)) return;
      focusBranch(expandedNodeId);
      lastExpandedRef.current = null;
      didInitialFitRef.current = true;
      previousHasOpenBranchRef.current = hasOpenVisibleBranch;
      return;
    }

    if (lastCollapsedRef.current) {
      fitFullTree();
      lastCollapsedRef.current = null;
      didInitialFitRef.current = true;
      previousHasOpenBranchRef.current = hasOpenVisibleBranch;
      return;
    }

    if (!didInitialFitRef.current || (!hasOpenVisibleBranch && previousHasOpenBranchRef.current)) {
      fitFullTree();
      didInitialFitRef.current = true;
    }

    previousHasOpenBranchRef.current = hasOpenVisibleBranch;
  }, [layoutSignature, size.w, size.h, hasOpenVisibleBranch]);

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
      dragState.current = null;

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

      if (clickTimer.current) {
        clearTimeout(clickTimer.current);
        clickTimer.current = null;
        // Double click
        if (nodeId.startsWith("note-")) {
          const nId = nodeId.replace("note-", "");
          const note = notes.find((n) => n.id === nId);
          const hasChildren = notes.some((n) => n.parentNoteId === nId);
          if (hasChildren && note) {
            lastExpandedRef.current = note.isCollapsed ? nodeId : null;
            lastCollapsedRef.current = note.isCollapsed ? null : nodeId;
            setFocusNoteId(note.isCollapsed ? nId : null);
            toggleNoteCollapsed(nId);
          }
        } else if (nodeId === "root") {
          setShowBrainDialog(true);
        }
        return;
      }
      clickTimer.current = setTimeout(() => {
        clickTimer.current = null;
        if (nodeId.startsWith("note-")) {
          const nId = nodeId.replace("note-", "");
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
          setFocusNoteId(nId);
          // En escritorio el panel lateral ocupa la derecha: desplazamos el mapa
          // para que el nodo activo siga siendo visible.
          if (window.innerWidth >= 768) {
            const panelW = 400;
            const overlapX = clientX - (window.innerWidth - panelW - 24);
            if (overlapX > -40) setPan((p) => ({ x: p.x - (overlapX + 80), y: p.y }));
          }
          setOpenPostIt({ noteId: nId, x: clientX, y: clientY });
        } else if (nodeId === "root") {
          // single click on root opens rename
          setShowBrainDialog(true);
        }
      }, 240);
    },
    [contextMenu, notes, toggleNoteCollapsed, linkingNoteId, linkNotes],
  );

  // Helper: bezier path between two nodes
  const pathBetween = (x1: number, y1: number, x2: number, y2: number) => {
    const midY = (y1 + y2) / 2;
    return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
  };

  // Grosor de rama según profundidad: grueso cerca del tronco, fino al ramificar
  const widthForDepth = (depth: number) => {
    if (depth < 0) return 15;
    return Math.max(1.5, 8.5 - depth * 2.3);
  };

  // Rama orgánica: contorno relleno con grosor decreciente (efecto 2.5D)
  const taperedBranch = (x1: number, y1: number, x2: number, y2: number, w1: number, w2: number) => {
    const midY = (y1 + y2) / 2;
    const p0 = { x: x1, y: y1 },
      p1 = { x: x1, y: midY },
      p2 = { x: x2, y: midY },
      p3 = { x: x2, y: y2 };
    const N = 22;
    const left: string[] = [];
    const right: string[] = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const mt = 1 - t;
      const px = mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x;
      const py = mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y;
      const dx = 3 * mt * mt * (p1.x - p0.x) + 6 * mt * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x);
      const dy = 3 * mt * mt * (p1.y - p0.y) + 6 * mt * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y);
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len,
        ny = dx / len;
      // easing para que el adelgazamiento sea orgánico, no lineal
      const e = t * t * (3 - 2 * t);
      const w = (w1 + (w2 - w1) * e) / 2;
      left.push(`${(px + nx * w).toFixed(2)} ${(py + ny * w).toFixed(2)}`);
      right.push(`${(px - nx * w).toFixed(2)} ${(py - ny * w).toFixed(2)}`);
    }
    return `M ${left.join(" L ")} L ${right.reverse().join(" L ")} Z`;
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
    const ids = new Set<string>(["root", "hub"]);
    const visit = (id: string) => {
      ids.add(`note-${id}`);
      notes.filter((n) => n.parentNoteId === id).forEach((c) => visit(c.id));
    };
    visit(cur.id);
    return ids;
  }, [focusNoteId, notes]);

  const dimFor = useCallback((id: string) => (focusIds && !focusIds.has(id) ? 0.3 : 1), [focusIds]);

  // Nivel de detalle según zoom: con la vista alejada solo ramas principales
  const showLeafLabels = viewZoom > 0.62;

  // Link edges (horizontal between notes)
  // Relaciones enlazadas entre notas.
  // Se reconstruyen siempre desde linkedNoteIds y se deduplican por pareja,
  // independientemente de cuál de las dos notas contenga la relación.
  const linkEdges = useMemo(() => {
    const out: { from: string; to: string }[] = [];
    const visibleIds = new Set(visiblePositions.map((p) => p.id));
    const seen = new Set<string>();

    notes.forEach((note) => {
      note.linkedNoteIds.forEach((linkedId) => {
        const pair = [note.id, linkedId].sort();
        const pairKey = `${pair[0]}::${pair[1]}`;

        if (seen.has(pairKey)) return;

        const from = `note-${pair[0]}`;
        const to = `note-${pair[1]}`;

        if (!visibleIds.has(from) || !visibleIds.has(to)) return;

        seen.add(pairKey);
        out.push({ from, to });
      });
    });

    return out;
  }, [notes, visiblePositions]);

  return (
    <div
      ref={containerRef}
      className="flex-1 h-full w-full canvas-wash overflow-hidden relative select-none"
      style={{ touchAction: "none" }}
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
        {/* SVG branches (orgánicas, con grosor decreciente) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0, overflow: "visible" }}>
          <defs>
            {edges.map((edge, idx) => {
              const from = getPos(edge.from);
              const to = getPos(edge.to);
              if (!from || !to) return null;
              return (
                <linearGradient
                  key={`bg-${idx}`}
                  id={`branch-${idx}`}
                  gradientUnits="userSpaceOnUse"
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                >
                  <stop
                    offset="0%"
                    stopColor={`hsl(${from.type === "note" ? from.color : to.color})`}
                    stopOpacity={0.85}
                  />
                  <stop offset="100%" stopColor={`hsl(${to.color})`} stopOpacity={0.6} />
                </linearGradient>
              );
            })}
            <radialGradient id="hub-glow">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.32} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </radialGradient>
          </defs>

          {/* Halo bajo el tronco */}
          {(() => {
            const hub = getPos("hub");
            if (!hub) return null;
            return <circle cx={hub.x} cy={hub.y} r={140} fill="url(#hub-glow)" />;
          })()}

          {edges.map((edge, idx) => {
            const from = getPos(edge.from);
            const to = getPos(edge.to);
            if (!from || !to) return null;
            const toY = edge.to === "root" ? to.y - ROOT_R : to.y;
            const w1 = widthForDepth(from.type === "note" ? from.depth : -1);
            const w2 = widthForDepth(to.type === "note" ? to.depth : -1);
            const d = taperedBranch(from.x, from.y, to.x, toY, w1, w2);
            const opacity = Math.min(dimFor(edge.to), dimFor(edge.from));
            return (
              <g key={`be-${idx}`} style={{ opacity, transition: "opacity 400ms ease" }}>
                {/* volumen: capa exterior difusa */}
                <path
                  d={taperedBranch(from.x, from.y, to.x, toY, w1 + 5, w2 + 2.5)}
                  fill={`hsl(${to.color})`}
                  fillOpacity={0.1}
                />
                <path d={d} fill={`url(#branch-${idx})`} />
                {/* luz superior sutil para el efecto 2.5D */}
                <path
                  d={taperedBranch(from.x, from.y - 0.9, to.x, toY - 0.6, w1 * 0.32, w2 * 0.32)}
                  fill="hsl(0 0% 100%)"
                  fillOpacity={0.22}
                />
              </g>
            );
          })}

          {linkEdges.map((edge, idx) => {
            const from = getPos(edge.from);
            const to = getPos(edge.to);
            if (!from || !to) return null;
            return (
              <line
                key={`le-${idx}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="hsl(var(--muted-foreground) / 0.35)"
                strokeWidth={1.2}
                strokeDasharray="5 5"
                style={{ opacity: Math.min(dimFor(edge.from), dimFor(edge.to)), transition: "opacity 400ms ease" }}
              />
            );
          })}
        </svg>

        {/* Nodes */}
        <AnimatePresence>
          {positionsWithOffsets.map((node) => {
            const isRoot = node.type === "root";
            const isHub = node.id === "hub";
            const isMainNote = node.type === "note" && node.isMain;
            const isCat = isMainNote;
            const r = isRoot ? ROOT_R : isHub ? 6 : isMainNote ? CAT_R : NOTE_R;
            const isLinkSource = linkingNoteId && node.noteId === linkingNoteId;
            const showCollapsedDot = node.type === "note" && node.hasChildren && node.isCollapsed;
            const nodeNote = node.noteId ? notes.find((n) => n.id === node.noteId) : null;
            const dim = dimFor(node.id);
            const isFocused = !!focusIds && focusIds.has(node.id);
            const childCount = nodeNote ? notes.filter((n) => n.parentNoteId === nodeNote.id).length : 0;

            return (
              <motion.div
                key={node.id}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{
                  opacity: dim,
                  scale: isFocused && node.type === "note" ? 1.06 : 1,
                  left: node.x - r,
                  top: node.y - r,
                }}
                exit={{ opacity: 0, scale: 0 }}
                transition={
                  dragState.current?.nodeId === node.id
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 300, damping: 25 }
                }
                className="absolute flex flex-col items-center cursor-grab active:cursor-grabbing touch-none"
                data-graph-node
                style={{
                  width: r * 2,
                  zIndex: isRoot ? 6 : isCat ? 4 : 2,
                  filter: dim < 1 ? "blur(1.1px)" : "none",
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  didDrag.current = false;
                  const cur = offsets[node.id] || { dx: 0, dy: 0 };
                  dragState.current = {
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
                {/* Etiqueta píldora bajo las ramas principales */}
                {isMainNote && (
                  <span
                    className="absolute whitespace-nowrap surface-glass rounded-full px-2.5 py-1 flex items-center gap-1.5 font-display text-xs font-semibold text-foreground"
                    style={{ top: r * 2 + 8, left: "50%", transform: "translateX(-50%)" }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: `hsl(${node.color})` }}
                    />
                    {nodeNote?.icon ? `${nodeNote.icon} ` : ""}
                    {node.label}
                    {childCount > 0 && <span className="text-[9px] font-body text-muted-foreground">{childCount}</span>}
                  </span>
                )}

                {/* Circle (or plain text for root) */}
                {isRoot ? (
                  <div className="flex items-center justify-center" style={{ width: r * 2, height: r * 2 }}>
                    <span
                      className="font-display font-bold text-foreground text-center px-2 leading-tight whitespace-nowrap"
                      style={{ fontSize: node.label.length > 10 ? 13 : 16 }}
                    >
                      {node.label}
                    </span>
                  </div>
                ) : (
                  <div
                    className={`rounded-full flex items-center justify-center shadow-node transition-all ${
                      isLinkSource ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                    }`}
                    style={{
                      width: r * 2,
                      height: r * 2,
                      background: `radial-gradient(circle at 32% 28%, hsl(0 0% 100% / 0.55), hsl(${node.color}) 62%)`,
                      border: `1.5px solid hsl(${node.color})`,
                    }}
                  >
                    {showCollapsedDot && (
                      <span
                        className="rounded-full"
                        style={{ width: 6, height: 6, backgroundColor: "hsl(var(--card))" }}
                      />
                    )}
                    {node.type === "note" && !showCollapsedDot && (
                      <span className="text-[10px]" style={{ color: "hsl(var(--card))" }}>
                        {node.noteType === "checklist" ? "☑" : ""}
                      </span>
                    )}
                  </div>
                )}

                {/* Etiqueta sobre el nodo para notas hijas */}
                {node.type === "note" && !isMainNote && (
                  <span
                    className="absolute font-body text-[9px] leading-tight text-foreground/85 whitespace-nowrap overflow-hidden text-ellipsis text-center block px-1.5 py-0.5 rounded-full"
                    style={{
                      bottom: r * 2 + 4,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 60,
                      opacity: showLeafLabels ? 1 : 0,
                      backgroundColor: "hsl(var(--glass-strong))",
                      transition: "opacity 250ms ease",
                    }}
                  >
                    {node.label}
                  </span>
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
            setOffsets({});
            setFocusNoteId(null);
            fitFullTree();
            setShowFilterPanel(false);
          }}
          className="p-2.5 md:p-2 min-h-11 min-w-11 md:min-h-0 md:min-w-0 rounded-xl surface-glass hover:bg-muted/40 text-muted-foreground transition-all flex items-center justify-center"
          title="Restablecer vista del árbol"
        >
          <TreePine size={16} />
        </button>

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
