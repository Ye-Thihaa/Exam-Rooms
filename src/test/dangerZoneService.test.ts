// ─── Vitest ───────────────────────────────────────────────────────────────────
import { describe, it, expect, vi, beforeEach } from "vitest";
import { deleteAllData, deleteTableData } from "@/services/dangerZoneService";

// ─────────────────────────────────────────────────────────────────────────────
// Mock
//
// Production chain: supabase.from(table).delete({ count:"exact" }).gte(pk, 0)
// Making the chain a thenable means `await chain` always resolves correctly
// regardless of which method was called last.
// ─────────────────────────────────────────────────────────────────────────────

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("@/utils/supabase", () => ({ default: { from: mockFrom } }));

function makeChain(resolved: { error: any; count?: number }) {
  const chain: any = {
    delete: vi.fn().mockReturnThis(),
    gte:    vi.fn().mockReturnThis(),
    then: (onFulfilled: (v: any) => any, onRejected?: (e: any) => any) =>
      Promise.resolve(resolved).then(onFulfilled, onRejected),
  };
  return chain;
}

// ─── PURGE_ORDER — must mirror the source exactly ─────────────────────────────

const PURGE_ORDER = [
  { table: "seating_assignment", pk: "seating_id"    },
  { table: "teacher_assignment", pk: "assignment_id" },
  { table: "exam_room",          pk: "exam_room_id"  },
  { table: "exam",               pk: "exam_id"       },
  { table: "student",            pk: "student_id"    },
  { table: "teacher",            pk: "teacher_id"    },
  { table: "room",               pk: "room_id"       },
] as const;

const KNOWN_TABLES = PURGE_ORDER.map((e) => e.table) as unknown as string[];

// ═════════════════════════════════════════════════════════════════════════════
// deleteAllData()
// ═════════════════════════════════════════════════════════════════════════════

