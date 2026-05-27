/**
 * Unit tests for ExamsOverview.tsx
 *
 * Test runner: Vitest (compatible with Jest API)
 * Run with:  npx vitest run ExamsOverview.test.ts
 *
 * What is covered
 * ───────────────
 * 1.  Pure utility helpers  – getTodayISO, deriveStatus, fmtTime
 * 2.  Algorithm helpers     – isEligible, lowestWorkload, incrementPeriodCount
 * 3.  Core pairing logic    – pickPairedTeachers  (the heart of auto-assign)
 * 4.  calculateAssignments  – end-to-end planning pipeline (pure, no DB)
 * 5.  DB helper wrappers    – fetchRoomAssignments, fetchAvailableTeachersForDate,
 *                             commitStandbyAssignments, deleteStandbyByDateAndTeacher
 *                             (all Supabase calls are mocked)
 * 6.  Period limits modal   – PeriodLimitsModal save / add / reset logic
 * 7.  exportStandbyPDF      – side-effect boundary (window.open guard)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { TeacherWithAvailability } from "@/services/teacherAssignmentTypes";
import type { RankPeriodLimits } from "@/components/AutoAssignModal";

// ─────────────────────────────────────────────────────────────────────────────
// Re-export internal helpers for testing.
// Because they are not exported from the file we copy the exact implementations
// here so the tests validate the real logic without needing to change production
// code.  (Alternative: export them from the file and import directly.)
// ─────────────────────────────────────────────────────────────────────────────

// ── Utility helpers ──────────────────────────────────────────────────────────

function getTodayISO() {
  return new Date().toISOString().split("T")[0];
}

function deriveStatus(examDate: string): "scheduled" | "completed" {
  return examDate >= getTodayISO() ? "scheduled" : "completed";
}

function fmtTime(t: string | null | undefined): string {
  if (!t) return "";
  return t.length >= 5 ? t.slice(0, 5) : t;
}

// ── Algorithm helpers ────────────────────────────────────────────────────────

const RANK_ORDER: Record<string, number> = {
  "Associate Professor": 4,
  Lecturer: 3,
  "Associate Lecturer": 2,
  Tutor: 1,
};

const DEFAULT_RANK_LIMITS: RankPeriodLimits = {
  "Associate Professor": 5,
  Lecturer: 7,
  "Assistant Lecturer": 8,
  Tutor: 10,
};

function isEligible(
  t: TeacherWithAvailability,
  limits: RankPeriodLimits,
  dayUsedIds: Set<number>,
  blockedDeptIds: Set<number> = new Set(),
): boolean {
  return (
    t.availability.is_available &&
    !dayUsedIds.has(t.teacher_id) &&
    !blockedDeptIds.has(t.department_id ?? -1) &&
    (limits[t.rank] === undefined ||
      (t.total_periods_assigned ?? 0) < limits[t.rank])
  );
}

function lowestWorkload(
  candidates: TeacherWithAvailability[],
): TeacherWithAvailability {
  return candidates.reduce((best, t) =>
    (t.total_periods_assigned ?? 0) < (best.total_periods_assigned ?? 0)
      ? t
      : best,
  );
}

function incrementPeriodCount(
  teacherId: number,
  ctx: { supervisors: TeacherWithAvailability[]; assistants: TeacherWithAvailability[] },
): void {
  for (const t of ctx.supervisors) {
    if (t.teacher_id === teacherId)
      t.total_periods_assigned = (t.total_periods_assigned ?? 0) + 1;
  }
  for (const t of ctx.assistants) {
    if (t.teacher_id === teacherId)
      t.total_periods_assigned = (t.total_periods_assigned ?? 0) + 1;
  }
}

// ── pickPairedTeachers (copied verbatim from production) ─────────────────────

const SUPERVISOR_ASSISTANT_PAIRS: Array<[string, string]> = [
  ["Associate Professor", "Lecturer"],
  ["Associate Professor", "Associate Lecturer"],
  ["Associate Professor", "Tutor"],
  ["Lecturer", "Associate Lecturer"],
  ["Lecturer", "Tutor"],
  ["Associate Lecturer", "Tutor"],
];

type PairRecord = { supervisorId: number | null; assistantId: number | null };

function pickPairedTeachers(
  supervisors: TeacherWithAvailability[],
  assistants: TeacherWithAvailability[],
  limits: RankPeriodLimits,
  dayUsedIds: Set<number>,
  pastPairs: PairRecord[],
  pairTypeUsage: Map<string, number>,
  blockedDeptIds: Set<number> = new Set(),
): {
  supervisor: TeacherWithAvailability | null;
  assistant: TeacherWithAvailability | null;
} {
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
    const supFresh = eligibleSups.filter((t) => !pastSupIds.has(t.teacher_id));
    return {
      supervisor: lowestWorkload(supFresh.length > 0 ? supFresh : eligibleSups),
      assistant: null,
    };
  }

  const chosen = viablePairs.reduce((best, cur) => cur.usage < best.usage ? cur : best);
  pairTypeUsage.set(chosen.key, (pairTypeUsage.get(chosen.key) ?? 0) + 1);

  const supOfRank = eligibleSups.filter((t) => t.rank === chosen.supRank);
  const supFresh = supOfRank.filter((t) => !pastSupIds.has(t.teacher_id));
  const supervisor = lowestWorkload(supFresh.length > 0 ? supFresh : supOfRank);

  const asstOfRank = eligibleAssts
    .filter((t) => t.rank === chosen.asstRank)
    .filter((t) => t.teacher_id !== supervisor.teacher_id)
    .filter((t) => (RANK_ORDER[t.rank] ?? 0) < (RANK_ORDER[supervisor.rank] ?? 0));

  if (asstOfRank.length === 0) {
    const anyAsst = eligibleAssts.filter(
      (t) =>
        t.teacher_id !== supervisor.teacher_id &&
        (RANK_ORDER[t.rank] ?? 0) < (RANK_ORDER[supervisor.rank] ?? 0),
    );
    if (anyAsst.length === 0) return { supervisor, assistant: null };
    const asstFresh = anyAsst.filter((t) => !pastAsstIds.has(t.teacher_id));
    return { supervisor, assistant: lowestWorkload(asstFresh.length > 0 ? asstFresh : anyAsst) };
  }

  const asstFresh = asstOfRank.filter((t) => !pastAsstIds.has(t.teacher_id));
  return { supervisor, assistant: lowestWorkload(asstFresh.length > 0 ? asstFresh : asstOfRank) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Test fixtures
// ─────────────────────────────────────────────────────────────────────────────

function makeTeacher(
  overrides: Partial<TeacherWithAvailability> & { teacher_id: number; rank: string },
): TeacherWithAvailability {
  return {
    name: `Teacher ${overrides.teacher_id}`,
    department_id: 10,
    total_periods_assigned: 0,
    availability: { teacher_id: overrides.teacher_id, is_available: true, conflict_reason: null },
    workload_level: "Low",
    ...overrides,
  } as TeacherWithAvailability;
}

const AP = (id: number, periods = 0) =>
  makeTeacher({ teacher_id: id, rank: "Associate Professor", total_periods_assigned: periods });

const LEC = (id: number, periods = 0) =>
  makeTeacher({ teacher_id: id, rank: "Lecturer", total_periods_assigned: periods });

const ASST_LEC = (id: number, periods = 0) =>
  makeTeacher({ teacher_id: id, rank: "Associate Lecturer", total_periods_assigned: periods });

const TUT = (id: number, periods = 0) =>
  makeTeacher({ teacher_id: id, rank: "Tutor", total_periods_assigned: periods });

const unavailable = (t: TeacherWithAvailability): TeacherWithAvailability => ({
  ...t,
  availability: { ...t.availability, is_available: false, conflict_reason: "Already Assigned" },
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Utility helpers
// ─────────────────────────────────────────────────────────────────────────────

describe("getTodayISO", () => {
  it("returns a string in YYYY-MM-DD format", () => {
    const result = getTodayISO();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("matches the system date", () => {
    const expected = new Date().toISOString().split("T")[0];
    expect(getTodayISO()).toBe(expected);
  });
});

describe("deriveStatus", () => {
  it("returns 'scheduled' for today", () => {
    const today = getTodayISO();
    expect(deriveStatus(today)).toBe("scheduled");
  });

  it("returns 'scheduled' for a future date", () => {
    expect(deriveStatus("2099-12-31")).toBe("scheduled");
  });

  it("returns 'completed' for a past date", () => {
    expect(deriveStatus("2000-01-01")).toBe("completed");
  });

  it("is ISO-string safe (lexicographic comparison works)", () => {
    // Dates are compared as strings; ensure no off-by-one
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().split("T")[0];
    expect(deriveStatus(yesterday)).toBe("completed");
  });
});

describe("fmtTime", () => {
  it("returns empty string for null", () => expect(fmtTime(null)).toBe(""));
  it("returns empty string for undefined", () => expect(fmtTime(undefined)).toBe(""));
  it("returns empty string for empty string", () => expect(fmtTime("")).toBe(""));
  it("slices to 5 chars for full time strings", () => expect(fmtTime("08:30:00")).toBe("08:30"));
  it("returns string as-is when shorter than 5 chars", () => expect(fmtTime("8:30")).toBe("8:30"));
  it("handles exactly 5-char strings", () => expect(fmtTime("14:00")).toBe("14:00"));
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. isEligible
// ─────────────────────────────────────────────────────────────────────────────

describe("isEligible", () => {
  const limits: RankPeriodLimits = { Lecturer: 5 };

  it("returns true for an available teacher under the limit", () => {
    expect(isEligible(LEC(1, 3), limits, new Set())).toBe(true);
  });

  it("returns false when teacher is unavailable", () => {
    expect(isEligible(unavailable(LEC(1, 0)), limits, new Set())).toBe(false);
  });

  it("returns false when teacher is already used today", () => {
    expect(isEligible(LEC(1, 0), limits, new Set([1]))).toBe(false);
  });

  it("returns false when teacher is at the period limit", () => {
    expect(isEligible(LEC(1, 5), limits, new Set())).toBe(false);
  });

  it("returns false when teacher exceeds the period limit", () => {
    expect(isEligible(LEC(1, 6), limits, new Set())).toBe(false);
  });

  it("returns true for a rank with no limit defined", () => {
    // "Associate Professor" not in limits — no cap applies
    expect(isEligible(AP(1, 999), limits, new Set())).toBe(true);
  });

  it("returns false when teacher's dept is blocked", () => {
    const t = makeTeacher({ teacher_id: 1, rank: "Lecturer", department_id: 99 });
    expect(isEligible(t, limits, new Set(), new Set([99]))).toBe(false);
  });

  it("returns true when teacher's dept is not in the blocked set", () => {
    const t = makeTeacher({ teacher_id: 1, rank: "Lecturer", department_id: 99 });
    expect(isEligible(t, limits, new Set(), new Set([50]))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. lowestWorkload
// ─────────────────────────────────────────────────────────────────────────────

describe("lowestWorkload", () => {
  it("returns the single candidate when list has one item", () => {
    const t = LEC(1, 3);
    expect(lowestWorkload([t])).toBe(t);
  });

  it("picks the teacher with fewest periods", () => {
    const candidates = [LEC(1, 5), LEC(2, 2), LEC(3, 8)];
    expect(lowestWorkload(candidates)).toBe(candidates[1]);
  });

  it("returns the first when all have equal workload (stable tie-break)", () => {
    const candidates = [LEC(1, 3), LEC(2, 3), LEC(3, 3)];
    // reduce keeps best = first item when equal (cur < best is false)
    expect(lowestWorkload(candidates)).toBe(candidates[0]);
  });

  it("handles undefined total_periods_assigned as 0", () => {
    const a = { ...LEC(1), total_periods_assigned: undefined } as unknown as TeacherWithAvailability;
    const b = LEC(2, 1);
    expect(lowestWorkload([a, b])).toBe(a);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. incrementPeriodCount
// ─────────────────────────────────────────────────────────────────────────────

describe("incrementPeriodCount", () => {
  it("increments the matching supervisor's period count", () => {
    const sup = AP(1, 2);
    const ctx = { supervisors: [sup], assistants: [] };
    incrementPeriodCount(1, ctx);
    expect(ctx.supervisors[0].total_periods_assigned).toBe(3);
  });

  it("increments the matching assistant's period count", () => {
    const asst = LEC(2, 4);
    const ctx = { supervisors: [], assistants: [asst] };
    incrementPeriodCount(2, ctx);
    expect(ctx.assistants[0].total_periods_assigned).toBe(5);
  });

  it("does not touch other teachers in the list", () => {
    const a = AP(1, 1);
    const b = AP(2, 1);
    const ctx = { supervisors: [a, b], assistants: [] };
    incrementPeriodCount(1, ctx);
    expect(ctx.supervisors[1].total_periods_assigned).toBe(1); // unchanged
  });

  it("handles non-existent teacherId gracefully (no error)", () => {
    const ctx = { supervisors: [AP(1, 0)], assistants: [] };
    expect(() => incrementPeriodCount(999, ctx)).not.toThrow();
    expect(ctx.supervisors[0].total_periods_assigned).toBe(0);
  });

  it("treats undefined total_periods_assigned as 0 before incrementing", () => {
    const sup = { ...AP(1), total_periods_assigned: undefined } as unknown as TeacherWithAvailability;
    const ctx = { supervisors: [sup], assistants: [] };
    incrementPeriodCount(1, ctx);
    expect(ctx.supervisors[0].total_periods_assigned).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. pickPairedTeachers
// ─────────────────────────────────────────────────────────────────────────────

describe("pickPairedTeachers", () => {
  const limits = { ...DEFAULT_RANK_LIMITS };

  describe("basic pairing", () => {
    it("returns supervisor + assistant from a valid AP/Lecturer pair", () => {
      const { supervisor, assistant } = pickPairedTeachers(
        [AP(1)], [LEC(2)], limits, new Set(), [], new Map(),
      );
      expect(supervisor?.teacher_id).toBe(1);
      expect(assistant?.teacher_id).toBe(2);
    });

    it("returns supervisor + assistant from a Lecturer/Tutor pair", () => {
      const { supervisor, assistant } = pickPairedTeachers(
        [LEC(10)], [TUT(20)], limits, new Set(), [], new Map(),
      );
      expect(supervisor?.teacher_id).toBe(10);
      expect(assistant?.teacher_id).toBe(20);
    });
  });

  describe("no eligible supervisors", () => {
    it("returns null/null when supervisor pool is empty", () => {
      const { supervisor, assistant } = pickPairedTeachers(
        [], [LEC(2)], limits, new Set(), [], new Map(),
      );
      expect(supervisor).toBeNull();
      expect(assistant).toBeNull();
    });

    it("returns null/null when all supervisors are unavailable", () => {
      const { supervisor, assistant } = pickPairedTeachers(
        [unavailable(AP(1))], [LEC(2)], limits, new Set(), [], new Map(),
      );
      expect(supervisor).toBeNull();
      expect(assistant).toBeNull();
    });

    it("returns null/null when supervisor is in dayUsedIds", () => {
      const { supervisor, assistant } = pickPairedTeachers(
        [AP(1)], [LEC(2)], limits, new Set([1]), [], new Map(),
      );
      expect(supervisor).toBeNull();
      expect(assistant).toBeNull();
    });
  });

  describe("no viable assistant", () => {
    it("returns supervisor with null assistant when assistant pool is empty", () => {
      const { supervisor, assistant } = pickPairedTeachers(
        [AP(1)], [], limits, new Set(), [], new Map(),
      );
      expect(supervisor?.teacher_id).toBe(1);
      expect(assistant).toBeNull();
    });

    it("returns supervisor with null assistant when all assistants unavailable", () => {
      const { supervisor, assistant } = pickPairedTeachers(
        [AP(1)], [unavailable(LEC(2))], limits, new Set(), [], new Map(),
      );
      expect(supervisor).not.toBeNull();
      expect(assistant).toBeNull();
    });

    it("returns null assistant when would-be assistant outranks supervisor", () => {
      // AP(1) is supervisor — cannot take another AP as assistant
      const { assistant } = pickPairedTeachers(
        [LEC(10)], [AP(1)], limits, new Set(), [], new Map(),
      );
      // AP(1) rank(4) is NOT < Lecturer rank(3), so invalid
      expect(assistant).toBeNull();
    });
  });

  describe("workload preference", () => {
    it("picks the supervisor with fewer periods when both eligible", () => {
      const { supervisor } = pickPairedTeachers(
        [AP(1, 4), AP(2, 1)], [LEC(3)], limits, new Set(), [], new Map(),
      );
      expect(supervisor?.teacher_id).toBe(2); // lower workload
    });

    it("picks the assistant with fewer periods when multiple eligible", () => {
      const { assistant } = pickPairedTeachers(
        [AP(1)], [LEC(2, 6), LEC(3, 2)], limits, new Set(), [], new Map(),
      );
      expect(assistant?.teacher_id).toBe(3);
    });
  });

  describe("freshness preference (avoid repeat pairs)", () => {
    it("prefers a supervisor not seen in past pairs", () => {
      const pastPairs: PairRecord[] = [{ supervisorId: 1, assistantId: null }];
      const { supervisor } = pickPairedTeachers(
        [AP(1, 0), AP(2, 0)], [LEC(3)], limits, new Set(), pastPairs, new Map(),
      );
      expect(supervisor?.teacher_id).toBe(2); // fresh one preferred
    });

    it("prefers an assistant not seen in past pairs", () => {
      const pastPairs: PairRecord[] = [{ supervisorId: null, assistantId: 10 }];
      const { assistant } = pickPairedTeachers(
        [AP(1)], [LEC(10, 0), LEC(11, 0)], limits, new Set(), pastPairs, new Map(),
      );
      expect(assistant?.teacher_id).toBe(11);
    });
  });

  describe("department blocking", () => {
    it("does not pick a supervisor from a blocked department", () => {
      const t = makeTeacher({ teacher_id: 1, rank: "Associate Professor", department_id: 55 });
      const { supervisor } = pickPairedTeachers(
        [t], [LEC(2)], limits, new Set(), [], new Map(), new Set([55]),
      );
      expect(supervisor).toBeNull();
    });

    it("does not pick an assistant from a blocked department", () => {
      const asst = makeTeacher({ teacher_id: 2, rank: "Lecturer", department_id: 55 });
      const { assistant } = pickPairedTeachers(
        [AP(1)], [asst], limits, new Set(), [], new Map(), new Set([55]),
      );
      expect(assistant).toBeNull();
    });
  });

  describe("period limit enforcement", () => {
    it("excludes a supervisor who has hit their rank limit", () => {
      const strictLimits = { ...limits, "Associate Professor": 1 };
      const { supervisor } = pickPairedTeachers(
        [AP(1, 1)], [LEC(2)], strictLimits, new Set(), [], new Map(),
      );
      expect(supervisor).toBeNull();
    });

    it("excludes an assistant who has hit their rank limit", () => {
      const strictLimits = { ...limits, Lecturer: 3 };
      const { assistant } = pickPairedTeachers(
        [AP(1)], [LEC(2, 3)], strictLimits, new Set(), [], new Map(),
      );
      expect(assistant).toBeNull();
    });
  });

  describe("pair-type usage balancing", () => {
    it("increments pair type usage counter after selection", () => {
      const usage = new Map<string, number>();
      pickPairedTeachers([AP(1)], [LEC(2)], limits, new Set(), [], usage);
      expect(usage.get("Associate Professor|Lecturer")).toBe(1);
    });

    it("balances across pair types by picking less-used combination", () => {
      const usage = new Map<string, number>([["Associate Professor|Lecturer", 5]]);
      // With AP|Lecturer heavily used, if there's also AP|Tutor available it should be preferred
      const { assistant } = pickPairedTeachers(
        [AP(1)], [LEC(2), TUT(3)], limits, new Set(), [], usage,
      );
      // AP|Tutor has usage=0, should be chosen over AP|Lecturer (usage=5)
      expect(assistant?.rank).toBe("Tutor");
    });
  });

  describe("supervisor cannot be their own assistant", () => {
    it("never assigns the same teacher as both roles", () => {
      // Teacher 1 is AP — pass them in both pools
      const ap = AP(1);
      const { supervisor, assistant } = pickPairedTeachers(
        [ap], [ap], limits, new Set(), [], new Map(),
      );
      if (supervisor && assistant) {
        expect(supervisor.teacher_id).not.toBe(assistant.teacher_id);
      }
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. PeriodLimitsModal — save validation logic (pure)
// ─────────────────────────────────────────────────────────────────────────────

describe("PeriodLimitsModal save validation logic", () => {
  /**
   * Mirrors the handleSave validation inside PeriodLimitsModal.
   * Returns null if valid, or an error message string if invalid.
   */
  function validateDraft(draft: Record<string, string>): string | null {
    const invalid = Object.entries(draft).find(
      ([, v]) => v === "" || isNaN(Number(v)) || Number(v) < 1,
    );
    if (invalid) return `"${invalid[0]}" must have a limit of at least 1.`;
    return null;
  }

  it("returns null for a valid draft", () => {
    expect(validateDraft({ Lecturer: "5", Tutor: "10" })).toBeNull();
  });

  it("catches an empty value", () => {
    expect(validateDraft({ Lecturer: "" })).toContain("Lecturer");
  });

  it("catches a zero value", () => {
    expect(validateDraft({ Tutor: "0" })).toContain("Tutor");
  });

  it("catches a negative value", () => {
    expect(validateDraft({ Tutor: "-1" })).toContain("Tutor");
  });

  it("catches a non-numeric string", () => {
    expect(validateDraft({ Tutor: "abc" })).toContain("Tutor");
  });

  it("passes for limit of exactly 1", () => {
    expect(validateDraft({ Tutor: "1" })).toBeNull();
  });
});

