// ============================================================
// Unit Tests — seatingTypes.ts
// Covers runtime shape/contract validation for all exported
// interfaces in the seating system types file.
// ============================================================

import { describe, it, expect } from "vitest";

// Import types — TypeScript will validate shapes at compile time.
// These tests verify runtime-constructable shapes and any pure
// helper logic associated with the types.
import type {
  RoomAssignment,
  SeatingArrangement,
  SeatingPlan,
  SeatingDetails,
  RoomAssignmentSummary,
  ExamGroup,
  RoomAllocation,
  SeatAssignment,
  SeatingPattern,
  GenerateSeatingRequest,
  GenerateSeatingResponse,
} from "@/services/seatingTypes";

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures — one valid object per interface
// ─────────────────────────────────────────────────────────────────────────────

const ROOM_ASSIGNMENT: RoomAssignment = {
  assignment_id: 1,
  exam_date: "2024-06-01",
  start_time: "08:00:00",
  end_time: "10:00:00",
  room_id: 5,
  exam_id_primary: 100,
  exam_id_secondary: null,
  students_primary: 20,
  students_secondary: 0,
  total_students: 20,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const SEATING_ARRANGEMENT: SeatingArrangement = {
  seating_id: 1,
  assignment_id: 1,
  student_id: 42,
  exam_id: 100,
  seat_number: 1,
  row_number: 1,
  column_number: 1,
  created_at: "2024-01-01T00:00:00Z",
};

const SEATING_PLAN: SeatingPlan = {
  plan_id: 1,
  exam_date: "2024-06-01",
  session: "Morning",
  start_time: "08:00:00",
  end_time: "10:00:00",
  total_exams: 3,
  total_students: 90,
  total_rooms_used: 3,
  status: "draft",
  generated_by: "admin",
  generated_at: "2024-01-01T00:00:00Z",
  confirmed_at: null,
  notes: null,
};

const SEATING_DETAILS: SeatingDetails = {
  seating_id: 1,
  seat_number: 1,
  row_number: 1,
  column_number: 1,
  student_id: 42,
  student_number: "2021-00001",
  student_name: "Juan dela Cruz",
  exam_id: 100,
  subject_code: "CS101",
  exam_name: "Midterm",
  year_level: "2",
  semester: "1",
  specialization: null,
  assignment_id: 1,
  exam_date: "2024-06-01",
  start_time: "08:00:00",
  end_time: "10:00:00",
  room_id: 5,
  room_name: "Room 101",
  building: "Main Building",
  capacity: 40,
};

const EXAM_GROUP: ExamGroup = {
  exam_id: 100,
  subject_code: "CS101",
  exam_name: "Midterm",
  year_level: "2",
  semester: "1",
  program: "CS",
  specialization: null,
  student_count: 25,
  students: [1, 2, 3],
};

const ROOM_ALLOCATION: RoomAllocation = {
  room_id: 5,
  room_name: "Room 101",
  capacity: 40,
  primary_exam: EXAM_GROUP,
  secondary_exam: null,
  total_students: 25,
};

const SEAT_ASSIGNMENT: SeatAssignment = {
  seat_number: 1,
  row: 1,
  column: 1,
  student_id: 42,
  exam_id: 100,
  exam_type: "primary",
};

const SEATING_PATTERN: SeatingPattern = {
  type: "zigzag",
  room_layout: {
    rows: 5,
    columns: 8,
    total_seats: 40,
  },
};

const GENERATE_REQUEST: GenerateSeatingRequest = {
  exam_date: "2024-06-01",
  session: "Morning",
  start_time: "08:00:00",
  end_time: "10:00:00",
  exam_ids: [100, 101],
  pattern: "zigzag",
  generated_by: "admin",
};

const GENERATE_RESPONSE: GenerateSeatingResponse = {
  success: true,
  plan_id: 1,
  total_rooms_used: 2,
  total_students_assigned: 50,
  assignments: [ROOM_ASSIGNMENT],
  message: "Seating generated successfully",
};

// ─────────────────────────────────────────────────────────────────────────────
// RoomAssignment
// ─────────────────────────────────────────────────────────────────────────────

describe("RoomAssignment", () => {
  it("has all required fields", () => {
    expect(ROOM_ASSIGNMENT.assignment_id).toBe(1);
    expect(ROOM_ASSIGNMENT.exam_date).toBe("2024-06-01");
    expect(ROOM_ASSIGNMENT.exam_id_primary).toBe(100);
    expect(ROOM_ASSIGNMENT.total_students).toBe(20);
  });

  it("allows exam_id_secondary to be null", () => {
    expect(ROOM_ASSIGNMENT.exam_id_secondary).toBeNull();
  });

  it("allows exam_id_secondary to be a number", () => {
    const withSecondary: RoomAssignment = { ...ROOM_ASSIGNMENT, exam_id_secondary: 101 };
    expect(withSecondary.exam_id_secondary).toBe(101);
  });

  it("total_students equals students_primary + students_secondary", () => {
    const assignment: RoomAssignment = {
      ...ROOM_ASSIGNMENT,
      students_primary: 15,
      students_secondary: 10,
      total_students: 25,
    };
    expect(assignment.total_students).toBe(
      assignment.students_primary + assignment.students_secondary,
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SeatingArrangement
// ─────────────────────────────────────────────────────────────────────────────

describe("SeatingArrangement", () => {
  it("has all required fields", () => {
    expect(SEATING_ARRANGEMENT.seating_id).toBe(1);
    expect(SEATING_ARRANGEMENT.student_id).toBe(42);
    expect(SEATING_ARRANGEMENT.seat_number).toBe(1);
  });

  it("seat_number is a number (not a string)", () => {
    expect(typeof SEATING_ARRANGEMENT.seat_number).toBe("number");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SeatingPlan
// ─────────────────────────────────────────────────────────────────────────────

describe("SeatingPlan", () => {
  it("has all required fields", () => {
    expect(SEATING_PLAN.plan_id).toBe(1);
    expect(SEATING_PLAN.session).toBe("Morning");
    expect(SEATING_PLAN.total_rooms_used).toBe(3);
  });

  it("status is one of draft | confirmed | completed", () => {
    const validStatuses = ["draft", "confirmed", "completed"];
    expect(validStatuses).toContain(SEATING_PLAN.status);
  });

  it("accepts status: confirmed", () => {
    const plan: SeatingPlan = { ...SEATING_PLAN, status: "confirmed" };
    expect(plan.status).toBe("confirmed");
  });

  it("accepts status: completed", () => {
    const plan: SeatingPlan = { ...SEATING_PLAN, status: "completed" };
    expect(plan.status).toBe("completed");
  });

  it("allows confirmed_at and notes to be null", () => {
    expect(SEATING_PLAN.confirmed_at).toBeNull();
    expect(SEATING_PLAN.notes).toBeNull();
  });

  it("allows generated_by to be null", () => {
    const plan: SeatingPlan = { ...SEATING_PLAN, generated_by: null };
    expect(plan.generated_by).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SeatingDetails
// ─────────────────────────────────────────────────────────────────────────────

describe("SeatingDetails", () => {
  it("has all required fields", () => {
    expect(SEATING_DETAILS.student_name).toBe("Juan dela Cruz");
    expect(SEATING_DETAILS.subject_code).toBe("CS101");
    expect(SEATING_DETAILS.room_name).toBe("Room 101");
  });

  it("allows specialization to be null", () => {
    expect(SEATING_DETAILS.specialization).toBeNull();
  });

  it("allows specialization to be a string", () => {
    const d: SeatingDetails = { ...SEATING_DETAILS, specialization: "Network" };
    expect(d.specialization).toBe("Network");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ExamGroup
// ─────────────────────────────────────────────────────────────────────────────

describe("ExamGroup", () => {
  it("has all required fields", () => {
    expect(EXAM_GROUP.exam_id).toBe(100);
    expect(EXAM_GROUP.student_count).toBe(25);
    expect(EXAM_GROUP.students).toEqual([1, 2, 3]);
  });

  it("students is an array of numbers", () => {
    expect(Array.isArray(EXAM_GROUP.students)).toBe(true);
    EXAM_GROUP.students.forEach((s) => expect(typeof s).toBe("number"));
  });

  it("allows specialization to be null", () => {
    expect(EXAM_GROUP.specialization).toBeNull();
  });

  it("allows specialization to be a string", () => {
    const g: ExamGroup = { ...EXAM_GROUP, specialization: "AI" };
    expect(g.specialization).toBe("AI");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RoomAllocation
// ─────────────────────────────────────────────────────────────────────────────

describe("RoomAllocation", () => {
  it("has all required fields", () => {
    expect(ROOM_ALLOCATION.room_id).toBe(5);
    expect(ROOM_ALLOCATION.capacity).toBe(40);
    expect(ROOM_ALLOCATION.total_students).toBe(25);
  });

  it("allows secondary_exam to be null", () => {
    expect(ROOM_ALLOCATION.secondary_exam).toBeNull();
  });

  it("allows secondary_exam to be an ExamGroup", () => {
    const alloc: RoomAllocation = { ...ROOM_ALLOCATION, secondary_exam: EXAM_GROUP };
    expect(alloc.secondary_exam?.exam_id).toBe(100);
  });

  it("total_students can be validated against groups", () => {
    const primary: ExamGroup = { ...EXAM_GROUP, student_count: 20 };
    const secondary: ExamGroup = { ...EXAM_GROUP, exam_id: 101, student_count: 15 };
    const alloc: RoomAllocation = {
      ...ROOM_ALLOCATION,
      primary_exam: primary,
      secondary_exam: secondary,
      total_students: primary.student_count + secondary.student_count,
    };
    expect(alloc.total_students).toBe(35);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SeatAssignment
// ─────────────────────────────────────────────────────────────────────────────

describe("SeatAssignment", () => {
  it("has all required fields", () => {
    expect(SEAT_ASSIGNMENT.seat_number).toBe(1);
    expect(SEAT_ASSIGNMENT.student_id).toBe(42);
    expect(SEAT_ASSIGNMENT.exam_type).toBe("primary");
  });

  it("exam_type is primary or secondary", () => {
    expect(["primary", "secondary"]).toContain(SEAT_ASSIGNMENT.exam_type);
  });

  it("accepts exam_type: secondary", () => {
    const s: SeatAssignment = { ...SEAT_ASSIGNMENT, exam_type: "secondary" };
    expect(s.exam_type).toBe("secondary");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SeatingPattern
// ─────────────────────────────────────────────────────────────────────────────

describe("SeatingPattern", () => {
  it("has all required fields", () => {
    expect(SEATING_PATTERN.type).toBe("zigzag");
    expect(SEATING_PATTERN.room_layout.rows).toBe(5);
    expect(SEATING_PATTERN.room_layout.total_seats).toBe(40);
  });

  it("type is zigzag | alternate | block", () => {
    const validTypes = ["zigzag", "alternate", "block"];
    expect(validTypes).toContain(SEATING_PATTERN.type);
  });

  it("accepts type: alternate", () => {
    const p: SeatingPattern = { ...SEATING_PATTERN, type: "alternate" };
    expect(p.type).toBe("alternate");
  });

  it("accepts type: block", () => {
    const p: SeatingPattern = { ...SEATING_PATTERN, type: "block" };
    expect(p.type).toBe("block");
  });

  it("total_seats equals rows × columns", () => {
    const layout = SEATING_PATTERN.room_layout;
    expect(layout.total_seats).toBe(layout.rows * layout.columns);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GenerateSeatingRequest
// ─────────────────────────────────────────────────────────────────────────────

describe("GenerateSeatingRequest", () => {
  it("has all required fields", () => {
    expect(GENERATE_REQUEST.exam_date).toBe("2024-06-01");
    expect(GENERATE_REQUEST.exam_ids).toEqual([100, 101]);
    expect(GENERATE_REQUEST.pattern).toBe("zigzag");
  });

  it("pattern is optional", () => {
    const req: GenerateSeatingRequest = {
      exam_date: "2024-06-01",
      session: "Morning",
      start_time: "08:00:00",
      end_time: "10:00:00",
      exam_ids: [100],
    };
    expect(req.pattern).toBeUndefined();
  });

  it("generated_by is optional", () => {
    const req: GenerateSeatingRequest = {
      exam_date: "2024-06-01",
      session: "Morning",
      start_time: "08:00:00",
      end_time: "10:00:00",
      exam_ids: [100],
    };
    expect(req.generated_by).toBeUndefined();
  });

  it("pattern accepts alternate", () => {
    const req: GenerateSeatingRequest = { ...GENERATE_REQUEST, pattern: "alternate" };
    expect(req.pattern).toBe("alternate");
  });

  it("exam_ids can be empty array", () => {
    const req: GenerateSeatingRequest = { ...GENERATE_REQUEST, exam_ids: [] };
    expect(req.exam_ids).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GenerateSeatingResponse
// ─────────────────────────────────────────────────────────────────────────────

describe("GenerateSeatingResponse", () => {
  it("has all required fields", () => {
    expect(GENERATE_RESPONSE.success).toBe(true);
    expect(GENERATE_RESPONSE.plan_id).toBe(1);
    expect(GENERATE_RESPONSE.total_rooms_used).toBe(2);
    expect(GENERATE_RESPONSE.total_students_assigned).toBe(50);
    expect(GENERATE_RESPONSE.message).toBe("Seating generated successfully");
  });

  it("assignments is an array of RoomAssignment", () => {
    expect(Array.isArray(GENERATE_RESPONSE.assignments)).toBe(true);
    expect(GENERATE_RESPONSE.assignments[0].assignment_id).toBe(1);
  });

  it("success can be false", () => {
    const resp: GenerateSeatingResponse = {
      ...GENERATE_RESPONSE,
      success: false,
      message: "Generation failed",
    };
    expect(resp.success).toBe(false);
  });

  it("assignments can be empty array", () => {
    const resp: GenerateSeatingResponse = { ...GENERATE_RESPONSE, assignments: [] };
    expect(resp.assignments).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RoomAssignmentSummary
// ─────────────────────────────────────────────────────────────────────────────

describe("RoomAssignmentSummary", () => {
  const SUMMARY: RoomAssignmentSummary = {
    assignment_id: 1,
    exam_date: "2024-06-01",
    start_time: "08:00:00",
    end_time: "10:00:00",
    room_name: "Room 101",
    building: "Main Building",
    capacity: 40,
    primary_subject: "CS101",
    primary_exam: "Midterm",
    primary_year: "2",
    primary_semester: "1",
    secondary_subject: null,
    secondary_exam: null,
    secondary_year: null,
    secondary_semester: null,
    students_primary: 20,
    students_secondary: 0,
    total_students: 20,
    remaining_capacity: 20,
  };

  it("has all required fields", () => {
    expect(SUMMARY.assignment_id).toBe(1);
    expect(SUMMARY.room_name).toBe("Room 101");
    expect(SUMMARY.remaining_capacity).toBe(20);
  });

  it("remaining_capacity equals capacity - total_students", () => {
    expect(SUMMARY.remaining_capacity).toBe(SUMMARY.capacity - SUMMARY.total_students);
  });

  it("secondary fields can be null", () => {
    expect(SUMMARY.secondary_subject).toBeNull();
    expect(SUMMARY.secondary_exam).toBeNull();
    expect(SUMMARY.secondary_year).toBeNull();
    expect(SUMMARY.secondary_semester).toBeNull();
  });

  it("secondary fields can be strings", () => {
    const s: RoomAssignmentSummary = {
      ...SUMMARY,
      secondary_subject: "IT201",
      secondary_exam: "Finals",
      secondary_year: "3",
      secondary_semester: "2",
    };
    expect(s.secondary_subject).toBe("IT201");
  });
});