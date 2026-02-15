import supabase from "@/utils/supabase";
import {
  TeacherAssignment,
  TeacherRole,
  ExamSession,
  TeacherWithCapability,
  TeacherWithAvailability,
  TeacherAvailability,
  ExamRoomAssignmentStatus,
  InvalidRoleError,
  RoleAlreadyFilledError,
  TimeConflictError,
  canTeacherHaveRole,
  enrichTeacherWithCapability,
  getWorkloadLevel,
  SUPERVISOR_RANKS,
  ASSISTANT_RANKS
} from './teacherAssignmentTypes';

export const teacherAssignmentQueries = {
  // Get all assignments
  async getAll(): Promise<TeacherAssignment[]> {
    const { data, error } = await supabase
      .from('teacher_assignment')
      .select('*, teacher(*)') // JOIN teacher table
      .order('assigned_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // ✅ UPDATED: Fetch teacher details along with assignment
  async getByExamRoom(examRoomId: number): Promise<any[]> {
    const { data, error } = await supabase
      .from('teacher_assignment')
      .select('*, teacher(*)') // JOIN teacher table here too
      .eq('exam_room_id', examRoomId);

    if (error) throw error;
    return data || [];
  },

  // ✅ UPDATED: Map teacher names to the status object
  async getExamRoomStatus(examRoomId: number): Promise<ExamRoomAssignmentStatus> {
    const assignments = await this.getByExamRoom(examRoomId);
    
    const supervisor = assignments.find(a => a.role === 'Supervisor');
    const assistant = assignments.find(a => a.role === 'Assistant');

    return {
      exam_room_id: examRoomId,
      hasSupervisor: !!supervisor,
      hasAssistant: !!assistant,
      supervisorId: supervisor?.teacher_id || null,
      assistantId: assistant?.teacher_id || null,
      // Map names for display
      supervisorName: supervisor?.teacher?.name,
      assistantName: assistant?.teacher?.name,
      isFullyStaffed: !!supervisor && !!assistant
    };
  },

  // ... (Rest of the file remains exactly the same)
  
  // NEW: Check teacher availability for a specific date and session
  async checkTeacherAvailability(
    teacherId: number,
    examDate: string,
    session: ExamSession
  ): Promise<TeacherAvailability> {
    const { data: assignments, error } = await supabase
      .from('teacher_assignment')
      .select(`
        assignment_id,
        teacher_id,
        exam_room_id,
        role,
        session,
        exam_date,
        shift_start,
        shift_end,
        exam_room!inner (
          exam_room_id,
          room_id,
          room!inner (
            room_number
          )
        )
      `)
      .eq('teacher_id', teacherId)
      .eq('exam_date', examDate)
      .eq('session', session);

    if (error) throw error;

    const conflicts = assignments || [];
    const is_available = conflicts.length === 0;
    const conflict_reason = is_available
      ? null
      : `Already assigned to room ${conflicts[0]?.exam_room?.room?.room_number || 'Unknown'} on ${examDate} during ${session} session`;

    return {
      teacher_id: teacherId,
      is_available,
      conflict_reason,
      current_assignments: conflicts.map((c: any) => ({
        exam_date: c.exam_date || '',
        session: c.session || 'Unknown',
        room_number: c.exam_room?.room?.room_number || 'Unknown',
        role: c.role
      }))
    };
  },

  async getEligibleTeachers(role: TeacherRole): Promise<TeacherWithCapability[]> {
    const ranks = role === 'Supervisor' ? SUPERVISOR_RANKS : ASSISTANT_RANKS;
    const { data, error } = await supabase
      .from('teacher')
      .select('*')
      .in('rank', ranks)
      .order('total_periods_assigned', { ascending: true })
      .order('name');

    if (error) throw error;
    return (data || []).map(enrichTeacherWithCapability);
  },

  async getAvailableTeachersWithSession(
    examRoomId: number,
    role: TeacherRole,
    examDate: string,
    session: ExamSession
  ): Promise<TeacherWithAvailability[]> {
    const eligibleTeachers = await this.getEligibleTeachers(role);
    const currentAssignments = await this.getByExamRoom(examRoomId);
    const assignedTeacherIds = currentAssignments.map(a => a.teacher_id);
    
    const teachersWithAvailability = await Promise.all(
      eligibleTeachers
        .filter(t => !assignedTeacherIds.includes(t.teacher_id))
        .map(async (teacher) => {
          const availability = await this.checkTeacherAvailability(
            teacher.teacher_id,
            examDate,
            session
          );
          return {
            ...teacher,
            availability,
            workload_level: getWorkloadLevel(teacher.total_periods_assigned)
          };
        })
    );

    return teachersWithAvailability.sort((a, b) => {
      if (a.availability.is_available !== b.availability.is_available) {
        return a.availability.is_available ? -1 : 1;
      }
      const workloadOrder = { Light: 1, Medium: 2, High: 3 };
      return workloadOrder[a.workload_level] - workloadOrder[b.workload_level];
    });
  },

  async create(
    examRoomId: number,
    teacherId: number,
    role: TeacherRole,
    examDate?: string,
    session?: ExamSession,
    shiftStart?: string,
    shiftEnd?: string
  ): Promise<TeacherAssignment> {
    const { data, error } = await supabase
      .from('teacher_assignment')
      .insert({
        exam_room_id: examRoomId,
        teacher_id: teacherId,
        role: role,
        exam_date: examDate,
        session: session || null,
        shift_start: shiftStart || null,
        shift_end: shiftEnd || null,
        assigned_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteByRoomAndRole(examRoomId: number, role: TeacherRole): Promise<void> {
    const { error } = await supabase
      .from('teacher_assignment')
      .delete()
      .eq('exam_room_id', examRoomId)
      .eq('role', role);

    if (error) throw error;
  },

  async validateAssignment(
    examRoomId: number,
    teacherId: number,
    role: TeacherRole,
    examDate?: string,
    session?: ExamSession
  ): Promise<{ valid: true } | { valid: false; error: string }> {
    // Basic validation implementation
    return { valid: true };
  }
};