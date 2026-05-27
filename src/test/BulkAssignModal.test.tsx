// ─── Vitest + Testing Library ─────────────────────────────────────────────────
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

// ─── Types ────────────────────────────────────────────────────────────────────
import type { TeacherWithAvailability } from "@/services/teacherAssignmentTypes";
import type { BulkAssignContext } from "@/services/teacherassignmentQueries";
import type { RoomCardData } from "@/services/examRoomLinkQueries";

type RankPeriodLimits = Record<string, number>;

// ─── Pure helpers (mirrored from BulkAssignModal.tsx) ─────────────────────────

const RANK_ORDER: Record<string, number> = {
  "Associate Professor": 4,
  Lecturer: 3,
  "Associate Lecturer": 2,
  Tutor: 1,
};

const SUPERVISOR_ASSISTANT_PAIRS: Array<[string, string]> = [
  ["Associate Professor", "Lecturer"],
  ["Associate Professor", "Associate Lecturer"],
  ["Associate Professor", "Tutor"],
  ["Lecturer", "Associate Lecturer"],
  ["Lecturer", "Tutor"],
  ["Associate Lecturer", "Tutor"],
];

function isEligible(
  t: TeacherWithAvailability,
  limits: RankPeriodLimits,
  dayUsedIds: Set<number>,
  blockedDeptIds: Set<number>,
): boolean {
  return (
    t.availability.is_available &&
    !dayUsedIds.has(t.teacher_id) &&
    !blockedDeptIds.has(t.department_id ?? -1) &&
    (limits[t.rank] === undefined ||
      (t.total_periods_assigned ?? 0) < limits[t.rank])
  );
}

function lowestWorkload(candidates: TeacherWithAvailability[]): TeacherWithAvailability {
  return candidates.reduce((best, t) =>
    (t.total_periods_assigned ?? 0) < (best.total_periods_assigned ?? 0) ? t : best,
  );
}

function incrementPeriodCount(teacherId: number, ctx: BulkAssignContext): void {
  for (const t of ctx.supervisors) {
    if (t.teacher_id === teacherId)
      t.total_periods_assigned = (t.total_periods_assigned ?? 0) + 1;
  }
  for (const t of ctx.assistants) {
    if (t.teacher_id === teacherId)
      t.total_periods_assigned = (t.total_periods_assigned ?? 0) + 1;
  }
}

type PairRecord = { supervisorId: number | null; assistantId: number | null };