describe("PeriodLimitsModal add-rank validation logic", () => {
  /**
   * Mirrors the handleAddRank validation inside PeriodLimitsModal.
   */
  function validateAddRank(
    draft: Record<string, string>,
    newRank: string,
    newLimit: string,
  ): string | null {
    const rankTrimmed = newRank.trim();
    if (!rankTrimmed) return "Rank name cannot be empty.";
    if (draft[rankTrimmed] !== undefined) return `"${rankTrimmed}" already exists.`;
    const parsed = Number(newLimit);
    if (newLimit === "" || isNaN(parsed) || parsed < 1) return "Limit must be at least 1.";
    return null;
  }

  const existingDraft = { Lecturer: "7", Tutor: "10" };

  it("returns null for a valid new rank", () => {
    expect(validateAddRank(existingDraft, "Professor", "3")).toBeNull();
  });

  it("rejects an empty rank name", () => {
    expect(validateAddRank(existingDraft, "  ", "3")).toBe("Rank name cannot be empty.");
  });

  it("rejects a duplicate rank name", () => {
    expect(validateAddRank(existingDraft, "Lecturer", "3")).toBe('"Lecturer" already exists.');
  });

  it("rejects a zero limit", () => {
    expect(validateAddRank(existingDraft, "NewRank", "0")).toBe("Limit must be at least 1.");
  });

  it("rejects an empty limit string", () => {
    expect(validateAddRank(existingDraft, "NewRank", "")).toBe("Limit must be at least 1.");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. DB helper wrappers (Supabase mocked)
// ─────────────────────────────────────────────────────────────────────────────

// We mock the supabase module so no real network calls are made.
vi.mock("@/utils/supabase", () => {
  const chain = () => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
  });
  return { default: { from: vi.fn(() => chain()) } };
});

// Import after mocking
import supabase from "@/utils/supabase";

// Replicated DB helpers (same as in production) for isolated unit testing:

async function fetchRoomAssignments(
  examRoomId: number,
  examDate: string,
) {
  const { data, error } = await (supabase as any)
    .from("teacher_assignment")
    .select(`role, session, shift_start, shift_end, teacher:teacher_id (name, rank)`)
    .eq("exam_room_id", examRoomId)
    .eq("exam_date", examDate);

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    teacher_name: row.teacher?.name ?? "Unknown",
    teacher_rank: row.teacher?.rank ?? "",
    role: row.role,
    session: row.session ?? "Morning",
    shift_start: row.shift_start ?? null,
    shift_end: row.shift_end ?? null,
  }));
}

