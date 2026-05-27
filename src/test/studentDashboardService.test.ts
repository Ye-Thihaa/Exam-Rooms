// ─── Vitest ───────────────────────────────────────────────────────────────────
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  getStudentDashboardData,
  getStudentExamsByDateRange,
  getStudentNextExam,
  getStudentUpcomingExamCount,
} from "@/services/studentDashboardService";

// ─────────────────────────────────────────────────────────────────────────────
// Mock all three service dependencies
// ─────────────────────────────────────────────────────────────────────────────

vi.mock("@/services/studentQueries", () => ({
  getStudentById: vi.fn(),
}));

vi.mock("@/services/seatingassignmentQueries", () => ({
  seatingAssignmentQueries: { getAll: vi.fn() },
}));

vi.mock("@/services/examroomQueries", () => ({
  examRoomQueries: { getExamRoomById: vi.fn() },
}));

vi.mock("@/services/examQueries", () => ({
  examQueries: { getByProgramYearSpecialization: vi.fn() },
}));

import { getStudentById } from "@/services/studentQueries";
import { seatingAssignmentQueries } from "@/services/seatingassignmentQueries";
import { examRoomQueries } from "@/services/examroomQueries";
import { examQueries } from "@/services/examQueries";

// ─────────────────────────────────────────────────────────────────────────────
// Typed mock helpers
// ─────────────────────────────────────────────────────────────────────────────

const mockGetStudentById        = vi.mocked(getStudentById);
const mockGetAll                = vi.mocked(seatingAssignmentQueries.getAll);
const mockGetExamRoomById       = vi.mocked(examRoomQueries.getExamRoomById);
const mockGetByProgram          = vi.mocked(examQueries.getByProgramYearSpecialization);

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const STUDENT_ID = 42;

const mockStudent = {
  student_id: STUDENT_ID,
  id:         STUDENT_ID,
  name:       "Alice",
  student_number: "TNT-2201",
  year_level: 2,
  program:    "CS",
};

function makeSeating(overrides: Partial<{
  seating_id:     number;
  exam_room_id:   number;
  student_id:     number;
  student_group:  "A" | "B";
  seat_number:    string;
  row_label:      string;
  column_number:  number;
}> = {}) {
  return {
    seating_id:    1,
    exam_room_id:  10,
    student_id:    STUDENT_ID,
    student_group: "A" as const,
    seat_number:   "A1",
    row_label:     "A",
    column_number: 1,
    ...overrides,
  };
}

function makeExamRoom(overrides: Partial<{
  exam_room_id:               number;
  year_level_primary:         number;
  sem_primary:                number;
  program_primary:            string;
  specialization_primary:     string | null;
  year_level_secondary:       number | null;
  sem_secondary:              number | null;
  program_secondary:          string | null;
  specialization_secondary:   string | null;
}> = {}) {
  return {
    exam_room_id:             10,
    year_level_primary:       2,
    sem_primary:              1,
    program_primary:          "CS",
    specialization_primary:   null,
    year_level_secondary:     null,
    sem_secondary:            null,
    program_secondary:        null,
    specialization_secondary: null,
    ...overrides,
  };
}

// Dates relative to today so upcoming/past split stays stable
const FUTURE_DATE = new Date(Date.now() + 10 * 86_400_000).toISOString().split("T")[0];
const PAST_DATE   = new Date(Date.now() - 10 * 86_400_000).toISOString().split("T")[0];