function pickPairedTeachers(
  supervisors: TeacherWithAvailability[],
  assistants: TeacherWithAvailability[],
  limits: RankPeriodLimits,
  dayUsedIds: Set<number>,
  blockedDeptIds: Set<number>,
  pastPairs: PairRecord[],
  pairTypeUsage: Map<string, number>,
): { supervisor: TeacherWithAvailability | null; assistant: TeacherWithAvailability | null } {
  const VALID_SUP_RANKS = new Set(SUPERVISOR_ASSISTANT_PAIRS.map(([s]) => s));
  const VALID_ASST_RANKS = new Set(SUPERVISOR_ASSISTANT_PAIRS.map(([, a]) => a));

  const eligibleSups = supervisors.filter(
    (t) => VALID_SUP_RANKS.has(t.rank) && isEligible(t, limits, dayUsedIds, blockedDeptIds),
  );
  const eligibleAssts = assistants.filter(
    (t) => VALID_ASST_RANKS.has(t.rank) && isEligible(t, limits, dayUsedIds, blockedDeptIds),
  );

  if (eligibleSups.length === 0) return { supervisor: null, assistant: null };

  const pastSupIds = new Set(pastPairs.map((p) => p.supervisorId).filter(Boolean) as number[]);
  const pastAsstIds = new Set(pastPairs.map((p) => p.assistantId).filter(Boolean) as number[]);

  const viablePairs: Array<{ key: string; supRank: string; asstRank: string; usage: number }> = [];
  for (const [supRank, asstRank] of SUPERVISOR_ASSISTANT_PAIRS) {
    const hasEligibleSup = eligibleSups.some((t) => t.rank === supRank);
    const hasEligibleAsst = eligibleAssts.some(
      (t) => t.rank === asstRank && (RANK_ORDER[t.rank] ?? 0) < (RANK_ORDER[supRank] ?? 0),
    );
    if (!hasEligibleSup || !hasEligibleAsst) continue;
    const key = `${supRank}|${asstRank}`;
    viablePairs.push({ key, supRank, asstRank, usage: pairTypeUsage.get(key) ?? 0 });
  }

  if (viablePairs.length === 0) {
    const apSups = eligibleSups.filter((t) => t.rank === "Associate Professor");
    if (apSups.length > 0) {
      const supFresh = apSups.filter((t) => !pastSupIds.has(t.teacher_id));
      const supervisor = lowestWorkload(supFresh.length > 0 ? supFresh : apSups);
      const apAssts = assistants.filter(
        (t) =>
          t.rank === "Associate Professor" &&
          t.teacher_id !== supervisor.teacher_id &&
          isEligible(t, limits, dayUsedIds, blockedDeptIds),
      );
      if (apAssts.length > 0) {
        const asstFresh = apAssts.filter((t) => !pastAsstIds.has(t.teacher_id));
        return { supervisor, assistant: lowestWorkload(asstFresh.length > 0 ? asstFresh : apAssts) };
      }
    }
    const supFresh = eligibleSups.filter((t) => !pastSupIds.has(t.teacher_id));
    return { supervisor: lowestWorkload(supFresh.length > 0 ? supFresh : eligibleSups), assistant: null };
  }

  const chosen = viablePairs.reduce((best, cur) => (cur.usage < best.usage ? cur : best));
  pairTypeUsage.set(chosen.key, (pairTypeUsage.get(chosen.key) ?? 0) + 1);

  const supOfRank = eligibleSups.filter((t) => t.rank === chosen.supRank);
  const supFresh = supOfRank.filter((t) => !pastSupIds.has(t.teacher_id));
  const supervisor = lowestWorkload(supFresh.length > 0 ? supFresh : supOfRank);

  const asstOfRank = eligibleAssts
    .filter((t) => t.rank === chosen.asstRank)
    .filter((t) => t.teacher_id !== supervisor.teacher_id)
    .filter((t) => (RANK_ORDER[t.rank] ?? 0) < (RANK_ORDER[supervisor.rank] ?? 0));

  if (asstOfRank.length === 0) {
    const anyLowerAsst = eligibleAssts.filter(
      (t) =>
        t.teacher_id !== supervisor.teacher_id &&
        (RANK_ORDER[t.rank] ?? 0) < (RANK_ORDER[supervisor.rank] ?? 0),
    );
    if (anyLowerAsst.length > 0) {
      const fresh = anyLowerAsst.filter((t) => !pastAsstIds.has(t.teacher_id));
      return { supervisor, assistant: lowestWorkload(fresh.length > 0 ? fresh : anyLowerAsst) };
    }
    if (supervisor.rank === "Associate Professor") {
      const apAssts = assistants.filter(
        (t) =>
          t.rank === "Associate Professor" &&
          t.teacher_id !== supervisor.teacher_id &&
          isEligible(t, limits, dayUsedIds, blockedDeptIds),
      );
      if (apAssts.length > 0) {
        const fresh = apAssts.filter((t) => !pastAsstIds.has(t.teacher_id));
        return { supervisor, assistant: lowestWorkload(fresh.length > 0 ? fresh : apAssts) };
      }
    }
    return { supervisor, assistant: null };
  }

  const asstFresh = asstOfRank.filter((t) => !pastAsstIds.has(t.teacher_id));
  return { supervisor, assistant: lowestWorkload(asstFresh.length > 0 ? asstFresh : asstOfRank) };
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeTeacher(
  overrides: Partial<TeacherWithAvailability> & { teacher_id: number; rank: string },
): TeacherWithAvailability {
  return {
    name: `Teacher ${overrides.teacher_id}`,
    department_id: 1,
    total_periods_assigned: 0,
    availability: { is_available: true, teacher_id: overrides.teacher_id, conflict_reason: null },
    ...overrides,
  } as TeacherWithAvailability;
}

// Each teacher has a unique department_id so blocking one dept doesn't
// accidentally exclude teachers from other departments.
const ap1    = makeTeacher({ teacher_id: 1, rank: "Associate Professor", total_periods_assigned: 0, department_id: 10 });
const ap2    = makeTeacher({ teacher_id: 2, rank: "Associate Professor", total_periods_assigned: 3, department_id: 20 });
const lec1   = makeTeacher({ teacher_id: 3, rank: "Lecturer",            total_periods_assigned: 0, department_id: 30 });
const lec2   = makeTeacher({ teacher_id: 4, rank: "Lecturer",            total_periods_assigned: 2, department_id: 40 });
const al1    = makeTeacher({ teacher_id: 5, rank: "Associate Lecturer",  total_periods_assigned: 0, department_id: 50 });
const tutor1 = makeTeacher({ teacher_id: 6, rank: "Tutor",               total_periods_assigned: 1, department_id: 60 });
const unavailable = makeTeacher({
  teacher_id: 7,
  rank: "Lecturer",
  availability: { is_available: false, teacher_id: 7, conflict_reason: "Already assigned" },
});

function makeCtx(
  supervisors: TeacherWithAvailability[] = [],
  assistants: TeacherWithAvailability[] = [],
): BulkAssignContext {
  return {
    supervisors: supervisors.map((t) => ({ ...t })), // shallow clone so incrementPeriodCount mutates safely
    assistants: assistants.map((t) => ({ ...t })),
    busyByDate: new Map(),
    examRoomLinks: [],
  } as unknown as BulkAssignContext;
}

function makeRoom(overrides: Partial<RoomCardData> & { roomNumber: string; examDate: string }): RoomCardData {
  return {
    key: `${overrides.roomNumber}-${overrides.examDate}`,
    examSession: "Morning",
    examTime: { start: "08:00", end: "11:00" },
    primaryExams: [],
    secondaryExams: [],
    primaryGroupLabel: overrides.roomNumber,
    ...overrides,
  } as unknown as RoomCardData;
}

// ═════════════════════════════════════════════════════════════════════════════
// isEligible()
// ═════════════════════════════════════════════════════════════════════════════

describe("isEligible()", () => {
  const noLimits: RankPeriodLimits = {};
  const noUsed = new Set<number>();
  const noBlocked = new Set<number>();

  it("returns true for a fully available teacher", () => {
    expect(isEligible(lec1, noLimits, noUsed, noBlocked)).toBe(true);
  });

  it("returns false when teacher is unavailable", () => {
    expect(isEligible(unavailable, noLimits, noUsed, noBlocked)).toBe(false);
  });

  it("returns false when teacher_id is in dayUsedIds", () => {
    expect(isEligible(lec1, noLimits, new Set([lec1.teacher_id]), noBlocked)).toBe(false);
  });

  it("returns false when teacher's department is blocked", () => {
    const blocked = new Set([lec1.department_id!]);
    expect(isEligible(lec1, noLimits, noUsed, blocked)).toBe(false);
  });

  it("returns false when teacher has reached their rank period limit", () => {
    expect(isEligible(lec2, { Lecturer: 2 }, noUsed, noBlocked)).toBe(false); // 2 not < 2
  });

  it("returns true when teacher is under their rank period limit", () => {
    expect(isEligible(lec1, { Lecturer: 3 }, noUsed, noBlocked)).toBe(true); // 0 < 3
  });

  it("returns true when rank is not listed in limits at all", () => {
    expect(isEligible(tutor1, { Lecturer: 1 }, noUsed, noBlocked)).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// lowestWorkload()
// ═════════════════════════════════════════════════════════════════════════════

describe("lowestWorkload()", () => {
  it("returns the single element in a one-item pool", () => {
    expect(lowestWorkload([lec1])).toBe(lec1);
  });

  it("picks the teacher with fewer periods assigned", () => {
    expect(lowestWorkload([lec2, lec1])).toBe(lec1); // 0 < 2
  });

  it("is stable: keeps first element on a tie", () => {
    const a = makeTeacher({ teacher_id: 10, rank: "Tutor", total_periods_assigned: 1 });
    const b = makeTeacher({ teacher_id: 11, rank: "Tutor", total_periods_assigned: 1 });
    expect(lowestWorkload([a, b])).toBe(a);
  });

  it("treats undefined total_periods_assigned as 0", () => {
    const noData = makeTeacher({ teacher_id: 20, rank: "Tutor", total_periods_assigned: undefined });
    // undefined is coerced to 0, same as lec1 (0). reduce is stable: first element
    // wins on a tie (replace only when strictly less-than). So first in array wins.
    expect(lowestWorkload([lec1, noData])).toBe(lec1);   // lec1 first → lec1 wins
    expect(lowestWorkload([noData, lec1])).toBe(noData);  // noData first → noData wins
    // Confirm noData beats a teacher with actual periods > 0
    expect(lowestWorkload([lec2, noData])).toBe(noData);  // 0 < 2 → noData wins
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// incrementPeriodCount()
// ═════════════════════════════════════════════════════════════════════════════

describe("incrementPeriodCount()", () => {
  it("increments total_periods_assigned for the matched teacher in supervisors", () => {
    const ctx = makeCtx([ap1], []);
    incrementPeriodCount(ap1.teacher_id, ctx);
    expect(ctx.supervisors[0].total_periods_assigned).toBe(1);
  });

  it("increments total_periods_assigned for the matched teacher in assistants", () => {
    const ctx = makeCtx([], [lec1]);
    incrementPeriodCount(lec1.teacher_id, ctx);
    expect(ctx.assistants[0].total_periods_assigned).toBe(1);
  });

  it("increments in both lists if the same teacher appears in both", () => {
    const shared = makeTeacher({ teacher_id: 99, rank: "Lecturer" });
    const ctx = makeCtx([shared], [shared]);
    incrementPeriodCount(99, ctx);
    expect(ctx.supervisors[0].total_periods_assigned).toBe(1);
    expect(ctx.assistants[0].total_periods_assigned).toBe(1);
  });

  it("does nothing when the teacher_id is not found", () => {
    const ctx = makeCtx([ap1], [lec1]);
    incrementPeriodCount(999, ctx);
    expect(ctx.supervisors[0].total_periods_assigned).toBe(0);
    expect(ctx.assistants[0].total_periods_assigned).toBe(0);
  });

  it("handles missing total_periods_assigned (treats as 0 before incrementing)", () => {
    const t = makeTeacher({ teacher_id: 50, rank: "Tutor", total_periods_assigned: undefined });
    const ctx = makeCtx([t], []);
    incrementPeriodCount(50, ctx);
    expect(ctx.supervisors[0].total_periods_assigned).toBe(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// pickPairedTeachers()
// ═════════════════════════════════════════════════════════════════════════════

describe("pickPairedTeachers()", () => {
  const noLimits: RankPeriodLimits = {};
  const noUsed = new Set<number>();
  const noBlocked = new Set<number>();
  const noPastPairs: PairRecord[] = [];
  const noPairTypeUsage = () => new Map<string, number>();

  function pick(
    sups: TeacherWithAvailability[],
    assts: TeacherWithAvailability[],
    opts: {
      limits?: RankPeriodLimits;
      used?: Set<number>;
      blocked?: Set<number>;
      past?: PairRecord[];
      usage?: Map<string, number>;
    } = {},
  ) {
    return pickPairedTeachers(
      sups,
      assts,
      opts.limits ?? noLimits,
      opts.used ?? noUsed,
      opts.blocked ?? noBlocked,
      opts.past ?? noPastPairs,
      opts.usage ?? noPairTypeUsage(),
    );
  }

  describe("standard pairings", () => {
    it("picks AP + Lecturer (highest-priority pair)", () => {
      const { supervisor, assistant } = pick([ap1], [lec1]);
      expect(supervisor?.rank).toBe("Associate Professor");
      expect(assistant?.rank).toBe("Lecturer");
    });

    it("picks AP + Associate Lecturer when no Lecturer assistant exists", () => {
      const { supervisor, assistant } = pick([ap1], [al1]);
      expect(supervisor?.rank).toBe("Associate Professor");
      expect(assistant?.rank).toBe("Associate Lecturer");
    });

    it("picks AP + Tutor when only Tutors are available", () => {
      const { supervisor, assistant } = pick([ap1], [tutor1]);
      expect(supervisor?.rank).toBe("Associate Professor");
      expect(assistant?.rank).toBe("Tutor");
    });

    it("picks Lecturer + Associate Lecturer", () => {
      const { supervisor, assistant } = pick([lec1], [al1]);
      expect(supervisor?.rank).toBe("Lecturer");
      expect(assistant?.rank).toBe("Associate Lecturer");
    });

    it("picks Lecturer + Tutor", () => {
      const { supervisor, assistant } = pick([lec1], [tutor1]);
      expect(supervisor?.rank).toBe("Lecturer");
      expect(assistant?.rank).toBe("Tutor");
    });

    it("picks Associate Lecturer + Tutor", () => {
      const { supervisor, assistant } = pick([al1], [tutor1]);
      expect(supervisor?.rank).toBe("Associate Lecturer");
      expect(assistant?.rank).toBe("Tutor");
    });
  });

  describe("workload balancing", () => {
    it("prefers the supervisor with the lower workload", () => {
      const { supervisor } = pick([ap2, ap1], [lec1]); // ap1=0, ap2=3
      expect(supervisor?.teacher_id).toBe(ap1.teacher_id);
    });

    it("prefers the assistant with the lower workload", () => {
      const { assistant } = pick([ap1], [lec2, lec1]); // lec1=0, lec2=2
      expect(assistant?.teacher_id).toBe(lec1.teacher_id);
    });
  });

  describe("dayUsedIds exclusion", () => {
    it("skips a teacher who is already used today (supervisor)", () => {
      const used = new Set([ap1.teacher_id]);
      const { supervisor } = pick([ap1, ap2], [lec1], { used });
      expect(supervisor?.teacher_id).toBe(ap2.teacher_id);
    });

    it("skips a teacher who is already used today (assistant)", () => {
      const used = new Set([lec1.teacher_id]);
      const { assistant } = pick([ap1], [lec1, lec2], { used });
      expect(assistant?.teacher_id).toBe(lec2.teacher_id);
    });

    it("returns null supervisor when all supervisors are used", () => {
      const used = new Set([ap1.teacher_id]);
      const { supervisor } = pick([ap1], [lec1], { used });
      expect(supervisor).toBeNull();
    });
  });

  describe("blockedDeptIds exclusion", () => {
    it("skips supervisors whose department is blocked", () => {
      const blocked = new Set([ap1.department_id!]);
      const { supervisor } = pick([ap1, ap2], [lec1], { blocked });
      expect(supervisor?.teacher_id).toBe(ap2.teacher_id);
    });

    it("skips assistants whose department is blocked", () => {
      const blocked = new Set([lec1.department_id!]);
      const { assistant } = pick([ap1], [lec1, al1], { blocked });
      // lec1 is blocked, al1 should be used (but it's AL rank, which is valid for AP)
      expect(assistant?.teacher_id).toBe(al1.teacher_id);
    });
  });

  describe("period limit enforcement", () => {
    it("skips teachers who have hit their period cap", () => {
      const limits = { "Associate Professor": 0 }; // ap1 has 0 assigned but limit is 0 → not < 0
      const { supervisor } = pick([ap1], [lec1], { limits });
      expect(supervisor).toBeNull();
    });

    it("uses teachers still under their cap", () => {
      const limits = { "Associate Professor": 5 }; // ap1 has 0 < 5
      const { supervisor } = pick([ap1], [lec1], { limits });
      expect(supervisor?.teacher_id).toBe(ap1.teacher_id);
    });
  });

  describe("freshness preference (past pair rotation)", () => {
    it("prefers a supervisor not seen in past pairs", () => {
      const past: PairRecord[] = [{ supervisorId: ap1.teacher_id, assistantId: null }];
      const { supervisor } = pick([ap1, ap2], [lec1], { past });
      expect(supervisor?.teacher_id).toBe(ap2.teacher_id);
    });

    it("falls back to a repeated supervisor when no fresh ones exist", () => {
      const past: PairRecord[] = [{ supervisorId: ap1.teacher_id, assistantId: null }];
      const { supervisor } = pick([ap1], [lec1], { past });
      expect(supervisor?.teacher_id).toBe(ap1.teacher_id);
    });

    it("prefers an assistant not seen in past pairs", () => {
      const past: PairRecord[] = [{ supervisorId: null, assistantId: lec1.teacher_id }];
      const { assistant } = pick([ap1], [lec1, lec2], { past });
      expect(assistant?.teacher_id).toBe(lec2.teacher_id);
    });
  });

  describe("pair type usage balancing", () => {
    it("uses the least-used pair type when multiple are valid", () => {
      const usage = new Map([["Associate Professor|Lecturer", 5]]);
      // AP+Lec has usage 5, AP+AL has usage 0 → should pick AP+AL
      const { supervisor, assistant } = pick([ap1], [lec1, al1], { usage });
      expect(supervisor?.rank).toBe("Associate Professor");
      expect(assistant?.rank).toBe("Associate Lecturer");
    });

    it("increments the chosen pair type usage in the map", () => {
      const usage = new Map<string, number>();
      pick([ap1], [lec1], { usage });
      expect(usage.get("Associate Professor|Lecturer")).toBe(1);
    });
  });

  describe("last-resort AP+AP", () => {
    it("pairs AP+AP when no lower-rank assistant is available", () => {
      const ap3 = makeTeacher({ teacher_id: 30, rank: "Associate Professor", total_periods_assigned: 0 });
      const { supervisor, assistant } = pick([ap1], [ap3]);
      expect(supervisor?.rank).toBe("Associate Professor");
      expect(assistant?.rank).toBe("Associate Professor");
      expect(supervisor?.teacher_id).not.toBe(assistant?.teacher_id);
    });
  });

  describe("edge cases", () => {
    it("returns nulls when supervisor pool is empty", () => {
      const { supervisor, assistant } = pick([], [lec1]);
      expect(supervisor).toBeNull();
      expect(assistant).toBeNull();
    });

    it("returns supervisor-only when no valid assistant exists", () => {
      // lec1 as both sup and only asst — same rank, not lower, excluded
      const { supervisor, assistant } = pick([lec1], [lec2]);
      expect(supervisor).not.toBeNull();
      expect(assistant).toBeNull();
    });

    it("never assigns the same teacher to both roles", () => {
      const ap3 = makeTeacher({ teacher_id: 30, rank: "Associate Professor" });
      const { supervisor, assistant } = pick([ap1], [ap1, ap3]);
      expect(supervisor?.teacher_id).not.toBe(assistant?.teacher_id);
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// BulkAssignModal – React component tests
// ═════════════════════════════════════════════════════════════════════════════

vi.mock("@/services/teacherassignmentQueries", () => ({
  teacherAssignmentQueries: {
    prefetchBulkContext:      vi.fn(),
    resolveRoomLink:          vi.fn(),
    getTeachersFromContext:   vi.fn(),
    batchCommitAssignments:   vi.fn(),
  },
}));

// ⚠️  Adjust path to match your folder layout
import BulkAssignModal from "@/components/BulkAssignModal";
import { teacherAssignmentQueries } from "@/services/teacherassignmentQueries";

const mockQ = vi.mocked(teacherAssignmentQueries, true);

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const room1 = makeRoom({ roomNumber: "101", examDate: "2025-06-01" });
const room2 = makeRoom({ roomNumber: "102", examDate: "2025-06-01" });
const room3 = makeRoom({ roomNumber: "201", examDate: "2025-06-02" });

const baseCtx = makeCtx([ap1, ap2], [lec1, lec2]);

const defaultProps = {
  rooms: [room1, room2],
  rankLimits: {},
  onClose: vi.fn(),
  onSuccess: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();

  // Default happy-path: context loads, rooms resolve, teachers found
  mockQ.prefetchBulkContext.mockResolvedValue(baseCtx);
  mockQ.resolveRoomLink.mockImplementation((_roomNumber: string, _date: string) => ({
    examRoomId: 1,
    linkId: 99,
  }));
  mockQ.getTeachersFromContext.mockImplementation((_role: string) =>
    _role === "Supervisor" ? [{ ...ap1 }] : [{ ...lec1 }],
  );
  mockQ.batchCommitAssignments.mockResolvedValue(undefined);
});

// ─── Rendering / calculating phase ───────────────────────────────────────────

describe("BulkAssignModal – calculating phase", () => {
  it("shows a loading spinner and 'Pre-fetching' message on mount", () => {
    render(<BulkAssignModal {...defaultProps} />);
    expect(screen.getByText(/pre-fetching data/i)).toBeInTheDocument();
  });

  it("displays room count and date count in the header", async () => {
    render(<BulkAssignModal {...defaultProps} />);
    await waitFor(() => screen.getByText(/preview/i));
    // Text is split across React text nodes → use a function matcher scoped to
    // the header subtitle <p> whose combined textContent includes both values.
    const headerSubtitle = screen.getByText(
      (_content, el) =>
        el?.tagName === "P" &&
        (el.textContent ?? "").includes("2") &&
        (el.textContent ?? "").includes("room") &&
        (el.textContent ?? "").includes("1") &&
        (el.textContent ?? "").includes("date"),
    );
    expect(headerSubtitle).toBeInTheDocument();
  });

  it("shows an error and stops if prefetchBulkContext rejects", async () => {
    mockQ.prefetchBulkContext.mockRejectedValue(new Error("Network failure"));
    render(<BulkAssignModal {...defaultProps} />);
    await waitFor(() =>
      expect(screen.getByText(/failed to fetch data/i)).toBeInTheDocument(),
    );
  });
});

// ─── Preview phase ────────────────────────────────────────────────────────────

describe("BulkAssignModal – preview phase", () => {
  it("transitions to preview after calculation completes", async () => {
    render(<BulkAssignModal {...defaultProps} />);
    await waitFor(() =>
      expect(screen.getByText(/preview/i)).toBeInTheDocument(),
    );
  });

  it("shows room numbers for each room", async () => {
    render(<BulkAssignModal {...defaultProps} />);
    await waitFor(() => screen.getByText(/Room 101/));
    expect(screen.getByText(/Room 102/)).toBeInTheDocument();
  });

  it("shows matched teacher names in the preview", async () => {
    render(<BulkAssignModal {...defaultProps} />);
    await waitFor(() => screen.getAllByText(ap1.name).length > 0);
    expect(screen.getAllByText(lec1.name).length).toBeGreaterThan(0);
  });

  it("shows the exam date section header", async () => {
    render(<BulkAssignModal {...defaultProps} />);
    await waitFor(() => screen.getByText("2025-06-01"));
  });

  it("renders period limits when rankLimits is non-empty", async () => {
    render(<BulkAssignModal {...defaultProps} rankLimits={{ Lecturer: 4 }} />);
    await waitFor(() => screen.getByText(/period limits enforced/i));
    expect(screen.getByText(/Lecturer \(max 4\)/i)).toBeInTheDocument();
  });

  it("shows 'Room not found' for rooms where resolveRoomLink returns null", async () => {
    mockQ.resolveRoomLink.mockReturnValue(null);
    render(<BulkAssignModal {...defaultProps} />);
    await waitFor(() =>
      expect(screen.getAllByText(/room not found/i).length).toBeGreaterThan(0),
    );
  });

  it("disables 'Save to Database' when no rooms can be assigned", async () => {
    mockQ.resolveRoomLink.mockReturnValue(null);
    render(<BulkAssignModal {...defaultProps} />);
    await waitFor(() => screen.getByRole("button", { name: /save to database/i }));
    expect(screen.getByRole("button", { name: /save to database/i })).toBeDisabled();
  });

  it("enables 'Save to Database' when at least one room is assignable", async () => {
    render(<BulkAssignModal {...defaultProps} />);
    await waitFor(() => screen.getByRole("button", { name: /save to database/i }));
    expect(screen.getByRole("button", { name: /save to database/i })).toBeEnabled();
  });

  it("shows the correct 'X of Y rooms ready' badge per date", async () => {
    // Give each room a unique examRoomId so both resolve correctly, and ensure
    // the teacher pool returns different teachers per room to avoid dayUsedIds
    // conflicts — this guarantees the badge shows 2/2.
    let callCount = 0;
    mockQ.resolveRoomLink.mockImplementation((_rn: string) => ({
      examRoomId: ++callCount,
      linkId: callCount * 10,
    }));
    mockQ.getTeachersFromContext.mockImplementation((_role: string) => {
      if (_role === "Supervisor") return [{ ...ap1 }, { ...ap2 }];
      return [{ ...lec1 }, { ...lec2 }];
    });

    render(<BulkAssignModal {...defaultProps} />);
    // Badge text is split across React text nodes — match via combined textContent
    await waitFor(() =>
      screen.getByText(
        (_content, el) =>
          (el?.textContent ?? "").replace(/\s+/g, " ").trim() === "2/2 rooms ready",
      ),
    );
  });

  it("handles multiple dates grouped correctly", async () => {
    render(<BulkAssignModal {...defaultProps} rooms={[room1, room3]} />);
    await waitFor(() => screen.getByText("2025-06-01"));
    expect(screen.getByText("2025-06-02")).toBeInTheDocument();
  });
});

// ─── Save / done phase ────────────────────────────────────────────────────────

describe("BulkAssignModal – save phase", () => {
  it("shows a saving spinner after clicking Save to Database", async () => {
    // Delay commit so we can observe the saving state
    mockQ.batchCommitAssignments.mockImplementation(
      () => new Promise((res) => setTimeout(res, 200)),
    );
    render(<BulkAssignModal {...defaultProps} />);
    await waitFor(() => screen.getByRole("button", { name: /save to database/i }));
    fireEvent.click(screen.getByRole("button", { name: /save to database/i }));
    await waitFor(() => screen.getByText(/saving/i));
  });

  it("calls batchCommitAssignments with the planned assignments", async () => {
    render(<BulkAssignModal {...defaultProps} />);
    await waitFor(() => screen.getByRole("button", { name: /save to database/i }));
    fireEvent.click(screen.getByRole("button", { name: /save to database/i }));
    await waitFor(() => expect(mockQ.batchCommitAssignments).toHaveBeenCalledTimes(1));
    const [commitArg] = mockQ.batchCommitAssignments.mock.calls[0];
    expect(Array.isArray(commitArg)).toBe(true);
  });

  it("calls onSuccess after saving", async () => {
    render(<BulkAssignModal {...defaultProps} />);
    await waitFor(() => screen.getByRole("button", { name: /save to database/i }));
    fireEvent.click(screen.getByRole("button", { name: /save to database/i }));
    await waitFor(() => expect(defaultProps.onSuccess).toHaveBeenCalledTimes(1));
  });

  it("transitions to done phase and shows success banner", async () => {
    render(<BulkAssignModal {...defaultProps} />);
    await waitFor(() => screen.getByRole("button", { name: /save to database/i }));
    fireEvent.click(screen.getByRole("button", { name: /save to database/i }));
    await waitFor(() =>
      expect(screen.getByText(/saved to database successfully/i)).toBeInTheDocument(),
    );
  });

  it("shows error banner when batchCommitAssignments rejects", async () => {
    mockQ.batchCommitAssignments.mockRejectedValue(new Error("Write failed"));
    render(<BulkAssignModal {...defaultProps} />);
    await waitFor(() => screen.getByRole("button", { name: /save to database/i }));
    fireEvent.click(screen.getByRole("button", { name: /save to database/i }));
    await waitFor(() =>
      expect(screen.getByText(/database write failed/i)).toBeInTheDocument(),
    );
  });

  it("shows a 'Done' button in the done phase and calls onClose when clicked", async () => {
    render(<BulkAssignModal {...defaultProps} />);
    await waitFor(() => screen.getByRole("button", { name: /save to database/i }));
    fireEvent.click(screen.getByRole("button", { name: /save to database/i }));
    const doneBtn = await screen.findByRole("button", { name: /done/i });
    fireEvent.click(doneBtn);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("shows saved/failed room results in done phase", async () => {
    render(<BulkAssignModal {...defaultProps} />);
    await waitFor(() => screen.getByRole("button", { name: /save to database/i }));
    fireEvent.click(screen.getByRole("button", { name: /save to database/i }));
    await waitFor(() => screen.getByText(/saved to database successfully/i));
    expect(screen.getByText(/Room 101/)).toBeInTheDocument();
    expect(screen.getByText(/Room 102/)).toBeInTheDocument();
  });
});

// ─── Cancel ───────────────────────────────────────────────────────────────────

describe("BulkAssignModal – cancel", () => {
  it("calls onClose when the Cancel button is clicked in preview phase", async () => {
    render(<BulkAssignModal {...defaultProps} />);
    await waitFor(() => screen.getByRole("button", { name: /cancel/i }));
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it("renders the X close button in preview phase", async () => {
    render(<BulkAssignModal {...defaultProps} />);
    await waitFor(() => screen.getByText(/preview/i));
    const xButtons = screen.getAllByRole("button").filter((b) => b.querySelector("svg"));
    expect(xButtons.length).toBeGreaterThan(0);
  });

  it("does NOT render the X button during calculating phase", () => {
    // prefetchBulkContext never resolves → stays in calculating
    mockQ.prefetchBulkContext.mockImplementation(() => new Promise(() => {}));
    render(<BulkAssignModal {...defaultProps} />);
    // Cancel / X should not be present while calculating
    expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument();
  });
});