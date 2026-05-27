// ============================================================
// Unit Tests — examRoomLinkQueries.ts
// Covers: deriveSession + all query methods including
//         getHydratedByExamRoomId, getHydratedByExamId (lines 160-195)
//         and edge branches on deleteById, deleteByExamRoomId (lines 355, 375)
// ============================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Supabase ────────────────────────────────────────────────────────────
const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));

vi.mock("@/utils/supabase", () => ({
  default: { from: fromMock },
}));

import { deriveSession, examRoomLinkQueries } from "@/services/examRoomLinkQueries";
import type { ExamRoomLink } from "@/services/examRoomLinkQueries";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const LINK_FIXTURE: ExamRoomLink = {
  link_id: 1,
  exam_room_id: 10,
  exam_id: 100,
  group_type: "primary",
  created_at: "2024-01-01T00:00:00Z",
};

const EXAM_FIXTURE = {
  exam_id: 100,
  exam_date: "2024-06-01",
  day_of_week: "Saturday",
  start_time: "08:00",
  end_time: "10:00",
  year_level: "2",
  semester: "1",
  program: "CS",
  specialization: "",
};

const EXAM_ROOM_FIXTURE = {
  exam_room_id: 10,
  room_id: 5,
  assigned_capacity: 30,
  year_level_primary: "2",
  sem_primary: "1",
  program_primary: "CS",
  specialization_primary: "",
  students_primary: 25,
  year_level_secondary: null,
  sem_secondary: null,
  program_secondary: null,
  specialization_secondary: null,
  students_secondary: 0,
  room: { room_id: 5, room_number: "101", capacity: 40 },
};

// ─── Chain builders ────────────────────────────────────────────────────────────

/** General-purpose fluent chain that resolves with the provided result */
function makeChain(resolved: { data: any; error: any }) {
  const p = Promise.resolve(resolved);
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(() => p),
    then: (onFulfilled: any, onRejected: any) => p.then(onFulfilled, onRejected),
    catch: (fn: any) => p.catch(fn),
  };
  return chain;
}

function ok(data: any) {
  return { data, error: null };
}
function fail(msg: string) {
  return { data: null, error: new Error(msg) };
}

// ═════════════════════════════════════════════════════════════════════════════
// deriveSession
// ═════════════════════════════════════════════════════════════════════════════

describe("deriveSession", () => {
  it("returns Morning for undefined", () => expect(deriveSession(undefined)).toBe("Morning"));
  it("returns Morning for null", () => expect(deriveSession(null)).toBe("Morning"));
  it("returns Morning for 00:00", () => expect(deriveSession("00:00")).toBe("Morning"));
  it("returns Morning for 08:00", () => expect(deriveSession("08:00")).toBe("Morning"));
  it("returns Morning for 11:59", () => expect(deriveSession("11:59")).toBe("Morning"));
  it("returns Afternoon for 12:00", () => expect(deriveSession("12:00")).toBe("Afternoon"));
  it("returns Afternoon for 14:30:00 (with seconds)", () => expect(deriveSession("14:30:00")).toBe("Afternoon"));
  it("returns Afternoon for 23:59", () => expect(deriveSession("23:59")).toBe("Afternoon"));
  it("returns Morning for an unparseable string", () => expect(deriveSession("not-a-time")).toBe("Morning"));
});

// ═════════════════════════════════════════════════════════════════════════════
// getAll
// ═════════════════════════════════════════════════════════════════════════════

