// ─── Vitest ───────────────────────────────────────────────────────────────────
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── teacherAssignmentTypes ────────────────────────────────────────────────────
import {
  canTeacherHaveRole,
  getEligibleRoles,
  enrichTeacherWithCapability,
  getWorkloadLevel,
  formatSession,
  getSessionTimeRange,
  TeacherAssignmentError,
  InvalidRoleError,
  RoleAlreadyFilledError,
  TimeConflictError,
  SUPERVISOR_RANKS,
  ASSISTANT_RANKS,
} from "@/services/teacherAssignmentTypes";
import type {
  TeacherRank,
  TeacherRole,
  Teacher,
  ExamSession,
} from "@/services/teacherAssignmentTypes";

// ── teacherAssignmentTableQueries ─────────────────────────────────────────────
import { teacherAssignmentTableQueries } from "@/services/teacherAssignmentTableQueries";
import type { TeacherAssignmentWithRoom } from "@/services/teacherAssignmentTableQueries";

// ─────────────────────────────────────────────────────────────────────────────
// Supabase mock
//
// getAllWithRoomDetails() makes up to 3 sequential supabase calls:
//   1. teacher_assignment  (always)
//   2. exam_room_exam_link (only when link_ids exist)
//   3. exam                (only when exam_ids exist)
//
// Each call ends with a different terminal method (.order / .in),
// so we use a thenable chain that resolves immediately on `await`.
// ─────────────────────────────────────────────────────────────────────────────

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("@/utils/supabase", () => ({ default: { from: mockFrom } }));

