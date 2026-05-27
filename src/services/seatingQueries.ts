// services/seatingQueries.ts

import supabase from "@/utils/supabase";

export interface SeatingAssignmentInput {
  exam_room_id: number;
  student_id: number;
  seat_number: string;
  row_label: string;
  column_number: number;
  student_group: "A" | "B";
}

export interface SeatingAssignmentWithStudent {
  seating_id: number;
  exam_room_id: number;
  student_id: number;
  seat_number: string;
  row_label: string;
  column_number: number;
  student_group: "A" | "B";
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
 * Fetch unassigned students for a specific group.
 * program should be the short code (CST, CS, CT) matching the student table's major field.
 */
export async function getUnassignedStudentsByGroup(
  yearLevel: number,
  semester: number,
  program: string,
  specialization?: string,
  limit?: number,
) {
  try {
    console.log("Querying with:", {
      yearLevel,
      semester,
      program,
      specialization,
      limit,
    });

    let query = supabase
      .from("student")
      .select("*")
      .eq("year_level", yearLevel)
      .eq("sem", semester)
      .eq("major", program)
      .eq("is_assigned", false);

    if (specialization) {
      query = query.eq("specialization", specialization);
    }

    if (limit) {
      query = query.limit(limit);
    }

    query = query.order("student_id", { ascending: true });

    const { data, error } = await query;

    if (error) throw error;

    console.log(`Found ${data?.length || 0} students for ${program}`);

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

    // ← ADD: mark all assigned students so they won't be picked again
    const studentIds = [...new Set(assignments.map((a) => a.student_id))];
    const { error: updateError } = await supabase
      .from("student")
      .update({ is_assigned: true })
      .in("student_id", studentIds);

    if (updateError) {
      console.error("Error marking students as assigned:", updateError);
      // Don't throw — seating was saved successfully, this is a secondary update
    }

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
    // First get the student IDs so we can unmark them
    const { data: existing } = await supabase
      .from("seating_assignment")
      .select("student_id")
      .eq("exam_room_id", examRoomId);

    const { error } = await supabase
      .from("seating_assignment")
      .delete()
      .eq("exam_room_id", examRoomId);

    if (error) throw error;

    // ← ADD: unmark students so they become available again
    if (existing && existing.length > 0) {
      const studentIds = existing.map((r: any) => r.student_id);
      await supabase
        .from("student")
        .update({ is_assigned: false })
        .in("student_id", studentIds);
    }

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