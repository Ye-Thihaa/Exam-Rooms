import { describe, it, expect, vi, beforeEach } from "vitest";
import { teacherAssignmentQueries, BulkAssignContext } from "@/services/teacherassignmentQueries";

vi.mock("@/utils/supabase", () => {
  const makeChain = (resolved: any) => {
    const chain: any = {};
    ["select","insert","update","delete","eq","in","order","limit","single"].forEach((m) => { chain[m] = vi.fn(() => chain); });
    chain.then = (res: any, rej: any) => Promise.resolve(resolved).then(res, rej);
    return chain;
  };
  return { default: { from: vi.fn(() => makeChain({ data: [], error: null })) } };
});

vi.mock("@/services/teacherAssignmentTypes", () => ({
  SUPERVISOR_RANKS: ["Professor", "Associate Professor"],
  ASSISTANT_RANKS: ["Lecturer", "Assistant Lecturer"],
  enrichTeacherWithCapability: vi.fn((t: any) => ({ ...t, canSupervise: true, canAssist: true })),
  getWorkloadLevel: vi.fn(() => "Low"),
}));

import supabase from "@/utils/supabase";

const mockTeacher: any = { teacher_id: 1, name: "Dr. Smith", rank: "Professor", department: "CS", total_periods_assigned: 3, canSupervise: true, canAssist: true };
const mockAssistant: any = { teacher_id: 2, name: "Ms. Jones", rank: "Lecturer", department: "Math", total_periods_assigned: 5, canSupervise: false, canAssist: true };

const makeTA = (t: any, isAvailable = true): any => ({
  ...t,
  availability: { teacher_id: t.teacher_id, is_available: isAvailable, conflict_reason: isAvailable ? null : "Already Assigned" },
  workload_level: "Low",
});

function makeBulkContext(overrides: Partial<BulkAssignContext> = {}): BulkAssignContext {
  return {
    roomIdByNumber: new Map([["101", 10]]),
    roomIdByExamRoomId: new Map([[1, 10]]),
    examRoomIdsByDate: new Map([["2025-06-01", new Set([1])]]),
    resolvedByRoomDate: new Map([["101|2025-06-01", { examRoomId: 1, linkId: 99 }]]),
    supervisors: [makeTA(mockTeacher)],
    assistants: [makeTA(mockAssistant)],
    busyByDate: new Map(),
    ...overrides,
  };
}

function makeChain(resolved: any) {
  const chain: any = {};
  ["select","insert","update","delete","eq","in","order","limit"].forEach((m) => { chain[m] = vi.fn(() => chain); });
  chain.single = vi.fn(() => Promise.resolve(resolved));
  chain.then = (res: any, rej: any) => Promise.resolve(resolved).then(res, rej);
  return chain;
}

const setupMock = (resolved: any) => {
  const chain = makeChain(resolved);
  vi.mocked(supabase.from).mockReturnValue(chain as any);
  return chain;
};