function makeExam(overrides: Partial<{
  exam_id:        number;
  exam_date:      string;
  exam_name:      string;
  subject_code:   string;
  program:        string;
  year_level:     number;
  specialization: string | null;
  session:        string;
  semester:       number;
}> = {}) {
  return {
    exam_id:        1,
    exam_date:      FUTURE_DATE,
    exam_name:      "Midterm",
    subject_code:   "CS101",
    program:        "CS",
    year_level:     2,
    specialization: null,
    session:        "Morning",
    semester:       1,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Default happy-path setup helper
// ─────────────────────────────────────────────────────────────────────────────

function setupHappyPath(examDate = FUTURE_DATE) {
  mockGetStudentById.mockResolvedValue(mockStudent as any);
  mockGetAll.mockResolvedValue([makeSeating()] as any);
  mockGetExamRoomById.mockResolvedValue({ success: true, data: makeExamRoom() } as any);
  mockGetByProgram.mockResolvedValue([makeExam({ exam_date: examDate })] as any);
}

// ═════════════════════════════════════════════════════════════════════════════
// getStudentDashboardData()
// ═════════════════════════════════════════════════════════════════════════════

describe("getStudentDashboardData()", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Student not found ─────────────────────────────────────────────────────

  describe("student not found", () => {
    beforeEach(() => mockGetStudentById.mockResolvedValue(null));

    it("returns student: null", async () => {
      expect((await getStudentDashboardData(STUDENT_ID)).student).toBeNull();
    });

    it("returns empty exams arrays", async () => {
      const result = await getStudentDashboardData(STUDENT_ID);
      expect(result.exams).toEqual([]);
      expect(result.upcomingExams).toEqual([]);
      expect(result.pastExams).toEqual([]);
    });

    it("does not call seating or exam services", async () => {
      await getStudentDashboardData(STUDENT_ID);
      expect(mockGetAll).not.toHaveBeenCalled();
      expect(mockGetExamRoomById).not.toHaveBeenCalled();
      expect(mockGetByProgram).not.toHaveBeenCalled();
    });
  });

  // ── No seating assignments ────────────────────────────────────────────────

  describe("student exists but has no seating assignments", () => {
    beforeEach(() => {
      mockGetStudentById.mockResolvedValue(mockStudent as any);
      mockGetAll.mockResolvedValue([] as any);
    });

    it("returns the student object", async () => {
      expect((await getStudentDashboardData(STUDENT_ID)).student).toMatchObject({ student_id: STUDENT_ID });
    });

    it("returns empty exams arrays", async () => {
      const result = await getStudentDashboardData(STUDENT_ID);
      expect(result.exams).toEqual([]);
      expect(result.upcomingExams).toEqual([]);
      expect(result.pastExams).toEqual([]);
    });

    it("does not call examRoomQueries", async () => {
      await getStudentDashboardData(STUDENT_ID);
      expect(mockGetExamRoomById).not.toHaveBeenCalled();
    });

    it("filters out seating assignments belonging to other students", async () => {
      // getAll returns one assignment for a different student
      mockGetAll.mockResolvedValue([makeSeating({ student_id: 999 })] as any);
      const result = await getStudentDashboardData(STUDENT_ID);
      expect(result.exams).toEqual([]);
    });
  });

  // ── Seating assignment error ──────────────────────────────────────────────

  describe("seating assignment query throws", () => {
    beforeEach(() => {
      mockGetStudentById.mockResolvedValue(mockStudent as any);
      mockGetAll.mockRejectedValue(new Error("DB timeout"));
    });

    it("returns the student with empty exams (does not rethrow)", async () => {
      const result = await getStudentDashboardData(STUDENT_ID);
      expect(result.student).toMatchObject({ student_id: STUDENT_ID });
      expect(result.exams).toEqual([]);
    });
  });

  // ── Exam room not found ───────────────────────────────────────────────────

  describe("exam room lookup fails for a seating assignment", () => {
    beforeEach(() => {
      mockGetStudentById.mockResolvedValue(mockStudent as any);
      mockGetAll.mockResolvedValue([makeSeating()] as any);
      mockGetExamRoomById.mockResolvedValue({ success: false, data: null } as any);
    });

    it("skips that seating assignment and returns empty exams", async () => {
      const result = await getStudentDashboardData(STUDENT_ID);
      expect(result.exams).toEqual([]);
    });

    it("still returns the student object", async () => {
      expect((await getStudentDashboardData(STUDENT_ID)).student).not.toBeNull();
    });
  });

  // ── Missing exam room group data ──────────────────────────────────────────

  describe("exam room has null group data", () => {
    it("skips when yearLevel is null", async () => {
      mockGetStudentById.mockResolvedValue(mockStudent as any);
      mockGetAll.mockResolvedValue([makeSeating({ student_group: "A" })] as any);
      mockGetExamRoomById.mockResolvedValue({
        success: true,
        data: makeExamRoom({ year_level_primary: null as any }),
      } as any);

      const result = await getStudentDashboardData(STUDENT_ID);
      expect(result.exams).toEqual([]);
      expect(mockGetByProgram).not.toHaveBeenCalled();
    });

    it("skips when sem is null", async () => {
      mockGetStudentById.mockResolvedValue(mockStudent as any);
      mockGetAll.mockResolvedValue([makeSeating({ student_group: "A" })] as any);
      mockGetExamRoomById.mockResolvedValue({
        success: true,
        data: makeExamRoom({ sem_primary: null as any }),
      } as any);

      const result = await getStudentDashboardData(STUDENT_ID);
      expect(result.exams).toEqual([]);
    });

    it("skips when program is null", async () => {
      mockGetStudentById.mockResolvedValue(mockStudent as any);
      mockGetAll.mockResolvedValue([makeSeating({ student_group: "A" })] as any);
      mockGetExamRoomById.mockResolvedValue({
        success: true,
        data: makeExamRoom({ program_primary: null as any }),
      } as any);

      const result = await getStudentDashboardData(STUDENT_ID);
      expect(result.exams).toEqual([]);
    });
  });

  // ── Group A vs Group B field selection ────────────────────────────────────

  describe("group A vs group B field selection", () => {
    it("uses primary fields for Group A students", async () => {
      mockGetStudentById.mockResolvedValue(mockStudent as any);
      mockGetAll.mockResolvedValue([makeSeating({ student_group: "A" })] as any);
      mockGetExamRoomById.mockResolvedValue({
        success: true,
        data: makeExamRoom({
          program_primary:   "CS",
          year_level_primary: 2,
          specialization_primary: "AI",
          program_secondary:   "IT",
          year_level_secondary: 3,
          specialization_secondary: "Networks",
        }),
      } as any);
      mockGetByProgram.mockResolvedValue([makeExam()] as any);

      await getStudentDashboardData(STUDENT_ID);

      expect(mockGetByProgram).toHaveBeenCalledWith("CS", 2, "AI");
    });

    it("uses secondary fields for Group B students", async () => {
      mockGetStudentById.mockResolvedValue(mockStudent as any);
      mockGetAll.mockResolvedValue([makeSeating({ student_group: "B" })] as any);
      mockGetExamRoomById.mockResolvedValue({
        success: true,
        data: makeExamRoom({
          program_primary:          "CS",
          year_level_primary:       2,
          specialization_primary:   "AI",
          program_secondary:        "IT",
          year_level_secondary:     3,
          sem_secondary:            2,
          specialization_secondary: "Networks",
        }),
      } as any);
      mockGetByProgram.mockResolvedValue([makeExam()] as any);

      await getStudentDashboardData(STUDENT_ID);

      expect(mockGetByProgram).toHaveBeenCalledWith("IT", 3, "Networks");
    });

    it("passes null specialization to getByProgramYearSpecialization when not set", async () => {
      mockGetStudentById.mockResolvedValue(mockStudent as any);
      mockGetAll.mockResolvedValue([makeSeating({ student_group: "A" })] as any);
      mockGetExamRoomById.mockResolvedValue({
        success: true,
        data: makeExamRoom({ specialization_primary: null }),
      } as any);
      mockGetByProgram.mockResolvedValue([makeExam()] as any);

      await getStudentDashboardData(STUDENT_ID);

      expect(mockGetByProgram).toHaveBeenCalledWith("CS", 2, null);
    });
  });

  // ── No exams found for group ──────────────────────────────────────────────

  describe("exam query returns no results", () => {
    it("returns empty exams when getByProgramYearSpecialization returns []", async () => {
      mockGetStudentById.mockResolvedValue(mockStudent as any);
      mockGetAll.mockResolvedValue([makeSeating()] as any);
      mockGetExamRoomById.mockResolvedValue({ success: true, data: makeExamRoom() } as any);
      mockGetByProgram.mockResolvedValue([] as any);

      expect((await getStudentDashboardData(STUDENT_ID)).exams).toEqual([]);
    });

    it("returns empty exams when getByProgramYearSpecialization returns null", async () => {
      mockGetStudentById.mockResolvedValue(mockStudent as any);
      mockGetAll.mockResolvedValue([makeSeating()] as any);
      mockGetExamRoomById.mockResolvedValue({ success: true, data: makeExamRoom() } as any);
      mockGetByProgram.mockResolvedValue(null as any);

      expect((await getStudentDashboardData(STUDENT_ID)).exams).toEqual([]);
    });
  });

  // ── Happy path — full data ────────────────────────────────────────────────

  describe("happy path — full data returned", () => {
    it("returns the student object", async () => {
      setupHappyPath();
      const result = await getStudentDashboardData(STUDENT_ID);
      expect(result.student).toMatchObject({ student_id: STUDENT_ID });
    });

    it("returns the correct number of exams", async () => {
      setupHappyPath();
      expect((await getStudentDashboardData(STUDENT_ID)).exams).toHaveLength(1);
    });

    it("each exam info has exam, examRoom, and seatingAssignment", async () => {
      setupHappyPath();
      const result = await getStudentDashboardData(STUDENT_ID);
      expect(result.exams[0]).toHaveProperty("exam");
      expect(result.exams[0]).toHaveProperty("examRoom");
      expect(result.exams[0]).toHaveProperty("seatingAssignment");
    });

    it("future exam appears in upcomingExams", async () => {
      setupHappyPath(FUTURE_DATE);
      const result = await getStudentDashboardData(STUDENT_ID);
      expect(result.upcomingExams).toHaveLength(1);
      expect(result.pastExams).toHaveLength(0);
    });

    it("past exam appears in pastExams", async () => {
      setupHappyPath(PAST_DATE);
      const result = await getStudentDashboardData(STUDENT_ID);
      expect(result.pastExams).toHaveLength(1);
      expect(result.upcomingExams).toHaveLength(0);
    });
  });

  // ── Deduplication ─────────────────────────────────────────────────────────

  describe("deduplication by exam_id", () => {
    it("deduplicates exams with the same exam_id across multiple seating assignments", async () => {
      // Two seating assignments for the same student → same exam returned twice
      mockGetStudentById.mockResolvedValue(mockStudent as any);
      mockGetAll.mockResolvedValue([
        makeSeating({ seating_id: 1, exam_room_id: 10 }),
        makeSeating({ seating_id: 2, exam_room_id: 10 }),
      ] as any);
      mockGetExamRoomById.mockResolvedValue({ success: true, data: makeExamRoom() } as any);
      // Both seating assignments resolve to the same exam_id: 1
      mockGetByProgram.mockResolvedValue([makeExam({ exam_id: 1 })] as any);

      const result = await getStudentDashboardData(STUDENT_ID);
      expect(result.exams).toHaveLength(1);
    });

    it("keeps distinct exams with different exam_ids", async () => {
      mockGetStudentById.mockResolvedValue(mockStudent as any);
      mockGetAll.mockResolvedValue([makeSeating()] as any);
      mockGetExamRoomById.mockResolvedValue({ success: true, data: makeExamRoom() } as any);
      mockGetByProgram.mockResolvedValue([
        makeExam({ exam_id: 1, subject_code: "CS101" }),
        makeExam({ exam_id: 2, subject_code: "CS102" }),
      ] as any);

      expect((await getStudentDashboardData(STUDENT_ID)).exams).toHaveLength(2);
    });
  });

  // ── Sorting ───────────────────────────────────────────────────────────────

  describe("exam sorting by date", () => {
    it("returns exams sorted ascending by exam_date", async () => {
      const earlier = new Date(Date.now() + 5  * 86_400_000).toISOString().split("T")[0];
      const later   = new Date(Date.now() + 20 * 86_400_000).toISOString().split("T")[0];

      mockGetStudentById.mockResolvedValue(mockStudent as any);
      mockGetAll.mockResolvedValue([makeSeating()] as any);
      mockGetExamRoomById.mockResolvedValue({ success: true, data: makeExamRoom() } as any);
      // Return later exam first to confirm sorting
      mockGetByProgram.mockResolvedValue([
        makeExam({ exam_id: 2, exam_date: later }),
        makeExam({ exam_id: 1, exam_date: earlier }),
      ] as any);

      const result = await getStudentDashboardData(STUDENT_ID);
      expect(result.exams[0].exam.exam_id).toBe(1);
      expect(result.exams[1].exam.exam_id).toBe(2);
    });
  });

  // ── Per-assignment error handling ─────────────────────────────────────────

  describe("per-assignment error handling", () => {
    it("skips a seating assignment when its exam room query throws, processing the rest", async () => {
      mockGetStudentById.mockResolvedValue(mockStudent as any);
      mockGetAll.mockResolvedValue([
        makeSeating({ seating_id: 1, exam_room_id: 10 }),
        makeSeating({ seating_id: 2, exam_room_id: 20 }),
      ] as any);

      // First room throws, second succeeds
      mockGetExamRoomById
        .mockRejectedValueOnce(new Error("room fetch failed"))
        .mockResolvedValueOnce({ success: true, data: makeExamRoom({ exam_room_id: 20 }) } as any);
      mockGetByProgram.mockResolvedValue([makeExam()] as any);

      const result = await getStudentDashboardData(STUDENT_ID);
      // Second assignment still processed
      expect(result.exams).toHaveLength(1);
    });
  });

  // ── Outer error propagation ───────────────────────────────────────────────

  describe("outer error propagation", () => {
    it("rethrows when getStudentById itself throws (unrecoverable)", async () => {
      mockGetStudentById.mockRejectedValue(new Error("connection lost"));
      await expect(getStudentDashboardData(STUDENT_ID)).rejects.toThrow("connection lost");
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// getStudentExamsByDateRange()
// ═════════════════════════════════════════════════════════════════════════════

describe("getStudentExamsByDateRange()", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns only exams within the date range", async () => {
    const inRange  = new Date(Date.now() + 5  * 86_400_000).toISOString().split("T")[0];
    const outRange = new Date(Date.now() + 30 * 86_400_000).toISOString().split("T")[0];
    const start    = new Date(Date.now() + 1  * 86_400_000).toISOString().split("T")[0];
    const end      = new Date(Date.now() + 10 * 86_400_000).toISOString().split("T")[0];

    mockGetStudentById.mockResolvedValue(mockStudent as any);
    mockGetAll.mockResolvedValue([makeSeating()] as any);
    mockGetExamRoomById.mockResolvedValue({ success: true, data: makeExamRoom() } as any);
    mockGetByProgram.mockResolvedValue([
      makeExam({ exam_id: 1, exam_date: inRange }),
      makeExam({ exam_id: 2, exam_date: outRange }),
    ] as any);

    const result = await getStudentExamsByDateRange(STUDENT_ID, start, end);
    expect(result).toHaveLength(1);
    expect(result[0].exam.exam_id).toBe(1);
  });

  it("includes exams on the start boundary date", async () => {
    const boundary = new Date(Date.now() + 5 * 86_400_000).toISOString().split("T")[0];

    mockGetStudentById.mockResolvedValue(mockStudent as any);
    mockGetAll.mockResolvedValue([makeSeating()] as any);
    mockGetExamRoomById.mockResolvedValue({ success: true, data: makeExamRoom() } as any);
    mockGetByProgram.mockResolvedValue([makeExam({ exam_date: boundary })] as any);

    const result = await getStudentExamsByDateRange(STUDENT_ID, boundary, boundary);
    expect(result).toHaveLength(1);
  });

  it("returns empty array when no exams fall in range", async () => {
    const farFuture = new Date(Date.now() + 365 * 86_400_000).toISOString().split("T")[0];
    const start     = new Date(Date.now() + 1   * 86_400_000).toISOString().split("T")[0];
    const end       = new Date(Date.now() + 10  * 86_400_000).toISOString().split("T")[0];

    mockGetStudentById.mockResolvedValue(mockStudent as any);
    mockGetAll.mockResolvedValue([makeSeating()] as any);
    mockGetExamRoomById.mockResolvedValue({ success: true, data: makeExamRoom() } as any);
    mockGetByProgram.mockResolvedValue([makeExam({ exam_date: farFuture })] as any);

    expect(await getStudentExamsByDateRange(STUDENT_ID, start, end)).toEqual([]);
  });

  it("returns empty array when dashboard throws (error is caught)", async () => {
    mockGetStudentById.mockRejectedValue(new Error("DB down"));
    const result = await getStudentExamsByDateRange(STUDENT_ID, "2025-01-01", "2025-12-31");
    expect(result).toEqual([]);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// getStudentNextExam()
// ═════════════════════════════════════════════════════════════════════════════

describe("getStudentNextExam()", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the first upcoming exam", async () => {
    setupHappyPath(FUTURE_DATE);
    const result = await getStudentNextExam(STUDENT_ID);
    expect(result).not.toBeNull();
    expect(result!.exam.exam_date).toBe(FUTURE_DATE);
  });

  it("returns null when there are no upcoming exams", async () => {
    setupHappyPath(PAST_DATE);
    expect(await getStudentNextExam(STUDENT_ID)).toBeNull();
  });

  it("returns null when student is not found", async () => {
    mockGetStudentById.mockResolvedValue(null);
    expect(await getStudentNextExam(STUDENT_ID)).toBeNull();
  });

  it("returns null (not throws) when dashboard throws", async () => {
    mockGetStudentById.mockRejectedValue(new Error("network error"));
    expect(await getStudentNextExam(STUDENT_ID)).toBeNull();
  });

  it("returns the chronologically earliest upcoming exam", async () => {
    const sooner = new Date(Date.now() + 3  * 86_400_000).toISOString().split("T")[0];
    const later  = new Date(Date.now() + 15 * 86_400_000).toISOString().split("T")[0];

    mockGetStudentById.mockResolvedValue(mockStudent as any);
    mockGetAll.mockResolvedValue([makeSeating()] as any);
    mockGetExamRoomById.mockResolvedValue({ success: true, data: makeExamRoom() } as any);
    // Return later first to confirm sorting takes effect
    mockGetByProgram.mockResolvedValue([
      makeExam({ exam_id: 2, exam_date: later }),
      makeExam({ exam_id: 1, exam_date: sooner }),
    ] as any);

    const result = await getStudentNextExam(STUDENT_ID);
    expect(result!.exam.exam_id).toBe(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// getStudentUpcomingExamCount()
// ═════════════════════════════════════════════════════════════════════════════

describe("getStudentUpcomingExamCount()", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the correct count of upcoming exams", async () => {
    const d1 = new Date(Date.now() + 5  * 86_400_000).toISOString().split("T")[0];
    const d2 = new Date(Date.now() + 10 * 86_400_000).toISOString().split("T")[0];

    mockGetStudentById.mockResolvedValue(mockStudent as any);
    mockGetAll.mockResolvedValue([makeSeating()] as any);
    mockGetExamRoomById.mockResolvedValue({ success: true, data: makeExamRoom() } as any);
    mockGetByProgram.mockResolvedValue([
      makeExam({ exam_id: 1, exam_date: d1 }),
      makeExam({ exam_id: 2, exam_date: d2 }),
    ] as any);

    expect(await getStudentUpcomingExamCount(STUDENT_ID)).toBe(2);
  });

  it("returns 0 when student is not found", async () => {
    mockGetStudentById.mockResolvedValue(null);
    expect(await getStudentUpcomingExamCount(STUDENT_ID)).toBe(0);
  });

  it("returns 0 when all exams are in the past", async () => {
    setupHappyPath(PAST_DATE);
    expect(await getStudentUpcomingExamCount(STUDENT_ID)).toBe(0);
  });

  it("returns 0 (not throws) when dashboard throws", async () => {
    mockGetStudentById.mockRejectedValue(new Error("timeout"));
    expect(await getStudentUpcomingExamCount(STUDENT_ID)).toBe(0);
  });

  it("does not count past exams", async () => {
    mockGetStudentById.mockResolvedValue(mockStudent as any);
    mockGetAll.mockResolvedValue([makeSeating()] as any);
    mockGetExamRoomById.mockResolvedValue({ success: true, data: makeExamRoom() } as any);
    mockGetByProgram.mockResolvedValue([
      makeExam({ exam_id: 1, exam_date: FUTURE_DATE }),
      makeExam({ exam_id: 2, exam_date: PAST_DATE }),
    ] as any);

    expect(await getStudentUpcomingExamCount(STUDENT_ID)).toBe(1);
  });
});
