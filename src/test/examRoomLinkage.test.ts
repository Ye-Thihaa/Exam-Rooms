import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  matchExamToGroup,
  getAllExamRoomLinkages,
  getExamRoomLinkagesByDate,
  getExamRoomLinkageById,
  getExamRoomLinkageStats,
  GroupCriteria,
  examRoomLinkageService,
} from "@/services/examRoomLinkage";
import { Exam } from "@/services/examQueries";

// ─── Mock dependencies ────────────────────────────────────────────────────────
vi.mock("@/services/examQueries", () => ({
  examQueries: {
    getUniqueDates: vi.fn(),
    getByDate: vi.fn(),
    getAll: vi.fn(),
  },
}));

vi.mock("@/services/examroomQueries", () => ({
  examRoomQueries: {
    getRoomsByDate: vi.fn(),
    getExamRoomById: vi.fn(),
  },
}));

import { examQueries } from "@/services/examQueries";
import { examRoomQueries } from "@/services/examroomQueries";

// ─── Fixtures ────────────────────────────────────────────────────────────────
const mockExam: Exam = {
  exam_id: 1,
  subject_code: "CS101",
  exam_name: "Intro to CS",
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

const mockExamRoom = {
  exam_room_id: 10,
  year_level_primary: "1",
  sem_primary: "1",
  program_primary: "CS",
  specialization_primary: "",
  year_level_secondary: null,
  sem_secondary: null,
  program_secondary: null,
  specialization_secondary: null,
  students_primary: 30,
  students_secondary: 0,
  room: { room_number: "101", capacity: 40 },
};

// ─── matchExamToGroup (pure function) ────────────────────────────────────────
describe("matchExamToGroup()", () => {
  const group: GroupCriteria = {
    yearLevel: "1",
    semester: "1",
    program: "CS",
    specialization: "",
  };

  it("returns true when exam matches group exactly", () => {
    expect(matchExamToGroup(mockExam, group)).toBe(true);
  });

  it("returns false when year level does not match", () => {
    expect(matchExamToGroup({ ...mockExam, year_level: "2" }, group)).toBe(false);
  });

  it("returns false when semester does not match", () => {
    expect(matchExamToGroup({ ...mockExam, semester: "2" }, group)).toBe(false);
  });

  it("returns false when program does not match", () => {
    expect(matchExamToGroup({ ...mockExam, program: "IT" }, group)).toBe(false);
  });

  it("handles word-based year levels like 'First Year'", () => {
    const wordYearExam = { ...mockExam, year_level: "First Year" };
    expect(matchExamToGroup(wordYearExam, group)).toBe(true);
  });

  it("handles word-based year level 'Second Year'", () => {
    const wordYearExam = { ...mockExam, year_level: "Second Year" };
    const group2: GroupCriteria = { ...group, yearLevel: "2" };
    expect(matchExamToGroup(wordYearExam, group2)).toBe(true);
  });

  it("handles word-based semester like 'First'", () => {
    const wordSemExam = { ...mockExam, semester: "First" };
    expect(matchExamToGroup(wordSemExam, group)).toBe(true);
  });

  it("handles word-based semester 'Second'", () => {
    const wordSemExam = { ...mockExam, semester: "Second" };
    const group2: GroupCriteria = { ...group, semester: "2" };
    expect(matchExamToGroup(wordSemExam, group2)).toBe(true);
  });

  it("matches specialization codes like 'SE' → 'Software Engineering'", () => {
    const seExam = { ...mockExam, specialization: "Software Engineering" };
    const seGroup: GroupCriteria = { ...group, specialization: "SE" };
    expect(matchExamToGroup(seExam, seGroup)).toBe(true);
  });

  it("matches specialization 'KE' → 'Knowledge Engineering'", () => {
    const keExam = { ...mockExam, specialization: "Knowledge Engineering" };
    const keGroup: GroupCriteria = { ...group, specialization: "KE" };
    expect(matchExamToGroup(keExam, keGroup)).toBe(true);
  });

  it("returns false when specializations don't match", () => {
    const seExam = { ...mockExam, specialization: "SE" };
    const keGroup: GroupCriteria = { ...group, specialization: "KE" };
    expect(matchExamToGroup(seExam, keGroup)).toBe(false);
  });

  it("handles null specialization in exam matching empty group specialization", () => {
    const nullSpecExam = { ...mockExam, specialization: null };
    const emptySpecGroup: GroupCriteria = { ...group, specialization: "" };
    expect(matchExamToGroup(nullSpecExam, emptySpecGroup)).toBe(true);
  });
});

// ─── getAllExamRoomLinkages ────────────────────────────────────────────────────
describe("getAllExamRoomLinkages()", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns success: true with empty data when no dates exist", async () => {
    vi.mocked(examQueries.getUniqueDates).mockResolvedValue([]);
    const result = await getAllExamRoomLinkages();
    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });

  it("groups linkages correctly for a single date", async () => {
    vi.mocked(examQueries.getUniqueDates).mockResolvedValue([
      { exam_date: "2025-06-01", day_of_week: "Monday" },
    ]);
    vi.mocked(examQueries.getByDate).mockResolvedValue([mockExam]);
    vi.mocked(examRoomQueries.getRoomsByDate).mockResolvedValue({
      success: true,
      data: { "2025-06-01": [mockExamRoom] },
    });

    const result = await getAllExamRoomLinkages();
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data![0].examDate).toBe("2025-06-01");
    expect(result.data![0].dayOfWeek).toBe("Monday");
    expect(result.data![0].linkages).toHaveLength(1);
    expect(result.data![0].linkages[0].roomNumber).toBe("101");
  });

  it("matches exams to primary group correctly", async () => {
    vi.mocked(examQueries.getUniqueDates).mockResolvedValue([
      { exam_date: "2025-06-01", day_of_week: "Monday" },
    ]);
    vi.mocked(examQueries.getByDate).mockResolvedValue([mockExam]);
    vi.mocked(examRoomQueries.getRoomsByDate).mockResolvedValue({
      success: true,
      data: { "2025-06-01": [mockExamRoom] },
    });

    const result = await getAllExamRoomLinkages();
    const linkage = result.data![0].linkages[0];
    expect(linkage.linkedExams.primary).toHaveLength(1);
    expect(linkage.linkedExams.secondary).toHaveLength(0);
    expect(linkage.totalLinkedExams).toBe(1);
  });

  it("skips dates when getRoomsByDate fails", async () => {
    vi.mocked(examQueries.getUniqueDates).mockResolvedValue([
      { exam_date: "2025-06-01", day_of_week: "Monday" },
    ]);
    vi.mocked(examQueries.getByDate).mockResolvedValue([mockExam]);
    vi.mocked(examRoomQueries.getRoomsByDate).mockResolvedValue({
      success: false,
      error: "DB error",
    });

    const result = await getAllExamRoomLinkages();
    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });

  it("returns success: false on unexpected error", async () => {
    vi.mocked(examQueries.getUniqueDates).mockRejectedValue(new Error("Network fail"));
    const result = await getAllExamRoomLinkages();
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("handles rooms with no matched exams (totalLinkedExams = 0)", async () => {
    const unmatchedExam = { ...mockExam, program: "IT" }; // won't match CS group
    vi.mocked(examQueries.getUniqueDates).mockResolvedValue([
      { exam_date: "2025-06-01", day_of_week: "Monday" },
    ]);
    vi.mocked(examQueries.getByDate).mockResolvedValue([unmatchedExam]);
    vi.mocked(examRoomQueries.getRoomsByDate).mockResolvedValue({
      success: true,
      data: { "2025-06-01": [mockExamRoom] },
    });

    const result = await getAllExamRoomLinkages();
    expect(result.data![0].linkages[0].totalLinkedExams).toBe(0);
  });
});

