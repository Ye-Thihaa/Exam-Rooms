import { describe, it, expect, vi, beforeEach } from "vitest";
import { seatingAssignmentQueries, SeatingAssignment } from "@/services/seatingassignmentQueries";

// ─── Mock Supabase ────────────────────────────────────────────────────────────
vi.mock("@/utils/supabase", () => {
  const makeChain = (resolved: any) => {
    const chain: any = {};
    const methods = [
      "select", "insert", "update", "delete",
      "eq", "in", "order", "limit", "single",
    ];
    methods.forEach((m) => { chain[m] = vi.fn(() => chain); });
    chain.then = (res: any, rej: any) => Promise.resolve(resolved).then(res, rej);
    return chain;
  };
  return { default: { from: vi.fn(() => makeChain({ data: [], error: null })) } };
});

import supabase from "@/utils/supabase";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const mockAssignment: SeatingAssignment = {
  seating_id: 1,
  exam_room_id: 10,
  student_id: 100,
  seat_number: "A1",
  row_label: "A",
  column_number: 1,
  student_group: "A",
  assigned_at: "2025-06-01T08:00:00Z",
};

function setupMock(resolved: any) {
  const chain: any = {};
  const methods = [
    "select", "insert", "update", "delete",
    "eq", "in", "order", "limit",
  ];
  methods.forEach((m) => { chain[m] = vi.fn(() => chain); });
  chain.single = vi.fn(() => Promise.resolve(resolved));
  chain.then = (res: any, rej: any) => Promise.resolve(resolved).then(res, rej);
  vi.mocked(supabase.from).mockReturnValue(chain as any);
  return chain;
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("seatingAssignmentQueries", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── getAll ─────────────────────────────────────────────────────────────────
  describe("getAll()", () => {
    it("returns array of seating assignments", async () => {
      setupMock({ data: [mockAssignment], error: null });
      const result = await seatingAssignmentQueries.getAll();
      expect(result).toEqual([mockAssignment]);
    });

    it("throws on DB error", async () => {
      setupMock({ data: null, error: { message: "DB error" } });
      await expect(seatingAssignmentQueries.getAll()).rejects.toEqual({ message: "DB error" });
    });

    it("returns empty array when no assignments", async () => {
      setupMock({ data: [], error: null });
      const result = await seatingAssignmentQueries.getAll();
      expect(result).toEqual([]);
    });
  });

  // ── getById ────────────────────────────────────────────────────────────────
  describe("getById()", () => {
    it("returns single assignment by ID", async () => {
      setupMock({ data: mockAssignment, error: null });
      const result = await seatingAssignmentQueries.getById(1);
      expect(result).toEqual(mockAssignment);
    });

    it("throws when not found", async () => {
      setupMock({ data: null, error: { message: "Not found" } });
      await expect(seatingAssignmentQueries.getById(999)).rejects.toEqual({ message: "Not found" });
    });
  });

  // ── getByExamRoomId ────────────────────────────────────────────────────────
  describe("getByExamRoomId()", () => {
    it("returns all assignments for a room", async () => {
      setupMock({ data: [mockAssignment], error: null });
      const result = await seatingAssignmentQueries.getByExamRoomId(10);
      expect(result).toEqual([mockAssignment]);
    });

    it("returns empty when no students assigned", async () => {
      setupMock({ data: [], error: null });
      const result = await seatingAssignmentQueries.getByExamRoomId(10);
      expect(result).toEqual([]);
    });

    it("throws on DB error", async () => {
      setupMock({ data: null, error: { message: "fail" } });
      await expect(seatingAssignmentQueries.getByExamRoomId(10)).rejects.toEqual({ message: "fail" });
    });
  });

  // ── getByExamRoomIdAndGroup ────────────────────────────────────────────────
  describe("getByExamRoomIdAndGroup()", () => {
    it("returns group A assignments", async () => {
      setupMock({ data: [mockAssignment], error: null });
      const result = await seatingAssignmentQueries.getByExamRoomIdAndGroup(10, "A");
      expect(result[0].student_group).toBe("A");
    });

    it("returns group B assignments", async () => {
      const groupB = { ...mockAssignment, student_group: "B" as const };
      setupMock({ data: [groupB], error: null });
      const result = await seatingAssignmentQueries.getByExamRoomIdAndGroup(10, "B");
      expect(result[0].student_group).toBe("B");
    });
  });

  // ── getByStudentId ─────────────────────────────────────────────────────────
  describe("getByStudentId()", () => {
    it("returns all assignments for a student", async () => {
      setupMock({ data: [mockAssignment], error: null });
      const result = await seatingAssignmentQueries.getByStudentId(100);
      expect(result).toEqual([mockAssignment]);
    });

    it("throws on DB error", async () => {
      setupMock({ data: null, error: { message: "fail" } });
      await expect(seatingAssignmentQueries.getByStudentId(100)).rejects.toEqual({ message: "fail" });
    });
  });

  // ── getByStudentAndExamRoom ────────────────────────────────────────────────
  describe("getByStudentAndExamRoom()", () => {
    it("returns assignment for student in specific room", async () => {
      setupMock({ data: mockAssignment, error: null });
      const result = await seatingAssignmentQueries.getByStudentAndExamRoom(100, 10);
      expect(result).toEqual(mockAssignment);
    });

    it("throws when not found", async () => {
      setupMock({ data: null, error: { message: "Not found" } });
      await expect(
        seatingAssignmentQueries.getByStudentAndExamRoom(999, 999)
      ).rejects.toEqual({ message: "Not found" });
    });
  });

  // ── create ─────────────────────────────────────────────────────────────────
  describe("create()", () => {
    it("creates and returns a new seating assignment", async () => {
      setupMock({ data: mockAssignment, error: null });
      const { seating_id, assigned_at, ...payload } = mockAssignment;
      const result = await seatingAssignmentQueries.create(payload);
      expect(result).toEqual(mockAssignment);
    });

    it("throws on insert error", async () => {
      setupMock({ data: null, error: { message: "Duplicate seat" } });
      const { seating_id, assigned_at, ...payload } = mockAssignment;
      await expect(seatingAssignmentQueries.create(payload)).rejects.toEqual({
        message: "Duplicate seat",
      });
    });
  });

  // ── createMany ─────────────────────────────────────────────────────────────
  describe("createMany()", () => {
    it("creates multiple assignments", async () => {
      setupMock({ data: [mockAssignment], error: null });
      const { seating_id, assigned_at, ...payload } = mockAssignment;
      const result = await seatingAssignmentQueries.createMany([payload]);
      expect(result).toEqual([mockAssignment]);
    });

    it("throws on bulk insert error", async () => {
      setupMock({ data: null, error: { message: "Bulk insert failed" } });
      const { seating_id, assigned_at, ...payload } = mockAssignment;
      await expect(seatingAssignmentQueries.createMany([payload])).rejects.toEqual({
        message: "Bulk insert failed",
      });
    });

    it("handles empty array", async () => {
      setupMock({ data: [], error: null });
      const result = await seatingAssignmentQueries.createMany([]);
      expect(result).toEqual([]);
    });
  });

  // ── update ─────────────────────────────────────────────────────────────────
  describe("update()", () => {
    it("updates and returns modified assignment", async () => {
      const updated = { ...mockAssignment, seat_number: "B2" };
      setupMock({ data: updated, error: null });
      const result = await seatingAssignmentQueries.update(1, { seat_number: "B2" });
      expect(result.seat_number).toBe("B2");
    });

    it("throws on update error", async () => {
      setupMock({ data: null, error: { message: "Update failed" } });
      await expect(seatingAssignmentQueries.update(1, { seat_number: "B2" })).rejects.toEqual({
        message: "Update failed",
      });
    });
  });

  // ── delete ─────────────────────────────────────────────────────────────────
  describe("delete()", () => {
    it("returns true on successful delete", async () => {
      setupMock({ error: null });
      const result = await seatingAssignmentQueries.delete(1);
      expect(result).toBe(true);
    });

    it("throws on delete error", async () => {
      setupMock({ error: { message: "FK constraint" } });
      await expect(seatingAssignmentQueries.delete(1)).rejects.toEqual({ message: "FK constraint" });
    });
  });

  // ── deleteByExamRoomId ─────────────────────────────────────────────────────
  describe("deleteByExamRoomId()", () => {
    it("returns true on successful bulk delete", async () => {
      setupMock({ error: null });
      const result = await seatingAssignmentQueries.deleteByExamRoomId(10);
      expect(result).toBe(true);
    });

    it("throws on delete error", async () => {
      setupMock({ error: { message: "fail" } });
      await expect(seatingAssignmentQueries.deleteByExamRoomId(10)).rejects.toEqual({ message: "fail" });
    });
  });

  // ── isSeatOccupied ─────────────────────────────────────────────────────────
  describe("isSeatOccupied()", () => {
    it("returns true when seat is taken", async () => {
      setupMock({ data: [{ seating_id: 1 }], error: null });
      const result = await seatingAssignmentQueries.isSeatOccupied(10, "A", 1);
      expect(result).toBe(true);
    });

    it("returns false when seat is empty", async () => {
      setupMock({ data: [], error: null });
      const result = await seatingAssignmentQueries.isSeatOccupied(10, "A", 1);
      expect(result).toBe(false);
    });

    it("throws on DB error", async () => {
      setupMock({ data: null, error: { message: "fail" } });
      await expect(seatingAssignmentQueries.isSeatOccupied(10, "A", 1)).rejects.toEqual({ message: "fail" });
    });
  });

  // ── getAssignedCount ───────────────────────────────────────────────────────
  describe("getAssignedCount()", () => {
    it("returns count of assigned seats", async () => {
      setupMock({ count: 25, error: null });
      const result = await seatingAssignmentQueries.getAssignedCount(10);
      expect(result).toBe(25);
    });

    it("returns 0 when count is null", async () => {
      setupMock({ count: null, error: null });
      const result = await seatingAssignmentQueries.getAssignedCount(10);
      expect(result).toBe(0);
    });

    it("throws on DB error", async () => {
      setupMock({ count: null, error: { message: "fail" } });
      await expect(seatingAssignmentQueries.getAssignedCount(10)).rejects.toEqual({ message: "fail" });
    });
  });

  // ── getAssignedCountByGroup ────────────────────────────────────────────────
  describe("getAssignedCountByGroup()", () => {
    it("returns count for group A", async () => {
      setupMock({ count: 15, error: null });
      const result = await seatingAssignmentQueries.getAssignedCountByGroup(10, "A");
      expect(result).toBe(15);
    });

    it("returns count for group B", async () => {
      setupMock({ count: 10, error: null });
      const result = await seatingAssignmentQueries.getAssignedCountByGroup(10, "B");
      expect(result).toBe(10);
    });
  });

  // ── getAvailableSeatsCount ─────────────────────────────────────────────────
  describe("getAvailableSeatsCount()", () => {
    it("returns remaining seats (capacity - assigned)", async () => {
      // Mock getAssignedCount to return 25
      setupMock({ count: 25, error: null });
      const result = await seatingAssignmentQueries.getAvailableSeatsCount(10, 40);
      expect(result).toBe(15); // 40 - 25 = 15
    });

    it("returns full capacity when nothing assigned", async () => {
      setupMock({ count: 0, error: null });
      const result = await seatingAssignmentQueries.getAvailableSeatsCount(10, 30);
      expect(result).toBe(30);
    });

    it("returns 0 when room is completely full", async () => {
      setupMock({ count: 40, error: null });
      const result = await seatingAssignmentQueries.getAvailableSeatsCount(10, 40);
      expect(result).toBe(0);
    });
  });

  // ── getSeatingMap ──────────────────────────────────────────────────────────
  describe("getSeatingMap()", () => {
    it("returns seating map data", async () => {
      const mapData = [{ row_label: "A", column_number: 1, seat_number: "A1", student_group: "A", student: { student_number: "STU001", name: "Alice" } }];
      setupMock({ data: mapData, error: null });
      const result = await seatingAssignmentQueries.getSeatingMap(10);
      expect(result).toEqual(mapData);
    });

    it("throws on DB error", async () => {
      setupMock({ data: null, error: { message: "fail" } });
      await expect(seatingAssignmentQueries.getSeatingMap(10)).rejects.toEqual({ message: "fail" });
    });
  });
});
