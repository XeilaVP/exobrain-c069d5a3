import { describe, expect, it } from "vitest";
import { destinationForEntry, initialExpandedEntries, noteAncestors, patchChecklistItem, replaceSubtaskItems } from "@/lib/taskNavigation";
import type { ChecklistItem, Note } from "@/types/notes";

const comprar: Note = { id: "comprar", title: "Comprar", content: "", categoryId: null, parentNoteId: "root", linkedNoteIds: ["linked"], checklist: [], noteType: "checklist", isCollapsed: false, createdAt: "", updatedAt: "" };
const superItem: ChecklistItem = { id: "super", text: "Super", completed: false, priority: "high" };

describe("Task navigation rules", () => {
  it("Tasks and sidebar branches start folded", () => {
    expect(initialExpandedEntries().has("super")).toBe(false);
    expect(initialExpandedEntries().has("root")).toBe(false);
    expect(initialExpandedEntries().size).toBe(0);
  });
  it("Ver nota targets Super itself rather than opening Comprar", () => {
    expect(destinationForEntry({ kind: "subtask", note: comprar, item: superItem })).toEqual({ noteId: "comprar", subtaskId: "super" });
  });
  it("A note task opens the original note without a subtask", () => {
    expect(destinationForEntry({ kind: "task", note: comprar })).toEqual({ noteId: "comprar" });
  });
  it("Breadcrumbs include the mother and all its ancestors", () => {
    expect(noteAncestors([{ ...comprar, id: "root", title: "Casa", parentNoteId: null }, comprar], "comprar").map(n => n.title)).toEqual(["Casa", "Comprar"]);
  });
  it("Editing Super preserves its siblings and existing checklist items", () => {
    const items = [superItem, { id: "milk", text: "Leche", completed: false, parentId: "super" }, { id: "pizarra", text: "Pizarra", completed: false }];
    const changed = patchChecklistItem(items, "super", { notes: "Solo Super" });
    expect(changed[0].notes).toBe("Solo Super");
    expect(changed[1]).toBe(items[1]);
    expect(changed[2]).toBe(items[2]);
    expect(items[0].notes).toBeUndefined();
  });
  it("Reordering Super checklist does not reorder or modify Pizarra", () => {
    const milk = { id: "milk", text: "Leche", completed: false, parentId: "super" };
    const bread = { id: "bread", text: "Pan", completed: false, parentId: "super" };
    const sibling = { id: "pizarra", text: "Pizarra", completed: false };
    const changed = replaceSubtaskItems([superItem, milk, bread, sibling], "super", [bread, milk]);
    expect(changed.map(i => i.id)).toEqual(["super", "bread", "milk", "pizarra"]);
    expect(changed[0]).toBe(superItem);
    expect(changed[3]).toBe(sibling);
  });
});