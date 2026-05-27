import { describe, it, expect, vi, beforeEach } from "vitest";
import { examQueries, Exam } from "@/services/examQueries";

// ─── Mock Supabase ───────────────────────────────────────────────────────────
vi.mock("@/utils/supabase", () => {
  const builder = () => {
    const chain: any = {};
    const methods = [
      "select", "insert", "update", "delete",
      "eq", "neq", "gte", "lte", "lt", "in", "is", "not",
      "ilike", "order", "limit", "single", "head",
    ];
    methods.forEach((m) => {
      chain[m] = vi.fn(() => chain);
    });
    // Default resolved value — overridden per-test
    chain.then = undefined; // not a thenable itself; .single() returns a promise
    return chain;
  };

  return {
    default: { from: vi.fn(() => builder()) },
  };
});

import supabase from "@/utils/supabase";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const mockExam: Exam = {
  exam_id: 1,
  subject_code: "CS101",
  exam_name: "Introduction to CS",
  exam_date: "2025-06-01",
  session: "Morning",
  academic_year: "2024-2025",
  semester: "1",
  year_level: "1",
  program: "CS",
  specialization: null,
  start_time: "08:00",
  end_time: "11:00",
  day_of_week: "Monday",
};

/** Make supabase.from(...).select(...).order(...) etc. resolve with { data, error } */
function mockChain(returnValue: { data?: any; error?: any }) {
  const chain: any = {};
  const methods = [
    "select", "insert", "update", "delete",
    "eq", "neq", "gte", "lte", "lt", "in", "is", "not",
    "ilike", "order", "limit",
  ];
  methods.forEach((m) => {
    chain[m] = vi.fn(() => chain);
  });
  // .single() is the terminal call that returns a Promise
  chain.single = vi.fn(() => Promise.resolve(returnValue));
  // make chain itself awaitable (for non-.single() paths)
  Object.assign(chain, Promise.resolve(returnValue));
  chain.then = (res: any, rej: any) =>
    Promise.resolve(returnValue).then(res, rej);
  return chain;
}

function setupMock(returnValue: { data?: any; error?: any }) {
  const chain = mockChain(returnValue);
  vi.mocked(supabase.from).mockReturnValue(chain as any);
  return chain;
}

