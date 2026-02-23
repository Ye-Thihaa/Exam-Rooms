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
  link_id: number | null;
  teacher: {
    teacher_id: number;
    name: string;
    rank: string;
    department_id: number;
  } | null;
  room_number: string | null;
  exam_department_id: number | null;
  has_conflict: boolean;
}

export const teacherAssignmentTableQueries = {
  async getAllWithRoomDetails(): Promise<TeacherAssignmentWithRoom[]> {
    // Step 1: Fetch assignments with teacher + room info
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
        link_id,
        teacher ( teacher_id, name, rank, department_id ),
        exam_room (
          room ( room_number )
        )
      `,
      )
      .order("exam_date", { ascending: true });

    if (error) throw error;

    const rows = data || [];

    // Step 2: Collect all link_ids to batch-fetch exam department info
    const linkIds = rows
      .map((r: any) => r.link_id)
      .filter((id: any) => id != null) as number[];

    // Map link_id → exam department_id
    const linkToDeptMap = new Map<number, number>();

    if (linkIds.length > 0) {
      const { data: linkData, error: linkError } = await supabase
        .from("exam_room_exam_link")
        .select("link_id, exam_id")
        .in("link_id", linkIds);

      if (linkError) throw linkError;

      const examIds = (linkData || []).map((l: any) => l.exam_id as number);

      if (examIds.length > 0) {
        const { data: examData, error: examError } = await supabase
          .from("exam")
          .select("exam_id, department_id")
          .in("exam_id", examIds);

        if (examError) throw examError;

        const examDeptMap = new Map<number, number>(
          (examData || []).map((e: any) => [
            e.exam_id as number,
            e.department_id as number,
          ]),
        );

        // Build link_id → department_id
        (linkData || []).forEach((l: any) => {
          const deptId = examDeptMap.get(l.exam_id as number);
          if (deptId !== undefined) {
            linkToDeptMap.set(l.link_id as number, deptId);
          }
        });
      }
    }

    // Step 3: Map rows + compute conflict
    return rows.map((row: any) => {
      const teacherDeptId = row.teacher?.department_id ?? null;
      const examDeptId =
        row.link_id != null ? (linkToDeptMap.get(row.link_id) ?? null) : null;
      const hasConflict =
        teacherDeptId != null &&
        examDeptId != null &&
        teacherDeptId === examDeptId;

      return {
        assignment_id: row.assignment_id,
        exam_room_id: row.exam_room_id,
        teacher_id: row.teacher_id,
        role: row.role,
        exam_date: row.exam_date,
        session: row.session,
        shift_start: row.shift_start,
        shift_end: row.shift_end,
        assigned_at: row.assigned_at,
        link_id: row.link_id ?? null,
        teacher: row.teacher ?? null,
        room_number: row.exam_room?.room?.room_number ?? null,
        exam_department_id: examDeptId,
        has_conflict: hasConflict,
      };
    });
  },
};