describe("examRoomLinkQueries.getAll", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns all links on success", async () => {
    fromMock.mockReturnValue(makeChain(ok([LINK_FIXTURE])));
    const result = await examRoomLinkQueries.getAll();
    expect(result).toEqual([LINK_FIXTURE]);
    expect(fromMock).toHaveBeenCalledWith("exam_room_exam_link");
  });

  it("throws when Supabase returns an error", async () => {
    fromMock.mockReturnValue(makeChain(fail("DB error")));
    await expect(examRoomLinkQueries.getAll()).rejects.toThrow("DB error");
  });

  it("returns empty array when no links exist", async () => {
    fromMock.mockReturnValue(makeChain(ok([])));
    expect(await examRoomLinkQueries.getAll()).toEqual([]);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// getByExamRoomId
// ═════════════════════════════════════════════════════════════════════════════

describe("examRoomLinkQueries.getByExamRoomId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns links filtered by exam_room_id", async () => {
    fromMock.mockReturnValue(makeChain(ok([LINK_FIXTURE])));
    expect(await examRoomLinkQueries.getByExamRoomId(10)).toEqual([LINK_FIXTURE]);
    expect(fromMock).toHaveBeenCalledWith("exam_room_exam_link");
  });

  it("returns empty array when no links match", async () => {
    fromMock.mockReturnValue(makeChain(ok([])));
    expect(await examRoomLinkQueries.getByExamRoomId(999)).toEqual([]);
  });

  it("throws on Supabase error", async () => {
    fromMock.mockReturnValue(makeChain(fail("not found")));
    await expect(examRoomLinkQueries.getByExamRoomId(10)).rejects.toThrow("not found");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// getByExamId
// ═════════════════════════════════════════════════════════════════════════════

describe("examRoomLinkQueries.getByExamId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns links filtered by exam_id", async () => {
    fromMock.mockReturnValue(makeChain(ok([LINK_FIXTURE])));
    expect(await examRoomLinkQueries.getByExamId(100)).toEqual([LINK_FIXTURE]);
  });

  it("returns empty array when no links match", async () => {
    fromMock.mockReturnValue(makeChain(ok([])));
    expect(await examRoomLinkQueries.getByExamId(0)).toEqual([]);
  });

  it("throws on error", async () => {
    fromMock.mockReturnValue(makeChain(fail("fetch error")));
    await expect(examRoomLinkQueries.getByExamId(100)).rejects.toThrow("fetch error");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// getHydratedByExamRoomId  — lines 160-195
// ═════════════════════════════════════════════════════════════════════════════

describe("examRoomLinkQueries.getHydratedByExamRoomId", () => {
  beforeEach(() => vi.clearAllMocks());

  // Call order inside getHydratedByExamRoomId:
  //   1. getByExamRoomId  → from("exam_room_exam_link").select().eq().order()
  //   2. from("exam_room").select().eq().single()
  //   3. from("exam").select().in()

  it("returns empty array when no links exist for the exam room", async () => {
    // getByExamRoomId returns []  → early return, no further queries
    fromMock.mockReturnValueOnce(makeChain(ok([])));
    expect(await examRoomLinkQueries.getHydratedByExamRoomId(10)).toEqual([]);
    expect(fromMock).toHaveBeenCalledTimes(1);
  });

  it("returns hydrated links when all queries succeed", async () => {
    // Query 1 — exam_room_exam_link
    fromMock.mockReturnValueOnce(makeChain(ok([LINK_FIXTURE])));
    // Query 2 — exam_room .single()
    fromMock.mockReturnValueOnce(makeChain(ok(EXAM_ROOM_FIXTURE)));
    // Query 3 — exam .in()
    fromMock.mockReturnValueOnce(makeChain(ok([EXAM_FIXTURE])));

    const result = await examRoomLinkQueries.getHydratedByExamRoomId(10);
    expect(result).toHaveLength(1);
    expect(result[0].link_id).toBe(1);
    expect(result[0].group_type).toBe("primary");
    expect(result[0].exam.exam_id).toBe(100);
    expect(result[0].examRoom.exam_room_id).toBe(10);
  });

  it("filters out links whose exam_id is not in the exams result", async () => {
    const orphanLink: ExamRoomLink = { ...LINK_FIXTURE, exam_id: 999 };
    fromMock.mockReturnValueOnce(makeChain(ok([orphanLink])));
    fromMock.mockReturnValueOnce(makeChain(ok(EXAM_ROOM_FIXTURE)));
    // exam with id 999 is NOT in the result → should be filtered
    fromMock.mockReturnValueOnce(makeChain(ok([])));

    const result = await examRoomLinkQueries.getHydratedByExamRoomId(10);
    expect(result).toHaveLength(0);
  });

  it("throws when exam_room query returns an error", async () => {
    fromMock.mockReturnValueOnce(makeChain(ok([LINK_FIXTURE])));
    fromMock.mockReturnValueOnce(makeChain(fail("exam_room fetch failed")));

    await expect(examRoomLinkQueries.getHydratedByExamRoomId(10))
      .rejects.toThrow("exam_room fetch failed");
  });

  it("throws when exam query returns an error", async () => {
    fromMock.mockReturnValueOnce(makeChain(ok([LINK_FIXTURE])));
    fromMock.mockReturnValueOnce(makeChain(ok(EXAM_ROOM_FIXTURE)));
    fromMock.mockReturnValueOnce(makeChain(fail("exam fetch failed")));

    await expect(examRoomLinkQueries.getHydratedByExamRoomId(10))
      .rejects.toThrow("exam fetch failed");
  });

  it("handles multiple links for the same exam room", async () => {
    const link2: ExamRoomLink = { ...LINK_FIXTURE, link_id: 2, exam_id: 101, group_type: "secondary" };
    const exam2 = { ...EXAM_FIXTURE, exam_id: 101, program: "IT" };

    fromMock.mockReturnValueOnce(makeChain(ok([LINK_FIXTURE, link2])));
    fromMock.mockReturnValueOnce(makeChain(ok(EXAM_ROOM_FIXTURE)));
    fromMock.mockReturnValueOnce(makeChain(ok([EXAM_FIXTURE, exam2])));

    const result = await examRoomLinkQueries.getHydratedByExamRoomId(10);
    expect(result).toHaveLength(2);
    expect(result[0].group_type).toBe("primary");
    expect(result[1].group_type).toBe("secondary");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// getHydratedByExamId  — lines 160-195 (secondary hydration path)
// ═════════════════════════════════════════════════════════════════════════════

describe("examRoomLinkQueries.getHydratedByExamId", () => {
  beforeEach(() => vi.clearAllMocks());

  // Call order inside getHydratedByExamId:
  //   1. getByExamId       → from("exam_room_exam_link").select().eq()
  //   2. from("exam").select().eq().single()
  //   3. from("exam_room").select().in()

  it("returns empty array when no links exist for the exam", async () => {
    fromMock.mockReturnValueOnce(makeChain(ok([])));
    expect(await examRoomLinkQueries.getHydratedByExamId(100)).toEqual([]);
    expect(fromMock).toHaveBeenCalledTimes(1);
  });

  it("returns hydrated links when all queries succeed", async () => {
    fromMock.mockReturnValueOnce(makeChain(ok([LINK_FIXTURE])));
    fromMock.mockReturnValueOnce(makeChain(ok(EXAM_FIXTURE)));         // exam .single()
    fromMock.mockReturnValueOnce(makeChain(ok([EXAM_ROOM_FIXTURE])));  // exam_room .in()

    const result = await examRoomLinkQueries.getHydratedByExamId(100);
    expect(result).toHaveLength(1);
    expect(result[0].exam.exam_id).toBe(100);
    expect(result[0].examRoom.exam_room_id).toBe(10);
  });

  it("filters out links whose exam_room_id is not in the rooms result", async () => {
    const orphanLink: ExamRoomLink = { ...LINK_FIXTURE, exam_room_id: 999 };
    fromMock.mockReturnValueOnce(makeChain(ok([orphanLink])));
    fromMock.mockReturnValueOnce(makeChain(ok(EXAM_FIXTURE)));
    fromMock.mockReturnValueOnce(makeChain(ok([]))); // room 999 missing

    const result = await examRoomLinkQueries.getHydratedByExamId(100);
    expect(result).toHaveLength(0);
  });

  it("throws when exam query returns an error", async () => {
    fromMock.mockReturnValueOnce(makeChain(ok([LINK_FIXTURE])));
    fromMock.mockReturnValueOnce(makeChain(fail("exam single failed")));

    await expect(examRoomLinkQueries.getHydratedByExamId(100))
      .rejects.toThrow("exam single failed");
  });

  it("throws when exam_room query returns an error", async () => {
    fromMock.mockReturnValueOnce(makeChain(ok([LINK_FIXTURE])));
    fromMock.mockReturnValueOnce(makeChain(ok(EXAM_FIXTURE)));
    fromMock.mockReturnValueOnce(makeChain(fail("exam_room in failed")));

    await expect(examRoomLinkQueries.getHydratedByExamId(100))
      .rejects.toThrow("exam_room in failed");
  });

  it("handles multiple links for the same exam", async () => {
    const link2: ExamRoomLink = { ...LINK_FIXTURE, link_id: 2, exam_room_id: 11 };
    const room2 = { ...EXAM_ROOM_FIXTURE, exam_room_id: 11 };

    fromMock.mockReturnValueOnce(makeChain(ok([LINK_FIXTURE, link2])));
    fromMock.mockReturnValueOnce(makeChain(ok(EXAM_FIXTURE)));
    fromMock.mockReturnValueOnce(makeChain(ok([EXAM_ROOM_FIXTURE, room2])));

    const result = await examRoomLinkQueries.getHydratedByExamId(100);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.examRoom.exam_room_id)).toEqual([10, 11]);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// create
// ═════════════════════════════════════════════════════════════════════════════

describe("examRoomLinkQueries.create", () => {
  beforeEach(() => vi.clearAllMocks());

  const payload = { exam_room_id: 10, exam_id: 100, group_type: "primary" as const };

  it("inserts and returns the new link", async () => {
    fromMock.mockReturnValue(makeChain(ok(LINK_FIXTURE)));
    expect(await examRoomLinkQueries.create(payload)).toEqual(LINK_FIXTURE);
    expect(fromMock).toHaveBeenCalledWith("exam_room_exam_link");
  });

  it("throws on insert error", async () => {
    fromMock.mockReturnValue(makeChain(fail("insert failed")));
    await expect(examRoomLinkQueries.create(payload)).rejects.toThrow("insert failed");
  });

  it("works for secondary group_type", async () => {
    const secondaryPayload = { ...payload, group_type: "secondary" as const };
    fromMock.mockReturnValue(makeChain(ok({ ...LINK_FIXTURE, group_type: "secondary" })));
    const result = await examRoomLinkQueries.create(secondaryPayload);
    expect(result.group_type).toBe("secondary");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// deleteById  — line 355
// ═════════════════════════════════════════════════════════════════════════════

describe("examRoomLinkQueries.deleteById", () => {
  beforeEach(() => vi.clearAllMocks());

  it("resolves without error on success", async () => {
    fromMock.mockReturnValue(makeChain(ok(null)));
    await expect(examRoomLinkQueries.deleteById(1)).resolves.toBeUndefined();
    expect(fromMock).toHaveBeenCalledWith("exam_room_exam_link");
  });

  it("throws on delete error", async () => {
    fromMock.mockReturnValue(makeChain(fail("delete failed")));
    await expect(examRoomLinkQueries.deleteById(1)).rejects.toThrow("delete failed");
  });

  it("calls .eq with the correct link_id", async () => {
    const chain = makeChain(ok(null));
    fromMock.mockReturnValue(chain);
    await examRoomLinkQueries.deleteById(42);
    expect(chain.eq).toHaveBeenCalledWith("link_id", 42);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// deleteByExamRoomId  — line 375
// ═════════════════════════════════════════════════════════════════════════════

describe("examRoomLinkQueries.deleteByExamRoomId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("resolves without error on success", async () => {
    fromMock.mockReturnValue(makeChain(ok(null)));
    await expect(examRoomLinkQueries.deleteByExamRoomId(10)).resolves.toBeUndefined();
  });

  it("throws on error", async () => {
    fromMock.mockReturnValue(makeChain(fail("delete failed")));
    await expect(examRoomLinkQueries.deleteByExamRoomId(10)).rejects.toThrow("delete failed");
  });

  it("calls .eq with the correct exam_room_id", async () => {
    const chain = makeChain(ok(null));
    fromMock.mockReturnValue(chain);
    await examRoomLinkQueries.deleteByExamRoomId(77);
    expect(chain.eq).toHaveBeenCalledWith("exam_room_id", 77);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// deleteByExamId
// ═════════════════════════════════════════════════════════════════════════════

describe("examRoomLinkQueries.deleteByExamId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("resolves without error on success", async () => {
    fromMock.mockReturnValue(makeChain(ok(null)));
    await expect(examRoomLinkQueries.deleteByExamId(100)).resolves.toBeUndefined();
  });

  it("throws on error", async () => {
    fromMock.mockReturnValue(makeChain(fail("delete failed")));
    await expect(examRoomLinkQueries.deleteByExamId(100)).rejects.toThrow("delete failed");
  });

  it("calls .eq with the correct exam_id", async () => {
    const chain = makeChain(ok(null));
    fromMock.mockReturnValue(chain);
    await examRoomLinkQueries.deleteByExamId(55);
    expect(chain.eq).toHaveBeenCalledWith("exam_id", 55);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// getAllDateGroups
// ═════════════════════════════════════════════════════════════════════════════

describe("examRoomLinkQueries.getAllDateGroups", () => {
  beforeEach(() => vi.clearAllMocks());

  const ER = {
    exam_room_id: 10,
    room_id: 5,
    assigned_capacity: 30,
    year_level_primary: "2",
    sem_primary: "1",
    program_primary: "CS",
    specialization_primary: "",
    students_primary: 20,
    students_secondary: 0,
    year_level_secondary: null,
    sem_secondary: null,
    program_secondary: null,
    specialization_secondary: null,
    room: { room_id: 5, room_number: "101", capacity: 40 },
  };

  const EX = {
    exam_id: 100,
    exam_date: "2024-06-01",
    day_of_week: "Saturday",
    start_time: "08:00",
    end_time: "10:00",
    year_level: "2",
    semester: "1",
    program: "CS",
    specialization: "",
  };

  function makeSimpleChain(data: any, error: any = null) {
    const p = Promise.resolve({ data, error });
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: (onFulfilled: any, onRejected: any) => p.then(onFulfilled, onRejected),
      catch: (fn: any) => p.catch(fn),
    };
    return chain;
  }

  function setup(examRooms: any[], exams: any[]) {
    fromMock
      .mockReturnValueOnce(makeSimpleChain(examRooms))
      .mockReturnValueOnce(makeSimpleChain(exams));
  }

  it("returns empty array when no exam rooms exist", async () => {
    fromMock.mockReturnValueOnce(makeSimpleChain([]));
    expect(await examRoomLinkQueries.getAllDateGroups()).toEqual([]);
  });

  it("returns empty array when exam rooms exist but no matching exams", async () => {
    setup([ER], []);
    expect(await examRoomLinkQueries.getAllDateGroups()).toEqual([]);
  });

  it("builds one DateGroup per unique date", async () => {
    setup([ER], [
      { ...EX, exam_date: "2024-06-01" },
      { ...EX, exam_id: 101, exam_date: "2024-06-02" },
    ]);
    const result = await examRoomLinkQueries.getAllDateGroups();
    expect(result).toHaveLength(2);
    expect(result[0].examDate).toBe("2024-06-01");
    expect(result[1].examDate).toBe("2024-06-02");
  });

  it("sets Afternoon session when start_time >= 12:00", async () => {
    setup([ER], [{ ...EX, start_time: "13:00" }]);
    const result = await examRoomLinkQueries.getAllDateGroups();
    expect(result[0].rooms[0].examSession).toBe("Afternoon");
  });

  it("sets Morning session when start_time < 12:00", async () => {
    setup([ER], [{ ...EX, start_time: "08:00" }]);
    const result = await examRoomLinkQueries.getAllDateGroups();
    expect(result[0].rooms[0].examSession).toBe("Morning");
  });

  it("sorts dates ascending", async () => {
    setup([ER], [
      { ...EX, exam_id: 102, exam_date: "2024-06-10" },
      { ...EX, exam_id: 101, exam_date: "2024-06-03" },
      { ...EX, exam_date: "2024-06-01" },
    ]);
    const result = await examRoomLinkQueries.getAllDateGroups();
    const dates = result.map((g) => g.examDate);
    expect(dates).toEqual([...dates].sort());
  });

  it("includes roomNumber and roomCapacity from joined room", async () => {
    setup([ER], [EX]);
    const result = await examRoomLinkQueries.getAllDateGroups();
    expect(result[0].rooms[0].roomNumber).toBe("101");
    expect(result[0].rooms[0].roomCapacity).toBe(40);
  });

  it("correctly sets totalStudents as primary + secondary", async () => {
    setup([{ ...ER, students_primary: 20, students_secondary: 10 }], [EX]);
    const result = await examRoomLinkQueries.getAllDateGroups();
    expect(result[0].rooms[0].totalStudents).toBe(30);
  });

  it("throws when exam_room query returns an error", async () => {
    const dbError = { message: "exam_room fetch failed", code: "42P01" };
    fromMock.mockReturnValueOnce(makeSimpleChain(null, dbError));
    await expect(examRoomLinkQueries.getAllDateGroups()).rejects.toMatchObject({
      message: "exam_room fetch failed",
    });
  });

  it("throws when exam query returns an error", async () => {
    const dbError = { message: "exam fetch failed", code: "42P01" };
    fromMock
      .mockReturnValueOnce(makeSimpleChain([ER]))
      .mockReturnValueOnce(makeSimpleChain(null, dbError));
    await expect(examRoomLinkQueries.getAllDateGroups()).rejects.toMatchObject({
      message: "exam fetch failed",
    });
  });

  it("populates primaryGroupLabel correctly", async () => {
    setup([ER], [EX]);
    const result = await examRoomLinkQueries.getAllDateGroups();
    expect(result[0].rooms[0].primaryGroupLabel).toContain("CS");
    expect(result[0].rooms[0].primaryGroupLabel).toContain("Year 2");
  });

  it("sets secondaryGroupLabel to null when no secondary group", async () => {
    setup([ER], [EX]);
    const result = await examRoomLinkQueries.getAllDateGroups();
    expect(result[0].rooms[0].secondaryGroupLabel).toBeNull();
  });

  it("sets secondaryGroupLabel when secondary group matches", async () => {
    const erWithSecondary = {
      ...ER,
      year_level_secondary: "3",
      sem_secondary: "1",
      program_secondary: "IT",
      specialization_secondary: "",
      students_secondary: 15,
    };
    const secondaryExam = {
      ...EX,
      exam_id: 200,
      year_level: "3",
      program: "IT",
    };
    setup([erWithSecondary], [EX, secondaryExam]);
    const result = await examRoomLinkQueries.getAllDateGroups();
    expect(result[0].rooms[0].secondaryGroupLabel).toContain("IT");
  });

  it("uses key format examRoomId-examDate", async () => {
    setup([ER], [EX]);
    const result = await examRoomLinkQueries.getAllDateGroups();
    expect(result[0].rooms[0].key).toBe("10-2024-06-01");
  });

  it("returns null examTime when start_time or end_time is missing", async () => {
    setup([ER], [{ ...EX, start_time: null, end_time: null }]);
    const result = await examRoomLinkQueries.getAllDateGroups();
    expect(result[0].rooms[0].examTime).toBeUndefined();
  });

  it("populates examTime correctly when both times are present", async () => {
    setup([ER], [{ ...EX, start_time: "08:00", end_time: "10:00" }]);
    const result = await examRoomLinkQueries.getAllDateGroups();
    expect(result[0].rooms[0].examTime).toEqual({ start: "08:00", end: "10:00" });
  });

  it("rooms with null primary descriptors produce no cards", async () => {
    const erNoGroup = {
      ...ER,
      year_level_primary: null,
      sem_primary: null,
      program_primary: null,
    };
    setup([erNoGroup], [EX]);
    // matchExams returns [] for null descriptors → allDates.size === 0 → skipped
    expect(await examRoomLinkQueries.getAllDateGroups()).toEqual([]);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// getDateGroupByDate
// ═════════════════════════════════════════════════════════════════════════════

describe("examRoomLinkQueries.getDateGroupByDate", () => {
  beforeEach(() => vi.clearAllMocks());

  const ER = {
    exam_room_id: 10,
    room_id: 5,
    assigned_capacity: 30,
    year_level_primary: "2",
    sem_primary: "1",
    program_primary: "CS",
    specialization_primary: "",
    students_primary: 20,
    students_secondary: 0,
    year_level_secondary: null,
    sem_secondary: null,
    program_secondary: null,
    specialization_secondary: null,
    room: { room_id: 5, room_number: "101", capacity: 40 },
  };

  const EX = {
    exam_id: 100,
    exam_date: "2024-06-01",
    day_of_week: "Saturday",
    start_time: "08:00",
    end_time: "10:00",
    year_level: "2",
    semester: "1",
    program: "CS",
    specialization: "",
  };

  function makeSimpleChain(data: any, error: any = null) {
    const p = Promise.resolve({ data, error });
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: (onFulfilled: any, onRejected: any) => p.then(onFulfilled, onRejected),
      catch: (fn: any) => p.catch(fn),
    };
    return chain;
  }

  it("returns the matching DateGroup", async () => {
    fromMock
      .mockReturnValueOnce(makeSimpleChain([ER]))
      .mockReturnValueOnce(makeSimpleChain([EX]));
    const result = await examRoomLinkQueries.getDateGroupByDate("2024-06-01");
    expect(result).not.toBeNull();
    expect(result?.examDate).toBe("2024-06-01");
  });

  it("returns null when date is not found", async () => {
    fromMock.mockReturnValueOnce(makeSimpleChain([]));
    expect(await examRoomLinkQueries.getDateGroupByDate("2099-01-01")).toBeNull();
  });

  it("returns null when groups exist but target date has no match", async () => {
    fromMock
      .mockReturnValueOnce(makeSimpleChain([ER]))
      .mockReturnValueOnce(makeSimpleChain([EX])); // only has 2024-06-01
    const result = await examRoomLinkQueries.getDateGroupByDate("2024-12-25");
    expect(result).toBeNull();
  });
});