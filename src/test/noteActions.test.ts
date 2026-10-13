import { describe, expect, it } from "vitest";
import { duplicateNoteData, favoritePathIds, plainNoteText } from "@/lib/noteActions";
import type { Note } from "@/types/notes";

const mother: Note = { id: "mother", title: "Comprar", content: "<p>Descripción &amp; texto</p>", categoryId: null, parentNoteId: null, linkedNoteIds: ["linked"], checklist: [{ id: "super", text: "Super", completed: false, priority: "high", dueAt: "2026-10-13" }, { id: "milk", text: "Leche", completed: true, parentId: "super" }], noteType: "checklist", isCollapsed: true, createdAt: "", updatedAt: "", posX: 10, posY: 20, isFavorite: true, inTasks: true };
describe("Note favorites and actions", () => {
  it("preserves ancestors without marking them or including siblings and children", () => {
    const root = { ...mother, id: "root", isFavorite: false };
    const favorite = { ...mother, parentNoteId: "root" };
    const sibling = { ...mother, id: "sibling", parentNoteId: "root", isFavorite: false };
    const child = { ...sibling, id: "child", parentNoteId: "mother" };
    expect([...favoritePathIds([root, favorite, sibling, child])]).toEqual(["mother", "root"]);
    expect(root.isFavorite).toBe(false);
  });
  it("unmarking a favorite removes its path from the filter, not its data", () => {
    const notes = [{ ...mother, isFavorite: false }];
    expect(favoritePathIds(notes).size).toBe(0);
    expect(notes[0].title).toBe("Comprar");
  });
  it("duplicates under the same mother or as another root", () => {
    expect(duplicateNoteData(mother).parent_note_id).toBeNull();
    expect(duplicateNoteData({ ...mother, parentNoteId: "parent" }).parent_note_id).toBe("parent");
  });
  it("preserves content and metadata with independent checklist IDs", () => {
    let id = 0;
    const copy = duplicateNoteData(mother, () => `copy-${++id}`);
    expect(copy.checklist.map(item => item.id)).toEqual(["copy-1", "copy-2"]);
    expect(copy.checklist[1].parentId).toBe("copy-1");
    expect(copy.checklist[0].priority).toBe("high");
    expect(copy.checklist[0].dueAt).toBe("2026-10-13");
    expect(copy.checklist[1].completed).toBe(true);
    expect(copy.content).toBe(mother.content);
    expect(mother.checklist[1].parentId).toBe("super");
  });
  it("does not inherit favorites, memberships or links and avoids original position", () => {
    const copy = duplicateNoteData(mother);
    expect(copy.is_favorite).toBe(false);
    expect(copy.in_tasks).toBe(false);
    expect(copy.in_postits).toBe(false);
    expect(copy.linked_note_ids).toEqual([]);
    expect([copy.pos_x, copy.pos_y]).toEqual([100, 80]);
  });
  it("copies rich text and nested checklist as plain text", () => {
    expect(plainNoteText(mother)).toBe("Comprar\nDescripción & texto\n[ ] Super\n  [x] Leche");
  });
});