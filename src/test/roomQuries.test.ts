import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getAllRooms,
  getAvailableRooms,
  getUnavailableRooms,
  getRoomById,
  getRoomsByType,
  getRoomsWithAssignmentStatus,
  setRoomAvailability,
  createRoom,
  updateRoom,
  deleteRoom,
  getAvailableRoomCount,
  getTotalRoomCount,
  getRoomStatistics,
  Room,
} from "@/services/Roomqueries";

vi.mock("@/utils/supabase", () => {
  const makeChain = (resolved: any) => {
    const chain: any = {};
    ["select","insert","update","delete","eq","in","order","limit","single"].forEach(
      (m) => { chain[m] = vi.fn(() => chain); }
    );
    chain.then = (res: any, rej: any) => Promise.resolve(resolved).then(res, rej);
    return chain;
  };
  return { default: { from: vi.fn(() => makeChain({ data: [], error: null })) } };
});

import supabase from "@/utils/supabase";

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const mockRoom: Room = {
  room_id: 1,
  room_number: "101",
  capacity: 40,
  room_type: "Lecture Hall",
  is_available: true,
  rows: 5,
  cols: 8,
};

const mockUnavailableRoom: Room = { ...mockRoom, room_id: 2, room_number: "102", is_available: false };

function makeChain(resolved: any) {
  const chain: any = {};
  ["select","insert","update","delete","eq","in","order","limit"].forEach(
    (m) => { chain[m] = vi.fn(() => chain); }
  );
  chain.single = vi.fn(() => Promise.resolve(resolved));
  chain.then = (res: any, rej: any) => Promise.resolve(resolved).then(res, rej);
  return chain;
}

