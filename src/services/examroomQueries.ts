import supabase from "@/utils/supabase";
export interface ExamRoom {
  exam_room_id?: number;
  exam_id: number;
  room_id: number;
  assigned_capacity: number;
  year_level_primary?: string;
  sem_primary?: string;
  program_primary?: string;
  students_primary?: number;
  year_level_secondary?: string;
  sem_secondary?: string;
  program_secondary?: string;
  students_secondary?: number;
  created_at?: string;
}

export interface ExamRoomInsert {
  exam_id: number;
  room_id: number;
  assigned_capacity: number;
  year_level_primary?: string;
  sem_primary?: string;
  program_primary?: string;
  students_primary?: number;
  year_level_secondary?: string;
  sem_secondary?: string;
  program_secondary?: string;
  students_secondary?: number;
}

/**
 * Save room assignments to the exam_room table
 */
export const saveExamRoomAssignments = async (
  examId: number,
  roomAssignments: ExamRoomInsert[],
): Promise<{ success: boolean; data?: any; error?: any }> => {
  try {
    const { data, error } = await supabase
      .from("exam_room")
      .insert(roomAssignments)
      .select();

    if (error) {
      console.error("Error saving exam room assignments:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Exception saving exam room assignments:", error);
    return { success: false, error };
  }
};

/**
 * Update an existing exam room assignment
 */
export const updateExamRoomAssignment = async (
  examRoomId: number,
  updates: Partial<ExamRoomInsert>,
): Promise<{ success: boolean; data?: any; error?: any }> => {
  try {
    const { data, error } = await supabase
      .from("exam_room")
      .update(updates)
      .eq("exam_room_id", examRoomId)
      .select();

    if (error) {
      console.error("Error updating exam room assignment:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Exception updating exam room assignment:", error);
    return { success: false, error };
  }
};

/**
 * Delete exam room assignments for a specific exam
 */
export const deleteExamRoomAssignments = async (
  examId: number,
): Promise<{ success: boolean; error?: any }> => {
  try {
    const { error } = await supabase
      .from("exam_room")
      .delete()
      .eq("exam_id", examId);

    if (error) {
      console.error("Error deleting exam room assignments:", error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error("Exception deleting exam room assignments:", error);
    return { success: false, error };
  }
};

/**
 * Get exam room assignments for a specific exam
 */
export const getExamRoomAssignments = async (
  examId: number,
): Promise<{ success: boolean; data?: ExamRoom[]; error?: any }> => {
  try {
    const { data, error } = await supabase
      .from("exam_room")
      .select(
        `
        *,
        room:room_id (
          room_id,
          room_number,
          building,
          capacity
        ),
        exam:exam_id (
          exam_id,
          exam_name,
          exam_date
        )
      `,
      )
      .eq("exam_id", examId);

    if (error) {
      console.error("Error fetching exam room assignments:", error);
      return { success: false, error };
    }

    return { success: true, data: data as ExamRoom[] };
  } catch (error) {
    console.error("Exception fetching exam room assignments:", error);
    return { success: false, error };
  }
};

/**
 * Get all exam room assignments
 */
export const getAllExamRoomAssignments = async (): Promise<{
  success: boolean;
  data?: ExamRoom[];
  error?: any;
}> => {
  try {
    const { data, error } = await supabase
      .from("exam_room")
      .select(
        `
        *,
        room:room_id (
          room_id,
          room_number,
          building,
          capacity
        ),
        exam:exam_id (
          exam_id,
          exam_name,
          exam_date
        )
      `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching all exam room assignments:", error);
      return { success: false, error };
    }

    return { success: true, data: data as ExamRoom[] };
  } catch (error) {
    console.error("Exception fetching all exam room assignments:", error);
    return { success: false, error };
  }
};

/**
 * Check if a room is already assigned to an exam
 */
export const isRoomAssignedToExam = async (
  examId: number,
  roomId: number,
): Promise<{ success: boolean; isAssigned?: boolean; error?: any }> => {
  try {
    const { data, error } = await supabase
      .from("exam_room")
      .select("exam_room_id")
      .eq("exam_id", examId)
      .eq("room_id", roomId)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "not found" error
      console.error("Error checking room assignment:", error);
      return { success: false, error };
    }

    return { success: true, isAssigned: !!data };
  } catch (error) {
    console.error("Exception checking room assignment:", error);
    return { success: false, error };
  }
};

/**
 * Get exam rooms with room details for seating plan generation
 */
export const getExamRoomsWithDetails = async (): Promise<{
  success: boolean;
  data?: any[];
  error?: any;
}> => {
  try {
    // Fetch exam rooms first
    const { data: examRoomData, error: examRoomError } = await supabase
      .from("exam_room")
      .select("*")
      .order("created_at", { ascending: false });

    if (examRoomError) {
      console.error("Error fetching exam rooms:", examRoomError);
      return { success: false, error: examRoomError };
    }

    if (!examRoomData || examRoomData.length === 0) {
      return { success: true, data: [] };
    }

    // Manually fetch room details for each exam room
    const examRoomsWithDetails = await Promise.all(
      examRoomData.map(async (examRoom: any) => {
        const { data: roomData, error: roomError } = await supabase
          .from("room")
          .select("room_id, room_number, capacity, rows, cols")
          .eq("room_id", examRoom.room_id)
          .single();

        if (roomError) {
          console.error(`Error fetching room ${examRoom.room_id}:`, roomError);
        }

        return {
          ...examRoom,
          room: roomData,
        };
      }),
    );

    return { success: true, data: examRoomsWithDetails };
  } catch (error) {
    console.error("Exception fetching exam rooms with details:", error);
    return { success: false, error };
  }
};
