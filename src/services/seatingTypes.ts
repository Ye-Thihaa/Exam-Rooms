// ============================================
// SEATING SYSTEM TYPES & INTERFACES
// ============================================

export interface RoomAssignment {
  assignment_id: number;
  exam_date: string;
  start_time: string;
  end_time: string;
  room_id: number;
  exam_id_primary: number;
  exam_id_secondary: number | null;
  students_primary: number;
  students_secondary: number;
  total_students: number;
  created_at: string;
  updated_at: string;
}

export interface SeatingArrangement {
  seating_id: number;
  assignment_id: number;
  student_id: number;
  exam_id: number;
  seat_number: number;
  row_number: number;
  column_number: number;
  created_at: string;
}

export interface SeatingPlan {
  plan_id: number;
  exam_date: string;
  session: string;
  start_time: string;
  end_time: string;
  total_exams: number;
  total_students: number;
  total_rooms_used: number;
  status: "draft" | "confirmed" | "completed";
  generated_by: string | null;
  generated_at: string;
  confirmed_at: string | null;
  notes: string | null;
}

export interface SeatingDetails {
  seating_id: number;
  seat_number: number;
  row_number: number;
  column_number: number;
  student_id: number;
  student_number: string;
  student_name: string;
  exam_id: number;
  subject_code: string;
  exam_name: string;
  year_level: string;
  semester: string;
  specialization: string | null;
  assignment_id: number;
  exam_date: string;
  start_time: string;
  end_time: string;
  room_id: number;
  room_name: string;
  building: string;
  capacity: number;
}

export interface RoomAssignmentSummary {
  assignment_id: number;
  exam_date: string;
  start_time: string;
  end_time: string;
  room_name: string;
  building: string;
  capacity: number;
  primary_subject: string;
  primary_exam: string;
  primary_year: string;
  primary_semester: string;
  secondary_subject: string | null;
  secondary_exam: string | null;
  secondary_year: string | null;
  secondary_semester: string | null;
  students_primary: number;
  students_secondary: number;
  total_students: number;
  remaining_capacity: number;
}

// For the seating generation algorithm
export interface ExamGroup {
  exam_id: number;
  subject_code: string;
  exam_name: string;
  year_level: string;
  semester: string;
  program: string;
  specialization: string | null;
  student_count: number;
  students: number[]; // student IDs
}

export interface RoomAllocation {
  room_id: number;
  room_name: string;
  capacity: number;
  primary_exam: ExamGroup;
  secondary_exam: ExamGroup | null;
  total_students: number;
}

export interface SeatAssignment {
  seat_number: number;
  row: number;
  column: number;
  student_id: number;
  exam_id: number;
  exam_type: "primary" | "secondary";
}

// Seating pattern configuration
export interface SeatingPattern {
  type: "zigzag" | "alternate" | "block";
  room_layout: {
    rows: number;
    columns: number;
    total_seats: number;
  };
}

// For API requests
export interface GenerateSeatingRequest {
  exam_date: string;
  session: string;
  start_time: string;
  end_time: string;
  exam_ids: number[];
  pattern?: "zigzag" | "alternate";
  generated_by?: string;
}

export interface GenerateSeatingResponse {
  success: boolean;
  plan_id: number;
  total_rooms_used: number;
  total_students_assigned: number;
  assignments: RoomAssignment[];
  message: string;
}