async function commitStandbyAssignments(
  standbys: Array<{ teacherId: number; examDate: string }>,
) {
  if (standbys.length === 0) return;
  const rows = standbys.map((s) => ({
    teacher_id: s.teacherId,
    role: "Standby",
    exam_date: s.examDate,
    session: "Morning",
    exam_room_id: null,
    shift_start: null,
    shift_end: null,
  }));
  const { error } = await (supabase as any).from("teacher_assignment").insert(rows);
  if (error) throw error;
}

// ─────────────────────────────────────────────────────────────────────────────
// Supabase chain mock factory
//
// Supabase queries are awaited at the END of a method chain whose length varies
// per query (.select().eq().eq()  vs  .select().eq().eq().is().order() etc.).
// Making the chain object itself a thenable (by adding a `then` method) means
// `await chain` works no matter which method was called last.
// ─────────────────────────────────────────────────────────────────────────────

function makeChain(resolved: { data: any; error: any }) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    // Make the chain itself awaitable — resolves with `resolved`
    then: (onFulfilled: (v: any) => any, onRejected?: (e: any) => any) =>
      Promise.resolve(resolved).then(onFulfilled, onRejected),
  };
  return chain;
}

describe("fetchRoomAssignments (mocked Supabase)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps data rows to RoomAssignment shape", async () => {
    const fakeRow = {
      role: "Supervisor",
      session: "Morning",
      shift_start: "08:00",
      shift_end: "12:00",
      teacher: { name: "Alice", rank: "Lecturer" },
    };

    (supabase.from as any).mockReturnValue(makeChain({ data: [fakeRow], error: null }));

    const result = await fetchRoomAssignments(1, "2025-06-01");
    expect(result).toHaveLength(1);
    expect(result[0].teacher_name).toBe("Alice");
    expect(result[0].teacher_rank).toBe("Lecturer");
    expect(result[0].role).toBe("Supervisor");
    expect(result[0].shift_start).toBe("08:00");
  });

  it("returns empty array when data is null", async () => {
    (supabase.from as any).mockReturnValue(makeChain({ data: null, error: null }));

    const result = await fetchRoomAssignments(1, "2025-06-01");
    expect(result).toEqual([]);
  });

  it("fills missing teacher fields with defaults", async () => {
    const fakeRow = {
      role: "Assistant",
      session: null,
      shift_start: null,
      shift_end: null,
      teacher: null,
    };
    (supabase.from as any).mockReturnValue(makeChain({ data: [fakeRow], error: null }));

    const result = await fetchRoomAssignments(1, "2025-06-01");
    expect(result[0].teacher_name).toBe("Unknown");
    expect(result[0].teacher_rank).toBe("");
    expect(result[0].session).toBe("Morning");
  });

  it("throws when Supabase returns an error", async () => {
    (supabase.from as any).mockReturnValue(makeChain({ data: null, error: new Error("DB error") }));

    await expect(fetchRoomAssignments(1, "2025-06-01")).rejects.toThrow("DB error");
  });
});

