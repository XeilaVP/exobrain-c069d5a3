import { describe, expect, it } from "vitest";
import { postItPriorityRank, dateInputToISO } from "@/lib/taskMetadata";
import { patchChecklistItem } from "@/lib/taskNavigation";
import type { Note, ChecklistItem } from "@/types/notes";

const note = (patch: Partial<Note> = {}): Note => ({
  id: "comprar", title: "Comprar", content: "Original", categoryId: null,
  parentNoteId: null, linkedNoteIds: [], checklist: [], noteType: "checklist",
  isCollapsed: false, createdAt: "", updatedAt: "", ...patch,
});

describe("Task and Post-it metadata", () => {
  it("Post-its sort by the note's own priority even without subtasks", () => {
    const sorted = [note({ id: "low", priority: "low" }), note({ id: "none" }), note({ id: "high", priority: "high" }), note({ id: "medium", priority: "medium" })]
      .sort((a, b) => postItPriorityRank(a) - postItPriorityRank(b));
    expect(sorted.map(item => item.id)).toEqual(["high", "medium", "low", "none"]);
  });

  it("Checklist items cannot affect Post-its priority ordering", () => {
    expect(postItPriorityRank(note({ priority: "low", checklist: [{ id: "milk", parentId: "super", text: "Leche", completed: false, priority: "high" }] }))).toBe(2);
  });

  const superItem: ChecklistItem = { id: "super", text: "Super", completed: false, priority: "high", dueAt: "2026-10-20T09:00:00.000Z", hasTime: true };
  const sibling: ChecklistItem = { id: "pizarra", text: "Pizarra", completed: false, priority: "low" };
  const child: ChecklistItem = { id: "milk", parentId: "super", text: "Leche", completed: false };

  it("Editing Super priority preserves date, title, sibling and checklist content", () => {
    const changed = patchChecklistItem([superItem, child, sibling], "super", { priority: "medium" });
    expect(changed[0]).toEqual({ ...superItem, priority: "medium" });
    expect(changed[1]).toBe(child);
    expect(changed[2]).toBe(sibling);
    expect(superItem.priority).toBe("high");
  });

  it("Removing Super priority leaves its date and other items unchanged", () => {
    const changed = patchChecklistItem([superItem, child, sibling], "super", { priority: undefined });
    expect(changed[0]).toEqual({ ...superItem, priority: undefined });
    expect(changed[1]).toBe(child);
    expect(changed[2]).toBe(sibling);
  });

  it("Editing date and time does not change priority or relatives", () => {
    const date = dateInputToISO("2026-10-21T16:30", true);
    const changed = patchChecklistItem([superItem, child, sibling], "super", { dueAt: date, hasTime: true });
    expect(new Date(changed[0].dueAt ?? "").getHours()).toBe(16);
    expect(new Date(changed[0].dueAt ?? "").getMinutes()).toBe(30);
    expect(changed[0].priority).toBe("high");
    expect(changed[1]).toBe(child);
    expect(changed[2]).toBe(sibling);
  });

  it("Removing a date does not erase the subtask priority", () => {
    expect(dateInputToISO("", false)).toBeNull();
    expect(patchChecklistItem([superItem], "super", { dueAt: null, hasTime: false })[0]).toEqual({ ...superItem, dueAt: null, hasTime: false });
  });
});