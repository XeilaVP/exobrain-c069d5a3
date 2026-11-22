import { describe, it, expect } from "vitest";
import { moveChecklistItem, canDrop } from "@/lib/checklistDnd";
const base = () => [
  { id: "web", text: "Web", completed: false },
  { id: "avon", text: "Avon", completed: false },
  { id: "prod", text: "Producto", completed: false },
  { id: "fc", text: "Freelance", completed: false, parentId: "prod" },
];
describe("checklist drag and drop", () => {
  it("dropping inside a task makes it a subtask placed after its items", () => {
    const r = moveChecklistItem(base(), "avon", "prod", "inside");
    expect(r.map(i => i.id)).toEqual(["web", "prod", "fc", "avon"]);
    expect(r.find(i => i.id === "avon")!.parentId).toBe("prod");
  });
  it("dropping before a root item takes a subtask out to root", () => {
    const r = moveChecklistItem(base(), "fc", "web", "before");
    expect(r.map(i => i.id)).toEqual(["fc", "web", "avon", "prod"]);
    expect(r[0].parentId).toBeUndefined();
  });
  it("moving a task keeps its items with it", () => {
    const r = moveChecklistItem(base(), "prod", "web", "before");
    expect(r.map(i => i.id)).toEqual(["prod", "fc", "web", "avon"]);
  });
  it("no third level: cannot drop inside a subtask item nor nest a task that has items", () => {
    expect(canDrop(base(), "web", "fc", "inside")).toBe(false);
    expect(canDrop(base(), "prod", "web", "inside")).toBe(false);
  });
});
