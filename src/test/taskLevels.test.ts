import { describe, it, expect } from "vitest";
import { prioritizedEntries } from "@/lib/taskLevels";
import type { Note } from "@/types/notes";

const note = (p: Partial<Note>): Note => ({ id: "n", title: "Comprar", content: "", categoryId: null, parentNoteId: null, linkedNoteIds: [], checklist: [], noteType: "checklist", isCollapsed: false, createdAt: "", updatedAt: "", ...p });

describe("prioritizedEntries", () => {
  it("subtarea con fecha sale sin su madre", () => {
    const r = prioritizedEntries([note({ checklist: [{ id: "s", text: "Super", completed: false, dueAt: "2026-10-20" }, { id: "x", text: "Pizarra", completed: false }] })]);
    expect(r).toHaveLength(1);
    expect(r[0].kind).toBe("subtask");
  });
  it("madre sin fecha ni prioridad no sale", () => {
    expect(prioritizedEntries([note({ checklist: [{ id: "s", text: "Super", completed: false }] })])).toHaveLength(0);
  });
  it("items dentro de subtarea nunca salen solos", () => {
    expect(prioritizedEntries([note({ checklist: [{ id: "s", text: "Super", completed: false }, { id: "i", text: "leche", completed: false, parentId: "s", priority: "high" }] })])).toHaveLength(0);
  });
  it("tarea con prioridad sale entera", () => {
    const r = prioritizedEntries([note({ priority: "low" })]);
    expect(r[0].kind).toBe("task");
  });
  it("ordena alta antes que baja y luego por fecha", () => {
    const r = prioritizedEntries([note({ checklist: [
      { id: "a", text: "a", completed: false, priority: "low" },
      { id: "b", text: "b", completed: false, dueAt: "2026-10-15" },
      { id: "c", text: "c", completed: false, priority: "high" },
    ] })]);
    expect(r.map(e => e.kind === "subtask" && e.item.id)).toEqual(["c", "a", "b"]);
  });
});