describe("deleteAllData()", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Happy path ───────────────────────────────────────────────────────────

  describe("happy path — all tables succeed", () => {
    beforeEach(() => {
      mockFrom.mockReturnValue(makeChain({ error: null, count: 10 }));
    });

    it("returns success: true", async () => {
      expect((await deleteAllData()).success).toBe(true);
    });

    it("message contains 'permanently deleted'", async () => {
      expect((await deleteAllData()).message).toMatch(/permanently deleted/i);
    });

    it("contains a deletedCounts entry for every known table", async () => {
      const result = await deleteAllData();
      for (const table of KNOWN_TABLES) {
        expect(result.deletedCounts).toHaveProperty(table);
      }
    });

    it("reports the correct row count per table", async () => {
      mockFrom.mockReturnValue(makeChain({ error: null, count: 5 }));
      const result = await deleteAllData();
      for (const table of KNOWN_TABLES) {
        expect(result.deletedCounts![table]).toBe(5);
      }
    });

    it("calls supabase.from() once per table", async () => {
      await deleteAllData();
      expect(mockFrom).toHaveBeenCalledTimes(KNOWN_TABLES.length);
    });

    it("does not include an error field when all succeed", async () => {
      expect((await deleteAllData()).error).toBeUndefined();
    });
  });

  // ── Partial failure ──────────────────────────────────────────────────────

  describe("partial failure — one table errors", () => {
    it("returns success: false", async () => {
      let call = 0;
      mockFrom.mockImplementation(() =>
        makeChain(++call === 3 ? { error: { message: "FK violation" }, count: 0 } : { error: null, count: 2 }),
      );
      expect((await deleteAllData()).success).toBe(false);
    });

    it("error string contains the failing table name and its error message", async () => {
      // Source formats errors as: "tableName: errorMessage"
      let call = 0;
      mockFrom.mockImplementation(() =>
        makeChain(++call === 1 ? { error: { message: "timeout" }, count: 0 } : { error: null, count: 1 }),
      );
      const result = await deleteAllData();
      expect(result.error).toContain("seating_assignment");
      expect(result.error).toContain("timeout");
    });

    it("still returns deletedCounts for tables that succeeded", async () => {
      let call = 0;
      mockFrom.mockImplementation(() =>
        makeChain(++call === 1 ? { error: { message: "err" }, count: 0 } : { error: null, count: 3 }),
      );
      const result = await deleteAllData();
      expect(result.deletedCounts!["seating_assignment"]).toBe(0);
      expect(result.deletedCounts!["teacher_assignment"]).toBe(3);
    });

    it("concatenates multiple errors with ' | '", async () => {
      // Source: errors.join(" | ")
      let call = 0;
      mockFrom.mockImplementation(() =>
        makeChain(++call <= 2 ? { error: { message: `err${call}` }, count: 0 } : { error: null, count: 1 }),
      );
      const result = await deleteAllData();
      expect(result.success).toBe(false);
      expect(result.error).toContain("|");
    });
  });

  // ── Total failure ────────────────────────────────────────────────────────

  describe("total failure — all tables error", () => {
    beforeEach(() => {
      mockFrom.mockReturnValue(makeChain({ error: { message: "DB down" }, count: 0 }));
    });

    it("returns success: false", async () => {
      expect((await deleteAllData()).success).toBe(false);
    });

    it("reports 0 count for every table", async () => {
      const result = await deleteAllData();
      for (const table of KNOWN_TABLES) {
        expect(result.deletedCounts![table]).toBe(0);
      }
    });

    it("error string contains every table name", async () => {
      // Source: errors.push(`${table}: ${result.error}`) for each failure
      const result = await deleteAllData();
      for (const table of KNOWN_TABLES) {
        expect(result.error).toContain(table);
      }
    });

    it("error string contains the DB error message", async () => {
      expect((await deleteAllData()).error).toContain("DB down");
    });
  });

  // ── Purge order ──────────────────────────────────────────────────────────
  //
  // Verified against PURGE_ORDER in source:
  //   [0] seating_assignment  [1] teacher_assignment  [2] exam_room
  //   [3] exam                [4] student             [5] teacher  [6] room

  describe("purge order — child tables deleted before parents", () => {
    function captureCallOrder(): string[] {
      const order: string[] = [];
      mockFrom.mockImplementation((table: string) => {
        order.push(table);
        return makeChain({ error: null, count: 1 });
      });
      return order;
    }

    it("deletes seating_assignment before exam_room", async () => {
      const order = captureCallOrder();
      await deleteAllData();
      expect(order.indexOf("seating_assignment")).toBeLessThan(order.indexOf("exam_room"));
    });

    it("deletes teacher_assignment before teacher", async () => {
      const order = captureCallOrder();
      await deleteAllData();
      expect(order.indexOf("teacher_assignment")).toBeLessThan(order.indexOf("teacher"));
    });

    it("deletes exam_room before exam (exam_room index 2 < exam index 3 in PURGE_ORDER)", async () => {
      const order = captureCallOrder();
      await deleteAllData();
      expect(order.indexOf("exam_room")).toBeLessThan(order.indexOf("exam"));
    });

    it("deletes exam_room before room", async () => {
      const order = captureCallOrder();
      await deleteAllData();
      expect(order.indexOf("exam_room")).toBeLessThan(order.indexOf("room"));
    });

    it("deletes seating_assignment before room", async () => {
      const order = captureCallOrder();
      await deleteAllData();
      expect(order.indexOf("seating_assignment")).toBeLessThan(order.indexOf("room"));
    });
  });

  // ── Supabase call shape ───────────────────────────────────────────────────

  describe("supabase call correctness", () => {
    it("calls .delete({ count: 'exact' }) for every table", async () => {
      const deleteSpy = vi.fn().mockReturnThis();
      mockFrom.mockReturnValue({
        delete: deleteSpy,
        gte: vi.fn().mockReturnThis(),
        then: (onFulfilled: (v: any) => any, onRejected?: (e: any) => any) =>
          Promise.resolve({ error: null, count: 1 }).then(onFulfilled, onRejected),
      });
      await deleteAllData();
      expect(deleteSpy).toHaveBeenCalledTimes(KNOWN_TABLES.length);
      expect(deleteSpy).toHaveBeenCalledWith({ count: "exact" });
    });

    it("calls .gte(pk, 0) for every table", async () => {
      const gteSpy = vi.fn().mockReturnThis();
      mockFrom.mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        gte: gteSpy,
        then: (onFulfilled: (v: any) => any, onRejected?: (e: any) => any) =>
          Promise.resolve({ error: null, count: 1 }).then(onFulfilled, onRejected),
      });
      await deleteAllData();
      expect(gteSpy).toHaveBeenCalledTimes(KNOWN_TABLES.length);
      expect(gteSpy).toHaveBeenCalledWith(expect.any(String), 0);
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// deleteTableData()
// ═════════════════════════════════════════════════════════════════════════════

describe("deleteTableData()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue(makeChain({ error: null, count: 5 }));
  });

  // ── Known tables — happy path ────────────────────────────────────────────

  describe("known tables — happy path", () => {
    it.each(KNOWN_TABLES)("returns success: true for '%s'", async (table) => {
      expect((await deleteTableData(table)).success).toBe(true);
    });

    it("message contains the deleted row count", async () => {
      mockFrom.mockReturnValue(makeChain({ error: null, count: 7 }));
      expect((await deleteTableData("student")).message).toContain("7");
    });

    it("message contains the table name", async () => {
      expect((await deleteTableData("teacher")).message).toContain("teacher");
    });

    it("returns deletedCounts keyed by the table name", async () => {
      expect((await deleteTableData("exam")).deletedCounts).toEqual({ exam: 5 });
    });

    it("calls supabase.from() once with the correct table name", async () => {
      await deleteTableData("room");
      expect(mockFrom).toHaveBeenCalledTimes(1);
      expect(mockFrom).toHaveBeenCalledWith("room");
    });
  });

  // ── Primary key correctness ───────────────────────────────────────────────

  describe("correct primary key used per table", () => {
    function captureGteArg(): { col: string | null } {
      const state = { col: null as string | null };
      mockFrom.mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        gte: vi.fn().mockImplementation((col: string) => {
          state.col = col;
          return { then: (f: any, r?: any) => Promise.resolve({ error: null, count: 0 }).then(f, r) };
        }),
      });
      return state;
    }

    it.each(PURGE_ORDER)("table '$table' uses pk '$pk'", async ({ table, pk }) => {
      const state = captureGteArg();
      await deleteTableData(table);
      expect(state.col).toBe(pk);
    });
  });

  // ── Unknown table ────────────────────────────────────────────────────────

  describe("unknown table", () => {
    it("returns success: false", async () => {
      expect((await deleteTableData("nonexistent_table")).success).toBe(false);
    });

    it("message contains the unknown table name", async () => {
      expect((await deleteTableData("nonexistent_table")).message).toContain("nonexistent_table");
    });

    it("error matches /table not found/i", async () => {
      expect((await deleteTableData("nonexistent_table")).error).toMatch(/table not found/i);
    });

    it("does NOT call supabase for unknown tables", async () => {
      await deleteTableData("hack_attempt");
      expect(mockFrom).not.toHaveBeenCalled();
    });
  });

  // ── DB error on a known table ────────────────────────────────────────────

  describe("DB error on a known table", () => {
    beforeEach(() => {
      mockFrom.mockReturnValue(makeChain({ error: { message: "Connection refused" }, count: 0 }));
    });

    it("returns success: false", async () => {
      expect((await deleteTableData("student")).success).toBe(false);
    });

    it("includes the DB error message in result.error", async () => {
      expect((await deleteTableData("student")).error).toContain("Connection refused");
    });

    it("message matches /failed to delete/i", async () => {
      expect((await deleteTableData("student")).message).toMatch(/failed to delete/i);
    });

    it("does not include deletedCounts on failure", async () => {
      expect((await deleteTableData("student")).deletedCounts).toBeUndefined();
    });
  });
});