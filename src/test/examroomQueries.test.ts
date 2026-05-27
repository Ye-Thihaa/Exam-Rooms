// ============================================================
// Unit Tests — examroomQueries.ts
// Covers: saveExamRoomAssignments, updateExamRoomAssignment,
//         deleteExamRoomAssignments, getAllExamRoomAssignments,
//         isRoomAssigned, getExamRoomsWithDetails,
//         getAllWithDetails, getExamRoomById, getRoomsByDate
//         + examRoomQueries facade object
// ============================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Supabase ────────────────────────────────────────────────────────────
const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));

vi.mock("@/utils/supabase", () => ({
  default: { from: fromMock },
}));

import {
  saveExamRoomAssignments,
  updateExamRoomAssignment,
  deleteExamRoomAssignments,
  getAllExamRoomAssignments,
  isRoomAssigned,
  getExamRoomsWithDetails,
  getAllWithDetails,
  getExamRoomById,
  getRoomsByDate,
  examRoomQueries,
} from "@/services/examroomQueries";
import type { ExamRoomInsert, ExamRoom } from "@/services/examroomQueries";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ROOM_FIXTURE = {
  room_id: 5,
  room_number: "101",
  capacity: 40,
  rows: 5,
  cols: 8,
};

const EXAM_ROOM_FIXTURE: ExamRoom = {
  exam_room_id: 10,
  room_id: 5,
  assigned_capacity: 30,
  year_level_primary: "2",
  sem_primary: "1",
  program_primary: "CS",
  specialization_primary: "",
  students_primary: 20,
  year_level_secondary: undefined,
  sem_secondary: undefined,
  program_secondary: undefined,
  specialization_secondary: undefined,
  students_secondary: 0,
};

const INSERT_FIXTURE: ExamRoomInsert = {
  room_id: 5,
  assigned_capacity: 30,
  year_level_primary: "2",
  sem_primary: "1",
  program_primary: "CS",
  specialization_primary: "",
  students_primary: 20,
};

// ─── Chain builder ────────────────────────────────────────────────────────────

function makeChain(resolved: { data?: any; error?: any }) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn(() => Promise.resolve(resolved)),
    then: (resolve: any) => Promise.resolve(resolved).then(resolve),
  };
  return chain;
}

// ─────────────────────────────────────────────────────────────────────────────
// saveExamRoomAssignments
// ─────────────────────────────────────────────────────────────────────────────

