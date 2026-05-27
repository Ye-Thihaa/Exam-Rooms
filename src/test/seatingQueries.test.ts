// ============================================================
// Unit Tests — seatingQueries.ts
// ============================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Supabase ────────────────────────────────────────────────────────────
// vi.mock is hoisted to the top of the file, so fromMock must be declared
// with vi.hoisted() to be accessible inside the factory.
const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));

vi.mock("@/utils/supabase", () => ({
  default: { from: fromMock },
}));

import {
  getUnassignedStudentsByGroup,
  saveSeatingAssignments,
  getSeatingAssignmentsByExamRoom,
  getSeatingAssignmentsByGroup,
  clearSeatingAssignments,
  checkExistingSeatingAssignments,
  getAssignedCountByGroup,
} from "@/services/seatingQueries";
import type { SeatingAssignmentInput } from "@/services/seatingQueries";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const STUDENT_FIXTURE = {
  student_id: 1,
  student_number: "2021-00001",
  name: "Juan dela Cruz",
  year_level: 2,
  sem: 1,
  major: "Computer Science",
  specialization: null,
  is_assigned: false,
};

const SEATING_FIXTURE = {
  seating_id: 1,
  exam_room_id: 10,
  student_id: 1,
  seat_number: "A1",
  row_label: "A",
  column_number: 1,
  student_group: "A" as const,
  assigned_at: "2024-01-01T00:00:00Z",
  student: STUDENT_FIXTURE,
};

const ASSIGNMENT_INPUT: SeatingAssignmentInput = {
  exam_room_id: 10,
  student_id: 1,
  seat_number: "A1",
  row_label: "A",
  column_number: 1,
  student_group: "A",
};

// ─── Chain builder ────────────────────────────────────────────────────────────

function makeChain(resolved: { data?: any; error?: any; count?: any }) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: (resolve: any) => Promise.resolve(resolved).then(resolve),
  };
  return chain;
}

// ─────────────────────────────────────────────────────────────────────────────
// getUnassignedStudentsByGroup
// ─────────────────────────────────────────────────────────────────────────────