// ─── Tests ───────────────────────────────────────────────────────────────────
describe("examQueries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── getAll ────────────────────────────────────────────────────────────────
  describe("getAll()", () => {
    it("returns array of exams on success", async () => {
      setupMock({ data: [mockExam], error: null });
      const result = await examQueries.getAll();
      expect(result).toEqual([mockExam]);
    });

    it("throws when supabase returns an error", async () => {
      setupMock({ data: null, error: { message: "DB error" } });
      await expect(examQueries.getAll()).rejects.toEqual({ message: "DB error" });
    });

    it("returns empty array when no exams exist", async () => {
      setupMock({ data: [], error: null });
      const result = await examQueries.getAll();
      expect(result).toEqual([]);
    });
  });

  // ── getById ───────────────────────────────────────────────────────────────
  describe("getById()", () => {
    it("returns a single exam by ID", async () => {
      setupMock({ data: mockExam, error: null });
      const result = await examQueries.getById(1);
      expect(result).toEqual(mockExam);
    });

    it("throws when exam is not found", async () => {
      setupMock({ data: null, error: { message: "Not found" } });
      await expect(examQueries.getById(999)).rejects.toEqual({ message: "Not found" });
    });
  });

  // ── getBySubjectCode ──────────────────────────────────────────────────────
  describe("getBySubjectCode()", () => {
    it("returns exams matching the subject code", async () => {
      setupMock({ data: [mockExam], error: null });
      const result = await examQueries.getBySubjectCode("CS101");
      expect(result).toEqual([mockExam]);
    });

    it("returns empty array when no match", async () => {
      setupMock({ data: [], error: null });
      const result = await examQueries.getBySubjectCode("UNKNOWN");
      expect(result).toEqual([]);
    });
  });

  // ── getBySemester ─────────────────────────────────────────────────────────
  describe("getBySemester()", () => {
    it("returns exams for given semester", async () => {
      setupMock({ data: [mockExam], error: null });
      const result = await examQueries.getBySemester("1");
      expect(result).toEqual([mockExam]);
    });

    it("throws on DB error", async () => {
      setupMock({ data: null, error: { message: "timeout" } });
      await expect(examQueries.getBySemester("1")).rejects.toEqual({ message: "timeout" });
    });
  });

  // ── getByAcademicYear ─────────────────────────────────────────────────────
  describe("getByAcademicYear()", () => {
    it("returns exams for given academic year", async () => {
      setupMock({ data: [mockExam], error: null });
      const result = await examQueries.getByAcademicYear("2024-2025");
      expect(result).toEqual([mockExam]);
    });
  });

  // ── getByYearLevel ────────────────────────────────────────────────────────
  describe("getByYearLevel()", () => {
    it("returns exams for given year level", async () => {
      setupMock({ data: [mockExam], error: null });
      const result = await examQueries.getByYearLevel("1");
      expect(result).toEqual([mockExam]);
    });
  });

  // ── getByProgram ──────────────────────────────────────────────────────────
  describe("getByProgram()", () => {
    it("returns exams for given program", async () => {
      setupMock({ data: [mockExam], error: null });
      const result = await examQueries.getByProgram("CS");
      expect(result).toEqual([mockExam]);
    });
  });

  // ── getByProgramAndYear ───────────────────────────────────────────────────
  describe("getByProgramAndYear()", () => {
    it("returns exams matching program and year", async () => {
      setupMock({ data: [mockExam], error: null });
      const result = await examQueries.getByProgramAndYear("CS", "1");
      expect(result).toEqual([mockExam]);
    });
  });

  // ── getByProgramYearSpecialization ────────────────────────────────────────
  describe("getByProgramYearSpecialization()", () => {
    it("filters by specialization when provided", async () => {
      const specialized = { ...mockExam, specialization: "SE" };
      setupMock({ data: [specialized], error: null });
      const result = await examQueries.getByProgramYearSpecialization("CS", "1", "SE");
      expect(result).toEqual([specialized]);
    });

    it("uses .is(null) when specialization is null", async () => {
      setupMock({ data: [mockExam], error: null });
      const result = await examQueries.getByProgramYearSpecialization("CS", "1", null);
      expect(result).toEqual([mockExam]);
    });
  });

  // ── getByDateRange ────────────────────────────────────────────────────────
  describe("getByDateRange()", () => {
    it("returns exams within date range", async () => {
      setupMock({ data: [mockExam], error: null });
      const result = await examQueries.getByDateRange("2025-06-01", "2025-06-30");
      expect(result).toEqual([mockExam]);
    });
  });

  // ── getByDate ─────────────────────────────────────────────────────────────
  describe("getByDate()", () => {
    it("returns exams on specific date", async () => {
      setupMock({ data: [mockExam], error: null });
      const result = await examQueries.getByDate("2025-06-01");
      expect(result).toEqual([mockExam]);
    });
  });

  // ── create ────────────────────────────────────────────────────────────────
  describe("create()", () => {
    it("creates and returns new exam", async () => {
      setupMock({ data: mockExam, error: null });
      const { exam_id, ...newExam } = mockExam;
      const result = await examQueries.create(newExam);
      expect(result).toEqual(mockExam);
    });

    it("throws on insert error", async () => {
      setupMock({ data: null, error: { message: "Insert failed" } });
      const { exam_id, ...newExam } = mockExam;
      await expect(examQueries.create(newExam)).rejects.toEqual({ message: "Insert failed" });
    });
  });

  // ── update ────────────────────────────────────────────────────────────────
  describe("update()", () => {
    it("updates and returns modified exam", async () => {
      const updated = { ...mockExam, exam_name: "Updated Name" };
      setupMock({ data: updated, error: null });
      const result = await examQueries.update(1, { exam_name: "Updated Name" });
      expect(result.exam_name).toBe("Updated Name");
    });

    it("throws on update error", async () => {
      setupMock({ data: null, error: { message: "Update failed" } });
      await expect(examQueries.update(1, { exam_name: "X" })).rejects.toEqual({
        message: "Update failed",
      });
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────
  describe("delete()", () => {
    it("returns true on successful delete", async () => {
      setupMock({ error: null });
      const result = await examQueries.delete(1);
      expect(result).toBe(true);
    });

    it("throws on delete error", async () => {
      setupMock({ error: { message: "FK constraint" } });
      await expect(examQueries.delete(1)).rejects.toEqual({ message: "FK constraint" });
    });
  });

  // ── getUniquePrograms ─────────────────────────────────────────────────────
  describe("getUniquePrograms()", () => {
    it("returns deduplicated list of programs", async () => {
      setupMock({ data: [{ program: "CS" }, { program: "CS" }, { program: "IT" }], error: null });
      const result = await examQueries.getUniquePrograms();
      expect(result).toEqual(["CS", "IT"]);
    });
  });

  // ── getUniqueSpecializations ──────────────────────────────────────────────
  describe("getUniqueSpecializations()", () => {
    it("returns deduplicated list of specializations (excluding nulls)", async () => {
      setupMock({
        data: [{ specialization: "SE" }, { specialization: "SE" }, { specialization: "KE" }],
        error: null,
      });
      const result = await examQueries.getUniqueSpecializations();
      expect(result).toEqual(["SE", "KE"]);
    });
  });

  // ── getUniqueYearLevels ───────────────────────────────────────────────────
  describe("getUniqueYearLevels()", () => {
    it("returns deduplicated list of year levels", async () => {
      setupMock({
        data: [{ year_level: "1" }, { year_level: "1" }, { year_level: "2" }],
        error: null,
      });
      const result = await examQueries.getUniqueYearLevels();
      expect(result).toEqual(["1", "2"]);
    });
  });

  // ── getUniqueAcademicYears ────────────────────────────────────────────────
  describe("getUniqueAcademicYears()", () => {
    it("returns deduplicated list of academic years", async () => {
      setupMock({
        data: [{ academic_year: "2024-2025" }, { academic_year: "2024-2025" }, { academic_year: "2023-2024" }],
        error: null,
      });
      const result = await examQueries.getUniqueAcademicYears();
      expect(result).toEqual(["2024-2025", "2023-2024"]);
    });
  });

  // ── searchByCourse ────────────────────────────────────────────────────────
  describe("searchByCourse()", () => {
    it("returns exams matching search term", async () => {
      setupMock({ data: [mockExam], error: null });
      const result = await examQueries.searchByCourse("Intro");
      expect(result).toEqual([mockExam]);
    });

    it("returns empty array when nothing matches", async () => {
      setupMock({ data: [], error: null });
      const result = await examQueries.searchByCourse("zzznomatch");
      expect(result).toEqual([]);
    });
  });

  // ── getExamCalendar ───────────────────────────────────────────────────────
  describe("getExamCalendar()", () => {
    it("groups exams by date", async () => {
      const exam2: Exam = { ...mockExam, exam_id: 2, exam_date: "2025-06-02" };
      setupMock({ data: [mockExam, exam2], error: null });
      const result = await examQueries.getExamCalendar("2025-06-01", "2025-06-30");
      expect(result["2025-06-01"]).toEqual([mockExam]);
      expect(result["2025-06-02"]).toEqual([exam2]);
    });

    it("returns empty object when no exams in range", async () => {
      setupMock({ data: [], error: null });
      const result = await examQueries.getExamCalendar("2025-01-01", "2025-01-31");
      expect(result).toEqual({});
    });
  });

  // ── getUniqueDates ────────────────────────────────────────────────────────
  describe("getUniqueDates()", () => {
    it("returns unique dates with day_of_week", async () => {
      const rows = [
        { exam_date: "2025-06-01", day_of_week: "Monday" },
        { exam_date: "2025-06-01", day_of_week: "Monday" }, // duplicate
        { exam_date: "2025-06-02", day_of_week: "Tuesday" },
      ];
      setupMock({ data: rows, error: null });
      const result = await examQueries.getUniqueDates();
      expect(result).toHaveLength(2);
      expect(result[0].exam_date).toBe("2025-06-01");
      expect(result[1].exam_date).toBe("2025-06-02");
    });
  });

  // ── getStudentSchedule ────────────────────────────────────────────────────
  describe("getStudentSchedule()", () => {
    it("returns schedule without specialization filter when not provided", async () => {
      setupMock({ data: [mockExam], error: null });
      const result = await examQueries.getStudentSchedule("CS", "1");
      expect(result).toEqual([mockExam]);
    });

    it("applies specialization filter when provided", async () => {
      const specialized = { ...mockExam, specialization: "SE" };
      setupMock({ data: [specialized], error: null });
      const result = await examQueries.getStudentSchedule("CS", "1", "SE");
      expect(result).toEqual([specialized]);
    });
  });
});
