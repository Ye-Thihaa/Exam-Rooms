import supabase from "@/utils/supabase";

export interface TeacherAssignment {
  assignment_id: number;
  exam_room_id: number;
  teacher_id: number;
  role: string;
  shift_start: string;
  shift_end: string;
  assigned_at: string;
}

export interface TeacherAssignmentWithDetails extends TeacherAssignment {
  teacher?: {
    teacher_id: number;
    rank: string;
    name: string;
    department: string;
    total_periods_assigned: number;
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
    };
  };
}

export const teacherAssignmentQueries = {
  // Get all teacher assignments
  async getAll() {
    const { data, error } = await supabase
      .from("teacher_assignment")
      .select("*")
      .order("assigned_at", { ascending: false });

    if (error) throw error;
    return data as TeacherAssignment[];
  },

  // Get teacher assignment by ID
  async getById(assignmentId: number) {
    const { data, error } = await supabase
      .from("teacher_assignment")
      .select("*")
      .eq("assignment_id", assignmentId)
      .single();

    if (error) throw error;
    return data as TeacherAssignment;
  },

  // Get teacher assignment with full details
  async getByIdWithDetails(assignmentId: number) {
    const { data, error } = await supabase
      .from("teacher_assignment")
      .select(
        `
        *,
        teacher:teacher_id (
          teacher_id,
          rank,
          name,
          department,
          total_periods_assigned
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
            capacity
          )
        )
      `,
      )
      .eq("assignment_id", assignmentId)
      .single();

    if (error) throw error;
    return data as TeacherAssignmentWithDetails;
  },

  // Get all assignments for an exam room
  async getByExamRoomId(examRoomId: number) {
    const { data, error } = await supabase
      .from("teacher_assignment")
      .select(
        `
        *,
        teacher:teacher_id (
          teacher_id,
          rank,
          name,
          department,
          total_periods_assigned
        )
      `,
      )
      .eq("exam_room_id", examRoomId)
      .order("shift_start", { ascending: true });

    if (error) throw error;
    return data as TeacherAssignmentWithDetails[];
  },

  // Get all assignments for a teacher
  async getByTeacherId(teacherId: number) {
    const { data, error } = await supabase
      .from("teacher_assignment")
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
            capacity
          )
        )
      `,
      )
      .eq("teacher_id", teacherId)
      .order("assigned_at", { ascending: false });

    if (error) throw error;
    return data as TeacherAssignmentWithDetails[];
  },

  // Get assignments by role
  async getByRole(role: string) {
    const { data, error } = await supabase
      .from("teacher_assignment")
      .select(
        `
        *,
        teacher:teacher_id (
          teacher_id,
          rank,
          name,
          department
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
            room_number
          )
        )
      `,
      )
      .eq("role", role)
      .order("assigned_at", { ascending: false });

    if (error) throw error;
    return data as TeacherAssignmentWithDetails[];
  },

  // Get all assignments with details
  async getAllWithDetails() {
    const { data, error } = await supabase
      .from("teacher_assignment")
      .select(
        `
        *,
        teacher:teacher_id (
          teacher_id,
          rank,
          name,
          department,
          total_periods_assigned
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
            capacity
          )
        )
      `,
      )
      .order("assigned_at", { ascending: false });

    if (error) throw error;
    return data as TeacherAssignmentWithDetails[];
  },

  // Create new teacher assignment
  async create(
    assignment: Omit<TeacherAssignment, "assignment_id" | "assigned_at">,
  ) {
    const { data, error } = await supabase
      .from("teacher_assignment")
      .insert({
        ...assignment,
        assigned_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data as TeacherAssignment;
  },

  // Create multiple teacher assignments
  async createMany(
    assignments: Omit<TeacherAssignment, "assignment_id" | "assigned_at">[],
  ) {
    const { data, error } = await supabase
      .from("teacher_assignment")
      .insert(
        assignments.map((a) => ({
          ...a,
          assigned_at: new Date().toISOString(),
        })),
      )
      .select();

    if (error) throw error;
    return data as TeacherAssignment[];
  },

  // Update teacher assignment
  async update(
    assignmentId: number,
    updates: Partial<Omit<TeacherAssignment, "assignment_id" | "assigned_at">>,
  ) {
    const { data, error } = await supabase
      .from("teacher_assignment")
      .update(updates)
      .eq("assignment_id", assignmentId)
      .select()
      .single();

    if (error) throw error;
    return data as TeacherAssignment;
  },

  // Delete teacher assignment
  async delete(assignmentId: number) {
    const { error } = await supabase
      .from("teacher_assignment")
      .delete()
      .eq("assignment_id", assignmentId);

    if (error) throw error;
    return true;
  },

  // Delete all assignments for an exam room
  async deleteByExamRoomId(examRoomId: number) {
    const { error } = await supabase
      .from("teacher_assignment")
      .delete()
      .eq("exam_room_id", examRoomId);

    if (error) throw error;
    return true;
  },

  // Delete all assignments for a teacher
  async deleteByTeacherId(teacherId: number) {
    const { error } = await supabase
      .from("teacher_assignment")
      .delete()
      .eq("teacher_id", teacherId);

    if (error) throw error;
    return true;
  },

  // Check if teacher is already assigned to exam room
  async isTeacherAssigned(teacherId: number, examRoomId: number) {
    const { data, error } = await supabase
      .from("teacher_assignment")
      .select("assignment_id")
      .eq("teacher_id", teacherId)
      .eq("exam_room_id", examRoomId);

    if (error) throw error;
    return data.length > 0;
  },

  // Get assignments by shift time range
  async getByShiftTime(startTime: string, endTime: string) {
    const { data, error } = await supabase
      .from("teacher_assignment")
      .select(
        `
        *,
        teacher:teacher_id (
          teacher_id,
          name,
          department
        ),
        exam_room:exam_room_id (
          exam_room_id,
          room:room_id (
            room_number
          )
        )
      `,
      )
      .gte("shift_start", startTime)
      .lte("shift_end", endTime)
      .order("shift_start", { ascending: true });

    if (error) throw error;
    return data as TeacherAssignmentWithDetails[];
  },

  // Get teacher's schedule for a specific date
  async getTeacherScheduleByDate(teacherId: number, examDate: string) {
    const { data, error } = await supabase
      .from("teacher_assignment")
      .select(
        `
        *,
        exam_room:exam_room_id (
          exam_room_id,
          exam:exam_id (
            exam_name,
            exam_date,
            session
          ),
          room:room_id (
            room_number
          )
        )
      `,
      )
      .eq("teacher_id", teacherId);

    if (error) throw error;

    // Filter by exam date in the application layer
    const filtered = (data as TeacherAssignmentWithDetails[]).filter(
      (assignment) => assignment.exam_room?.exam?.exam_date === examDate,
    );

    return filtered;
  },

  // Get count of assignments for a teacher
  async getTeacherAssignmentCount(teacherId: number) {
    const { count, error } = await supabase
      .from("teacher_assignment")
      .select("*", { count: "exact", head: true })
      .eq("teacher_id", teacherId);

    if (error) throw error;
    return count || 0;
  },

  // Get count of assignments for an exam room
  async getExamRoomAssignmentCount(examRoomId: number) {
    const { count, error } = await supabase
      .from("teacher_assignment")
      .select("*", { count: "exact", head: true })
      .eq("exam_room_id", examRoomId);

    if (error) throw error;
    return count || 0;
  },

  // Get assignments by exam ID (through exam_room)
  async getByExamId(examId: number) {
    const { data, error } = await supabase
      .from("teacher_assignment")
      .select(
        `
        *,
        teacher:teacher_id (
          teacher_id,
          name,
          department
        ),
        exam_room:exam_room_id!inner (
          exam_room_id,
          exam_id,
          room:room_id (
            room_number
          )
        )
      `,
      )
      .eq("exam_room.exam_id", examId)
      .order("assigned_at", { ascending: false });

    if (error) throw error;
    return data as TeacherAssignmentWithDetails[];
  },
};
