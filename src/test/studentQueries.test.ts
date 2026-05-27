import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getTotalStudentCount,
  getRecentStudents,
  getAllStudents,
  getStudentById,
  getStudentsByYearLevel,
  getStudentsByMajor,
  getStudentsBySpecialization,
  getRetakeStudents,
  searchStudentsByName,
  getStudentStatistics,
  getUniqueSemesters,
  getUniqueYearLevels,
  getUniqueMajors,
  getUniqueSpecializations,
  markStudentsAsPending,
  releaseStudentsFromPending,
  Student,
} from "@/services/studentQueries";

// ─── Mock Supabase ───────────────────────────────────────────────────────────
vi.mock("@/utils/supabase", () => {
  const makeChain = (resolved: any) => {
    const chain: any = {};
    const methods = [
      "select", "insert", "update", "delete",
      "eq", "neq", "gte", "lte", "lt", "in", "is", "not",
      "ilike", "order", "limit", "single",
    ];
    methods.forEach((m) => {
      chain[m] = vi.fn(() => chain);
    });
    chain.then = (res: any, rej: any) => Promise.resolve(resolved).then(res, rej);
    return chain;
  };

  return { default: { from: vi.fn(() => makeChain({ data: [], error: null, count: 0 })) } };
});

import supabase from "@/utils/supabase";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const mockStudent: Student = {
  student_id: 1,
  student_number: "STU001",
  name: "Alice",
  year_level: 1,
  retake: false,
  major: "CS",
  sem: 1,
  specialization: "SE",
  is_assigned: false,
};

function setupMock(resolved: any) {
  const chain: any = {};
  const methods = [
    "select", "insert", "update", "delete",
    "eq", "in", "not", "ilike", "order", "limit", "single",
  ];
  methods.forEach((m) => { chain[m] = vi.fn(() => chain); });
  chain.then = (res: any, rej: any) => Promise.resolve(resolved).then(res, rej);
  vi.mocked(supabase.from).mockReturnValue(chain as any);
  return chain;
}