// ─── getExamRoomLinkagesByDate ────────────────────────────────────────────────
describe("getExamRoomLinkagesByDate()", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns linkages for a specific date", async () => {
    vi.mocked(examQueries.getByDate).mockResolvedValue([mockExam]);
    vi.mocked(examRoomQueries.getRoomsByDate).mockResolvedValue({
      success: true,
      data: { "2025-06-01": [mockExamRoom] },
    });

    const result = await getExamRoomLinkagesByDate("2025-06-01");
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
  });

  it("returns empty linkages when no rooms on date", async () => {
    vi.mocked(examQueries.getByDate).mockResolvedValue([mockExam]);
    vi.mocked(examRoomQueries.getRoomsByDate).mockResolvedValue({
      success: true,
      data: {},
    });

    const result = await getExamRoomLinkagesByDate("2025-06-01");
    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });

  it("returns success: false when getRoomsByDate fails", async () => {
    vi.mocked(examQueries.getByDate).mockResolvedValue([]);
    vi.mocked(examRoomQueries.getRoomsByDate).mockResolvedValue({
      success: false,
      error: "fail",
    });

    const result = await getExamRoomLinkagesByDate("2025-06-01");
    expect(result.success).toBe(false);
  });

  it("returns success: false on unexpected error", async () => {
    vi.mocked(examQueries.getByDate).mockRejectedValue(new Error("crash"));
    vi.mocked(examRoomQueries.getRoomsByDate).mockResolvedValue({ success: true, data: {} });

    const result = await getExamRoomLinkagesByDate("2025-06-01");
    expect(result.success).toBe(false);
  });
});

