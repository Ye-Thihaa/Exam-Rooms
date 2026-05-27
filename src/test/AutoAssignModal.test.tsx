// ─── Vitest + Testing Library ─────────────────────────────────────────────────
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

// ─── Types ────────────────────────────────────────────────────────────────────
import type { TeacherWithAvailability } from "@/services/teacherAssignmentTypes";

type RankPeriodLimits = Record<string, number>;

// ─── Pure helpers (mirrored from AutoAssignModal.tsx) ─────────────────────────

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

function eligible(t: TeacherWithAvailability, limits: RankPeriodLimits): boolean {
  return (
    t.availability.is_available &&
    (limits[t.rank] === undefined || (t.total_periods_assigned ?? 0) < limits[t.rank])
  );
}

function minWorkload(pool: TeacherWithAvailability[]): TeacherWithAvailability {
  return pool.reduce((best, t) =>
    (t.total_periods_assigned ?? 0) < (best.total_periods_assigned ?? 0) ? t : best,
  );
}

function pickPairedTeachers(
  supervisors: TeacherWithAvailability[],
  assistants: TeacherWithAvailability[],
  limits: RankPeriodLimits,
) {
  const VALID_SUP_RANKS = new Set(SUPERVISOR_ASSISTANT_PAIRS.map(([s]) => s));
  const VALID_ASST_RANKS = new Set(SUPERVISOR_ASSISTANT_PAIRS.map(([, a]) => a));

  const eSups = supervisors.filter((t) => VALID_SUP_RANKS.has(t.rank) && eligible(t, limits));
  const eAssts = assistants.filter((t) => VALID_ASST_RANKS.has(t.rank) && eligible(t, limits));

  for (const [supRank, asstRank] of SUPERVISOR_ASSISTANT_PAIRS) {
    const sCandidates = eSups.filter((t) => t.rank === supRank);
    const aCandidates = eAssts.filter(
      (t) => t.rank === asstRank && (RANK_ORDER[t.rank] ?? 0) < (RANK_ORDER[supRank] ?? 0),
    );
    if (sCandidates.length === 0 || aCandidates.length === 0) continue;

    const supervisor = minWorkload(sCandidates);
    const aBase = aCandidates.filter((t) => t.teacher_id !== supervisor.teacher_id);
    if (aBase.length === 0) continue;
    const assistant = minWorkload(aBase);

    return { supervisor, assistant, pairLabel: `${supRank} + ${asstRank}` };
  }

  if (eSups.length > 0) {
    const supervisor = minWorkload(eSups);
    const lowerRankAssts = eAssts.filter(
      (t) =>
        t.teacher_id !== supervisor.teacher_id &&
        (RANK_ORDER[t.rank] ?? 0) < (RANK_ORDER[supervisor.rank] ?? 0),
    );

    if (lowerRankAssts.length > 0) {
      const assistant = minWorkload(lowerRankAssts);
      return {
        supervisor,
        assistant,
        pairLabel: `${supervisor.rank} + ${assistant.rank} (fallback)`,
      };
    }

    if (supervisor.rank === "Associate Professor") {
      const apAssts = assistants.filter(
        (t) =>
          t.rank === "Associate Professor" &&
          t.teacher_id !== supervisor.teacher_id &&
          eligible(t, limits),
      );
      if (apAssts.length > 0) {
        const assistant = minWorkload(apAssts);
        return { supervisor, assistant, pairLabel: "AP + AP (last resort)" };
      }
    }

    return { supervisor, assistant: null, pairLabel: null };
  }

  return { supervisor: null, assistant: null, pairLabel: null };
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────
// TeacherAvailability requires { teacher_id, conflict_reason } — supply all fields.

function makeTeacher(
  overrides: Partial<TeacherWithAvailability> & { teacher_id: number; rank: string },
): TeacherWithAvailability {
  return {
    name: `Teacher ${overrides.teacher_id}`,
    department_id: 1,
    total_periods_assigned: 0,
    availability: {
      is_available: true,
      teacher_id: overrides.teacher_id,
      conflict_reason: null,
    },
    ...overrides,
  } as TeacherWithAvailability;
}

const ap1    = makeTeacher({ teacher_id: 1, rank: "Associate Professor", total_periods_assigned: 2 });
const ap2    = makeTeacher({ teacher_id: 2, rank: "Associate Professor", total_periods_assigned: 5 });
const lec1   = makeTeacher({ teacher_id: 3, rank: "Lecturer",            total_periods_assigned: 1 });
const lec2   = makeTeacher({ teacher_id: 4, rank: "Lecturer",            total_periods_assigned: 3 });
const al1    = makeTeacher({ teacher_id: 5, rank: "Associate Lecturer",  total_periods_assigned: 0 });
const tutor1 = makeTeacher({ teacher_id: 6, rank: "Tutor",               total_periods_assigned: 4 });
const unavailable = makeTeacher({
  teacher_id: 7,
  rank: "Lecturer",
  availability: { is_available: false, teacher_id: 7, conflict_reason: "Already assigned" },
});

// ═════════════════════════════════════════════════════════════════════════════
// eligible()
// ═════════════════════════════════════════════════════════════════════════════

describe("eligible()", () => {
  it("returns true for an available teacher with no limits set", () => {
    expect(eligible(lec1, {})).toBe(true);
  });

  it("returns false for an unavailable teacher", () => {
    expect(eligible(unavailable, {})).toBe(false);
  });

  it("returns true when periods assigned is below the rank limit", () => {
    expect(eligible(lec1, { Lecturer: 5 })).toBe(true);
  });

  it("returns false when periods assigned equals the rank limit", () => {
    expect(eligible(lec2, { Lecturer: 3 })).toBe(false);
  });

  it("returns false when periods assigned exceeds the rank limit", () => {
    expect(eligible(ap2, { "Associate Professor": 4 })).toBe(false);
  });

  it("ignores limits for ranks not present in the limits map", () => {
    expect(eligible(tutor1, { Lecturer: 2 })).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// minWorkload()
// ═════════════════════════════════════════════════════════════════════════════

describe("minWorkload()", () => {
  it("returns the single teacher in a one-element pool", () => {
    expect(minWorkload([lec1])).toBe(lec1);
  });

  it("picks the teacher with the lowest periods assigned", () => {
    expect(minWorkload([ap2, ap1])).toBe(ap1);
  });

  it("keeps the first teacher on a tie (stable)", () => {
    const t1 = makeTeacher({ teacher_id: 10, rank: "Tutor", total_periods_assigned: 3 });
    const t2 = makeTeacher({ teacher_id: 11, rank: "Tutor", total_periods_assigned: 3 });
    expect(minWorkload([t1, t2])).toBe(t1);
  });

  it("treats missing total_periods_assigned as 0", () => {
    const noData = makeTeacher({ teacher_id: 20, rank: "Tutor", total_periods_assigned: undefined });
    expect(minWorkload([lec1, noData])).toBe(noData);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// pickPairedTeachers()
// ═════════════════════════════════════════════════════════════════════════════

describe("pickPairedTeachers()", () => {
  describe("happy-path pairings", () => {
    it("picks AP + Lecturer (highest priority)", () => {
      const { supervisor, assistant, pairLabel } = pickPairedTeachers([ap1, lec1], [ap1, lec1], {});
      expect(supervisor?.rank).toBe("Associate Professor");
      expect(assistant?.rank).toBe("Lecturer");
      expect(pairLabel).toBe("Associate Professor + Lecturer");
    });

    it("picks AP + Associate Lecturer when no Lecturer assistant exists", () => {
      const { supervisor, assistant, pairLabel } = pickPairedTeachers([ap1], [al1], {});
      expect(supervisor?.rank).toBe("Associate Professor");
      expect(assistant?.rank).toBe("Associate Lecturer");
      expect(pairLabel).toBe("Associate Professor + Associate Lecturer");
    });

    it("picks AP + Tutor when only Tutors are available", () => {
      const { supervisor, assistant, pairLabel } = pickPairedTeachers([ap1], [tutor1], {});
      expect(supervisor?.rank).toBe("Associate Professor");
      expect(assistant?.rank).toBe("Tutor");
      expect(pairLabel).toBe("Associate Professor + Tutor");
    });

    it("picks Lecturer + Associate Lecturer", () => {
      const { supervisor, assistant, pairLabel } = pickPairedTeachers([lec1], [al1], {});
      expect(supervisor?.rank).toBe("Lecturer");
      expect(assistant?.rank).toBe("Associate Lecturer");
      expect(pairLabel).toBe("Lecturer + Associate Lecturer");
    });

    it("picks Lecturer + Tutor", () => {
      const { supervisor, assistant, pairLabel } = pickPairedTeachers([lec1], [tutor1], {});
      expect(supervisor?.rank).toBe("Lecturer");
      expect(assistant?.rank).toBe("Tutor");
      expect(pairLabel).toBe("Lecturer + Tutor");
    });

    it("picks Associate Lecturer + Tutor", () => {
      const { supervisor, assistant, pairLabel } = pickPairedTeachers([al1], [tutor1], {});
      expect(supervisor?.rank).toBe("Associate Lecturer");
      expect(assistant?.rank).toBe("Tutor");
      expect(pairLabel).toBe("Associate Lecturer + Tutor");
    });
  });

  describe("workload balancing", () => {
    it("selects the supervisor with the lower workload", () => {
      const { supervisor } = pickPairedTeachers([ap1, ap2], [lec1], {});
      expect(supervisor?.teacher_id).toBe(ap1.teacher_id);
    });

    it("selects the assistant with the lower workload", () => {
      const { assistant } = pickPairedTeachers([ap1], [lec1, lec2], {});
      expect(assistant?.teacher_id).toBe(lec1.teacher_id);
    });
  });

  describe("period limit enforcement", () => {
    it("skips teachers who have reached their rank limit", () => {
      const limits: RankPeriodLimits = { "Associate Professor": 2 };
      const { supervisor } = pickPairedTeachers([ap1, ap2], [lec1], limits);
      expect(supervisor).toBeNull();
    });

    it("uses teachers who are still under their limit", () => {
      const limits: RankPeriodLimits = { "Associate Professor": 3 };
      const { supervisor } = pickPairedTeachers([ap1, ap2], [lec1], limits);
      expect(supervisor?.teacher_id).toBe(ap1.teacher_id);
    });
  });

  describe("unavailability", () => {
    it("excludes unavailable supervisors", () => {
      const { supervisor } = pickPairedTeachers([unavailable], [al1], {});
      expect(supervisor).toBeNull();
    });

    it("returns nulls when all teachers are unavailable", () => {
      const { supervisor, assistant } = pickPairedTeachers([unavailable], [unavailable], {});
      expect(supervisor).toBeNull();
      expect(assistant).toBeNull();
    });
  });

  describe("fallback and last-resort", () => {
    it("uses AP + AP (last resort) when only another AP is available as assistant", () => {
      const ap3 = makeTeacher({ teacher_id: 30, rank: "Associate Professor", total_periods_assigned: 0 });
      const { pairLabel } = pickPairedTeachers([ap1], [ap3], {});
      expect(pairLabel).toBe("AP + AP (last resort)");
    });

    it("returns supervisor-only when no lower-rank assistant exists for a Lecturer", () => {
      const { supervisor, assistant, pairLabel } = pickPairedTeachers([lec1], [lec2], {});
      expect(supervisor).not.toBeNull();
      expect(assistant).toBeNull();
      expect(pairLabel).toBeNull();
    });

    it("returns nulls for both when both pools are empty", () => {
      const { supervisor, assistant } = pickPairedTeachers([], [], {});
      expect(supervisor).toBeNull();
      expect(assistant).toBeNull();
    });
  });

  describe("same-teacher guard", () => {
    it("never assigns the same teacher to both roles", () => {
      const ap3 = makeTeacher({ teacher_id: 30, rank: "Associate Professor", total_periods_assigned: 0 });
      const { supervisor, assistant } = pickPairedTeachers([ap1], [ap1, ap3], {});
      expect(supervisor?.teacher_id).not.toBe(assistant?.teacher_id);
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// AutoAssignModal – React component tests
// ═════════════════════════════════════════════════════════════════════════════

vi.mock("@/services/teacherassignmentQueries", () => ({
  teacherAssignmentQueries: {
    getCorrectExamRoomId:            vi.fn(),
    getAvailableTeachersWithSession: vi.fn(),
    deleteByRoomAndRole:             vi.fn(),
    create:                          vi.fn(),
  },
}));

// ⚠️  Adjust this path to match your folder structure, e.g.:
//   Same folder as the test:       "./AutoAssignModal"
//   Under src/components/ui/:      "../components/ui/AutoAssignModal"
import AutoAssignModal from "@/components/AutoAssignModal";
import { teacherAssignmentQueries } from "@/services/teacherassignmentQueries";

// vi.mocked() is Vitest's built-in typed mock helper — no type overlap errors
const mockQueries = vi.mocked(teacherAssignmentQueries, true);

const defaultProps = {
  examRoomId:  1,
  roomNumber:  "Room 101",
  examDate:    "2025-06-01",
  examSession: "Morning" as const,
  examTime:    { start: "08:00", end: "11:00" },
  rankLimits:  {},
  onClose:     vi.fn(),
  onSuccess:   vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockQueries.getCorrectExamRoomId.mockResolvedValue(null);
  mockQueries.getAvailableTeachersWithSession.mockResolvedValue([]);
  mockQueries.deleteByRoomAndRole.mockResolvedValue(undefined);
  mockQueries.create.mockResolvedValue(undefined);
});

// ─── Rendering ────────────────────────────────────────────────────────────────

describe("AutoAssignModal – rendering", () => {
  it("shows a loading spinner on mount", () => {
    render(<AutoAssignModal {...defaultProps} />);
    expect(screen.getByText(/finding best available teachers/i)).toBeInTheDocument();
  });

  it("renders room number, date and session in the header", async () => {
    render(<AutoAssignModal {...defaultProps} />);
    await waitFor(() => expect(screen.queryByText(/finding best/i)).not.toBeInTheDocument());
    expect(screen.getByText(/Room 101/)).toBeInTheDocument();
    expect(screen.getByText(/2025-06-01/)).toBeInTheDocument();
    expect(screen.getByText(/Morning/)).toBeInTheDocument();
  });

  it("shows 'No teacher available' for both roles when pools are empty", async () => {
    render(<AutoAssignModal {...defaultProps} />);
    await waitFor(() =>
      expect(screen.getAllByText(/no teacher available/i).length).toBeGreaterThan(0),
    );
  });

  it("renders matched teacher names after load", async () => {
    mockQueries.getAvailableTeachersWithSession.mockImplementation(
      (_id: number, role: string) =>
        role === "Supervisor" ? Promise.resolve([ap1]) : Promise.resolve([lec1]),
    );
    render(<AutoAssignModal {...defaultProps} />);
    await waitFor(() => screen.getByText(ap1.name));
    expect(screen.getByText(lec1.name)).toBeInTheDocument();
  });

  it("displays the selected pairLabel after load", async () => {
    mockQueries.getAvailableTeachersWithSession.mockImplementation(
      (_id: number, role: string) =>
        role === "Supervisor" ? Promise.resolve([ap1]) : Promise.resolve([lec1]),
    );
    render(<AutoAssignModal {...defaultProps} />);
    await waitFor(() => screen.getByText(/selected pairing/i));
    expect(screen.getByText(/Associate Professor \+ Lecturer/i)).toBeInTheDocument();
  });

  it("displays rank period limits in the info banner", async () => {
    render(<AutoAssignModal {...defaultProps} rankLimits={{ Lecturer: 4 }} />);
    await waitFor(() => expect(screen.queryByText(/finding best/i)).not.toBeInTheDocument());
    expect(screen.getByText(/Lecturer \(4\)/i)).toBeInTheDocument();
  });
});

// ─── Confirm action ───────────────────────────────────────────────────────────

describe("AutoAssignModal – confirm action", () => {
  it("disables Confirm when no teachers are found", async () => {
    render(<AutoAssignModal {...defaultProps} />);
    await waitFor(() => expect(screen.queryByText(/finding best/i)).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: /confirm assignment/i })).toBeDisabled();
  });

  it("enables Confirm when at least one teacher is found", async () => {
    mockQueries.getAvailableTeachersWithSession.mockImplementation(
      (_id: number, role: string) =>
        role === "Supervisor" ? Promise.resolve([ap1]) : Promise.resolve([]),
    );
    render(<AutoAssignModal {...defaultProps} />);
    await waitFor(() => screen.getByText(ap1.name));
    expect(screen.getByRole("button", { name: /confirm assignment/i })).toBeEnabled();
  });

  it("calls deleteByRoomAndRole + create for each assigned teacher", async () => {
    mockQueries.getAvailableTeachersWithSession.mockImplementation(
      (_id: number, role: string) =>
        role === "Supervisor" ? Promise.resolve([ap1]) : Promise.resolve([lec1]),
    );
    render(<AutoAssignModal {...defaultProps} />);
    await waitFor(() => screen.getByText(ap1.name));
    fireEvent.click(screen.getByRole("button", { name: /confirm assignment/i }));
    await waitFor(() => expect(mockQueries.create).toHaveBeenCalledTimes(2));
    expect(mockQueries.deleteByRoomAndRole).toHaveBeenCalledTimes(2);
    expect(defaultProps.onSuccess).toHaveBeenCalled();
  });

  it("shows a success message after saving", async () => {
    mockQueries.getAvailableTeachersWithSession.mockImplementation(
      (_id: number, role: string) =>
        role === "Supervisor" ? Promise.resolve([ap1]) : Promise.resolve([lec1]),
    );
    render(<AutoAssignModal {...defaultProps} />);
    await waitFor(() => screen.getByText(ap1.name));
    fireEvent.click(screen.getByRole("button", { name: /confirm assignment/i }));
    await waitFor(() =>
      expect(screen.getByText(/assignments saved successfully/i)).toBeInTheDocument(),
    );
  });

  it("shows an error message when create() rejects", async () => {
    mockQueries.getAvailableTeachersWithSession.mockImplementation(
      (_id: number, role: string) =>
        role === "Supervisor" ? Promise.resolve([ap1]) : Promise.resolve([lec1]),
    );
    mockQueries.create.mockRejectedValue(new Error("DB error"));
    render(<AutoAssignModal {...defaultProps} />);
    await waitFor(() => screen.getByText(ap1.name));
    fireEvent.click(screen.getByRole("button", { name: /confirm assignment/i }));
    await waitFor(() => expect(screen.getByText(/DB error/i)).toBeInTheDocument());
  });
});

// ─── Cancel / close ───────────────────────────────────────────────────────────

describe("AutoAssignModal – cancel", () => {
  it("calls onClose when the Cancel button is clicked", async () => {
    render(<AutoAssignModal {...defaultProps} />);
    await waitFor(() => expect(screen.queryByText(/finding best/i)).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the X icon button is clicked", async () => {
    render(<AutoAssignModal {...defaultProps} />);
    await waitFor(() => expect(screen.queryByText(/finding best/i)).not.toBeInTheDocument());
    const xBtn = screen.getAllByRole("button").find((b) => b.querySelector("svg"));
    fireEvent.click(xBtn!);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});

// ─── Room ID resolution ───────────────────────────────────────────────────────

describe("AutoAssignModal – getCorrectExamRoomId resolution", () => {
  it("passes the corrected room ID to getAvailableTeachersWithSession", async () => {
    mockQueries.getCorrectExamRoomId.mockResolvedValue(99);
    render(<AutoAssignModal {...defaultProps} examRoomId={1} />);
    await waitFor(() =>
      expect(mockQueries.getAvailableTeachersWithSession).toHaveBeenCalledWith(
        99,
        expect.any(String),
        expect.any(String),
        expect.any(String),
      ),
    );
  });
});