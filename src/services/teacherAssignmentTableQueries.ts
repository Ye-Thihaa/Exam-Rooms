// src/services/teacherAssignmentTableQueries.ts

import supabase from "@/utils/supabase";

export interface TeacherAssignmentWithRoom {
  assignment_id: number;
  exam_room_id: number;
  teacher_id: number;
  role: "Supervisor" | "Assistant";
  exam_date: string | null;
  session: string | null;
  shift_start: string | null;
  shift_end: string | null;
  assigned_at: string | null;
  teacher: {
    teacher_id: number;
    name: string;
    rank: string;
    department: string;
  } | null;
  room_number: string | null;
}

export const teacherAssignmentTableQueries = {
  async getAllWithRoomDetails(): Promise<TeacherAssignmentWithRoom[]> {
    const { data, error } = await supabase
      .from("teacher_assignment")
      .select(
        `
        assignment_id,
        exam_room_id,
        teacher_id,
        role,
        exam_date,
        session,
        shift_start,
        shift_end,
        assigned_at,
        teacher ( teacher_id, name, rank, department ),
        exam_room (
          room ( room_number )
        )
      `,
      )
      .order("exam_date", { ascending: true });

    if (error) throw error;

    return (data || []).map((row: any) => ({
      assignment_id: row.assignment_id,
      exam_room_id: row.exam_room_id,
      teacher_id: row.teacher_id,
      role: row.role,
      exam_date: row.exam_date,
      session: row.session,
      shift_start: row.shift_start,
      shift_end: row.shift_end,
      assigned_at: row.assigned_at,
      teacher: row.teacher ?? null,
      room_number: row.exam_room?.room?.room_number ?? null,
    }));
  },
};