// ─── getExamRoomLinkageById ───────────────────────────────────────────────────
describe("getExamRoomLinkageById()", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns linkage for a specific exam room", async () => {
    vi.mocked(examRoomQueries.getExamRoomById).mockResolvedValue({
      success: true,
      data: mockExamRoom,
    });
    vi.mocked(examQueries.getAll).mockResolvedValue([mockExam]);

    const result = await getExamRoomLinkageById(10);
    expect(result.success).toBe(true);
    expect(result.data?.examRoomId).toBe(10);
    expect(result.data?.roomNumber).toBe("101");
  });

  it("returns success: false when exam room not found", async () => {
    vi.mocked(examRoomQueries.getExamRoomById).mockResolvedValue({
      success: false,
      data: null,
    });

    const result = await getExamRoomLinkageById(999);
    expect(result.success).toBe(false);
  });

  it("correctly matches exams to primary group", async () => {
    vi.mocked(examRoomQueries.getExamRoomById).mockResolvedValue({
      success: true,
      data: mockExamRoom,
    });
    vi.mocked(examQueries.getAll).mockResolvedValue([mockExam]);

    const result = await getExamRoomLinkageById(10);
    expect(result.data?.linkedExams.primary).toHaveLength(1);
    expect(result.data?.linkedExams.secondary).toHaveLength(0);
  });

  it("returns success: false on unexpected error", async () => {
    vi.mocked(examRoomQueries.getExamRoomById).mockRejectedValue(new Error("crash"));
    const result = await getExamRoomLinkageById(10);
    expect(result.success).toBe(false);
  });
});

// ─── getExamRoomLinkageStats ──────────────────────────────────────────────────
describe("getExamRoomLinkageStats()", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns correct stats for one date with one room and one exam", async () => {
    vi.mocked(examQueries.getUniqueDates).mockResolvedValue([
      { exam_date: "2025-06-01", day_of_week: "Monday" },
    ]);
    vi.mocked(examQueries.getByDate).mockResolvedValue([mockExam]);
    vi.mocked(examRoomQueries.getRoomsByDate).mockResolvedValue({
      success: true,
      data: { "2025-06-01": [mockExamRoom] },
    });
    vi.mocked(examQueries.getAll).mockResolvedValue([mockExam]);

    const result = await getExamRoomLinkageStats();
    expect(result.success).toBe(true);
    expect(result.data?.totalDates).toBe(1);
    expect(result.data?.totalRooms).toBe(1);
    expect(result.data?.totalExams).toBe(1);
    expect(result.data?.examsWithoutRooms).toBe(0);
  });

  it("counts rooms without exams", async () => {
    const unmatchedExam = { ...mockExam, program: "IT" };
    vi.mocked(examQueries.getUniqueDates).mockResolvedValue([
      { exam_date: "2025-06-01", day_of_week: "Monday" },
    ]);
    vi.mocked(examQueries.getByDate).mockResolvedValue([unmatchedExam]);
    vi.mocked(examRoomQueries.getRoomsByDate).mockResolvedValue({
      success: true,
      data: { "2025-06-01": [mockExamRoom] },
    });
    vi.mocked(examQueries.getAll).mockResolvedValue([unmatchedExam]);

    const result = await getExamRoomLinkageStats();
    expect(result.data?.roomsWithoutExams).toBe(1);
    expect(result.data?.examsWithoutRooms).toBe(1);
  });

  it("returns success: false on unexpected error", async () => {
    vi.mocked(examQueries.getUniqueDates).mockRejectedValue(new Error("crash"));
    const result = await getExamRoomLinkageStats();
    expect(result.success).toBe(false);
  });
});

// ─── examRoomLinkageService (exported object) ─────────────────────────────────
describe("examRoomLinkageService", () => {
  it("exposes getAll, getByDate, getById, getStats, matchExamToGroup", () => {
    expect(typeof examRoomLinkageService.getAll).toBe("function");
    expect(typeof examRoomLinkageService.getByDate).toBe("function");
    expect(typeof examRoomLinkageService.getById).toBe("function");
    expect(typeof examRoomLinkageService.getStats).toBe("function");
    expect(typeof examRoomLinkageService.matchExamToGroup).toBe("function");
  });
});
