import { describe, expect, it } from "vitest";
import { subtaskTransferBundle } from "@/lib/subtaskTransfer";
import type { Note } from "@/types/notes";

const source: Note = { id: "comprar", title: "Comprar", content: "Descripción madre", categoryId: null, parentNoteId: null, linkedNoteIds: [], noteType: "checklist", isCollapsed: true, createdAt: "", updatedAt: "", inTasks: false, calendarAt: null, checklist: [
  { id: "super", text: "Super", notes: "Detalles", completed: true, dueAt: "2026-10-15T13:00:00Z", hasTime: true, priority: "high" },
  { id: "milk", text: "Leche", completed: false, parentId: "super" },
  { id: "bread", text: "Pan", completed: true, parentId: "super" },
  { id: "sibling", text: "Pizarra", completed: false },
] };
const target: Note = { ...source, id: "otra", checklist: [{ id: "existing", text: "Existente", completed: false }] };
describe("Subtask transfer rules", () => {
  it("moves Super with all its checklist items in their existing order", () => {
    expect(subtaskTransferBundle(source, target, "super").map(item => item.id)).toEqual(["super", "milk", "bread"]);
  });
  it("preserves identifiers, title, description, completed state, date, time and priority", () => {
    expect(subtaskTransferBundle(source, target, "super")[0]).toEqual({ id: "super", text: "Super", notes: "Detalles", completed: true, dueAt: "2026-10-15T13:00:00Z", hasTime: true, priority: "high" });
  });
  it("does not mutate the mother descriptions, dates, memberships or other items", () => {
    const originals = JSON.stringify([source, target]);
    subtaskTransferBundle(source, target, "super");
    expect(JSON.stringify([source, target])).toBe(originals);
  });
  it("does not allow moving an item instead of a subtask", () => {
    expect(() => subtaskTransferBundle(source, target, "milk")).toThrow("Invalid subtask");
  });
  it("rejects a text note as destination", () => {
    expect(() => subtaskTransferBundle(source, { ...target, noteType: "text" }, "super")).toThrow("Invalid destination");
  });
  it("rejects a same-mother move", () => {
    expect(() => subtaskTransferBundle(source, source, "super")).toThrow("Invalid destination");
  });
  it("rejects duplicate IDs rather than copying an entry", () => {
    expect(() => subtaskTransferBundle(source, { ...target, checklist: [source.checklist[1]] }, "super")).toThrow("Duplicate item");
  });
  it("rejects extra levels without silently changing the hierarchy", () => {
    expect(() => subtaskTransferBundle({ ...source, checklist: [...source.checklist, { id: "third", text: "Extra", completed: false, parentId: "milk" }] }, target, "super")).toThrow("Unsupported checklist levels");
  });
});