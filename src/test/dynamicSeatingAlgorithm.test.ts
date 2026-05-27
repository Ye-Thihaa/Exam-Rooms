// ─── Vitest ───────────────────────────────────────────────────────────────────
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  dynamicSeatingAssignment,
  validateSeatingArrangement,
  createStudentFromNumber,
  printSeatingGrid,
  exampleUsage,
} from "@/services/dynamicSeatingAlgorithm";
import type { Student, SeatingGrid } from "@/services/dynamicSeatingAlgorithm";

// ─────────────────────────────────────────────────────────────────────────────
// Patterns — mirrored exactly from SEATING_PATTERNS in source
// ─────────────────────────────────────────────────────────────────────────────

const GROUP_A_PATTERN = [
  "A1","B2","C1","D2","E1","F2",
  "F4","E3","D4","C3","B4","A3",
  "A5","B6","C5","D6","E5","F6",
];
const GROUP_B_PATTERN = [
  "A2","B1","C2","D1","E2","F1",
  "F3","E4","D3","C4","B3","A4",
  "A6","B5","C6","D5","E6","F5",
];

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

function makeStudents(count: number, idOffset = 0): Student[] {
  return Array.from({ length: count }, (_, i) => ({
    student_id:     idOffset + i + 1,
    student_number: `S${String(idOffset + i + 1).padStart(3, "0")}`,
    name:           `Student ${idOffset + i + 1}`,
    year_level:     1,
    retake:         false,
  }));
}

const fullA = makeStudents(18, 0);    // ids  1-18
const fullB = makeStudents(18, 100);  // ids 101-118

// ═════════════════════════════════════════════════════════════════════════════
// createStudentFromNumber()
// ═════════════════════════════════════════════════════════════════════════════