function makeChain(resolved: { data: any; error: any }) {
  const chain: any = {
    select:  vi.fn().mockReturnThis(),
    order:   vi.fn().mockReturnThis(),
    in:      vi.fn().mockReturnThis(),
    then: (onFulfilled: (v: any) => any, onRejected?: (e: any) => any) =>
      Promise.resolve(resolved).then(onFulfilled, onRejected),
  };
  return chain;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const ALL_RANKS: TeacherRank[] = [
  "Associate Professor",
  "Lecturer",
  "Associate Lecturer",
  "Tutor",
];

function makeTeacher(rank: TeacherRank, id = 1): Teacher {
  return {
    teacher_id: id,
    name: `Teacher ${id}`,
    rank,
    department: "CS",
    department_id: 10,
    total_periods_assigned: 0,
  };
}

// Raw DB row shape returned by the first supabase query
function makeRawRow(overrides: Partial<{
  assignment_id: number;
  exam_room_id: number;
  teacher_id: number;
  role: "Supervisor" | "Assistant";
  exam_date: string;
  session: string;
  shift_start: string;
  shift_end: string;
  assigned_at: string;
  link_id: number | null;
  teacher: { teacher_id: number; name: string; rank: string; department_id: number } | null;
  exam_room: { room: { room_number: string } } | null;
}> = {}) {
  return {
    assignment_id: 1,
    exam_room_id:  10,
    teacher_id:    5,
    role:          "Supervisor" as const,
    exam_date:     "2025-06-01",
    session:       "Morning",
    shift_start:   "08:00",
    shift_end:     "12:00",
    assigned_at:   "2025-05-01T00:00:00Z",
    link_id:       null,
    teacher: {
      teacher_id:   5,
      name:         "Alice",
      rank:         "Lecturer",
      department_id: 20,
    },
    exam_room: { room: { room_number: "LT-01" } },
    ...overrides,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// teacherAssignmentTypes.ts
// ═════════════════════════════════════════════════════════════════════════════

// ── SUPERVISOR_RANKS / ASSISTANT_RANKS constants ──────────────────────────────

describe("rank constants", () => {
  it("SUPERVISOR_RANKS contains Associate Professor, Lecturer, Associate Lecturer", () => {
    expect(SUPERVISOR_RANKS).toContain("Associate Professor");
    expect(SUPERVISOR_RANKS).toContain("Lecturer");
    expect(SUPERVISOR_RANKS).toContain("Associate Lecturer");
  });

  it("SUPERVISOR_RANKS does NOT contain Tutor", () => {
    expect(SUPERVISOR_RANKS).not.toContain("Tutor");
  });

  it("ASSISTANT_RANKS contains all four ranks", () => {
    for (const rank of ALL_RANKS) expect(ASSISTANT_RANKS).toContain(rank);
  });
});

// ── canTeacherHaveRole ────────────────────────────────────────────────────────

describe("canTeacherHaveRole()", () => {
  describe("Supervisor role", () => {
    it.each(["Associate Professor", "Lecturer", "Associate Lecturer"] as TeacherRank[])(
      "%s CAN be Supervisor",
      (rank) => expect(canTeacherHaveRole(rank, "Supervisor")).toBe(true),
    );

    it("Tutor CANNOT be Supervisor", () => {
      expect(canTeacherHaveRole("Tutor", "Supervisor")).toBe(false);
    });
  });

  describe("Assistant role", () => {
    it.each(ALL_RANKS)("%s CAN be Assistant", (rank) => {
      expect(canTeacherHaveRole(rank, "Assistant")).toBe(true);
    });
  });

  it("returns false for an unrecognised role", () => {
    expect(canTeacherHaveRole("Lecturer", "Standby" as TeacherRole)).toBe(false);
  });
});

// ── getEligibleRoles ──────────────────────────────────────────────────────────

describe("getEligibleRoles()", () => {
  it("Associate Professor gets both roles", () => {
    expect(getEligibleRoles("Associate Professor")).toEqual(
      expect.arrayContaining(["Supervisor", "Assistant"]),
    );
  });

  it("Lecturer gets both roles", () => {
    const roles = getEligibleRoles("Lecturer");
    expect(roles).toContain("Supervisor");
    expect(roles).toContain("Assistant");
  });

  it("Associate Lecturer gets both roles", () => {
    const roles = getEligibleRoles("Associate Lecturer");
    expect(roles).toContain("Supervisor");
    expect(roles).toContain("Assistant");
  });

  it("Tutor gets only Assistant", () => {
    const roles = getEligibleRoles("Tutor");
    expect(roles).toEqual(["Assistant"]);
    expect(roles).not.toContain("Supervisor");
  });

  it("returns an empty array for an unknown rank", () => {
    expect(getEligibleRoles("Unknown Rank" as TeacherRank)).toEqual([]);
  });
});

// ── enrichTeacherWithCapability ───────────────────────────────────────────────

describe("enrichTeacherWithCapability()", () => {
  it("sets canBeSupervisor=true for Lecturer", () => {
    expect(enrichTeacherWithCapability(makeTeacher("Lecturer")).canBeSupervisor).toBe(true);
  });

  it("sets canBeSupervisor=false for Tutor", () => {
    expect(enrichTeacherWithCapability(makeTeacher("Tutor")).canBeSupervisor).toBe(false);
  });

  it("sets canBeAssistant=true for all ranks", () => {
    for (const rank of ALL_RANKS) {
      expect(enrichTeacherWithCapability(makeTeacher(rank)).canBeAssistant).toBe(true);
    }
  });

  it("preserves all original teacher fields", () => {
    const teacher = makeTeacher("Lecturer", 42);
    const enriched = enrichTeacherWithCapability(teacher);
    expect(enriched.teacher_id).toBe(42);
    expect(enriched.name).toBe("Teacher 42");
    expect(enriched.rank).toBe("Lecturer");
    expect(enriched.department).toBe("CS");
    expect(enriched.total_periods_assigned).toBe(0);
  });

  it("eligibleRoles for Associate Professor contains Supervisor and Assistant", () => {
    const enriched = enrichTeacherWithCapability(makeTeacher("Associate Professor"));
    expect(enriched.eligibleRoles).toContain("Supervisor");
    expect(enriched.eligibleRoles).toContain("Assistant");
  });

  it("eligibleRoles for Tutor contains only Assistant", () => {
    const enriched = enrichTeacherWithCapability(makeTeacher("Tutor"));
    expect(enriched.eligibleRoles).toEqual(["Assistant"]);
  });
});

// ── getWorkloadLevel ──────────────────────────────────────────────────────────

describe("getWorkloadLevel()", () => {
  it("returns 'Light' for 0 periods", () => {
    expect(getWorkloadLevel(0)).toBe("Light");
  });

  it("returns 'Light' for 11 periods (below Medium threshold)", () => {
    expect(getWorkloadLevel(11)).toBe("Light");
  });

  it("returns 'Medium' for exactly 12 periods", () => {
    expect(getWorkloadLevel(12)).toBe("Medium");
  });

  it("returns 'Medium' for 17 periods (below High threshold)", () => {
    expect(getWorkloadLevel(17)).toBe("Medium");
  });

  it("returns 'High' for exactly 18 periods", () => {
    expect(getWorkloadLevel(18)).toBe("High");
  });

  it("returns 'High' for periods above 18", () => {
    expect(getWorkloadLevel(99)).toBe("High");
  });

  it("treats null as 0 — returns 'Light'", () => {
    expect(getWorkloadLevel(null)).toBe("Light");
  });
});

// ── formatSession ─────────────────────────────────────────────────────────────

describe("formatSession()", () => {
  it("returns 'Morning' for Morning", () => {
    expect(formatSession("Morning")).toBe("Morning");
  });

  it("returns 'Afternoon' for Afternoon", () => {
    expect(formatSession("Afternoon")).toBe("Afternoon");
  });

  it("returns 'Evening' for Evening", () => {
    expect(formatSession("Evening")).toBe("Evening");
  });

  it("returns 'Unknown Session' for null", () => {
    expect(formatSession(null)).toBe("Unknown Session");
  });
});

// ── getSessionTimeRange ───────────────────────────────────────────────────────

describe("getSessionTimeRange()", () => {
  it("Morning returns 08:00–12:00", () => {
    expect(getSessionTimeRange("Morning")).toEqual({ start: "08:00", end: "12:00" });
  });

  it("Afternoon returns 13:00–17:00", () => {
    expect(getSessionTimeRange("Afternoon")).toEqual({ start: "13:00", end: "17:00" });
  });

  it("Evening returns null (no range defined)", () => {
    expect(getSessionTimeRange("Evening")).toBeNull();
  });

  it("null returns null", () => {
    expect(getSessionTimeRange(null)).toBeNull();
  });
});

// ── Custom error classes ──────────────────────────────────────────────────────

describe("custom error classes", () => {
  describe("TeacherAssignmentError", () => {
    it("is an instance of Error", () => {
      expect(new TeacherAssignmentError("msg")).toBeInstanceOf(Error);
    });

    it("sets the message correctly", () => {
      expect(new TeacherAssignmentError("test message").message).toBe("test message");
    });

    it("name is 'TeacherAssignmentError'", () => {
      expect(new TeacherAssignmentError("msg").name).toBe("TeacherAssignmentError");
    });
  });

  describe("InvalidRoleError", () => {
    const err = new InvalidRoleError("Tutor", "Supervisor");

    it("is an instance of TeacherAssignmentError", () => {
      expect(err).toBeInstanceOf(TeacherAssignmentError);
    });

    it("name is 'InvalidRoleError'", () => {
      expect(err.name).toBe("InvalidRoleError");
    });

    it("message contains the rank and role", () => {
      expect(err.message).toContain("Tutor");
      expect(err.message).toContain("Supervisor");
    });
  });

  describe("RoleAlreadyFilledError", () => {
    const err = new RoleAlreadyFilledError("Supervisor", 42);

    it("is an instance of TeacherAssignmentError", () => {
      expect(err).toBeInstanceOf(TeacherAssignmentError);
    });

    it("name is 'RoleAlreadyFilledError'", () => {
      expect(err.name).toBe("RoleAlreadyFilledError");
    });

    it("message contains the role", () => {
      expect(err.message).toContain("Supervisor");
    });
  });

  describe("TimeConflictError", () => {
    const err = new TimeConflictError("Bob", "2025-06-01", "Morning", "LT-01");

    it("is an instance of TeacherAssignmentError", () => {
      expect(err).toBeInstanceOf(TeacherAssignmentError);
    });

    it("name is 'TimeConflictError'", () => {
      expect(err.name).toBe("TimeConflictError");
    });

    it("message contains the teacher name, date, and session", () => {
      expect(err.message).toContain("Bob");
      expect(err.message).toContain("2025-06-01");
      expect(err.message).toContain("Morning");
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// teacherAssignmentTableQueries.getAllWithRoomDetails()
// ═════════════════════════════════════════════════════════════════════════════

describe("teacherAssignmentTableQueries.getAllWithRoomDetails()", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Happy path — no link_ids ──────────────────────────────────────────────

  describe("rows with no link_id (single DB call)", () => {
    it("returns an empty array when there are no assignments", async () => {
      mockFrom.mockReturnValue(makeChain({ data: [], error: null }));
      expect(await teacherAssignmentTableQueries.getAllWithRoomDetails()).toEqual([]);
    });

    it("calls supabase.from('teacher_assignment') first", async () => {
      mockFrom.mockReturnValue(makeChain({ data: [], error: null }));
      await teacherAssignmentTableQueries.getAllWithRoomDetails();
      expect(mockFrom).toHaveBeenCalledWith("teacher_assignment");
    });

    it("maps a row to the correct output shape", async () => {
      const row = makeRawRow({ link_id: null });
      mockFrom.mockReturnValue(makeChain({ data: [row], error: null }));

      const result = await teacherAssignmentTableQueries.getAllWithRoomDetails();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject<Partial<TeacherAssignmentWithRoom>>({
        assignment_id:     1,
        exam_room_id:      10,
        teacher_id:        5,
        role:              "Supervisor",
        exam_date:         "2025-06-01",
        session:           "Morning",
        shift_start:       "08:00",
        shift_end:         "12:00",
        link_id:           null,
        room_number:       "LT-01",
        exam_department_id: null,
        has_conflict:      false,
      });
    });

    it("extracts room_number from the nested exam_room.room path", async () => {
      const row = makeRawRow({ exam_room: { room: { room_number: "LAB-3" } } });
      mockFrom.mockReturnValue(makeChain({ data: [row], error: null }));
      const result = await teacherAssignmentTableQueries.getAllWithRoomDetails();
      expect(result[0].room_number).toBe("LAB-3");
    });

    it("sets room_number to null when exam_room is null", async () => {
      const row = makeRawRow({ exam_room: null });
      mockFrom.mockReturnValue(makeChain({ data: [row], error: null }));
      const result = await teacherAssignmentTableQueries.getAllWithRoomDetails();
      expect(result[0].room_number).toBeNull();
    });

    it("sets teacher to null when the join returns null", async () => {
      const row = makeRawRow({ teacher: null });
      mockFrom.mockReturnValue(makeChain({ data: [row], error: null }));
      const result = await teacherAssignmentTableQueries.getAllWithRoomDetails();
      expect(result[0].teacher).toBeNull();
    });

    it("does NOT make a second DB call when all link_ids are null", async () => {
      mockFrom.mockReturnValue(makeChain({ data: [makeRawRow({ link_id: null })], error: null }));
      await teacherAssignmentTableQueries.getAllWithRoomDetails();
      // Only the teacher_assignment call should be made
      expect(mockFrom).toHaveBeenCalledTimes(1);
    });

    it("throws when the first query returns an error", async () => {
      mockFrom.mockReturnValue(makeChain({ data: null, error: new Error("DB down") }));
      await expect(
        teacherAssignmentTableQueries.getAllWithRoomDetails(),
      ).rejects.toThrow("DB down");
    });
  });

  // ── has_conflict logic ────────────────────────────────────────────────────

  describe("has_conflict computation (no link_id path)", () => {
    it("has_conflict is false when link_id is null (no exam dept to compare)", async () => {
      const row = makeRawRow({ link_id: null, teacher: { teacher_id: 5, name: "Alice", rank: "Lecturer", department_id: 20 } });
      mockFrom.mockReturnValue(makeChain({ data: [row], error: null }));
      expect((await teacherAssignmentTableQueries.getAllWithRoomDetails())[0].has_conflict).toBe(false);
    });

    it("has_conflict is false when teacher is null", async () => {
      const row = makeRawRow({ link_id: null, teacher: null });
      mockFrom.mockReturnValue(makeChain({ data: [row], error: null }));
      expect((await teacherAssignmentTableQueries.getAllWithRoomDetails())[0].has_conflict).toBe(false);
    });
  });

  // ── Happy path — with link_ids (3 DB calls) ───────────────────────────────

  describe("rows with link_id — full 3-query flow", () => {
    /**
     * Sets up mockFrom to return different responses per table call:
     *   call 1 → teacher_assignment rows
     *   call 2 → exam_room_exam_link rows
     *   call 3 → exam rows
     */
    function setupThreeCallMock(options: {
      assignmentRows: any[];
      linkRows: { link_id: number; exam_id: number }[];
      examRows: { exam_id: number; department_id: number }[];
    }) {
      let call = 0;
      mockFrom.mockImplementation(() => {
        call++;
        if (call === 1) return makeChain({ data: options.assignmentRows, error: null });
        if (call === 2) return makeChain({ data: options.linkRows, error: null });
        return makeChain({ data: options.examRows, error: null });
      });
    }

    it("makes exactly 3 DB calls when link_ids are present", async () => {
      setupThreeCallMock({
        assignmentRows: [makeRawRow({ link_id: 99 })],
        linkRows: [{ link_id: 99, exam_id: 7 }],
        examRows: [{ exam_id: 7, department_id: 30 }],
      });
      await teacherAssignmentTableQueries.getAllWithRoomDetails();
      expect(mockFrom).toHaveBeenCalledTimes(3);
    });

    it("queries exam_room_exam_link second", async () => {
      setupThreeCallMock({
        assignmentRows: [makeRawRow({ link_id: 99 })],
        linkRows: [{ link_id: 99, exam_id: 7 }],
        examRows: [{ exam_id: 7, department_id: 30 }],
      });
      await teacherAssignmentTableQueries.getAllWithRoomDetails();
      expect(mockFrom).toHaveBeenNthCalledWith(2, "exam_room_exam_link");
    });

    it("queries exam table third", async () => {
      setupThreeCallMock({
        assignmentRows: [makeRawRow({ link_id: 99 })],
        linkRows: [{ link_id: 99, exam_id: 7 }],
        examRows: [{ exam_id: 7, department_id: 30 }],
      });
      await teacherAssignmentTableQueries.getAllWithRoomDetails();
      expect(mockFrom).toHaveBeenNthCalledWith(3, "exam");
    });

    it("resolves exam_department_id via link_id → exam_id → department_id chain", async () => {
      setupThreeCallMock({
        assignmentRows: [makeRawRow({ link_id: 99 })],
        linkRows: [{ link_id: 99, exam_id: 7 }],
        examRows: [{ exam_id: 7, department_id: 30 }],
      });
      const result = await teacherAssignmentTableQueries.getAllWithRoomDetails();
      expect(result[0].exam_department_id).toBe(30);
    });

    it("sets has_conflict=true when teacher dept matches exam dept", async () => {
      // Teacher dept_id = 30, exam dept_id = 30 → conflict
      setupThreeCallMock({
        assignmentRows: [makeRawRow({
          link_id: 99,
          teacher: { teacher_id: 5, name: "Alice", rank: "Lecturer", department_id: 30 },
        })],
        linkRows: [{ link_id: 99, exam_id: 7 }],
        examRows: [{ exam_id: 7, department_id: 30 }],
      });
      const result = await teacherAssignmentTableQueries.getAllWithRoomDetails();
      expect(result[0].has_conflict).toBe(true);
    });

    it("sets has_conflict=false when teacher dept differs from exam dept", async () => {
      // Teacher dept_id = 20, exam dept_id = 30 → no conflict
      setupThreeCallMock({
        assignmentRows: [makeRawRow({
          link_id: 99,
          teacher: { teacher_id: 5, name: "Alice", rank: "Lecturer", department_id: 20 },
        })],
        linkRows: [{ link_id: 99, exam_id: 7 }],
        examRows: [{ exam_id: 7, department_id: 30 }],
      });
      const result = await teacherAssignmentTableQueries.getAllWithRoomDetails();
      expect(result[0].has_conflict).toBe(false);
    });

    it("sets exam_department_id=null when link_id has no matching exam", async () => {
      // link_id 99 exists but exam lookup returns no department_id for it
      setupThreeCallMock({
        assignmentRows: [makeRawRow({ link_id: 99 })],
        linkRows: [{ link_id: 99, exam_id: 7 }],
        examRows: [], // exam 7 not found
      });
      const result = await teacherAssignmentTableQueries.getAllWithRoomDetails();
      expect(result[0].exam_department_id).toBeNull();
    });

    it("handles multiple rows with different link_ids correctly", async () => {
      setupThreeCallMock({
        assignmentRows: [
          makeRawRow({ assignment_id: 1, link_id: 10, teacher: { teacher_id: 1, name: "A", rank: "Lecturer", department_id: 5 } }),
          makeRawRow({ assignment_id: 2, link_id: 20, teacher: { teacher_id: 2, name: "B", rank: "Tutor",    department_id: 9 } }),
        ],
        linkRows: [
          { link_id: 10, exam_id: 100 },
          { link_id: 20, exam_id: 200 },
        ],
        examRows: [
          { exam_id: 100, department_id: 5 },  // matches teacher 1 → conflict
          { exam_id: 200, department_id: 7 },  // differs from teacher 2 → no conflict
        ],
      });
      const result = await teacherAssignmentTableQueries.getAllWithRoomDetails();
      expect(result[0].has_conflict).toBe(true);
      expect(result[1].has_conflict).toBe(false);
    });
  });

  // ── Error propagation ─────────────────────────────────────────────────────

  describe("error propagation", () => {
    it("throws when exam_room_exam_link query fails", async () => {
      let call = 0;
      mockFrom.mockImplementation(() => {
        call++;
        if (call === 1) return makeChain({ data: [makeRawRow({ link_id: 99 })], error: null });
        return makeChain({ data: null, error: new Error("link query failed") });
      });
      await expect(
        teacherAssignmentTableQueries.getAllWithRoomDetails(),
      ).rejects.toThrow("link query failed");
    });

    it("throws when exam query fails", async () => {
      let call = 0;
      mockFrom.mockImplementation(() => {
        call++;
        if (call === 1) return makeChain({ data: [makeRawRow({ link_id: 99 })], error: null });
        if (call === 2) return makeChain({ data: [{ link_id: 99, exam_id: 7 }], error: null });
        return makeChain({ data: null, error: new Error("exam query failed") });
      });
      await expect(
        teacherAssignmentTableQueries.getAllWithRoomDetails(),
      ).rejects.toThrow("exam query failed");
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("skips the link query when linkIds array is empty (all link_ids null)", async () => {
      mockFrom.mockReturnValue(makeChain({ data: [makeRawRow({ link_id: null })], error: null }));
      await teacherAssignmentTableQueries.getAllWithRoomDetails();
      expect(mockFrom).toHaveBeenCalledTimes(1);
    });

    it("skips the exam query when no exam_ids are found from link query", async () => {
      let call = 0;
      mockFrom.mockImplementation(() => {
        call++;
        if (call === 1) return makeChain({ data: [makeRawRow({ link_id: 99 })], error: null });
        // link query returns empty — no exam_ids to look up
        return makeChain({ data: [], error: null });
      });
      await teacherAssignmentTableQueries.getAllWithRoomDetails();
      expect(mockFrom).toHaveBeenCalledTimes(2); // not 3
    });

    it("handles null data from the first query (treats as empty array)", async () => {
      mockFrom.mockReturnValue(makeChain({ data: null, error: null }));
      const result = await teacherAssignmentTableQueries.getAllWithRoomDetails();
      expect(result).toEqual([]);
    });

    it("two rows sharing the same link_id both resolve to the same exam_department_id", async () => {
      // Source does not deduplicate link_ids before the .in() query — that is fine
      // because Map.set() is idempotent: the same link_id always maps to the same
      // dept_id, so both rows get the correct exam_department_id regardless.
      let call = 0;
      mockFrom.mockImplementation(() => {
        call++;
        if (call === 1) {
          return makeChain({
            data: [
              makeRawRow({ assignment_id: 1, link_id: 55, teacher: { teacher_id: 1, name: "A", rank: "Lecturer", department_id: 99 } }),
              makeRawRow({ assignment_id: 2, link_id: 55, teacher: { teacher_id: 2, name: "B", rank: "Tutor",    department_id: 99 } }),
            ],
            error: null,
          });
        }
        if (call === 2) return makeChain({ data: [{ link_id: 55, exam_id: 7 }], error: null });
        return makeChain({ data: [{ exam_id: 7, department_id: 99 }], error: null });
      });

      const result = await teacherAssignmentTableQueries.getAllWithRoomDetails();
      // Both rows share link_id 55 → exam dept 99 → teacher dept 99 → conflict on both
      expect(result[0].exam_department_id).toBe(99);
      expect(result[1].exam_department_id).toBe(99);
      expect(result[0].has_conflict).toBe(true);
      expect(result[1].has_conflict).toBe(true);
    });
  });
});