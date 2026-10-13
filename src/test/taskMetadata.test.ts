import { describe, expect, it } from "vitest";
import { postItPriorityRank, dateInputToISO, datedEntries } from "@/lib/taskMetadata";
import { patchChecklistItem } from "@/lib/taskNavigation";
import type { Note, ChecklistItem } from "@/types/notes";

const note = (patch: Partial<Note> = {}): Note => ({
  id: "comprar", title: "Comprar", content: "Original", categoryId: null,
  parentNoteId: null, linkedNoteIds: [], checklist: [], noteType: "checklist",
  isCollapsed: false, createdAt: "", updatedAt: "", ...patch,
});

describe("Task and Post-it metadata", () => {
  it("a dated Super appears independently of undated Comprar and its calendar flag", () => {
    const entries = datedEntries([note({ inCalendar: false, checklist: [
      { id: "super", text: "Super", completed: false, dueAt: "2026-10-20" },
      { id: "pizarra", text: "Pizarra", completed: false },
      { id: "milk", text: "Leche", completed: false, parentId: "super", dueAt: "2026-10-20" },
    ] })]);
    expect(entries.map(entry => entry.item.id)).toEqual(["super"]);
    expect(entries[0].item.dueAt).toBe("2026-10-20");
  });
  it("a note date appears even when legacy calendar membership is off", () => {
    expect(datedEntries([note({ inCalendar: false, calendarAt: "2026-10-21" })]).map(entry => entry.item.text)).toEqual(["Comprar"]);
  });
  it("moving and clearing Super's date changes only its calendar entry", () => {
    const original = note({ checklist: [
      { id: "super", text: "Super", completed: false, dueAt: "2026-10-20" },
      { id: "pizarra", text: "Pizarra", completed: false, dueAt: "2026-10-22" },
    ] });
    const moved = { ...original, checklist: patchChecklistItem(original.checklist, "super", { dueAt: "2026-10-21" }) };
    expect(datedEntries([moved]).map(entry => entry.item.dueAt)).toEqual(["2026-10-21", "2026-10-22"]);
    const cleared = { ...moved, checklist: patchChecklistItem(moved.checklist, "super", { dueAt: null }) };
    expect(datedEntries([cleared]).map(entry => entry.item.id)).toEqual(["pizarra"]);
    expect(cleared.content).toBe("Original");
  });
  it("optional time preserves the selected calendar day", () => {
    const value = dateInputToISO("2026-10-21", false);
    expect(new Date(value ?? "").getDate()).toBe(21);
    expect(new Date(value ?? "").getMonth()).toBe(9);
  });
  it("editing a checklist item preserves completion, position and siblings", () => {
    const items = [{ id: "milk", text: "Leche", completed: true, parentId: "super" }, { id: "bread", text: "Pan", completed: false, parentId: "super" }];
    const edited = patchChecklistItem(items, "milk", { text: "Leche sin lactosa" });
    expect(edited[0]).toEqual({ ...items[0], text: "Leche sin lactosa" });
    expect(edited[1]).toBe(items[1]);
  });
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