describe("createStudentFromNumber()", () => {
  it("extracts a numeric student_id from the student number string", () => {
    expect(createStudentFromNumber("TNT-2201", 0).student_id).toBe(2201);
  });

  it("falls back to the index when the string contains no digits", () => {
    expect(createStudentFromNumber("ABC", 7).student_id).toBe(7);
  });

  it("sets student_number to the provided string", () => {
    expect(createStudentFromNumber("TNT-2201", 0).student_number).toBe("TNT-2201");
  });

  it("sets year_level to 1", () => {
    expect(createStudentFromNumber("X-001", 0).year_level).toBe(1);
  });

  it("sets retake to false", () => {
    expect(createStudentFromNumber("X-001", 0).retake).toBe(false);
  });

  it("sets major to 'Computer Science'", () => {
    expect(createStudentFromNumber("X-001", 0).major).toBe("Computer Science");
  });

  it("sets sem to 1", () => {
    expect(createStudentFromNumber("X-001", 0).sem).toBe(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// dynamicSeatingAssignment()
// ═════════════════════════════════════════════════════════════════════════════

describe("dynamicSeatingAssignment()", () => {

  // ── Return shape ────────────────────────────────────────────────────────────

  describe("return shape", () => {
    it("returns an object with grid, assignments, and rowLabels", () => {
      const r = dynamicSeatingAssignment(fullA, fullB, 6, 6, 1);
      expect(r).toHaveProperty("grid");
      expect(r).toHaveProperty("assignments");
      expect(r).toHaveProperty("rowLabels");
    });

    it("grid has the correct number of rows", () => {
      expect(dynamicSeatingAssignment(fullA, fullB, 6, 6, 1).grid.length).toBe(6);
    });

    it("each grid row has the correct number of columns", () => {
      dynamicSeatingAssignment(fullA, fullB, 6, 6, 1).grid
        .forEach((row) => expect(row.length).toBe(6));
    });

    it("rowLabels are ['A','B','C','D','E','F'] for 6 rows", () => {
      expect(dynamicSeatingAssignment(fullA, fullB, 6, 6, 1).rowLabels)
        .toEqual(["A","B","C","D","E","F"]);
    });
  });

  // ── null rows parameter ───────────────────────────────────────────────────

  describe("null rows parameter", () => {
    it("defaults to 6 rows when rows is null", () => {
      const r = dynamicSeatingAssignment(fullA, fullB, 6, null, 1);
      expect(r.grid.length).toBe(6);
      expect(r.rowLabels).toEqual(["A","B","C","D","E","F"]);
    });
  });

  // ── Assignment counts ───────────────────────────────────────────────────────

  describe("assignment counts", () => {
    it("creates 36 assignments for two full groups of 18", () => {
      expect(dynamicSeatingAssignment(fullA, fullB, 6, 6, 1).assignments.length).toBe(36);
    });

    it("creates exactly as many assignments as students provided (partial groups)", () => {
      expect(dynamicSeatingAssignment(makeStudents(5), makeStudents(3, 100), 6, 6, 1)
        .assignments.length).toBe(8);
    });

    it("caps Group A at pattern length (18) when more students are provided", () => {
      expect(dynamicSeatingAssignment(makeStudents(30), [], 6, 6, 1)
        .assignments.length).toBe(18);
    });

    it("caps Group B at pattern length (18) when more students are provided", () => {
      expect(dynamicSeatingAssignment([], makeStudents(30, 100), 6, 6, 1)
        .assignments.length).toBe(18);
    });

    it("creates 0 assignments when both groups are empty", () => {
      expect(dynamicSeatingAssignment([], [], 6, 6, 1).assignments.length).toBe(0);
    });

    it("creates only Group A assignments when Group B is empty", () => {
      expect(dynamicSeatingAssignment(makeStudents(5), [], 6, 6, 1)
        .assignments.length).toBe(5);
    });

    it("creates only Group B assignments when Group A is empty", () => {
      expect(dynamicSeatingAssignment([], makeStudents(5, 100), 6, 6, 1)
        .assignments.length).toBe(5);
    });
  });

  // ── Pattern adherence ───────────────────────────────────────────────────────

  describe("pattern adherence", () => {
    it("places Group A students only in Group A pattern seats", () => {
      const r = dynamicSeatingAssignment(fullA, fullB, 6, 6, 1);
      const aIds = new Set(fullA.map((s) => s.student_id));
      r.assignments
        .filter((a) => aIds.has(a.student_id))
        .forEach((a) => expect(GROUP_A_PATTERN).toContain(a.seat_number));
    });

    it("places Group B students only in Group B pattern seats", () => {
      const r = dynamicSeatingAssignment(fullA, fullB, 6, 6, 1);
      const bIds = new Set(fullB.map((s) => s.student_id));
      r.assignments
        .filter((a) => bIds.has(a.student_id))
        .forEach((a) => expect(GROUP_B_PATTERN).toContain(a.seat_number));
    });

    it("assigns Group A seats in exact pattern order", () => {
      const r = dynamicSeatingAssignment(fullA, [], 6, 6, 1);
      r.assignments.forEach((a, i) => expect(a.seat_number).toBe(GROUP_A_PATTERN[i]));
    });

    it("assigns Group B seats in exact pattern order", () => {
      const r = dynamicSeatingAssignment([], fullB, 6, 6, 1);
      r.assignments.forEach((a, i) => expect(a.seat_number).toBe(GROUP_B_PATTERN[i]));
    });

    it("Group A and Group B patterns have no overlapping seats", () => {
      const overlap = GROUP_A_PATTERN.filter((s) => GROUP_B_PATTERN.includes(s));
      expect(overlap).toHaveLength(0);
    });

    it("no two assignments share the same seat number", () => {
      const r = dynamicSeatingAssignment(fullA, fullB, 6, 6, 1);
      const seats = r.assignments.map((a) => a.seat_number);
      expect(new Set(seats).size).toBe(seats.length);
    });
  });

  // ── Assignment field correctness ────────────────────────────────────────────

  describe("assignment field correctness", () => {
    it("each assignment carries the correct exam_room_id", () => {
      dynamicSeatingAssignment(fullA, fullB, 6, 6, 42)
        .assignments.forEach((a) => expect(a.exam_room_id).toBe(42));
    });

    it("row_label matches the first character of seat_number", () => {
      dynamicSeatingAssignment(fullA, fullB, 6, 6, 1)
        .assignments.forEach((a) => expect(a.row_label).toBe(a.seat_number.charAt(0)));
    });

    it("column_number matches the numeric part of seat_number", () => {
      dynamicSeatingAssignment(fullA, fullB, 6, 6, 1)
        .assignments.forEach((a) =>
          expect(a.column_number).toBe(parseInt(a.seat_number.slice(1))),
        );
    });

    it("every Group A student appears in assignments exactly once", () => {
      const r = dynamicSeatingAssignment(fullA, [], 6, 6, 1);
      const assignedIds = r.assignments.map((a) => a.student_id);
      fullA.forEach((s) =>
        expect(assignedIds.filter((id) => id === s.student_id).length).toBe(1),
      );
    });

    it("every Group B student appears in assignments exactly once", () => {
      const r = dynamicSeatingAssignment([], fullB, 6, 6, 1);
      const assignedIds = r.assignments.map((a) => a.student_id);
      fullB.forEach((s) =>
        expect(assignedIds.filter((id) => id === s.student_id).length).toBe(1),
      );
    });
  });

  // ── Grid placement ──────────────────────────────────────────────────────────

  describe("grid placement", () => {
    it("places each student at the correct grid[row][col] cell", () => {
      const r = dynamicSeatingAssignment(fullA, fullB, 6, 6, 1);
      r.assignments.forEach((a) => {
        const rowIndex = a.row_label.charCodeAt(0) - "A".charCodeAt(0);
        const colIndex = a.column_number - 1;
        expect(r.grid[rowIndex][colIndex]?.student_id).toBe(a.student_id);
      });
    });

    it("unassigned cells are null", () => {
      const r = dynamicSeatingAssignment(makeStudents(1), [], 6, 6, 1);
      let filled = 0;
      r.grid.forEach((row) => row.forEach((cell) => { if (cell) filled++; }));
      expect(filled).toBe(1);
    });

    it("no student appears in the grid more than once", () => {
      const r = dynamicSeatingAssignment(fullA, fullB, 6, 6, 1);
      const ids: number[] = [];
      r.grid.forEach((row) => row.forEach((cell) => { if (cell) ids.push(cell.student_id); }));
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("number of filled cells equals number of assignments", () => {
      const r = dynamicSeatingAssignment(makeStudents(7), makeStudents(5, 50), 6, 6, 1);
      let filled = 0;
      r.grid.forEach((row) => row.forEach((cell) => { if (cell) filled++; }));
      expect(filled).toBe(r.assignments.length);
    });
  });

  // ── Columns configuration ───────────────────────────────────────────────────

  describe("columns configuration", () => {
    it("respects a custom colsPerRow — each row has that many columns", () => {
      dynamicSeatingAssignment(makeStudents(2), [], 8, 6, 1)
        .grid.forEach((row) => expect(row.length).toBe(8));
    });

    it("rowLabels length always equals grid row count", () => {
      const r = dynamicSeatingAssignment(makeStudents(4), [], 6, 6, 1);
      expect(r.rowLabels.length).toBe(r.grid.length);
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// validateSeatingArrangement()
// ═════════════════════════════════════════════════════════════════════════════

describe("validateSeatingArrangement()", () => {
  function fullRun() {
    const result = dynamicSeatingAssignment(fullA, fullB, 6, 6, 1);
    return {
      result,
      groupAIds: new Set(fullA.map((s) => s.student_id)),
      groupBIds: new Set(fullB.map((s) => s.student_id)),
    };
  }

  // ── Valid arrangements ────────────────────────────────────────────────────

  it("returns valid=true and no errors for a correctly assigned grid", () => {
    const { result, groupAIds, groupBIds } = fullRun();
    const v = validateSeatingArrangement(result, groupAIds, groupBIds);
    expect(v.valid).toBe(true);
    expect(v.errors).toHaveLength(0);
  });

  it("returns valid=true for partial groups", () => {
    const a = makeStudents(5, 0);
    const b = makeStudents(5, 100);
    const result = dynamicSeatingAssignment(a, b, 6, 6, 1);
    const v = validateSeatingArrangement(
      result,
      new Set(a.map((s) => s.student_id)),
      new Set(b.map((s) => s.student_id)),
    );
    expect(v.valid).toBe(true);
  });

  it("returns valid=true when only Group A is used", () => {
    const result = dynamicSeatingAssignment(fullA, [], 6, 6, 1);
    const v = validateSeatingArrangement(
      result, new Set(fullA.map((s) => s.student_id)), new Set(),
    );
    expect(v.valid).toBe(true);
  });

  it("returns valid=true when only Group B is used", () => {
    const result = dynamicSeatingAssignment([], fullB, 6, 6, 1);
    const v = validateSeatingArrangement(
      result, new Set(), new Set(fullB.map((s) => s.student_id)),
    );
    expect(v.valid).toBe(true);
  });

  it("returns valid=true for an empty result", () => {
    const result = dynamicSeatingAssignment([], [], 6, 6, 1);
    const v = validateSeatingArrangement(result, new Set(), new Set());
    expect(v.valid).toBe(true);
    expect(v.errors).toHaveLength(0);
  });

  // ── Invalid arrangements ──────────────────────────────────────────────────

  it("returns valid=false when a Group A student is in a Group B seat", () => {
    const { result, groupAIds, groupBIds } = fullRun();
    result.assignments[0] = { ...result.assignments[0], seat_number: GROUP_B_PATTERN[0] };
    const v = validateSeatingArrangement(result, groupAIds, groupBIds);
    expect(v.valid).toBe(false);
    expect(v.errors.some((e) => e.includes("Group A"))).toBe(true);
  });

  it("returns valid=false when a Group B student is in a Group A seat", () => {
    const { result, groupAIds, groupBIds } = fullRun();
    const lastIdx = result.assignments.length - 1;
    result.assignments[lastIdx] = {
      ...result.assignments[lastIdx],
      seat_number: GROUP_A_PATTERN[0],
    };
    const v = validateSeatingArrangement(result, groupAIds, groupBIds);
    expect(v.valid).toBe(false);
    expect(v.errors.some((e) => e.includes("Group B"))).toBe(true);
  });

  it("returns valid=false and includes 'duplicate' in errors for duplicate seats", () => {
    const { result, groupAIds, groupBIds } = fullRun();
    result.assignments.push({ ...result.assignments[0] });
    const v = validateSeatingArrangement(result, groupAIds, groupBIds);
    expect(v.valid).toBe(false);
    expect(v.errors.some((e) => e.toLowerCase().includes("duplicate"))).toBe(true);
  });

  it("accumulates multiple errors — does not stop at the first", () => {
    const { result, groupAIds, groupBIds } = fullRun();
    result.assignments[0] = { ...result.assignments[0], seat_number: GROUP_B_PATTERN[0] };
    result.assignments[1] = { ...result.assignments[1], seat_number: GROUP_B_PATTERN[1] };
    const v = validateSeatingArrangement(result, groupAIds, groupBIds);
    expect(v.errors.length).toBeGreaterThanOrEqual(2);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// printSeatingGrid()  — covers lines 193-229
// ═════════════════════════════════════════════════════════════════════════════

describe("printSeatingGrid()", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("calls console.log at least once", () => {
    const r = dynamicSeatingAssignment(fullA, fullB, 6, 6, 1);
    printSeatingGrid(r);
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("prints the SEATING ARRANGEMENT header", () => {
    const r = dynamicSeatingAssignment(fullA, fullB, 6, 6, 1);
    printSeatingGrid(r);
    const allOutput = consoleSpy.mock.calls.flat().join("\n");
    expect(allOutput).toContain("SEATING ARRANGEMENT");
  });

  it("prints a column header row containing 'Col1'", () => {
    const r = dynamicSeatingAssignment(fullA, fullB, 6, 6, 1);
    printSeatingGrid(r);
    const allOutput = consoleSpy.mock.calls.flat().join("\n");
    expect(allOutput).toContain("Col1");
  });

  it("prints a STATISTICS section", () => {
    const r = dynamicSeatingAssignment(fullA, fullB, 6, 6, 1);
    printSeatingGrid(r);
    const allOutput = consoleSpy.mock.calls.flat().join("\n");
    expect(allOutput).toContain("STATISTICS");
  });

  it("prints the total number of assignments", () => {
    const r = dynamicSeatingAssignment(fullA, fullB, 6, 6, 1);
    printSeatingGrid(r);
    const allOutput = consoleSpy.mock.calls.flat().join("\n");
    expect(allOutput).toContain("36"); // 18 + 18
  });

  it("prints row labels (A-F) as row headers", () => {
    const r = dynamicSeatingAssignment(fullA, fullB, 6, 6, 1);
    printSeatingGrid(r);
    const allOutput = consoleSpy.mock.calls.flat().join("\n");
    ["A","B","C","D","E","F"].forEach((label) => expect(allOutput).toContain(label));
  });

  it("prints 'EMPTY' for unoccupied seats", () => {
    // Only 1 student — most cells should be empty
    const r = dynamicSeatingAssignment(makeStudents(1), [], 6, 6, 1);
    printSeatingGrid(r);
    const allOutput = consoleSpy.mock.calls.flat().join("\n");
    expect(allOutput).toContain("EMPTY");
  });

  it("prints student numbers for occupied seats", () => {
    const r = dynamicSeatingAssignment(fullA, fullB, 6, 6, 1);
    printSeatingGrid(r);
    const allOutput = consoleSpy.mock.calls.flat().join("\n");
    // fullA student numbers follow the pattern S001, S002 …
    expect(allOutput).toContain("S001");
  });

  it("handles an empty grid without throwing", () => {
    const r = dynamicSeatingAssignment([], [], 6, 6, 1);
    expect(() => printSeatingGrid(r)).not.toThrow();
  });

  it("handles a grid with 0 columns gracefully (no column headers beyond 'Row')", () => {
    // Force a zero-column grid by using colsPerRow = 0
    const r = dynamicSeatingAssignment([], [], 0, 6, 1);
    expect(() => printSeatingGrid(r)).not.toThrow();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// exampleUsage()  — covers lines 303-339
// ═════════════════════════════════════════════════════════════════════════════

describe("exampleUsage()", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it("runs without throwing", () => {
    expect(() => exampleUsage()).not.toThrow();
  });

  it("produces console output", () => {
    exampleUsage();
    expect(logSpy).toHaveBeenCalled();
  });

  it("prints a VALIDATION section", () => {
    exampleUsage();
    const allOutput = logSpy.mock.calls.flat().join("\n");
    expect(allOutput).toContain("VALIDATION");
  });

  it("prints 'Valid: true' — the example arrangement is always valid", () => {
    exampleUsage();
    const allOutput = logSpy.mock.calls.flat().join("\n");
    expect(allOutput).toContain("Valid: true");
  });

  it("prints a PATTERN VERIFICATION section", () => {
    exampleUsage();
    const allOutput = logSpy.mock.calls.flat().join("\n");
    expect(allOutput).toContain("PATTERN VERIFICATION");
  });

  it("prints Group A and Group B pattern lines", () => {
    exampleUsage();
    const allOutput = logSpy.mock.calls.flat().join("\n");
    expect(allOutput).toContain("Group A Pattern");
    expect(allOutput).toContain("Group B Pattern");
  });

  it("creates groups of 18 students each (TNT-22xx / TNT-23xx format)", () => {
    exampleUsage();
    const allOutput = logSpy.mock.calls.flat().join("\n");
    // The example uses TNT-22xx and TNT-23xx student numbers
    expect(allOutput).toMatch(/TNT-22\d{2}/);
  });

  it("prints a SEATING ARRANGEMENT section as part of the run", () => {
    exampleUsage();
    const allOutput = logSpy.mock.calls.flat().join("\n");
    expect(allOutput).toContain("SEATING ARRANGEMENT");
  });
});