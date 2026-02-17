// src/services/teacherassignmentQueries.ts

import supabase from "@/utils/supabase";
import {
  TeacherAssignment,
  TeacherRole,
  ExamSession,
  TeacherWithCapability,
  TeacherWithAvailability,
  TeacherAvailability,
  ExamRoomAssignmentStatus,
  enrichTeacherWithCapability,
  getWorkloadLevel,
  SUPERVISOR_RANKS,
  ASSISTANT_RANKS,
} from "./teacherAssignmentTypes";

export const teacherAssignmentQueries = {
  // ✅ THIS WAS MISSING: Fixes the "is not a function" error
  async getCorrectExamRoomId(
    roomNumber: string,
    examDate: string,
    session: ExamSession,
  ): Promise<number | null> {
    const { data, error } = await supabase
      .from("exam_room")
      .select(
        `
        exam_room_id,
        exam!inner ( exam_date ),
        room!inner ( room_number )
      `,
      )
      .eq("room.room_number", roomNumber)
      .eq("exam.exam_date", examDate)
      .limit(1)
      .single();

    if (error || !data) return null;
    return data.exam_room_id;
  },

  async getAll(): Promise<TeacherAssignment[]> {
    const { data, error } = await supabase
      .from("teacher_assignment")
      .select("*, teacher(*)")
      .order("assigned_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // ✅ Updated to join teacher details
  async getByExamRoom(examRoomId: number): Promise<any[]> {
    const { data, error } = await supabase
      .from("teacher_assignment")
      .select("*, teacher(*)")
      .eq("exam_room_id", examRoomId);

    if (error) throw error;
    return data || [];
  },

  // ✅ Updated to filter by specific date/session
  async getExamRoomStatus(
    examRoomId: number,
    examDate?: string,
    session?: ExamSession,
  ): Promise<ExamRoomAssignmentStatus> {
    const assignments = await this.getByExamRoom(examRoomId);

    // Filter assignments for this specific date/session if provided
    const relevantAssignments = assignments.filter((a) => {
      if (!examDate) return true;
      return a.exam_date === examDate && a.session === session;
    });

    const supervisor = relevantAssignments.find((a) => a.role === "Supervisor");
    const assistant = relevantAssignments.find((a) => a.role === "Assistant");

    return {
      exam_room_id: examRoomId,
      hasSupervisor: !!supervisor,
      hasAssistant: !!assistant,
      supervisorId: supervisor?.teacher_id || null,
      assistantId: assistant?.teacher_id || null,
      supervisorName: supervisor?.teacher?.name,
      assistantName: assistant?.teacher?.name,
      isFullyStaffed: !!supervisor && !!assistant,
    };
  },

  async getEligibleTeachers(
    role: TeacherRole,
  ): Promise<TeacherWithCapability[]> {
    const ranks = role === "Supervisor" ? SUPERVISOR_RANKS : ASSISTANT_RANKS;
    const { data, error } = await supabase
      .from("teacher")
      .select("*")
      .in("rank", ranks)
      .order("name");

    if (error) throw error;
    return (data || []).map(enrichTeacherWithCapability);
  },

  async getAvailableTeachersWithSession(
    examRoomId: number,
    role: TeacherRole,
    examDate: string,
    session: ExamSession,
  ): Promise<TeacherWithAvailability[]> {
    const eligibleTeachers = await this.getEligibleTeachers(role);

    const { data: busy } = await supabase
      .from("teacher_assignment")
      .select("teacher_id")
      .eq("exam_date", examDate);

    const busyIds = (busy || []).map((b: any) => b.teacher_id);

    return eligibleTeachers
      .map((t) => ({
        ...t,
        availability: {
          teacher_id: t.teacher_id,
          is_available: !busyIds.includes(t.teacher_id),
          conflict_reason: busyIds.includes(t.teacher_id)
            ? "Already Assigned"
            : null,
        },
        workload_level: getWorkloadLevel(t.total_periods_assigned),
      }))
      .sort((a, b) =>
        a.availability.is_available === b.availability.is_available
          ? 0
          : a.availability.is_available
            ? -1
            : 1,
      );
  },

  async create(
    examRoomId: number,
    teacherId: number,
    role: TeacherRole,
    examDate: string,
    session: ExamSession,
    shiftStart?: string,
    shiftEnd?: string,
  ): Promise<TeacherAssignment> {
    const { data, error } = await supabase
      .from("teacher_assignment")
      .insert({
        exam_room_id: examRoomId,
        teacher_id: teacherId,
        role: role,
        exam_date: examDate,
        session: session,
        shift_start: shiftStart,
        shift_end: shiftEnd,
        assigned_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteByRoomAndRole(
    examRoomId: number,
    role: TeacherRole,
  ): Promise<void> {
    const { error } = await supabase
      .from("teacher_assignment")
      .delete()
      .eq("exam_room_id", examRoomId)
      .eq("role", role);

    if (error) throw error;
  },
};
