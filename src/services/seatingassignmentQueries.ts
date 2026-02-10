import supabase from "@/utils/supabase";

export interface SeatingAssignment {
  seating_id: number;
  exam_room_id: number;
  student_id: number;
  seat_number: string;
  row_label: string; // actual DB column (was incorrectly typed as row_number)
  column_number: number;
  student_group: "A" | "B"; // A for primary group, B for secondary group
  assigned_at: string;
}

export interface SeatingAssignmentWithDetails extends SeatingAssignment {
  student?: {
    student_id: number;
    student_number: string;
    name: string;
    year_level: number;
    major: string;
  };
  exam_room?: {
    exam_room_id: number;
    exam_id: number;
    room_id: number;
    exam?: {
      subject_code: string;
      exam_name: string;
      exam_date: string;
      session: string;
    };
    room?: {
      room_number: string;
      capacity: number;
      rows: number;
      cols: number;
    };
  };
}

export const seatingAssignmentQueries = {
  // Get all seating assignments
  async getAll() {
    const { data, error } = await supabase
      .from("seating_assignment")
      .select("*")
      .order("assigned_at", { ascending: false });

    if (error) throw error;
    return data as SeatingAssignment[];
  },

  // Get seating assignment by ID
  async getById(seatingId: number) {
    const { data, error } = await supabase
      .from("seating_assignment")
      .select("*")
      .eq("seating_id", seatingId)
      .single();

    if (error) throw error;
    return data as SeatingAssignment;
  },

  // Get seating assignment with full details
  async getByIdWithDetails(seatingId: number) {
    const { data, error } = await supabase
      .from("seating_assignment")
      .select(
        `
        *,
        student:student_id (
          student_id,
          student_number,
          name,
          year_level,
          major
        ),
        exam_room:exam_room_id (
          exam_room_id,
          exam_id,
          room_id,
          exam:exam_id (
            subject_code,
            exam_name,
            exam_date,
            session
          ),
          room:room_id (
            room_number,
            capacity,
            rows,
            cols
          )
        )
      `,
      )
      .eq("seating_id", seatingId)
      .single();

    if (error) throw error;
    return data as SeatingAssignmentWithDetails;
  },

  // Get all seating assignments for an exam room
  async getByExamRoomId(examRoomId: number) {
    const { data, error } = await supabase
      .from("seating_assignment")
      .select(
        `
        *,
        student:student_id (
          student_id,
          student_number,
          name,
          year_level,
          major
        )
      `,
      )
      .eq("exam_room_id", examRoomId)
      .order("row_label", { ascending: true })
      .order("column_number", { ascending: true });

    if (error) throw error;
    return data as SeatingAssignmentWithDetails[];
  },

  // Get seating assignments by student group
  async getByExamRoomIdAndGroup(examRoomId: number, studentGroup: "A" | "B") {
    const { data, error } = await supabase
      .from("seating_assignment")
      .select(
        `
        *,
        student:student_id (
          student_id,
          student_number,
          name,
          year_level,
          major
        )
      `,
      )
      .eq("exam_room_id", examRoomId)
      .eq("student_group", studentGroup)
      .order("row_label", { ascending: true })
      .order("column_number", { ascending: true });

    if (error) throw error;
    return data as SeatingAssignmentWithDetails[];
  },

  // Get seating assignment for a specific student
  async getByStudentId(studentId: number) {
    const { data, error } = await supabase
      .from("seating_assignment")
      .select(
        `
        *,
        exam_room:exam_room_id (
          exam_room_id,
          exam_id,
          room_id,
          exam:exam_id (
            subject_code,
            exam_name,
            exam_date,
            session
          ),
          room:room_id (
            room_number,
            capacity,
            rows,
            cols
          )
        )
      `,
      )
      .eq("student_id", studentId)
      .order("assigned_at", { ascending: false });

    if (error) throw error;
    return data as SeatingAssignmentWithDetails[];
  },

  // Get seating assignment for a student in a specific exam room
  async getByStudentAndExamRoom(studentId: number, examRoomId: number) {
    const { data, error } = await supabase
      .from("seating_assignment")
      .select("*")
      .eq("student_id", studentId)
      .eq("exam_room_id", examRoomId)
      .single();

    if (error) throw error;
    return data as SeatingAssignment;
  },

  // Get seating assignments by seat number
  async getBySeatNumber(examRoomId: number, seatNumber: string) {
    const { data, error } = await supabase
      .from("seating_assignment")
      .select(
        `
        *,
        student:student_id (
          student_id,
          student_number,
          name,
          year_level,
          major
        )
      `,
      )
      .eq("exam_room_id", examRoomId)
      .eq("seat_number", seatNumber)
      .single();

    if (error) throw error;
    return data as SeatingAssignmentWithDetails;
  },

  // Get seating assignment by row_label and column
  async getByRowAndColumn(examRoomId: number, rowLabel: string, col: number) {
    const { data, error } = await supabase
      .from("seating_assignment")
      .select(
        `
        *,
        student:student_id (
          student_id,
          student_number,
          name,
          year_level,
          major
        )
      `,
      )
      .eq("exam_room_id", examRoomId)
      .eq("row_label", rowLabel)
      .eq("column_number", col)
      .single();

    if (error) throw error;
    return data as SeatingAssignmentWithDetails;
  },

  // Create new seating assignment
  async create(
    assignment: Omit<SeatingAssignment, "seating_id" | "assigned_at">,
  ) {
    const { data, error } = await supabase
      .from("seating_assignment")
      .insert({
        ...assignment,
        assigned_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data as SeatingAssignment;
  },

  // Create multiple seating assignments
  async createMany(
    assignments: Omit<SeatingAssignment, "seating_id" | "assigned_at">[],
  ) {
    const { data, error } = await supabase
      .from("seating_assignment")
      .insert(
        assignments.map((a) => ({
          ...a,
          assigned_at: new Date().toISOString(),
        })),
      )
      .select();

    if (error) throw error;
    return data as SeatingAssignment[];
  },

  // Update seating assignment
  async update(
    seatingId: number,
    updates: Partial<Omit<SeatingAssignment, "seating_id" | "assigned_at">>,
  ) {
    const { data, error } = await supabase
      .from("seating_assignment")
      .update(updates)
      .eq("seating_id", seatingId)
      .select()
      .single();

    if (error) throw error;
    return data as SeatingAssignment;
  },

  // Delete seating assignment
  async delete(seatingId: number) {
    const { error } = await supabase
      .from("seating_assignment")
      .delete()
      .eq("seating_id", seatingId);

    if (error) throw error;
    return true;
  },

  // Delete all seating assignments for an exam room
  async deleteByExamRoomId(examRoomId: number) {
    const { error } = await supabase
      .from("seating_assignment")
      .delete()
      .eq("exam_room_id", examRoomId);

    if (error) throw error;
    return true;
  },

  // Check if a seat is occupied
  async isSeatOccupied(examRoomId: number, rowLabel: string, col: number) {
    const { data, error } = await supabase
      .from("seating_assignment")
      .select("seating_id")
      .eq("exam_room_id", examRoomId)
      .eq("row_label", rowLabel)
      .eq("column_number", col);

    if (error) throw error;
    return data.length > 0;
  },

  // Get seating map for an exam room
  async getSeatingMap(examRoomId: number) {
    const { data, error } = await supabase
      .from("seating_assignment")
      .select(
        `
        row_label,
        column_number,
        seat_number,
        student_group,
        student:student_id (
          student_number,
          name
        )
      `,
      )
      .eq("exam_room_id", examRoomId)
      .order("row_label", { ascending: true })
      .order("column_number", { ascending: true });

    if (error) throw error;
    return data;
  },

  // Get count of assigned seats in an exam room
  async getAssignedCount(examRoomId: number) {
    const { count, error } = await supabase
      .from("seating_assignment")
      .select("*", { count: "exact", head: true })
      .eq("exam_room_id", examRoomId);

    if (error) throw error;
    return count || 0;
  },

  // Get count by group
  async getAssignedCountByGroup(examRoomId: number, studentGroup: "A" | "B") {
    const { count, error } = await supabase
      .from("seating_assignment")
      .select("*", { count: "exact", head: true })
      .eq("exam_room_id", examRoomId)
      .eq("student_group", studentGroup);

    if (error) throw error;
    return count || 0;
  },

  // Get available seats count in an exam room
  async getAvailableSeatsCount(examRoomId: number, totalCapacity: number) {
    const assignedCount = await this.getAssignedCount(examRoomId);
    return totalCapacity - assignedCount;
  },
};