const setupMock = (resolved: any) => {
  const chain = makeChain(resolved);
  vi.mocked(supabase.from).mockReturnValue(chain as any);
  return chain;
};

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("roomQuries", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── getAllRooms ─────────────────────────────────────────────────────────────
  describe("getAllRooms()", () => {
    it("returns all rooms", async () => {
      setupMock({ data: [mockRoom, mockUnavailableRoom], error: null });
      const result = await getAllRooms();
      expect(result).toHaveLength(2);
    });
    it("returns empty array when no rooms", async () => {
      setupMock({ data: [], error: null });
      expect(await getAllRooms()).toEqual([]);
    });
    it("returns empty array on DB error (does not throw)", async () => {
      setupMock({ data: null, error: { message: "fail" } });
      expect(await getAllRooms()).toEqual([]);
    });
    it("returns empty array on exception", async () => {
      vi.mocked(supabase.from).mockImplementation(() => { throw new Error("crash"); });
      expect(await getAllRooms()).toEqual([]);
    });
  });

  // ── getAvailableRooms ───────────────────────────────────────────────────────
  describe("getAvailableRooms()", () => {
    it("returns only available rooms", async () => {
      setupMock({ data: [mockRoom], error: null });
      const result = await getAvailableRooms();
      expect(result).toHaveLength(1);
      expect(result[0].is_available).toBe(true);
    });
    it("returns empty array when all rooms unavailable", async () => {
      setupMock({ data: [], error: null });
      expect(await getAvailableRooms()).toEqual([]);
    });
    it("returns empty array on DB error", async () => {
      setupMock({ data: null, error: { message: "fail" } });
      expect(await getAvailableRooms()).toEqual([]);
    });
    it("returns empty array on exception", async () => {
      vi.mocked(supabase.from).mockImplementation(() => { throw new Error("crash"); });
      expect(await getAvailableRooms()).toEqual([]);
    });
  });

  // ── getUnavailableRooms ─────────────────────────────────────────────────────
  describe("getUnavailableRooms()", () => {
    it("returns only unavailable rooms", async () => {
      setupMock({ data: [mockUnavailableRoom], error: null });
      const result = await getUnavailableRooms();
      expect(result[0].is_available).toBe(false);
    });
    it("returns empty array when all rooms available", async () => {
      setupMock({ data: [], error: null });
      expect(await getUnavailableRooms()).toEqual([]);
    });
    it("returns empty array on DB error", async () => {
      setupMock({ data: null, error: { message: "fail" } });
      expect(await getUnavailableRooms()).toEqual([]);
    });
    it("returns empty array on exception", async () => {
      vi.mocked(supabase.from).mockImplementation(() => { throw new Error("crash"); });
      expect(await getUnavailableRooms()).toEqual([]);
    });
  });

  // ── getRoomById ─────────────────────────────────────────────────────────────
  describe("getRoomById()", () => {
    it("returns a room by ID", async () => {
      setupMock({ data: mockRoom, error: null });
      const result = await getRoomById(1);
      expect(result?.room_number).toBe("101");
    });
    it("returns null on DB error", async () => {
      setupMock({ data: null, error: { message: "Not found" } });
      expect(await getRoomById(999)).toBeNull();
    });
    it("returns null on exception", async () => {
      vi.mocked(supabase.from).mockImplementation(() => { throw new Error("crash"); });
      expect(await getRoomById(1)).toBeNull();
    });
  });

  // ── getRoomsByType ──────────────────────────────────────────────────────────
  describe("getRoomsByType()", () => {
    it("returns rooms of given type", async () => {
      setupMock({ data: [mockRoom], error: null });
      const result = await getRoomsByType("Lecture Hall");
      expect(result[0].room_type).toBe("Lecture Hall");
    });
    it("returns empty array when no match", async () => {
      setupMock({ data: [], error: null });
      expect(await getRoomsByType("Lab")).toEqual([]);
    });
    it("returns empty array on DB error", async () => {
      setupMock({ data: null, error: { message: "fail" } });
      expect(await getRoomsByType("Lab")).toEqual([]);
    });
    it("returns empty array on exception", async () => {
      vi.mocked(supabase.from).mockImplementation(() => { throw new Error("crash"); });
      expect(await getRoomsByType("Lab")).toEqual([]);
    });
  });

  // ── getRoomsWithAssignmentStatus ────────────────────────────────────────────
  describe("getRoomsWithAssignmentStatus()", () => {
    it("returns rooms with assignment info", async () => {
      const withStatus = { ...mockRoom, exam_room: [{ exam_room_id: 1, exam_id: 1, assigned_capacity: 30 }] };
      setupMock({ data: [withStatus], error: null });
      const result = await getRoomsWithAssignmentStatus();
      expect(result[0].exam_room).toBeDefined();
    });
    it("returns empty array on DB error", async () => {
      setupMock({ data: null, error: { message: "fail" } });
      expect(await getRoomsWithAssignmentStatus()).toEqual([]);
    });
    it("returns empty array on exception", async () => {
      vi.mocked(supabase.from).mockImplementation(() => { throw new Error("crash"); });
      expect(await getRoomsWithAssignmentStatus()).toEqual([]);
    });
  });

  // ── setRoomAvailability ─────────────────────────────────────────────────────
  describe("setRoomAvailability()", () => {
    it("returns success: true when update succeeds", async () => {
      setupMock({ error: null });
      expect((await setRoomAvailability(1, true)).success).toBe(true);
    });
    it("returns success: true when setting to false", async () => {
      setupMock({ error: null });
      expect((await setRoomAvailability(1, false)).success).toBe(true);
    });
    it("returns success: false on DB error", async () => {
      setupMock({ error: { message: "fail" } });
      expect((await setRoomAvailability(1, true)).success).toBe(false);
    });
    it("returns success: false on exception", async () => {
      vi.mocked(supabase.from).mockImplementation(() => { throw new Error("crash"); });
      expect((await setRoomAvailability(1, true)).success).toBe(false);
    });
  });

  // ── createRoom ──────────────────────────────────────────────────────────────
  describe("createRoom()", () => {
    it("creates and returns new room", async () => {
      setupMock({ data: mockRoom, error: null });
      const { room_id, ...newRoom } = mockRoom;
      const result = await createRoom(newRoom);
      expect(result.success).toBe(true);
      expect(result.data?.room_number).toBe("101");
    });
    it("includes optional fields (rows, cols) when provided", async () => {
      setupMock({ data: mockRoom, error: null });
      const { room_id, ...newRoom } = mockRoom;
      const result = await createRoom({ ...newRoom, rows: 5, cols: 8 });
      expect(result.success).toBe(true);
    });
    it("excludes empty room_type from insert", async () => {
      setupMock({ data: { ...mockRoom, room_type: undefined }, error: null });
      const { room_id, room_type, ...newRoom } = mockRoom;
      const result = await createRoom({ ...newRoom, room_type: "" });
      expect(result.success).toBe(true);
    });
    it("returns success: false on DB error", async () => {
      setupMock({ data: null, error: { message: "Duplicate room_number" } });
      const { room_id, ...newRoom } = mockRoom;
      const result = await createRoom(newRoom);
      expect(result.success).toBe(false);
    });
    it("returns success: false on exception", async () => {
      vi.mocked(supabase.from).mockImplementation(() => { throw new Error("crash"); });
      const { room_id, ...newRoom } = mockRoom;
      expect((await createRoom(newRoom)).success).toBe(false);
    });
  });

  // ── updateRoom ──────────────────────────────────────────────────────────────
  describe("updateRoom()", () => {
    it("updates and returns modified room", async () => {
      const updated = { ...mockRoom, capacity: 50 };
      setupMock({ data: updated, error: null });
      const result = await updateRoom(1, { capacity: 50 });
      expect(result.success).toBe(true);
      expect(result.data?.capacity).toBe(50);
    });
    it("ignores room_id in updates (prevents ID modification)", async () => {
      setupMock({ data: mockRoom, error: null });
      const result = await updateRoom(1, { room_id: 999, capacity: 40 } as any);
      expect(result.success).toBe(true);
    });
    it("returns success: false on DB error", async () => {
      setupMock({ data: null, error: { message: "fail" } });
      expect((await updateRoom(1, { capacity: 50 })).success).toBe(false);
    });
    it("returns success: false on exception", async () => {
      vi.mocked(supabase.from).mockImplementation(() => { throw new Error("crash"); });
      expect((await updateRoom(1, {})).success).toBe(false);
    });
  });

  // ── deleteRoom ──────────────────────────────────────────────────────────────
  describe("deleteRoom()", () => {
    it("returns success: true on successful delete", async () => {
      setupMock({ error: null });
      expect((await deleteRoom(1)).success).toBe(true);
    });
    it("returns success: false when room has FK constraint (assigned)", async () => {
      setupMock({ error: { message: "FK constraint violation" } });
      const result = await deleteRoom(1);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
    it("returns success: false on exception", async () => {
      vi.mocked(supabase.from).mockImplementation(() => { throw new Error("crash"); });
      expect((await deleteRoom(1)).success).toBe(false);
    });
  });

  // ── getAvailableRoomCount ───────────────────────────────────────────────────
  describe("getAvailableRoomCount()", () => {
    it("returns count of available rooms", async () => {
      setupMock({ count: 5, error: null });
      expect(await getAvailableRoomCount()).toBe(5);
    });
    it("returns 0 when count is null", async () => {
      setupMock({ count: null, error: null });
      expect(await getAvailableRoomCount()).toBe(0);
    });
    it("returns 0 on DB error", async () => {
      setupMock({ count: null, error: { message: "fail" } });
      expect(await getAvailableRoomCount()).toBe(0);
    });
    it("returns 0 on exception", async () => {
      vi.mocked(supabase.from).mockImplementation(() => { throw new Error("crash"); });
      expect(await getAvailableRoomCount()).toBe(0);
    });
  });

  // ── getTotalRoomCount ───────────────────────────────────────────────────────
  describe("getTotalRoomCount()", () => {
    it("returns total number of rooms", async () => {
      setupMock({ count: 10, error: null });
      expect(await getTotalRoomCount()).toBe(10);
    });
    it("returns 0 when count is null", async () => {
      setupMock({ count: null, error: null });
      expect(await getTotalRoomCount()).toBe(0);
    });
    it("returns 0 on DB error", async () => {
      setupMock({ count: null, error: { message: "fail" } });
      expect(await getTotalRoomCount()).toBe(0);
    });
    it("returns 0 on exception", async () => {
      vi.mocked(supabase.from).mockImplementation(() => { throw new Error("crash"); });
      expect(await getTotalRoomCount()).toBe(0);
    });
  });

  // ── getRoomStatistics ───────────────────────────────────────────────────────
  describe("getRoomStatistics()", () => {
    it("calculates total, available, unavailable, and capacity correctly", async () => {
      setupMock({
        data: [
          { is_available: true, capacity: 40 },
          { is_available: true, capacity: 30 },
          { is_available: false, capacity: 50 },
        ],
        error: null,
      });
      const result = await getRoomStatistics();
      expect(result.total).toBe(3);
      expect(result.available).toBe(2);
      expect(result.unavailable).toBe(1);
      expect(result.totalCapacity).toBe(120);
      expect(result.availableCapacity).toBe(70);
    });
    it("returns all zeros when no rooms", async () => {
      setupMock({ data: [], error: null });
      const result = await getRoomStatistics();
      expect(result.total).toBe(0);
      expect(result.available).toBe(0);
      expect(result.totalCapacity).toBe(0);
    });
    it("returns all zeros on DB error", async () => {
      setupMock({ data: null, error: { message: "fail" } });
      const result = await getRoomStatistics();
      expect(result.total).toBe(0);
      expect(result.totalCapacity).toBe(0);
    });
    it("returns all zeros on exception", async () => {
      vi.mocked(supabase.from).mockImplementation(() => { throw new Error("crash"); });
      const result = await getRoomStatistics();
      expect(result.total).toBe(0);
    });
  });
});