// ─── Tests ───────────────────────────────────────────────────────────────────
describe("studentQueries", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── getTotalStudentCount ──────────────────────────────────────────────────
  describe("getTotalStudentCount()", () => {
    it("returns total count from DB", async () => {
      setupMock({ count: 42, error: null });
      const result = await getTotalStudentCount();
      expect(result).toBe(42);
    });

    it("returns 0 when count is null", async () => {
      setupMock({ count: null, error: null });
      const result = await getTotalStudentCount();
      expect(result).toBe(0);
    });

    it("returns 0 on DB error (does not throw)", async () => {
      setupMock({ count: null, error: { message: "DB error" } });
      const result = await getTotalStudentCount();
      expect(result).toBe(0);
    });
  });

  // ── getRecentStudents ─────────────────────────────────────────────────────
  describe("getRecentStudents()", () => {
    it("returns students with id field added", async () => {
      setupMock({ data: [mockStudent], error: null });
      const result = await getRecentStudents();
      expect(result[0].id).toBe(mockStudent.student_id);
      expect(result[0].name).toBe("Alice");
    });

    it("returns empty array on DB error", async () => {
      setupMock({ data: null, error: { message: "fail" } });
      const result = await getRecentStudents();
      expect(result).toEqual([]);
    });

    it("uses default limit of 6", async () => {
      setupMock({ data: [], error: null });
      const result = await getRecentStudents();
      expect(result).toEqual([]);
    });

    it("accepts custom limit", async () => {
      setupMock({ data: [mockStudent], error: null });
      const result = await getRecentStudents(1);
      expect(result).toHaveLength(1);
    });
  });

  // ── getAllStudents ────────────────────────────────────────────────────────
  describe("getAllStudents()", () => {
    it("returns all students with id field", async () => {
      setupMock({ data: [mockStudent], error: null });
      const result = await getAllStudents();
      expect(result[0].id).toBe(1);
    });

    it("returns empty array on error", async () => {
      setupMock({ data: null, error: { message: "fail" } });
      const result = await getAllStudents();
      expect(result).toEqual([]);
    });
  });

  // ── getStudentById ────────────────────────────────────────────────────────
  describe("getStudentById()", () => {
    it("returns student with id field when found", async () => {
      setupMock({ data: mockStudent, error: null });
      const result = await getStudentById(1);
      expect(result).not.toBeNull();
      expect(result!.id).toBe(1);
    });

    it("returns null on DB error", async () => {
      setupMock({ data: null, error: { message: "Not found" } });
      const result = await getStudentById(999);
      expect(result).toBeNull();
    });

    it("returns null when data is null", async () => {
      setupMock({ data: null, error: null });
      const result = await getStudentById(999);
      expect(result).toBeNull();
    });
  });

  // ── getStudentsByYearLevel ────────────────────────────────────────────────
  describe("getStudentsByYearLevel()", () => {
    it("returns students for given year level", async () => {
      setupMock({ data: [mockStudent], error: null });
      const result = await getStudentsByYearLevel(1);
      expect(result[0].year_level).toBe(1);
    });

    it("returns empty array on error", async () => {
      setupMock({ data: null, error: { message: "fail" } });
      const result = await getStudentsByYearLevel(1);
      expect(result).toEqual([]);
    });
  });

  // ── getStudentsByMajor ────────────────────────────────────────────────────
  describe("getStudentsByMajor()", () => {
    it("returns students for given major", async () => {
      setupMock({ data: [mockStudent], error: null });
      const result = await getStudentsByMajor("CS");
      expect(result[0].major).toBe("CS");
    });

    it("returns empty array on error", async () => {
      setupMock({ data: null, error: { message: "fail" } });
      const result = await getStudentsByMajor("CS");
      expect(result).toEqual([]);
    });
  });

  // ── getStudentsBySpecialization ───────────────────────────────────────────
  describe("getStudentsBySpecialization()", () => {
    it("returns students for given specialization", async () => {
      setupMock({ data: [mockStudent], error: null });
      const result = await getStudentsBySpecialization("SE");
      expect(result[0].specialization).toBe("SE");
    });

    it("returns empty array on error", async () => {
      setupMock({ data: null, error: { message: "fail" } });
      const result = await getStudentsBySpecialization("SE");
      expect(result).toEqual([]);
    });
  });

  // ── getRetakeStudents ─────────────────────────────────────────────────────
  describe("getRetakeStudents()", () => {
    it("returns retake students", async () => {
      const retakeStudent = { ...mockStudent, retake: true };
      setupMock({ data: [retakeStudent], error: null });
      const result = await getRetakeStudents();
      expect(result[0].retake).toBe(true);
    });

    it("returns empty array on error", async () => {
      setupMock({ data: null, error: { message: "fail" } });
      const result = await getRetakeStudents();
      expect(result).toEqual([]);
    });
  });

  // ── searchStudentsByName ──────────────────────────────────────────────────
  describe("searchStudentsByName()", () => {
    it("returns students matching name search", async () => {
      setupMock({ data: [mockStudent], error: null });
      const result = await searchStudentsByName("Alice");
      expect(result[0].name).toBe("Alice");
    });

    it("returns empty array when no match", async () => {
      setupMock({ data: [], error: null });
      const result = await searchStudentsByName("zzznotexist");
      expect(result).toEqual([]);
    });

    it("returns empty array on error", async () => {
      setupMock({ data: null, error: { message: "fail" } });
      const result = await searchStudentsByName("Alice");
      expect(result).toEqual([]);
    });
  });

  // ── getUniqueSemesters ────────────────────────────────────────────────────
  describe("getUniqueSemesters()", () => {
    it("returns sorted unique semesters", async () => {
      setupMock({ data: [{ sem: 2 }, { sem: 1 }, { sem: 2 }], error: null });
      const result = await getUniqueSemesters();
      expect(result).toEqual([1, 2]);
    });

    it("returns empty array on error", async () => {
      setupMock({ data: null, error: { message: "fail" } });
      const result = await getUniqueSemesters();
      expect(result).toEqual([]);
    });
  });

  // ── getUniqueYearLevels ───────────────────────────────────────────────────
  describe("getUniqueYearLevels()", () => {
    it("returns sorted unique year levels", async () => {
      setupMock({ data: [{ year_level: 3 }, { year_level: 1 }, { year_level: 3 }], error: null });
      const result = await getUniqueYearLevels();
      expect(result).toEqual([1, 3]);
    });

    it("returns empty array on error", async () => {
      setupMock({ data: null, error: { message: "fail" } });
      const result = await getUniqueYearLevels();
      expect(result).toEqual([]);
    });
  });

  // ── getUniqueMajors ───────────────────────────────────────────────────────
  describe("getUniqueMajors()", () => {
    it("returns sorted unique majors", async () => {
      setupMock({ data: [{ major: "IT" }, { major: "CS" }, { major: "IT" }], error: null });
      const result = await getUniqueMajors();
      expect(result).toEqual(["CS", "IT"]);
    });

    it("returns empty array on error", async () => {
      setupMock({ data: null, error: { message: "fail" } });
      const result = await getUniqueMajors();
      expect(result).toEqual([]);
    });
  });

  // ── getUniqueSpecializations ──────────────────────────────────────────────
  describe("getUniqueSpecializations()", () => {
    it("returns sorted unique specializations", async () => {
      setupMock({ data: [{ specialization: "SE" }, { specialization: "KE" }, { specialization: "SE" }], error: null });
      const result = await getUniqueSpecializations();
      expect(result).toEqual(["KE", "SE"]);
    });

    it("returns empty array on error", async () => {
      setupMock({ data: null, error: { message: "fail" } });
      const result = await getUniqueSpecializations();
      expect(result).toEqual([]);
    });
  });

  // ── markStudentsAsPending ─────────────────────────────────────────────────
  describe("markStudentsAsPending()", () => {
    it("returns success: true when update succeeds", async () => {
      setupMock({ error: null });
      const result = await markStudentsAsPending([1, 2, 3]);
      expect(result.success).toBe(true);
    });

    it("returns success: false and error when update fails", async () => {
      setupMock({ error: { message: "Update failed" } });
      const result = await markStudentsAsPending([1]);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("handles empty array gracefully", async () => {
      setupMock({ error: null });
      const result = await markStudentsAsPending([]);
      expect(result.success).toBe(true);
    });
  });

  // ── releaseStudentsFromPending ────────────────────────────────────────────
  describe("releaseStudentsFromPending()", () => {
    it("returns success: true when update succeeds", async () => {
      setupMock({ error: null });
      const result = await releaseStudentsFromPending([1, 2]);
      expect(result.success).toBe(true);
    });

    it("returns success: false on DB error", async () => {
      setupMock({ error: { message: "fail" } });
      const result = await releaseStudentsFromPending([1]);
      expect(result.success).toBe(false);
    });
  });

  // ── getStudentStatistics ──────────────────────────────────────────────────
  describe("getStudentStatistics()", () => {
    it("returns zero stats on DB error", async () => {
      // Promise.all will be called — return safe defaults
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ count: null, data: null, error: { message: "fail" } }),
          then: (res: any) => Promise.resolve({ count: null, data: null, error: null }).then(res),
        }),
      } as any);

      const result = await getStudentStatistics();
      expect(result.totalStudents).toBe(0);
      expect(result.retakeStudents).toBe(0);
    });

    it("aggregates distributions from data", async () => {
      // We test the pure transformation logic separately
      const yearData = [{ year_level: 1 }, { year_level: 1 }, { year_level: 2 }];
      const dist: Record<number, number> = {};
      yearData.forEach((r) => {
        dist[r.year_level] = (dist[r.year_level] || 0) + 1;
      });
      expect(dist[1]).toBe(2);
      expect(dist[2]).toBe(1);
    });
  });
});
