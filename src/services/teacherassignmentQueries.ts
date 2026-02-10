// ============================================
// UPDATED QUERIES WITH SESSION & AVAILABILITY
// ============================================

import supabase from "@/utils/supabase";
import {
  TeacherAssignment,
  Teacher,
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
      .select('*')
      .order('assigned_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get assignments for a specific exam room
  async getByExamRoom(examRoomId: number): Promise<TeacherAssignment[]> {
    const { data, error } = await supabase
      .from('teacher_assignment')
      .select('*')
      .eq('exam_room_id', examRoomId);

    if (error) throw error;
    return data || [];
  },

  // Get assignment status for an exam room
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
      isFullyStaffed: !!supervisor && !!assistant
    };
  },

  // NEW: Check teacher availability for a specific date and session
  async checkTeacherAvailability(
    teacherId: number,
    examDate: string,
    session: ExamSession
  ): Promise<TeacherAvailability> {
    // Get all assignments for this teacher on the same date and session
    const { data: assignments, error } = await supabase
      .from('teacher_assignment')
      .select(`
        *,
        exam_room:exam_room_id (
          exam_room_id,
          exam_date,
          room:room_id (
            room_number
          )
        )
      `)
      .eq('teacher_id', teacherId);

    if (error) throw error;

    // Filter assignments that match the date and session
    const conflicts = (assignments || []).filter((a: any) => {
      return a.exam_room?.exam_date === examDate && a.session === session;
    });

    const is_available = conflicts.length === 0;
    const conflict_reason = is_available
      ? null
      : `Already assigned to room ${conflicts[0]?.exam_room?.room?.room_number || 'Unknown'} on ${examDate} during ${session} session`;

    return {
      teacher_id: teacherId,
      is_available,
      conflict_reason,
      current_assignments: conflicts.map((c: any) => ({
        exam_date: c.exam_room?.exam_date || '',
        session: c.session || 'Unknown',
        room_number: c.exam_room?.room?.room_number || 'Unknown',
        role: c.role
      }))
    };
  },

  // Get eligible teachers for a specific role
  async getEligibleTeachers(role: TeacherRole): Promise<TeacherWithCapability[]> {
    const ranks = role === 'Supervisor' ? SUPERVISOR_RANKS : ASSISTANT_RANKS;
    
    const { data, error } = await supabase
      .from('teacher')
      .select('*')
      .in('rank', ranks)
      .order('total_periods_assigned', { ascending: true }) // Prioritize teachers with lower workload
      .order('name');

    if (error) throw error;
    
    return (data || []).map(enrichTeacherWithCapability);
  },

  // NEW: Get available teachers for a role considering time conflicts
  async getAvailableTeachersWithSession(
    examRoomId: number,
    role: TeacherRole,
    examDate: string,
    session: ExamSession
  ): Promise<TeacherWithAvailability[]> {
    // Get all eligible teachers for this role
    const eligibleTeachers = await this.getEligibleTeachers(role);
    
    // Get current assignments for this exam room
    const currentAssignments = await this.getByExamRoom(examRoomId);
    const assignedTeacherIds = currentAssignments.map(a => a.teacher_id);
    
    // Check availability for each teacher
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

    // Sort: available first, then by workload (light to heavy)
    return teachersWithAvailability.sort((a, b) => {
      // Available teachers first
      if (a.availability.is_available !== b.availability.is_available) {
        return a.availability.is_available ? -1 : 1;
      }
      
      // Then by workload
      const workloadOrder = { Light: 1, Medium: 2, High: 3 };
      return workloadOrder[a.workload_level] - workloadOrder[b.workload_level];
    });
  },

  // Legacy method for backward compatibility (no session checking)
  async getAvailableTeachers(
    examRoomId: number,
    role: TeacherRole
  ): Promise<TeacherWithCapability[]> {
    const eligibleTeachers = await this.getEligibleTeachers(role);
    const currentAssignments = await this.getByExamRoom(examRoomId);
    const assignedTeacherIds = currentAssignments.map(a => a.teacher_id);
    
    return eligibleTeachers.filter(
      t => !assignedTeacherIds.includes(t.teacher_id)
    );
  },

  // Validate assignment before creating
  async validateAssignment(
    examRoomId: number,
    teacherId: number,
    role: TeacherRole,
    examDate?: string,
    session?: ExamSession
  ): Promise<{ valid: true } | { valid: false; error: string }> {
    // Get teacher details
    const { data: teacher, error: teacherError } = await supabase
      .from('teacher')
      .select('*')
      .eq('teacher_id', teacherId)
      .single();

    if (teacherError || !teacher) {
      return { valid: false, error: 'Teacher not found' };
    }

    // Check if teacher rank is eligible for the role
    if (!canTeacherHaveRole(teacher.rank, role)) {
      return {
        valid: false,
        error: new InvalidRoleError(teacher.rank, role).message
      };
    }

    // Check if role is already filled
    const status = await this.getExamRoomStatus(examRoomId);
    if (role === 'Supervisor' && status.hasSupervisor) {
      return {
        valid: false,
        error: new RoleAlreadyFilledError('Supervisor', examRoomId).message
      };
    }
    if (role === 'Assistant' && status.hasAssistant) {
      return {
        valid: false,
        error: new RoleAlreadyFilledError('Assistant', examRoomId).message
      };
    }

    // Check for time conflicts if date and session provided
    if (examDate && session) {
      const availability = await this.checkTeacherAvailability(
        teacherId,
        examDate,
        session
      );

      if (!availability.is_available) {
        return {
          valid: false,
          error: new TimeConflictError(
            teacher.name,
            examDate,
            session,
            availability.current_assignments?.[0]?.room_number
          ).message
        };
      }
    }

    return { valid: true };
  },

  // Create a new assignment with validation
  async create(
    examRoomId: number,
    teacherId: number,
    role: TeacherRole,
    examDate?: string,
    session?: ExamSession,
    shiftStart?: string,
    shiftEnd?: string
  ): Promise<TeacherAssignment> {
    // Validate first
    const validation = await this.validateAssignment(
      examRoomId,
      teacherId,
      role,
      examDate,
      session
    );
    
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const { data, error } = await supabase
      .from('teacher_assignment')
      .insert({
        exam_room_id: examRoomId,
        teacher_id: teacherId,
        role: role,
        session: session || null,
        shift_start: shiftStart || null,
        shift_end: shiftEnd || null,
        assigned_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    
    // Note: total_periods_assigned will be automatically updated by the database trigger
    return data;
  },

  // Update an assignment (role cannot be changed, only times)
  async update(
    assignmentId: number,
    shiftStart?: string,
    shiftEnd?: string
  ): Promise<TeacherAssignment> {
    const { data, error } = await supabase
      .from('teacher_assignment')
      .update({
        shift_start: shiftStart || null,
        shift_end: shiftEnd || null
      })
      .eq('assignment_id', assignmentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete an assignment
  async delete(assignmentId: number): Promise<void> {
    const { error } = await supabase
      .from('teacher_assignment')
      .delete()
      .eq('assignment_id', assignmentId);

    if (error) throw error;
    // Note: total_periods_assigned will be automatically decremented by the database trigger
  },

  // Delete by exam room and role (useful for replacing)
  async deleteByRoomAndRole(examRoomId: number, role: TeacherRole): Promise<void> {
    const { error } = await supabase
      .from('teacher_assignment')
      .delete()
      .eq('exam_room_id', examRoomId)
      .eq('role', role);

    if (error) throw error;
  },

  // Get assignments with teacher and exam details
  async getWithDetails(examRoomId: number) {
    const { data, error } = await supabase
      .from('teacher_assignment')
      .select(`
        *,
        teacher:teacher_id (
          teacher_id,
          name,
          rank,
          department,
          total_periods_assigned
        ),
        exam_room:exam_room_id (
          exam_room_id,
          exam_date,
          room:room_id (
            room_number,
            capacity
          )
        )
      `)
      .eq('exam_room_id', examRoomId);

    if (error) throw error;
    return data || [];
  },

  // Get all exam rooms with their assignment counts and status
  async getExamRoomAssignmentCounts(): Promise<Record<number, { 
    total: number; 
    supervisor: boolean; 
    assistant: boolean;
    isFullyStaffed: boolean;
  }>> {
    const { data, error } = await supabase
      .from('teacher_assignment')
      .select('exam_room_id, role');

    if (error) throw error;

    const counts: Record<number, { 
      total: number; 
      supervisor: boolean; 
      assistant: boolean;
      isFullyStaffed: boolean;
    }> = {};
    
    (data || []).forEach(assignment => {
      if (!counts[assignment.exam_room_id]) {
        counts[assignment.exam_room_id] = {
          total: 0,
          supervisor: false,
          assistant: false,
          isFullyStaffed: false
        };
      }
      counts[assignment.exam_room_id].total++;
      if (assignment.role === 'Supervisor') {
        counts[assignment.exam_room_id].supervisor = true;
      }
      if (assignment.role === 'Assistant') {
        counts[assignment.exam_room_id].assistant = true;
      }
    });

    // Mark as fully staffed if has both roles
    Object.values(counts).forEach(count => {
      count.isFullyStaffed = count.supervisor && count.assistant;
    });

    return counts;
  },

  // NEW: Get teacher schedule for a specific date
  async getTeacherSchedule(teacherId: number, examDate?: string) {
    let query = supabase
      .from('teacher_assignment')
      .select(`
        *,
        exam_room:exam_room_id (
          exam_room_id,
          exam_date,
          room:room_id (
            room_number,
            capacity
          )
        )
      `)
      .eq('teacher_id', teacherId);

    if (examDate) {
      // This will need a join through exam_room to exam table
      // For now, return all and filter in application
    }

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  }
};