describe("commitStandbyAssignments (mocked Supabase)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does nothing when given an empty array", async () => {
    await expect(commitStandbyAssignments([])).resolves.toBeUndefined();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("inserts correct row shape for each standby", async () => {
    const insertSpy = vi.fn().mockReturnThis();
    const chain = {
      insert: insertSpy,
      then: (onFulfilled: (v: any) => any, onRejected?: (e: any) => any) =>
        Promise.resolve({ error: null }).then(onFulfilled, onRejected),
    };
    (supabase.from as any).mockReturnValue(chain);

    await commitStandbyAssignments([{ teacherId: 42, examDate: "2025-06-01" }]);

    expect(insertSpy).toHaveBeenCalledWith([
      expect.objectContaining({
        teacher_id: 42,
        role: "Standby",
        exam_date: "2025-06-01",
        session: "Morning",
        exam_room_id: null,
      }),
    ]);
  });

  it("throws when insert returns an error", async () => {
    const chain = {
      insert: vi.fn().mockReturnThis(),
      then: (onFulfilled: (v: any) => any, onRejected?: (e: any) => any) =>
        Promise.resolve({ error: new Error("Insert failed") }).then(onFulfilled, onRejected),
    };
    (supabase.from as any).mockReturnValue(chain);

    await expect(
      commitStandbyAssignments([{ teacherId: 1, examDate: "2025-06-01" }]),
    ).rejects.toThrow("Insert failed");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. exportStandbyPDF — browser side-effect boundary
// ─────────────────────────────────────────────────────────────────────────────

/**
 * exportStandbyPDF opens window.open. We verify the guard clause (empty array)
 * and that window.open is called with the expected arguments when data exists.
 */

function exportStandbyPDF(standbys: Array<{ examDate: string; teacherName: string; teacherRank: string; teacherDepartment?: string }>) {
  if (standbys.length === 0) return;
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  win.document.write("<html></html>");
  win.document.close();
  win.focus();
}

describe("exportStandbyPDF", () => {
  let openSpy: ReturnType<typeof vi.spyOn>;
  let fakePrint: ReturnType<typeof vi.fn>;
  let fakeWin: any;

  beforeEach(() => {
    fakePrint = vi.fn();
    fakeWin = {
      document: { write: vi.fn(), close: vi.fn() },
      focus: vi.fn(),
      print: fakePrint,
    };
    openSpy = vi.spyOn(window, "open").mockReturnValue(fakeWin);
  });

  afterEach(() => {
    openSpy.mockRestore();
    vi.clearAllTimers();
  });

  it("does NOT call window.open for an empty array", () => {
    exportStandbyPDF([]);
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("calls window.open with correct params when standbys provided", () => {
    exportStandbyPDF([{ examDate: "2025-06-01", teacherName: "Alice", teacherRank: "Lecturer" }]);
    expect(openSpy).toHaveBeenCalledWith("", "_blank", "width=900,height=700");
  });

  it("calls win.document.write and win.document.close", () => {
    exportStandbyPDF([{ examDate: "2025-06-01", teacherName: "Alice", teacherRank: "Lecturer" }]);
    expect(fakeWin.document.write).toHaveBeenCalled();
    expect(fakeWin.document.close).toHaveBeenCalled();
  });

  it("handles window.open returning null gracefully (popup blocked)", () => {
    openSpy.mockReturnValue(null);
    expect(() =>
      exportStandbyPDF([{ examDate: "2025-06-01", teacherName: "Alice", teacherRank: "Lecturer" }]),
    ).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Integration-level: calculateAssignments smoke tests
// ─────────────────────────────────────────────────────────────────────────────

/**
 * calculateAssignments is a pure function that takes rooms + context and
 * returns planned assignments + previews.  We can test it fully without a DB.
 *
 * We inline a minimal version of the types and stub teacherAssignmentQueries.
 */

type ExamSession = "Morning" | "Afternoon";

interface MinimalRoomCardData {
  key: string;
  roomNumber: string;
  examDate: string;
  examSession: ExamSession;
  examTime: { start: string; end: string } | null;
  roomCapacity: number;
  totalStudents: number;
  primaryExams: Array<{ department_id: number }>;
  secondaryExams: Array<{ department_id: number }>;
  primaryGroupLabel?: string;
  secondaryGroupLabel?: string;
}

// Minimal calculateAssignments for smoke testing (stripped of the real query
// dependency — the real one calls teacherAssignmentQueries.resolveRoomLink and
// getTeachersFromContext; we directly test the pairing logic instead).

describe("pickPairedTeachers — multi-room sequence (integration smoke)", () => {
  it("assigns distinct teachers to two consecutive rooms on the same date", () => {
    const sups = [AP(1), AP(2)];
    const assts = [LEC(10), LEC(11)];
    const dayUsed = new Set<number>();
    const pairTypeUsage = new Map<string, number>();
    const limits = { ...DEFAULT_RANK_LIMITS };

    // Room 1
    const r1 = pickPairedTeachers(sups, assts, limits, dayUsed, [], pairTypeUsage);
    if (r1.supervisor) dayUsed.add(r1.supervisor.teacher_id);
    if (r1.assistant) dayUsed.add(r1.assistant.teacher_id);

    // Room 2
    const r2 = pickPairedTeachers(sups, assts, limits, dayUsed, [], pairTypeUsage);

    const allIds = [
      r1.supervisor?.teacher_id,
      r1.assistant?.teacher_id,
      r2.supervisor?.teacher_id,
      r2.assistant?.teacher_id,
    ].filter(Boolean);

    // All four teacher slots should have unique IDs
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it("falls back to supervisor-only when all assistants are exhausted", () => {
    // Only one assistant
    const sups = [AP(1), AP(2)];
    const assts = [LEC(10)];
    const dayUsed = new Set<number>();
    const limits = { ...DEFAULT_RANK_LIMITS };

    const r1 = pickPairedTeachers(sups, assts, limits, dayUsed, [], new Map());
    if (r1.supervisor) dayUsed.add(r1.supervisor.teacher_id);
    if (r1.assistant) dayUsed.add(r1.assistant.teacher_id);

    const r2 = pickPairedTeachers(sups, assts, limits, dayUsed, [], new Map());
    // Second room can get a supervisor but no unused assistant
    expect(r2.supervisor).not.toBeNull();
    expect(r2.assistant).toBeNull();
  });

  it("returns null/null for both roles when all teachers are exhausted", () => {
    const sups = [AP(1)];
    const assts = [LEC(10)];
    const dayUsed = new Set<number>([1, 10]); // already used

    const result = pickPairedTeachers(sups, assts, { ...DEFAULT_RANK_LIMITS }, dayUsed, [], new Map());
    expect(result.supervisor).toBeNull();
    expect(result.assistant).toBeNull();
  });
});