describe("saveExamRoomAssignments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns success:true with data on successful insert", async () => {
    fromMock.mockReturnValue(makeChain({ data: [EXAM_ROOM_FIXTURE], error: null }));
    const result = await saveExamRoomAssignments([INSERT_FIXTURE]);
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
  });

  it("inserts into the exam_room table", async () => {
    fromMock.mockReturnValue(makeChain({ data: [], error: null }));
    await saveExamRoomAssignments([INSERT_FIXTURE]);
    expect(fromMock).toHaveBeenCalledWith("exam_room");
  });

  it("handles multiple room assignments", async () => {
    const two = [INSERT_FIXTURE, { ...INSERT_FIXTURE, room_id: 6 }];
    fromMock.mockReturnValue(makeChain({ data: two, error: null }));
    const result = await saveExamRoomAssignments(two);
    expect(result.success).toBe(true);
  });

  it("returns success:false on Supabase error", async () => {
    fromMock.mockReturnValue(makeChain({ data: null, error: new Error("insert failed") }));
    const result = await saveExamRoomAssignments([INSERT_FIXTURE]);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("returns success:false on thrown exception", async () => {
    fromMock.mockImplementation(() => { throw new Error("crash"); });
    const result = await saveExamRoomAssignments([INSERT_FIXTURE]);
    expect(result.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// updateExamRoomAssignment
// ─────────────────────────────────────────────────────────────────────────────

describe("updateExamRoomAssignment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns success:true with updated data", async () => {
    const updated = { ...EXAM_ROOM_FIXTURE, students_primary: 25 };
    fromMock.mockReturnValue(makeChain({ data: [updated], error: null }));
    const result = await updateExamRoomAssignment(10, { students_primary: 25 });
    expect(result.success).toBe(true);
    expect(result.data[0].students_primary).toBe(25);
  });

  it("filters by exam_room_id", async () => {
    const chain = makeChain({ data: [], error: null });
    fromMock.mockReturnValue(chain);
    await updateExamRoomAssignment(42, { students_primary: 10 });
    expect(chain.eq).toHaveBeenCalledWith("exam_room_id", 42);
  });

  it("returns success:false on Supabase error", async () => {
    fromMock.mockReturnValue(makeChain({ data: null, error: new Error("update failed") }));
    const result = await updateExamRoomAssignment(10, { students_primary: 5 });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("returns success:false on thrown exception", async () => {
    fromMock.mockImplementation(() => { throw new Error("crash"); });
    const result = await updateExamRoomAssignment(10, {});
    expect(result.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// deleteExamRoomAssignments
// ─────────────────────────────────────────────────────────────────────────────

describe("deleteExamRoomAssignments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns success:true on successful delete", async () => {
    fromMock.mockReturnValue(makeChain({ data: null, error: null }));
    const result = await deleteExamRoomAssignments();
    expect(result.success).toBe(true);
  });

  it("uses neq(exam_room_id, 0) to delete all rows", async () => {
    const chain = makeChain({ data: null, error: null });
    fromMock.mockReturnValue(chain);
    await deleteExamRoomAssignments();
    expect(chain.neq).toHaveBeenCalledWith("exam_room_id", 0);
  });

  it("returns success:false on Supabase error", async () => {
    fromMock.mockReturnValue(makeChain({ data: null, error: new Error("delete failed") }));
    const result = await deleteExamRoomAssignments();
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("returns success:false on thrown exception", async () => {
    fromMock.mockImplementation(() => { throw new Error("crash"); });
    const result = await deleteExamRoomAssignments();
    expect(result.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getAllExamRoomAssignments
// ─────────────────────────────────────────────────────────────────────────────

describe("getAllExamRoomAssignments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns all exam rooms on success", async () => {
    fromMock.mockReturnValue(makeChain({ data: [EXAM_ROOM_FIXTURE], error: null }));
    const result = await getAllExamRoomAssignments();
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
  });

  it("returns empty array when no rooms exist", async () => {
    fromMock.mockReturnValue(makeChain({ data: [], error: null }));
    const result = await getAllExamRoomAssignments();
    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });

  it("returns success:false on error", async () => {
    fromMock.mockReturnValue(makeChain({ data: null, error: new Error("fetch failed") }));
    const result = await getAllExamRoomAssignments();
    expect(result.success).toBe(false);
  });

  it("returns success:false on thrown exception", async () => {
    fromMock.mockImplementation(() => { throw new Error("crash"); });
    const result = await getAllExamRoomAssignments();
    expect(result.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isRoomAssigned
// ─────────────────────────────────────────────────────────────────────────────

describe("isRoomAssigned", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns isAssigned:true when a row is found", async () => {
    fromMock.mockReturnValue(makeChain({ data: { exam_room_id: 10 }, error: null }));
    const result = await isRoomAssigned(5);
    expect(result.success).toBe(true);
    expect(result.isAssigned).toBe(true);
  });

  it("returns isAssigned:false when no row found (PGRST116 not-found code)", async () => {
    fromMock.mockReturnValue(
      makeChain({ data: null, error: { code: "PGRST116", message: "not found" } }),
    );
    const result = await isRoomAssigned(5);
    expect(result.success).toBe(true);
    expect(result.isAssigned).toBe(false);
  });

  it("returns success:false for non-PGRST116 errors", async () => {
    fromMock.mockReturnValue(
      makeChain({ data: null, error: { code: "500", message: "server error" } }),
    );
    const result = await isRoomAssigned(5);
    expect(result.success).toBe(false);
  });

  it("filters by the correct room_id", async () => {
    const chain = makeChain({ data: { exam_room_id: 10 }, error: null });
    fromMock.mockReturnValue(chain);
    await isRoomAssigned(7);
    expect(chain.eq).toHaveBeenCalledWith("room_id", 7);
  });

  it("returns success:false on thrown exception", async () => {
    fromMock.mockImplementation(() => { throw new Error("crash"); });
    const result = await isRoomAssigned(5);
    expect(result.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getAllWithDetails
// ─────────────────────────────────────────────────────────────────────────────

describe("getAllWithDetails", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns exam rooms with nested room details", async () => {
    const withDetails = { ...EXAM_ROOM_FIXTURE, room: ROOM_FIXTURE };
    fromMock.mockReturnValue(makeChain({ data: [withDetails], error: null }));
    const result = await getAllWithDetails();
    expect(result.success).toBe(true);
    expect(result.data![0].room?.room_number).toBe("101");
  });

  it("returns empty array when no rooms exist", async () => {
    fromMock.mockReturnValue(makeChain({ data: [], error: null }));
    const result = await getAllWithDetails();
    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });

  it("returns success:false on Supabase error", async () => {
    fromMock.mockReturnValue(makeChain({ data: null, error: new Error("fetch failed") }));
    const result = await getAllWithDetails();
    expect(result.success).toBe(false);
  });

  it("returns success:false on thrown exception", async () => {
    fromMock.mockImplementation(() => { throw new Error("crash"); });
    const result = await getAllWithDetails();
    expect(result.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getExamRoomById
// ─────────────────────────────────────────────────────────────────────────────

describe("getExamRoomById", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the exam room with room details on success", async () => {
    const withDetails = { ...EXAM_ROOM_FIXTURE, room: ROOM_FIXTURE };
    fromMock.mockReturnValue(makeChain({ data: withDetails, error: null }));
    const result = await getExamRoomById(10);
    expect(result.success).toBe(true);
    expect(result.data?.exam_room_id).toBe(10);
    expect(result.data?.room?.capacity).toBe(40);
  });

  it("filters by the correct exam_room_id", async () => {
    const chain = makeChain({ data: { ...EXAM_ROOM_FIXTURE, room: ROOM_FIXTURE }, error: null });
    fromMock.mockReturnValue(chain);
    await getExamRoomById(42);
    expect(chain.eq).toHaveBeenCalledWith("exam_room_id", 42);
  });

  it("returns success:false when room not found", async () => {
    fromMock.mockReturnValue(makeChain({ data: null, error: new Error("not found") }));
    const result = await getExamRoomById(999);
    expect(result.success).toBe(false);
    expect(result.data).toBeUndefined();
  });

  it("returns success:false on thrown exception", async () => {
    fromMock.mockImplementation(() => { throw new Error("crash"); });
    const result = await getExamRoomById(1);
    expect(result.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getExamRoomsWithDetails
// ─────────────────────────────────────────────────────────────────────────────

describe("getExamRoomsWithDetails", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty array when no exam rooms exist", async () => {
    fromMock.mockReturnValue(makeChain({ data: [], error: null }));
    const result = await getExamRoomsWithDetails();
    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });

  it("fetches room details for each exam room via separate query", async () => {
    fromMock
      .mockReturnValueOnce(makeChain({ data: [EXAM_ROOM_FIXTURE], error: null }))
      .mockReturnValueOnce(makeChain({ data: ROOM_FIXTURE, error: null }));

    const result = await getExamRoomsWithDetails();
    expect(result.success).toBe(true);
    expect(result.data![0].room).toEqual(ROOM_FIXTURE);
  });

  it("still returns the exam room even if the room detail fetch fails (soft error)", async () => {
    fromMock
      .mockReturnValueOnce(makeChain({ data: [EXAM_ROOM_FIXTURE], error: null }))
      .mockReturnValueOnce(makeChain({ data: null, error: new Error("room not found") }));

    const result = await getExamRoomsWithDetails();
    expect(result.success).toBe(true);
    expect(result.data![0].room).toBeNull();
  });

  it("returns success:false when initial exam_room fetch fails", async () => {
    fromMock.mockReturnValue(makeChain({ data: null, error: new Error("fetch failed") }));
    const result = await getExamRoomsWithDetails();
    expect(result.success).toBe(false);
  });

  it("returns success:false on thrown exception", async () => {
    fromMock.mockImplementation(() => { throw new Error("crash"); });
    const result = await getExamRoomsWithDetails();
    expect(result.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getRoomsByDate
// ─────────────────────────────────────────────────────────────────────────────

describe("getRoomsByDate", () => {
  beforeEach(() => vi.clearAllMocks());

  const EXAM_ON_DATE = {
    exam_id: 100,
    exam_date: "2024-06-01",
    year_level: "2",
    semester: "1",
    program: "CS",
    specialization: "",
  };

  it("returns empty rooms array when no exams on the date", async () => {
    fromMock.mockReturnValueOnce(makeChain({ data: [], error: null }));
    const result = await getRoomsByDate("2024-06-01");
    expect(result.success).toBe(true);
    expect(result.data!["2024-06-01"]).toEqual([]);
  });

  it("returns matching rooms when primary group matches an exam", async () => {
    const examRoom = {
      ...EXAM_ROOM_FIXTURE,
      room: ROOM_FIXTURE,
      year_level_primary: "2",
      sem_primary: "1",
      program_primary: "CS",
      specialization_primary: "",
    };
    fromMock
      .mockReturnValueOnce(makeChain({ data: [EXAM_ON_DATE], error: null }))
      .mockReturnValueOnce(makeChain({ data: [examRoom], error: null }));

    const result = await getRoomsByDate("2024-06-01");
    expect(result.success).toBe(true);
    expect(result.data!["2024-06-01"]).toHaveLength(1);
    expect(result.data!["2024-06-01"][0].exam_room_id).toBe(10);
  });

  it("returns matching rooms when secondary group matches an exam", async () => {
    const examRoom = {
      ...EXAM_ROOM_FIXTURE,
      room: ROOM_FIXTURE,
      year_level_primary: "3",
      sem_primary: "2",
      program_primary: "CT",
      specialization_primary: "",
      year_level_secondary: "2",
      sem_secondary: "1",
      program_secondary: "CS",
      specialization_secondary: "",
    };
    fromMock
      .mockReturnValueOnce(makeChain({ data: [EXAM_ON_DATE], error: null }))
      .mockReturnValueOnce(makeChain({ data: [examRoom], error: null }));

    const result = await getRoomsByDate("2024-06-01");
    expect(result.data!["2024-06-01"]).toHaveLength(1);
  });

  it("excludes rooms whose groups do not match any exam on the date", async () => {
    const nonMatchingRoom = {
      ...EXAM_ROOM_FIXTURE,
      room: ROOM_FIXTURE,
      year_level_primary: "4",
      sem_primary: "2",
      program_primary: "CT",
      specialization_primary: "",
    };
    fromMock
      .mockReturnValueOnce(makeChain({ data: [EXAM_ON_DATE], error: null }))
      .mockReturnValueOnce(makeChain({ data: [nonMatchingRoom], error: null }));

    const result = await getRoomsByDate("2024-06-01");
    expect(result.data!["2024-06-01"]).toHaveLength(0);
  });

  it("uses the exam date as the key in the result object", async () => {
    fromMock
      .mockReturnValueOnce(makeChain({ data: [EXAM_ON_DATE], error: null }))
      .mockReturnValueOnce(makeChain({ data: [], error: null }));

    const result = await getRoomsByDate("2024-06-01");
    expect(Object.keys(result.data!)).toContain("2024-06-01");
  });

  it("returns success:false when exam fetch fails", async () => {
    fromMock.mockReturnValueOnce(makeChain({ data: null, error: new Error("exam fetch failed") }));
    const result = await getRoomsByDate("2024-06-01");
    expect(result.success).toBe(false);
  });

  it("returns success:false when exam_room fetch fails", async () => {
    fromMock
      .mockReturnValueOnce(makeChain({ data: [EXAM_ON_DATE], error: null }))
      .mockReturnValueOnce(makeChain({ data: null, error: new Error("room fetch failed") }));
    const result = await getRoomsByDate("2024-06-01");
    expect(result.success).toBe(false);
  });

  it("returns success:false on thrown exception", async () => {
    fromMock.mockImplementation(() => { throw new Error("crash"); });
    const result = await getRoomsByDate("2024-06-01");
    expect(result.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// examRoomQueries facade object
// ─────────────────────────────────────────────────────────────────────────────

describe("examRoomQueries facade", () => {
  it("exposes getAllWithDetails", () => expect(examRoomQueries.getAllWithDetails).toBeTypeOf("function"));
  it("exposes getExamRoomById", () => expect(examRoomQueries.getExamRoomById).toBeTypeOf("function"));
  it("exposes getRoomsByDate", () => expect(examRoomQueries.getRoomsByDate).toBeTypeOf("function"));
  it("exposes getAll", () => expect(examRoomQueries.getAll).toBeTypeOf("function"));
  it("exposes create", () => expect(examRoomQueries.create).toBeTypeOf("function"));
  it("exposes update", () => expect(examRoomQueries.update).toBeTypeOf("function"));
  it("exposes delete", () => expect(examRoomQueries.delete).toBeTypeOf("function"));
  it("exposes isRoomAssigned", () => expect(examRoomQueries.isRoomAssigned).toBeTypeOf("function"));
  it("exposes getWithDetails", () => expect(examRoomQueries.getWithDetails).toBeTypeOf("function"));

  it("getAll points to getAllExamRoomAssignments", () => {
    expect(examRoomQueries.getAll).toBe(getAllExamRoomAssignments);
  });
  it("create points to saveExamRoomAssignments", () => {
    expect(examRoomQueries.create).toBe(saveExamRoomAssignments);
  });
  it("update points to updateExamRoomAssignment", () => {
    expect(examRoomQueries.update).toBe(updateExamRoomAssignment);
  });
  it("delete points to deleteExamRoomAssignments", () => {
    expect(examRoomQueries.delete).toBe(deleteExamRoomAssignments);
  });
});