// ─── Vitest ───────────────────────────────────────────────────────────────────
import { describe, it, expect, vi, beforeEach } from "vitest";
import { deleteExamRoomById } from "@/services/examRoomDeleteHelper";

// ─────────────────────────────────────────────────────────────────────────────
// Mock
//
// Chain: supabase.from("exam_room").delete().eq("exam_room_id", id)
// Terminal call is .eq() so the whole chain must be a thenable.
// ─────────────────────────────────────────────────────────────────────────────

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("@/utils/supabase", () => ({ default: { from: mockFrom } }));

function makeChain(resolved: { error: any }) {
  const chain: any = {
    delete: vi.fn().mockReturnThis(),
    eq:     vi.fn().mockReturnThis(),
    then: (onFulfilled: (v: any) => any, onRejected?: (e: any) => any) =>
      Promise.resolve(resolved).then(onFulfilled, onRejected),
  };
  return chain;
}

// ─────────────────────────────────────────────────────────────────────────────

describe("deleteExamRoomById()", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Happy path ───────────────────────────────────────────────────────────

  describe("successful deletion", () => {
    beforeEach(() => {
      mockFrom.mockReturnValue(makeChain({ error: null }));
    });

    it("returns success: true", async () => {
      expect((await deleteExamRoomById(1)).success).toBe(true);
    });

    it("does not include an error field on success", async () => {
      expect((await deleteExamRoomById(1)).error).toBeUndefined();
    });

    it("calls supabase.from() with 'exam_room'", async () => {
      await deleteExamRoomById(1);
      expect(mockFrom).toHaveBeenCalledWith("exam_room");
    });

    it("calls .eq() with 'exam_room_id' and the provided id", async () => {
      const chain = makeChain({ error: null });
      mockFrom.mockReturnValue(chain);
      await deleteExamRoomById(99);
      expect(chain.eq).toHaveBeenCalledWith("exam_room_id", 99);
    });

    it("calls .delete() once", async () => {
      const chain = makeChain({ error: null });
      mockFrom.mockReturnValue(chain);
      await deleteExamRoomById(1);
      expect(chain.delete).toHaveBeenCalledTimes(1);
    });
  });

  // ── Supabase error (error object returned) ────────────────────────────────

  describe("supabase returns an error object", () => {
    const dbError = { message: "FK constraint violation", code: "23503" };

    beforeEach(() => {
      mockFrom.mockReturnValue(makeChain({ error: dbError }));
    });

    it("returns success: false", async () => {
      expect((await deleteExamRoomById(1)).success).toBe(false);
    });

    it("returns the error object in result.error", async () => {
      expect((await deleteExamRoomById(1)).error).toEqual(dbError);
    });

    it("does not throw — error is contained in the return value", async () => {
      await expect(deleteExamRoomById(1)).resolves.toBeDefined();
    });
  });

  // ── Network / thrown exception ────────────────────────────────────────────

  describe("supabase throws an exception", () => {
    beforeEach(() => {
      // Simulate a network-level throw rather than an error response
      mockFrom.mockImplementation(() => {
        throw new Error("Network unreachable");
      });
    });

    it("returns success: false", async () => {
      expect((await deleteExamRoomById(1)).success).toBe(false);
    });

    it("returns the thrown error in result.error", async () => {
      const result = await deleteExamRoomById(1);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe("Network unreachable");
    });

    it("does not rethrow — the catch block absorbs the exception", async () => {
      await expect(deleteExamRoomById(1)).resolves.toBeDefined();
    });
  });

  // ── Different IDs ─────────────────────────────────────────────────────────

  describe("ID handling", () => {
    it("passes the exact id to .eq() — id 0", async () => {
      const chain = makeChain({ error: null });
      mockFrom.mockReturnValue(chain);
      await deleteExamRoomById(0);
      expect(chain.eq).toHaveBeenCalledWith("exam_room_id", 0);
    });

    it("passes the exact id to .eq() — large id", async () => {
      const chain = makeChain({ error: null });
      mockFrom.mockReturnValue(chain);
      await deleteExamRoomById(999999);
      expect(chain.eq).toHaveBeenCalledWith("exam_room_id", 999999);
    });
  });
});