describe("getUnassignedStudentsByGroup", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns matching students on success", async () => {
    fromMock.mockReturnValue(makeChain({ data: [STUDENT_FIXTURE], error: null }));
    const result = await getUnassignedStudentsByGroup(2, 1, "CS");
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe("Juan dela Cruz");
  });

  it("maps CST → Computer Science and Technology", async () => {
    const chain = makeChain({ data: [], error: null });
    fromMock.mockReturnValue(chain);
    await getUnassignedStudentsByGroup(2, 1, "CST");
    const eqCalls: any[][] = chain.eq.mock.calls;
    const majorCall = eqCalls.find((c) => c[0] === "major");
    expect(majorCall?.[1]).toBe("Computer Science and Technology");
  });

  it("maps CS → Computer Science", async () => {
    const chain = makeChain({ data: [], error: null });
    fromMock.mockReturnValue(chain);
    await getUnassignedStudentsByGroup(2, 1, "CS");
    const eqCalls: any[][] = chain.eq.mock.calls;
    const majorCall = eqCalls.find((c) => c[0] === "major");
    expect(majorCall?.[1]).toBe("Computer Science");
  });

  it("maps CT → Computer Technology", async () => {
    const chain = makeChain({ data: [], error: null });
    fromMock.mockReturnValue(chain);
    await getUnassignedStudentsByGroup(2, 1, "CT");
    const eqCalls: any[][] = chain.eq.mock.calls;
    const majorCall = eqCalls.find((c) => c[0] === "major");
    expect(majorCall?.[1]).toBe("Computer Technology");
  });

  it("uses unknown program code as-is", async () => {
    const chain = makeChain({ data: [], error: null });
    fromMock.mockReturnValue(chain);
    await getUnassignedStudentsByGroup(2, 1, "UNKNOWN");
    const eqCalls: any[][] = chain.eq.mock.calls;
    const majorCall = eqCalls.find((c) => c[0] === "major");
    expect(majorCall?.[1]).toBe("UNKNOWN");
  });

  it("applies specialization filter when provided", async () => {
    const chain = makeChain({ data: [], error: null });
    fromMock.mockReturnValue(chain);
    await getUnassignedStudentsByGroup(2, 1, "CS", "Network");
    const eqCalls: any[][] = chain.eq.mock.calls;
    const specCall = eqCalls.find((c) => c[0] === "specialization");
    expect(specCall?.[1]).toBe("Network");
  });

  it("does not apply specialization filter when not provided", async () => {
    const chain = makeChain({ data: [], error: null });
    fromMock.mockReturnValue(chain);
    await getUnassignedStudentsByGroup(2, 1, "CS");
    const eqCalls: any[][] = chain.eq.mock.calls;
    const specCall = eqCalls.find((c) => c[0] === "specialization");
    expect(specCall).toBeUndefined();
  });

  it("applies limit when provided", async () => {
    const chain = makeChain({ data: [], error: null });
    fromMock.mockReturnValue(chain);
    await getUnassignedStudentsByGroup(2, 1, "CS", undefined, 15);
    expect(chain.limit).toHaveBeenCalledWith(15);
  });

  it("does not call limit when not provided", async () => {
    const chain = makeChain({ data: [], error: null });
    fromMock.mockReturnValue(chain);
    await getUnassignedStudentsByGroup(2, 1, "CS");
    expect(chain.limit).not.toHaveBeenCalled();
  });

  it("returns success:false and empty data on Supabase error", async () => {
    fromMock.mockReturnValue(makeChain({ data: null, error: new Error("query failed") }));
    const result = await getUnassignedStudentsByGroup(2, 1, "CS");
    expect(result.success).toBe(false);
    expect(result.data).toEqual([]);
    expect(result.error).toBeDefined();
  });

  it("returns empty array (not null) when data is null", async () => {
    fromMock.mockReturnValue(makeChain({ data: null, error: null }));
    const result = await getUnassignedStudentsByGroup(2, 1, "CS");
    expect(result.data).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// saveSeatingAssignments
// ─────────────────────────────────────────────────────────────────────────────

describe("saveSeatingAssignments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("inserts assignments and returns success with data", async () => {
    fromMock.mockReturnValue(makeChain({ data: [SEATING_FIXTURE], error: null }));
    const result = await saveSeatingAssignments([ASSIGNMENT_INPUT]);
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
  });

  it("works with multiple assignments", async () => {
    const twoAssignments = [ASSIGNMENT_INPUT, { ...ASSIGNMENT_INPUT, student_id: 2, seat_number: "A2" }];
    fromMock.mockReturnValue(makeChain({ data: twoAssignments, error: null }));
    const result = await saveSeatingAssignments(twoAssignments);
    expect(result.success).toBe(true);
  });

  it("accepts group B student_group", async () => {
    const input: SeatingAssignmentInput = { ...ASSIGNMENT_INPUT, student_group: "B" };
    fromMock.mockReturnValue(makeChain({ data: [input], error: null }));
    const result = await saveSeatingAssignments([input]);
    expect(result.success).toBe(true);
  });

  it("returns success:false on insert error", async () => {
    fromMock.mockReturnValue(makeChain({ data: null, error: new Error("insert error") }));
    const result = await saveSeatingAssignments([ASSIGNMENT_INPUT]);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("returns success:false on thrown exception", async () => {
    fromMock.mockImplementation(() => { throw new Error("crash"); });
    const result = await saveSeatingAssignments([ASSIGNMENT_INPUT]);
    expect(result.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getSeatingAssignmentsByExamRoom
// ─────────────────────────────────────────────────────────────────────────────

describe("getSeatingAssignmentsByExamRoom", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns seating assignments with student details", async () => {
    fromMock.mockReturnValue(makeChain({ data: [SEATING_FIXTURE], error: null }));
    const result = await getSeatingAssignmentsByExamRoom(10);
    expect(result.success).toBe(true);
    expect(result.data[0].student.name).toBe("Juan dela Cruz");
  });

  it("returns empty array when no assignments exist", async () => {
    fromMock.mockReturnValue(makeChain({ data: [], error: null }));
    const result = await getSeatingAssignmentsByExamRoom(10);
    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });

  it("queries the seating_assignment table", async () => {
    fromMock.mockReturnValue(makeChain({ data: [], error: null }));
    await getSeatingAssignmentsByExamRoom(10);
    expect(fromMock).toHaveBeenCalledWith("seating_assignment");
  });

  it("returns success:false on error", async () => {
    fromMock.mockReturnValue(makeChain({ data: null, error: new Error("fetch failed") }));
    const result = await getSeatingAssignmentsByExamRoom(10);
    expect(result.success).toBe(false);
    expect(result.data).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getSeatingAssignmentsByGroup
// ─────────────────────────────────────────────────────────────────────────────

describe("getSeatingAssignmentsByGroup", () => {
  beforeEach(() => vi.clearAllMocks());

  it("filters by exam_room_id and student_group A", async () => {
    const chain = makeChain({ data: [SEATING_FIXTURE], error: null });
    fromMock.mockReturnValue(chain);
    const result = await getSeatingAssignmentsByGroup(10, "A");
    expect(result.success).toBe(true);
    expect(chain.eq).toHaveBeenCalledWith("exam_room_id", 10);
    expect(chain.eq).toHaveBeenCalledWith("student_group", "A");
  });

  it("filters by student_group B", async () => {
    const chain = makeChain({ data: [], error: null });
    fromMock.mockReturnValue(chain);
    await getSeatingAssignmentsByGroup(10, "B");
    expect(chain.eq).toHaveBeenCalledWith("student_group", "B");
  });

  it("returns success:false on error", async () => {
    fromMock.mockReturnValue(makeChain({ data: null, error: new Error("error") }));
    const result = await getSeatingAssignmentsByGroup(10, "A");
    expect(result.success).toBe(false);
    expect(result.data).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// clearSeatingAssignments
// ─────────────────────────────────────────────────────────────────────────────

describe("clearSeatingAssignments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns success:true on successful delete", async () => {
    fromMock.mockReturnValue(makeChain({ data: null, error: null }));
    const result = await clearSeatingAssignments(10);
    expect(result.success).toBe(true);
  });

  it("deletes from seating_assignment table with correct exam_room_id", async () => {
    const chain = makeChain({ data: null, error: null });
    fromMock.mockReturnValue(chain);
    await clearSeatingAssignments(10);
    expect(fromMock).toHaveBeenCalledWith("seating_assignment");
    expect(chain.eq).toHaveBeenCalledWith("exam_room_id", 10);
  });

  it("returns success:false on Supabase error", async () => {
    fromMock.mockReturnValue(makeChain({ data: null, error: new Error("delete failed") }));
    const result = await clearSeatingAssignments(10);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("returns success:false on thrown exception", async () => {
    fromMock.mockImplementation(() => { throw new Error("crash"); });
    const result = await clearSeatingAssignments(10);
    expect(result.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// checkExistingSeatingAssignments
// ─────────────────────────────────────────────────────────────────────────────

describe("checkExistingSeatingAssignments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns hasAssignments:true and correct count when count > 0", async () => {
    fromMock.mockReturnValue(makeChain({ count: 5, error: null }));
    const result = await checkExistingSeatingAssignments(10);
    expect(result.success).toBe(true);
    expect(result.count).toBe(5);
    expect(result.hasAssignments).toBe(true);
  });

  it("returns hasAssignments:false when count is 0", async () => {
    fromMock.mockReturnValue(makeChain({ count: 0, error: null }));
    const result = await checkExistingSeatingAssignments(10);
    expect(result.hasAssignments).toBe(false);
    expect(result.count).toBe(0);
  });

  it("returns hasAssignments:false when count is null", async () => {
    fromMock.mockReturnValue(makeChain({ count: null, error: null }));
    const result = await checkExistingSeatingAssignments(10);
    expect(result.hasAssignments).toBe(false);
    expect(result.count).toBe(0);
  });

  it("returns success:false on error", async () => {
    fromMock.mockReturnValue(makeChain({ count: null, error: new Error("count failed") }));
    const result = await checkExistingSeatingAssignments(10);
    expect(result.success).toBe(false);
    expect(result.count).toBe(0);
    expect(result.hasAssignments).toBe(false);
  });

  it("returns success:false on thrown exception", async () => {
    fromMock.mockImplementation(() => { throw new Error("crash"); });
    const result = await checkExistingSeatingAssignments(10);
    expect(result.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getAssignedCountByGroup
// ─────────────────────────────────────────────────────────────────────────────

describe("getAssignedCountByGroup", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns correct count for group A", async () => {
    fromMock.mockReturnValue(makeChain({ count: 12, error: null }));
    const result = await getAssignedCountByGroup(10, "A");
    expect(result.success).toBe(true);
    expect(result.count).toBe(12);
  });

  it("returns correct count for group B", async () => {
    fromMock.mockReturnValue(makeChain({ count: 8, error: null }));
    const result = await getAssignedCountByGroup(10, "B");
    expect(result.success).toBe(true);
    expect(result.count).toBe(8);
  });

  it("returns 0 when count is null", async () => {
    fromMock.mockReturnValue(makeChain({ count: null, error: null }));
    const result = await getAssignedCountByGroup(10, "A");
    expect(result.count).toBe(0);
  });

  it("filters by both exam_room_id and student_group", async () => {
    const chain = makeChain({ count: 5, error: null });
    fromMock.mockReturnValue(chain);
    await getAssignedCountByGroup(10, "B");
    expect(chain.eq).toHaveBeenCalledWith("exam_room_id", 10);
    expect(chain.eq).toHaveBeenCalledWith("student_group", "B");
  });

  it("returns success:false on Supabase error", async () => {
    fromMock.mockReturnValue(makeChain({ count: null, error: new Error("error") }));
    const result = await getAssignedCountByGroup(10, "A");
    expect(result.success).toBe(false);
    expect(result.count).toBe(0);
  });

  it("returns success:false on thrown exception", async () => {
    fromMock.mockImplementation(() => { throw new Error("crash"); });
    const result = await getAssignedCountByGroup(10, "A");
    expect(result.success).toBe(false);
  });
});