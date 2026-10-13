import { describe, it, expect } from "vitest";
import { toggleAndSort } from "@/lib/checklistOrder";

const base = [
  { id: "a", text: "a", completed: false },
  { id: "a1", text: "a1", completed: false, parentId: "a" },
  { id: "b", text: "b", completed: false },
  { id: "c", text: "c", completed: false },
];

describe("checklist order", () => {
  it("marcar mueve al final con sus subtareas", () => {
    expect(toggleAndSort(base, "a").map(i => i.id)).toEqual(["b", "c", "a", "a1"]);
  });
  it("desmarcar vuelve tras las pendientes", () => {
    const done = toggleAndSort(toggleAndSort(base, "a"), "b");
    expect(toggleAndSort(done, "a").map(i => i.id)).toEqual(["c", "a", "a1", "b"]);
  });
  it("subtarea marcada baja dentro de su madre", () => {
    const items = [...base.slice(0, 2), { id: "a2", text: "a2", completed: false, parentId: "a" }, ...base.slice(2)];
    expect(toggleAndSort(items, "a1").map(i => i.id)).toEqual(["a", "a2", "a1", "b", "c"]);
  });
});
