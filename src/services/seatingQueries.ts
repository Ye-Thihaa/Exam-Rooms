// services/seatingQueries.ts

import supabase from "@/utils/supabase";

export interface SeatingAssignmentInput {
  exam_room_id: number;
  student_id: number;
  seat_number: string;
  row_label: string;
  column_number: number;
  student_group: "A" | "B"; // A for primary group, B for secondary group
}

export interface SeatingAssignmentWithStudent {
  seating_id: number;
  exam_room_id: number;
  student_id: number;
  seat_number: string;
  row_label: string;
  column_number: number;
  student_group: "A" | "B"; // A for primary group, B for secondary group
  assigned_at: string;
  student: {
    student_id: number;
    student_number: string;
    name: string;
    year_level: number;
    sem: number;
    major: string;
    specialization?: string;
  };
}

/**
 * Fetch unassigned students for a specific group
 */
export async function getUnassignedStudentsByGroup(
  yearLevel: number,
  semester: number,
  program: string,
  specialization?: string,
  limit?: number,
) {
  try {
    // Map program codes back to full program names for database query
    // The database stores full names in 'major' field, not codes
    const programMapping: Record<string, string> = {
      CST: "Computer Science and Technology",
      CS: "Computer Science",
      CT: "Computer Technology",
    };

    const programName = programMapping[program] || program;

    console.log("Querying with:", {
      yearLevel,
      semester,
      program,
      programName,
      specialization,
      limit,
    });

    let query = supabase
      .from("student")
      .select("*")
      .eq("year_level", yearLevel)
      .eq("sem", semester)
      .eq("major", programName)
      .eq("is_assigned", false);

    if (specialization) {
      query = query.eq("specialization", specialization);
    }

    if (limit) {
      query = query.limit(limit);
    }

    query = query.order("student_number", { ascending: true });

    const { data, error } = await query;

    if (error) throw error;

    console.log(`Found ${data?.length || 0} students for ${programName}`);

    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Error fetching unassigned students:", error);
    return { success: false, error, data: [] };
  }
}

export async function saveSeatingAssignments(
  assignments: SeatingAssignmentInput[],
) {
  try {
    const { data, error } = await supabase
      .from("seating_assignment")
      .insert(assignments)
      .select();

    if (error) throw error;

    // Trigger will automatically set stu_assigned to true
    return { success: true, data };
  } catch (error) {
    console.error("Error saving seating assignments:", error);
    return { success: false, error };
  }
}

/**
 * Get seating assignments for an exam room
 */
export async function getSeatingAssignmentsByExamRoom(examRoomId: number) {
  try {
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
          sem,
          major,
          specialization
        )
      `,
      )
      .eq("exam_room_id", examRoomId)
      .order("row_label")
      .order("column_number");

    if (error) throw error;

    return { success: true, data: data as SeatingAssignmentWithStudent[] };
  } catch (error) {
    console.error("Error fetching seating assignments:", error);
    return { success: false, error, data: [] };
  }
}

/**
 * Get seating assignments by student group
 */
export async function getSeatingAssignmentsByGroup(
  examRoomId: number,
  studentGroup: "A" | "B",
) {
  try {
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
          sem,
          major,
          specialization
        )
      `,
      )
      .eq("exam_room_id", examRoomId)
      .eq("student_group", studentGroup)
      .order("row_label")
      .order("column_number");

    if (error) throw error;

    return { success: true, data: data as SeatingAssignmentWithStudent[] };
  } catch (error) {
    console.error("Error fetching seating assignments by group:", error);
    return { success: false, error, data: [] };
  }
}

/**
 * Clear all seating assignments for an exam room
 */
export async function clearSeatingAssignments(examRoomId: number) {
  try {
    const { error } = await supabase
      .from("seating_assignment")
      .delete()
      .eq("exam_room_id", examRoomId);

    if (error) throw error;

    // Trigger will automatically set stu_assigned to false
    return { success: true };
  } catch (error) {
    console.error("Error clearing seating assignments:", error);
    return { success: false, error };
  }
}

/**
 * Check if exam room already has seating assignments
 */
export async function checkExistingSeatingAssignments(examRoomId: number) {
  try {
    const { count, error } = await supabase
      .from("seating_assignment")
      .select("*", { count: "exact", head: true })
      .eq("exam_room_id", examRoomId);

    if (error) throw error;

    return {
      success: true,
      count: count || 0,
      hasAssignments: (count || 0) > 0,
    };
  } catch (error) {
    console.error("Error checking existing assignments:", error);
    return { success: false, count: 0, hasAssignments: false };
  }
}

/**
 * Get count of assigned seats by group
 */
export async function getAssignedCountByGroup(
  examRoomId: number,
  studentGroup: "A" | "B",
) {
  try {
    const { count, error } = await supabase
      .from("seating_assignment")
      .select("*", { count: "exact", head: true })
      .eq("exam_room_id", examRoomId)
      .eq("student_group", studentGroup);

    if (error) throw error;

    return { success: true, count: count || 0 };
  } catch (error) {
    console.error("Error getting count by group:", error);
    return { success: false, count: 0 };
  }
}
