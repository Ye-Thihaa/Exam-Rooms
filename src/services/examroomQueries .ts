import supabase from "@/utils/supabase";

export interface ExamRoom {
  exam_room_id: number;
  exam_id: number;
  room_id: number;
  assigned_capacity: number;
  created_at: string;
}

export interface ExamRoomWithDetails extends ExamRoom {
  exam?: {
    exam_id: number;
    subject_code: string;
    exam_name: string;
    exam_date: string;
    session: string;
  };
  room?: {
    room_id: number;
    room_number: string;
    capacity: number;
    room_type: string;
    rows: number;
    cols: number;
  };
}

export const examRoomQueries = {
  // Get all exam rooms
  async getAll() {
    const { data, error } = await supabase
      .from("exam_room")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as ExamRoom[];
  },

  // Get exam room by ID
  async getById(examRoomId: number) {
    const { data, error } = await supabase
      .from("exam_room")
      .select("*")
      .eq("exam_room_id", examRoomId)
      .single();

    if (error) throw error;
    return data as ExamRoom;
  },

  // Get exam room with full details (exam and room info)
  async getByIdWithDetails(examRoomId: number) {
    const { data, error } = await supabase
      .from("exam_room")
      .select(
        `
        *,
        exam:exam_id (
          exam_id,
          subject_code,
          exam_name,
          exam_date,
          session
        ),
        room:room_id (
          room_id,
          room_number,
          capacity,
          room_type,
          rows,
          cols
        )
      `,
      )
      .eq("exam_room_id", examRoomId)
      .single();

    if (error) throw error;
    return data as ExamRoomWithDetails;
  },

  // Get all exam rooms for a specific exam
  async getByExamId(examId: number) {
    const { data, error } = await supabase
      .from("exam_room")
      .select(
        `
        *,
        room:room_id (
          room_id,
          room_number,
          capacity,
          room_type,
          rows,
          cols
        )
      `,
      )
      .eq("exam_id", examId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data as ExamRoomWithDetails[];
  },

  // Get all exams assigned to a specific room
  async getByRoomId(roomId: number) {
    const { data, error } = await supabase
      .from("exam_room")
      .select(
        `
        *,
        exam:exam_id (
          exam_id,
          subject_code,
          exam_name,
          exam_date,
          session
        )
      `,
      )
      .eq("room_id", roomId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as ExamRoomWithDetails[];
  },

  // Get all exam rooms with details
  async getAllWithDetails() {
    const { data, error } = await supabase
      .from("exam_room")
      .select(
        `
        *,
        exam:exam_id (
          exam_id,
          subject_code,
          exam_name,
          exam_date,
          session
        ),
        room:room_id (
          room_id,
          room_number,
          capacity,
          room_type,
          rows,
          cols
        )
      `,
      )
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as ExamRoomWithDetails[];
  },

  // Create new exam room assignment
  async create(examRoom: Omit<ExamRoom, "exam_room_id" | "created_at">) {
    const { data, error } = await supabase
      .from("exam_room")
      .insert({
        ...examRoom,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data as ExamRoom;
  },

  // Create multiple exam room assignments
  async createMany(examRooms: Omit<ExamRoom, "exam_room_id" | "created_at">[]) {
    const { data, error } = await supabase
      .from("exam_room")
      .insert(
        examRooms.map((er) => ({
          ...er,
          created_at: new Date().toISOString(),
        })),
      )
      .select();

    if (error) throw error;
    return data as ExamRoom[];
  },

  // Update exam room assignment
  async update(
    examRoomId: number,
    updates: Partial<Omit<ExamRoom, "exam_room_id" | "created_at">>,
  ) {
    const { data, error } = await supabase
      .from("exam_room")
      .update(updates)
      .eq("exam_room_id", examRoomId)
      .select()
      .single();

    if (error) throw error;
    return data as ExamRoom;
  },

  // Delete exam room assignment
  async delete(examRoomId: number) {
    const { error } = await supabase
      .from("exam_room")
      .delete()
      .eq("exam_room_id", examRoomId);

    if (error) throw error;
    return true;
  },

  // Delete all exam rooms for a specific exam
  async deleteByExamId(examId: number) {
    const { error } = await supabase
      .from("exam_room")
      .delete()
      .eq("exam_id", examId);

    if (error) throw error;
    return true;
  },

  // Get total assigned capacity for an exam
  async getTotalCapacityForExam(examId: number) {
    const { data, error } = await supabase
      .from("exam_room")
      .select("assigned_capacity")
      .eq("exam_id", examId);

    if (error) throw error;

    const totalCapacity = data.reduce(
      (sum, er) => sum + er.assigned_capacity,
      0,
    );
    return totalCapacity;
  },

  // Check if a room is already assigned to an exam
  async isRoomAssignedToExam(examId: number, roomId: number) {
    const { data, error } = await supabase
      .from("exam_room")
      .select("exam_room_id")
      .eq("exam_id", examId)
      .eq("room_id", roomId);

    if (error) throw error;
    return data.length > 0;
  },
};