describe("teacherAssignmentQueries", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("resolveRoomLink()", () => {
    it("returns { examRoomId, linkId } when key exists", () => {
      expect(teacherAssignmentQueries.resolveRoomLink("101", "2025-06-01", makeBulkContext())).toEqual({ examRoomId: 1, linkId: 99 });
    });
    it("returns null when room not in context", () => {
      expect(teacherAssignmentQueries.resolveRoomLink("999", "2025-06-01", makeBulkContext())).toBeNull();
    });
    it("returns null when date not in context", () => {
      expect(teacherAssignmentQueries.resolveRoomLink("101", "2099-01-01", makeBulkContext())).toBeNull();
    });
    it("returns null when context is empty", () => {
      expect(teacherAssignmentQueries.resolveRoomLink("101", "2025-06-01", makeBulkContext({ resolvedByRoomDate: new Map() }))).toBeNull();
    });
  });

  describe("resolveExamRoomId()", () => {
    it("returns examRoomId when found", () => {
      expect(teacherAssignmentQueries.resolveExamRoomId("101", "2025-06-01", makeBulkContext())).toBe(1);
    });
    it("returns null when not found", () => {
      expect(teacherAssignmentQueries.resolveExamRoomId("101", "2025-06-01", makeBulkContext({ resolvedByRoomDate: new Map() }))).toBeNull();
    });
  });

  describe("getTeachersFromContext()", () => {
    it("returns supervisors when role is Supervisor", () => {
      const result = teacherAssignmentQueries.getTeachersFromContext("Supervisor", "2025-06-01", makeBulkContext(), new Set());
      expect(result[0].name).toBe("Dr. Smith");
    });
    it("returns assistants when role is Assistant", () => {
      const result = teacherAssignmentQueries.getTeachersFromContext("Assistant", "2025-06-01", makeBulkContext(), new Set());
      expect(result[0].name).toBe("Ms. Jones");
    });
    it("marks teacher unavailable when in busyByDate", () => {
      const ctx = makeBulkContext({ busyByDate: new Map([["2025-06-01", new Set([1])]]) });
      expect(teacherAssignmentQueries.getTeachersFromContext("Supervisor", "2025-06-01", ctx, new Set())[0].availability.is_available).toBe(false);
    });
    it("marks teacher unavailable when in sessionUsedIds", () => {
      expect(teacherAssignmentQueries.getTeachersFromContext("Supervisor", "2025-06-01", makeBulkContext(), new Set([1]))[0].availability.is_available).toBe(false);
    });
    it("marks teacher available when not busy", () => {
      expect(teacherAssignmentQueries.getTeachersFromContext("Supervisor", "2025-06-01", makeBulkContext(), new Set())[0].availability.is_available).toBe(true);
    });
    it("returns empty array when pool is empty", () => {
      expect(teacherAssignmentQueries.getTeachersFromContext("Supervisor", "2025-06-01", makeBulkContext({ supervisors: [] }), new Set())).toEqual([]);
    });
    it("handles date not in busyByDate (uses empty set)", () => {
      const ctx = makeBulkContext({ busyByDate: new Map() });
      expect(teacherAssignmentQueries.getTeachersFromContext("Supervisor", "2099-01-01", ctx, new Set())[0].availability.is_available).toBe(true);
    });
  });

  describe("getAll()", () => {
    it("returns all assignments", async () => {
      setupMock({ data: [{ assignment_id: 1 }], error: null });
      expect(await teacherAssignmentQueries.getAll()).toHaveLength(1);
    });
    it("returns empty array when none", async () => {
      setupMock({ data: [], error: null });
      expect(await teacherAssignmentQueries.getAll()).toEqual([]);
    });
    it("throws on DB error", async () => {
      setupMock({ data: null, error: { message: "fail" } });
      await expect(teacherAssignmentQueries.getAll()).rejects.toBeDefined();
    });
  });

  describe("getByExamRoom()", () => {
    it("returns assignments for room", async () => {
      setupMock({ data: [{ assignment_id: 1, exam_room_id: 10 }], error: null });
      expect(await teacherAssignmentQueries.getByExamRoom(10)).toHaveLength(1);
    });
    it("throws on DB error", async () => {
      setupMock({ data: null, error: { message: "fail" } });
      await expect(teacherAssignmentQueries.getByExamRoom(10)).rejects.toBeDefined();
    });
  });

  describe("getExamRoomStatus()", () => {
    it("returns fully staffed when both roles assigned", async () => {
      setupMock({ data: [
        { assignment_id: 1, exam_room_id: 1, teacher_id: 1, role: "Supervisor", exam_date: "2025-06-01", session: "Morning" },
        { assignment_id: 2, exam_room_id: 1, teacher_id: 2, role: "Assistant", exam_date: "2025-06-01", session: "Morning" },
      ], error: null });
      const r = await teacherAssignmentQueries.getExamRoomStatus(1, "2025-06-01", "Morning");
      expect(r.isFullyStaffed).toBe(true);
    });
    it("not fully staffed when only supervisor", async () => {
      setupMock({ data: [{ assignment_id: 1, exam_room_id: 1, teacher_id: 1, role: "Supervisor", exam_date: "2025-06-01", session: "Morning" }], error: null });
      const r = await teacherAssignmentQueries.getExamRoomStatus(1, "2025-06-01", "Morning");
      expect(r.isFullyStaffed).toBe(false);
      expect(r.hasAssistant).toBe(false);
    });
    it("returns empty status when no assignments", async () => {
      setupMock({ data: [], error: null });
      const r = await teacherAssignmentQueries.getExamRoomStatus(1);
      expect(r.hasSupervisor).toBe(false);
      expect(r.supervisorId).toBeNull();
    });
  });

  describe("create()", () => {
    it("creates and returns a new assignment", async () => {
      setupMock({ data: { assignment_id: 1, role: "Supervisor" }, error: null });
      const r = await teacherAssignmentQueries.create(1, 1, "Supervisor", "2025-06-01", "Morning");
      expect(r.role).toBe("Supervisor");
    });
    it("throws on DB error", async () => {
      setupMock({ data: null, error: { message: "fail" } });
      await expect(teacherAssignmentQueries.create(1, 1, "Supervisor", "2025-06-01", "Morning")).rejects.toBeDefined();
    });
  });

  describe("deleteByRoomAndRole()", () => {
    it("resolves without error on success", async () => {
      setupMock({ error: null });
      await expect(teacherAssignmentQueries.deleteByRoomAndRole(1, "Supervisor", "2025-06-01")).resolves.toBeUndefined();
    });
    it("throws on DB error", async () => {
      setupMock({ error: { message: "fail" } });
      await expect(teacherAssignmentQueries.deleteByRoomAndRole(1, "Supervisor", "2025-06-01")).rejects.toBeDefined();
    });
  });

  describe("batchCommitAssignments()", () => {
    it("resolves immediately when array is empty", async () => {
      await expect(teacherAssignmentQueries.batchCommitAssignments([])).resolves.toBeUndefined();
    });
    it("performs delete then insert for each assignment", async () => {
      let deleted = 0, inserted = 0;
      vi.mocked(supabase.from).mockImplementation(() => {
        const chain = makeChain({ error: null });
        chain.delete = vi.fn(() => { deleted++; return chain; });
        chain.insert = vi.fn(() => { inserted++; return chain; });
        return chain as any;
      });
      await teacherAssignmentQueries.batchCommitAssignments([
        { examRoomId: 1, linkId: 99, teacherId: 1, role: "Supervisor", examDate: "2025-06-01", session: "Morning" },
      ]);
      expect(deleted).toBeGreaterThan(0);
      expect(inserted).toBeGreaterThan(0);
    });
    it("throws when delete fails", async () => {
      vi.mocked(supabase.from).mockImplementation(() => makeChain({ error: { message: "delete fail" } }) as any);
      await expect(teacherAssignmentQueries.batchCommitAssignments([
        { examRoomId: 1, linkId: 99, teacherId: 1, role: "Supervisor", examDate: "2025-06-01", session: "Morning" },
      ])).rejects.toBeDefined();
    });
  });

  describe("prefetchBulkContext()", () => {
    it("returns empty context when dates is empty", async () => {
      const r = await teacherAssignmentQueries.prefetchBulkContext([]);
      expect(r.roomIdByNumber.size).toBe(0);
      expect(r.supervisors).toEqual([]);
    });
    it("builds context correctly from DB", async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === "room") return makeChain({ data: [{ room_id: 10, room_number: "101" }], error: null }) as any;
        if (table === "exam_room") return makeChain({ data: [{ exam_room_id: 1, room_id: 10 }], error: null }) as any;
        if (table === "exam") return makeChain({ data: [{ exam_id: 5, exam_date: "2025-06-01" }], error: null }) as any;
        if (table === "exam_room_exam_link") return makeChain({ data: [{ link_id: 99, exam_id: 5, exam_room_id: 1, group_type: "primary" }], error: null }) as any;
        if (table === "teacher") return makeChain({ data: [{ teacher_id: 1, name: "Dr. Smith", rank: "Professor", department: "CS", total_periods_assigned: 0 }], error: null }) as any;
        if (table === "teacher_assignment") return makeChain({ data: [{ teacher_id: 2, exam_date: "2025-06-01" }], error: null }) as any;
        return makeChain({ data: [], error: null }) as any;
      });
      const r = await teacherAssignmentQueries.prefetchBulkContext(["2025-06-01"]);
      expect(r.roomIdByNumber.get("101")).toBe(10);
      expect(r.resolvedByRoomDate.get("101|2025-06-01")).toEqual({ examRoomId: 1, linkId: 99 });
      expect(r.busyByDate.get("2025-06-01")?.has(2)).toBe(true);
    });
    it("prefers primary links over secondary in resolvedByRoomDate", async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === "room") return makeChain({ data: [{ room_id: 10, room_number: "101" }], error: null }) as any;
        if (table === "exam_room") return makeChain({ data: [{ exam_room_id: 1, room_id: 10 }], error: null }) as any;
        if (table === "exam") return makeChain({ data: [{ exam_id: 5, exam_date: "2025-06-01" }], error: null }) as any;
        if (table === "exam_room_exam_link") return makeChain({ data: [
          { link_id: 50, exam_id: 5, exam_room_id: 1, group_type: "secondary" },
          { link_id: 99, exam_id: 5, exam_room_id: 1, group_type: "primary" },
        ], error: null }) as any;
        if (table === "teacher") return makeChain({ data: [], error: null }) as any;
        if (table === "teacher_assignment") return makeChain({ data: [], error: null }) as any;
        return makeChain({ data: [], error: null }) as any;
      });
      const r = await teacherAssignmentQueries.prefetchBulkContext(["2025-06-01"]);
      expect(r.resolvedByRoomDate.get("101|2025-06-01")?.linkId).toBe(99);
    });
    it("throws when rooms fetch fails", async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === "room") return makeChain({ data: null, error: { message: "fail" } }) as any;
        return makeChain({ data: [], error: null }) as any;
      });
      await expect(teacherAssignmentQueries.prefetchBulkContext(["2025-06-01"])).rejects.toBeDefined();
    });
  });

  describe("getCorrectExamRoomId()", () => {
    it("returns null when room not found", async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === "room") return makeChain({ data: null, error: null }) as any;
        return makeChain({ data: [], error: null }) as any;
      });
      expect(await teacherAssignmentQueries.getCorrectExamRoomId("999", "2025-06-01", "Morning")).toBeNull();
    });
    it("returns null when no exams on date", async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === "room") return makeChain({ data: { room_id: 10 }, error: null }) as any;
        if (table === "exam") return makeChain({ data: [], error: null }) as any;
        return makeChain({ data: [], error: null }) as any;
      });
      expect(await teacherAssignmentQueries.getCorrectExamRoomId("101", "2025-06-01", "Morning")).toBeNull();
    });
    it("returns exam_room_id on full success path", async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === "room") return makeChain({ data: { room_id: 10 }, error: null }) as any;
        if (table === "exam") return makeChain({ data: [{ exam_id: 5 }], error: null }) as any;
        if (table === "exam_room_exam_link") return makeChain({ data: [{ exam_room_id: 1 }], error: null }) as any;
        if (table === "exam_room") return makeChain({ data: { exam_room_id: 1 }, error: null }) as any;
        return makeChain({ data: [], error: null }) as any;
      });
      expect(await teacherAssignmentQueries.getCorrectExamRoomId("101", "2025-06-01", "Morning")).toBe(1);
    });
  });

  describe("getLinkIdForRoomDate()", () => {
    it("returns null when room not found", async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === "room") return makeChain({ data: null, error: null }) as any;
        return makeChain({ data: [], error: null }) as any;
      });
      expect(await teacherAssignmentQueries.getLinkIdForRoomDate("999", "2025-06-01")).toBeNull();
    });
    it("returns link_id on full success path", async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === "room") return makeChain({ data: { room_id: 10 }, error: null }) as any;
        if (table === "exam_room") return makeChain({ data: [{ exam_room_id: 1 }], error: null }) as any;
        if (table === "exam") return makeChain({ data: [{ exam_id: 5 }], error: null }) as any;
        if (table === "exam_room_exam_link") return makeChain({ data: { link_id: 99 }, error: null }) as any;
        return makeChain({ data: [], error: null }) as any;
      });
      expect(await teacherAssignmentQueries.getLinkIdForRoomDate("101", "2025-06-01")).toBe(99);
    });
  });
});
