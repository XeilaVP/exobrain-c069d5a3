import type { Note } from "@/types/notes";

export function subtaskTransferBundle(source: Note, target: Note, itemId: string) {
  if (source.id === target.id || source.noteType !== "checklist" || target.noteType !== "checklist") throw new Error("Invalid destination");
  const root = source.checklist.find(item => item.id === itemId);
  if (!root || root.parentId || root.style === "bullet") throw new Error("Invalid subtask");
  const children = source.checklist.filter(item => item.parentId === itemId);
  if (source.checklist.some(item => children.some(child => child.id === item.parentId))) throw new Error("Unsupported checklist levels");
  const bundle = source.checklist.filter(item => item.id === itemId || item.parentId === itemId);
  if (target.checklist.some(item => bundle.some(moved => moved.id === item.id))) throw new Error("Duplicate item");
  return bundle;
}