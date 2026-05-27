import { describe, it, expect, vi, beforeEach } from "vitest";
import { teacherQueries, Teacher } from "@/services/teacherQueries";

vi.mock("@/utils/supabase", () => {
  const makeChain = (resolved: any) => {
    const chain: any = {};
    ["select","insert","update","delete","eq","in","gte","lte","lt","ilike","order","single"].forEach(
      (m) => { chain[m] = vi.fn(() => chain); }
    );
    chain.then = (res: any, rej: any) => Promise.resolve(resolved).then(res, rej);
    return chain;
  };
  return { default: { from: vi.fn(() => makeChain({ data: [], error: null })) } };
});

import supabase from "@/utils/supabase";

const mockTeacher: Teacher = { teacher_id: 1, name: "Dr. Smith", rank: "Professor", department: "Computer Science", total_periods_assigned: 5 };
const mockTeacher2: Teacher = { teacher_id: 2, name: "Ms. Jones", rank: "Lecturer", department: "Mathematics", total_periods_assigned: 10 };

function makeChain(resolved: any) {
  const chain: any = {};
  ["select","insert","update","delete","eq","in","gte","lte","lt","ilike","order"].forEach(
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

describe("teacherQueries", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("getAll()", () => {
    it("returns all teachers", async () => {
      setupMock({ data: [mockTeacher, mockTeacher2], error: null });
      expect(await teacherQueries.getAll()).toHaveLength(2);
    });
    it("returns empty array when none", async () => {
      setupMock({ data: [], error: null });
      expect(await teacherQueries.getAll()).toEqual([]);
    });
    it("throws on DB error", async () => {
      setupMock({ data: null, error: { message: "fail" } });
      await expect(teacherQueries.getAll()).rejects.toEqual({ message: "fail" });
    });
  });

  describe("getById()", () => {
    it("returns teacher by ID", async () => {
      setupMock({ data: mockTeacher, error: null });
      expect((await teacherQueries.getById(1)).name).toBe("Dr. Smith");
    });
    it("throws when not found", async () => {
      setupMock({ data: null, error: { message: "Not found" } });
      await expect(teacherQueries.getById(999)).rejects.toEqual({ message: "Not found" });
    });
  });

  describe("getByRank()", () => {
    it("returns teacher by rank", async () => {
      setupMock({ data: mockTeacher, error: null });
      expect((await teacherQueries.getByRank("Professor")).rank).toBe("Professor");
    });
    it("throws on DB error", async () => {
      setupMock({ data: null, error: { message: "fail" } });
      await expect(teacherQueries.getByRank("Unknown")).rejects.toBeDefined();
    });
  });

  describe("getByDepartment()", () => {
    it("returns teachers in department", async () => {
      setupMock({ data: [mockTeacher], error: null });
      expect((await teacherQueries.getByDepartment("Computer Science"))[0].department).toBe("Computer Science");
    });
    it("returns empty array when no match", async () => {
      setupMock({ data: [], error: null });
      expect(await teacherQueries.getByDepartment("Physics")).toEqual([]);
    });
    it("throws on DB error", async () => {
      setupMock({ data: null, error: { message: "fail" } });
      await expect(teacherQueries.getByDepartment("CS")).rejects.toBeDefined();
    });
  });

  describe("searchByName()", () => {
    it("returns teachers matching name", async () => {
      setupMock({ data: [mockTeacher], error: null });
      expect((await teacherQueries.searchByName("Smith"))[0].name).toBe("Dr. Smith");
    });
    it("returns empty array when no match", async () => {
      setupMock({ data: [], error: null });
      expect(await teacherQueries.searchByName("zzz")).toEqual([]);
    });
    it("throws on DB error", async () => {
      setupMock({ data: null, error: { message: "fail" } });
      await expect(teacherQueries.searchByName("x")).rejects.toBeDefined();
    });
  });

  describe("getByMaxPeriods()", () => {
    it("returns teachers at or below threshold", async () => {
      setupMock({ data: [mockTeacher], error: null });
      expect(await teacherQueries.getByMaxPeriods(10)).toHaveLength(1);
    });
    it("throws on DB error", async () => {
      setupMock({ data: null, error: { message: "fail" } });
      await expect(teacherQueries.getByMaxPeriods(10)).rejects.toBeDefined();
    });
  });

  describe("getByMinPeriods()", () => {
    it("returns teachers at or above threshold", async () => {
      setupMock({ data: [mockTeacher2], error: null });
      expect(await teacherQueries.getByMinPeriods(5)).toHaveLength(1);
    });
    it("throws on DB error", async () => {
      setupMock({ data: null, error: { message: "fail" } });
      await expect(teacherQueries.getByMinPeriods(5)).rejects.toBeDefined();
    });
  });

  describe("getAvailable()", () => {
    it("uses default max of 20 periods", async () => {
      setupMock({ data: [mockTeacher, mockTeacher2], error: null });
      expect(await teacherQueries.getAvailable()).toHaveLength(2);
    });
    it("accepts custom maxPeriods", async () => {
      setupMock({ data: [mockTeacher], error: null });
      expect(await teacherQueries.getAvailable(8)).toHaveLength(1);
    });
    it("throws on DB error", async () => {
      setupMock({ data: null, error: { message: "fail" } });
      await expect(teacherQueries.getAvailable()).rejects.toBeDefined();
    });
  });

  describe("getAvailableByDepartment()", () => {
    it("returns available teachers in department", async () => {
      setupMock({ data: [mockTeacher], error: null });
      expect((await teacherQueries.getAvailableByDepartment("Computer Science"))[0].department).toBe("Computer Science");
    });
    it("throws on DB error", async () => {
      setupMock({ data: null, error: { message: "fail" } });
      await expect(teacherQueries.getAvailableByDepartment("CS")).rejects.toBeDefined();
    });
  });

  describe("create()", () => {
    it("creates and returns new teacher", async () => {
      setupMock({ data: mockTeacher, error: null });
      const { teacher_id, ...newT } = mockTeacher;
      expect((await teacherQueries.create(newT)).name).toBe("Dr. Smith");
    });
    it("throws on DB error", async () => {
      setupMock({ data: null, error: { message: "Duplicate" } });
      const { teacher_id, ...newT } = mockTeacher;
      await expect(teacherQueries.create(newT)).rejects.toBeDefined();
    });
  });

  describe("createMany()", () => {
    it("creates multiple teachers", async () => {
      setupMock({ data: [mockTeacher, mockTeacher2], error: null });
      expect(await teacherQueries.createMany([])).toHaveLength(2);
    });
    it("throws on DB error", async () => {
      setupMock({ data: null, error: { message: "fail" } });
      await expect(teacherQueries.createMany([])).rejects.toBeDefined();
    });
  });

  describe("update()", () => {
    it("updates and returns modified teacher", async () => {
      setupMock({ data: { ...mockTeacher, name: "Updated" }, error: null });
      expect((await teacherQueries.update(1, { name: "Updated" })).name).toBe("Updated");
    });
    it("throws on DB error", async () => {
      setupMock({ data: null, error: { message: "fail" } });
      await expect(teacherQueries.update(1, {})).rejects.toBeDefined();
    });
  });

  describe("delete()", () => {
    it("returns true on success", async () => {
      setupMock({ error: null });
      expect(await teacherQueries.delete(1)).toBe(true);
    });
    it("throws on FK constraint", async () => {
      setupMock({ error: { message: "FK violation" } });
      await expect(teacherQueries.delete(1)).rejects.toBeDefined();
    });
  });

  describe("incrementPeriods()", () => {
    it("increments by 1 by default", async () => {
      let call = 0;
      vi.mocked(supabase.from).mockImplementation(() => {
        call++;
        return makeChain(call === 1
          ? { data: mockTeacher, error: null }
          : { data: { ...mockTeacher, total_periods_assigned: 6 }, error: null }
        ) as any;
      });
      expect((await teacherQueries.incrementPeriods(1)).total_periods_assigned).toBe(6);
    });
    it("increments by custom amount", async () => {
      let call = 0;
      vi.mocked(supabase.from).mockImplementation(() => {
        call++;
        return makeChain(call === 1
          ? { data: mockTeacher, error: null }
          : { data: { ...mockTeacher, total_periods_assigned: 8 }, error: null }
        ) as any;
      });
      expect((await teacherQueries.incrementPeriods(1, 3)).total_periods_assigned).toBe(8);
    });
    it("throws when getById fails", async () => {
      setupMock({ data: null, error: { message: "fail" } });
      await expect(teacherQueries.incrementPeriods(1)).rejects.toBeDefined();
    });
  });

  describe("decrementPeriods()", () => {
    it("decrements by 1 by default", async () => {
      let call = 0;
      vi.mocked(supabase.from).mockImplementation(() => {
        call++;
        return makeChain(call === 1
          ? { data: mockTeacher, error: null }
          : { data: { ...mockTeacher, total_periods_assigned: 4 }, error: null }
        ) as any;
      });
      expect((await teacherQueries.decrementPeriods(1)).total_periods_assigned).toBe(4);
    });
    it("never goes below 0 (floors at 0)", async () => {
      const zeroTeacher = { ...mockTeacher, total_periods_assigned: 0 };
      let call = 0;
      vi.mocked(supabase.from).mockImplementation(() => {
        call++;
        return makeChain(call === 1
          ? { data: zeroTeacher, error: null }
          : { data: { ...zeroTeacher, total_periods_assigned: 0 }, error: null }
        ) as any;
      });
      expect((await teacherQueries.decrementPeriods(1, 5)).total_periods_assigned).toBe(0);
    });
  });

  describe("resetAllPeriods()", () => {
    it("resets all teachers to 0 periods", async () => {
      setupMock({ data: [{ ...mockTeacher, total_periods_assigned: 0 }], error: null });
      const result = await teacherQueries.resetAllPeriods();
      result.forEach((t) => expect(t.total_periods_assigned).toBe(0));
    });
    it("throws on DB error", async () => {
      setupMock({ data: null, error: { message: "fail" } });
      await expect(teacherQueries.resetAllPeriods()).rejects.toBeDefined();
    });
  });

  describe("getStats()", () => {
    it("calculates totals and averages correctly", async () => {
      setupMock({
        data: [
          { department: "CS", total_periods_assigned: 5 },
          { department: "CS", total_periods_assigned: 10 },
          { department: "Math", total_periods_assigned: 3 },
        ],
        error: null,
      });
      const r = await teacherQueries.getStats();
      expect(r.totalTeachers).toBe(3);
      expect(r.totalPeriodsAssigned).toBe(18);
      expect(r.averagePeriodsPerTeacher).toBeCloseTo(6);
    });
    it("calculates department breakdown correctly", async () => {
      setupMock({
        data: [
          { department: "CS", total_periods_assigned: 5 },
          { department: "CS", total_periods_assigned: 10 },
          { department: "Math", total_periods_assigned: 3 },
        ],
        error: null,
      });
      const r = await teacherQueries.getStats();
      expect(r.byDepartment["CS"].count).toBe(2);
      expect(r.byDepartment["CS"].totalPeriods).toBe(15);
      expect(r.byDepartment["Math"].count).toBe(1);
    });
    it("returns 0 average when no teachers", async () => {
      setupMock({ data: [], error: null });
      expect((await teacherQueries.getStats()).averagePeriodsPerTeacher).toBe(0);
    });
    it("throws on DB error", async () => {
      setupMock({ data: null, error: { message: "fail" } });
      await expect(teacherQueries.getStats()).rejects.toBeDefined();
    });
  });

  describe("getWithFilters()", () => {
    it("returns all when no filters", async () => {
      setupMock({ data: [mockTeacher, mockTeacher2], error: null });
      expect(await teacherQueries.getWithFilters({})).toHaveLength(2);
    });
    it("filters by department", async () => {
      setupMock({ data: [mockTeacher], error: null });
      expect(await teacherQueries.getWithFilters({ department: "Computer Science" })).toHaveLength(1);
    });
    it("filters by minPeriods", async () => {
      setupMock({ data: [mockTeacher2], error: null });
      expect(await teacherQueries.getWithFilters({ minPeriods: 8 })).toHaveLength(1);
    });
    it("filters by maxPeriods", async () => {
      setupMock({ data: [mockTeacher], error: null });
      expect(await teacherQueries.getWithFilters({ maxPeriods: 7 })).toHaveLength(1);
    });
    it("applies all filters combined", async () => {
      setupMock({ data: [mockTeacher], error: null });
      expect(await teacherQueries.getWithFilters({ department: "CS", minPeriods: 0, maxPeriods: 10 })).toHaveLength(1);
    });
    it("throws on DB error", async () => {
      setupMock({ data: null, error: { message: "fail" } });
      await expect(teacherQueries.getWithFilters({})).rejects.toBeDefined();
    });
  });
});
