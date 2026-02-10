// ============================================
// UPDATED TYPES WITH SESSION MANAGEMENT
// ============================================

export type TeacherRole = 'Supervisor' | 'Assistant';
export type ExamSession = 'Morning' | 'Afternoon' | 'Evening';

export type TeacherRank = 
  | 'Professor' 
  | 'Associate Professor' 
  | 'Assistant Professor'
  | 'Lecturer'
  | 'Instructor';

// Ranks that can be Supervisors
export const SUPERVISOR_RANKS: TeacherRank[] = [
  'Professor',
  'Associate Professor'
];

// Ranks that can be Assistants
export const ASSISTANT_RANKS: TeacherRank[] = [
  'Lecturer',
  'Assistant Professor',
  'Instructor'
];

export interface TeacherAssignment {
  assignment_id: number;
  exam_room_id: number;
  teacher_id: number;
  role: TeacherRole;
  session: ExamSession | null; // Added session tracking
  shift_start: string | null;
  shift_end: string | null;
  assigned_at: string | null;
}

export interface Teacher {
  teacher_id: number;
  name: string;
  rank: TeacherRank;
  department: string;
  total_periods_assigned: number | null; // Now tracks exam invigilation assignments
}

export interface Exam {
  exam_id: number;
  subject_code: string | null;
  exam_name: string | null;
  exam_date: string | null;
  session: ExamSession | null;
  semester: number | null;
  academic_year: string | null;
  year_level: number | null;
  program: string | null;
  specialization: string | null;
  start_time: string | null;
  end_time: string | null;
  day_of_week: string | null;
}

// Helper function to check if a teacher can be assigned a specific role
export function canTeacherHaveRole(teacherRank: TeacherRank, role: TeacherRole): boolean {
  if (role === 'Supervisor') {
    return SUPERVISOR_RANKS.includes(teacherRank);
  }
  if (role === 'Assistant') {
    return ASSISTANT_RANKS.includes(teacherRank);
  }
  return false;
}

// Helper function to get eligible roles for a teacher based on their rank
export function getEligibleRoles(teacherRank: TeacherRank): TeacherRole[] {
  const roles: TeacherRole[] = [];
  
  if (SUPERVISOR_RANKS.includes(teacherRank)) {
    roles.push('Supervisor');
  }
  
  if (ASSISTANT_RANKS.includes(teacherRank)) {
    roles.push('Assistant');
  }
  
  return roles;
}

// Type for teacher with assignment capability info
export interface TeacherWithCapability extends Teacher {
  canBeSupervisor: boolean;
  canBeAssistant: boolean;
  eligibleRoles: TeacherRole[];
}

// Transform teacher to include capability info
export function enrichTeacherWithCapability(teacher: Teacher): TeacherWithCapability {
  const canBeSupervisor = SUPERVISOR_RANKS.includes(teacher.rank);
  const canBeAssistant = ASSISTANT_RANKS.includes(teacher.rank);
  
  return {
    ...teacher,
    canBeSupervisor,
    canBeAssistant,
    eligibleRoles: getEligibleRoles(teacher.rank)
  };
}

// Type for exam room assignment status
export interface ExamRoomAssignmentStatus {
  exam_room_id: number;
  hasSupervisor: boolean;
  hasAssistant: boolean;
  supervisorId: number | null;
  assistantId: number | null;
  isFullyStaffed: boolean;
}

// NEW: Teacher availability info
export interface TeacherAvailability {
  teacher_id: number;
  is_available: boolean;
  conflict_reason: string | null;
  current_assignments?: {
    exam_date: string;
    session: ExamSession;
    room_number: string;
    role: TeacherRole;
  }[];
}

// NEW: Teacher with availability and workload info
export interface TeacherWithAvailability extends TeacherWithCapability {
  availability: TeacherAvailability;
  workload_level: 'Light' | 'Medium' | 'High';
}

// Helper to calculate workload level
export function getWorkloadLevel(periods: number | null): 'Light' | 'Medium' | 'High' {
  const p = periods || 0;
  if (p >= 18) return 'High';
  if (p >= 12) return 'Medium';
  return 'Light';
}

// Validation error types
export class TeacherAssignmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TeacherAssignmentError';
  }
}

export class InvalidRoleError extends TeacherAssignmentError {
  constructor(teacherRank: TeacherRank, attemptedRole: TeacherRole) {
    super(
      `A ${teacherRank} cannot be assigned as ${attemptedRole}. ` +
      `${attemptedRole === 'Supervisor' 
        ? 'Only Professors and Associate Professors can be Supervisors.' 
        : 'Only Lecturers, Assistant Professors, and Instructors can be Assistants.'}`
    );
    this.name = 'InvalidRoleError';
  }
}

export class RoleAlreadyFilledError extends TeacherAssignmentError {
  constructor(role: TeacherRole, examRoomId: number) {
    super(
      `The ${role} role is already filled for exam room #${examRoomId}. ` +
      `Please remove the existing ${role} before assigning a new one.`
    );
    this.name = 'RoleAlreadyFilledError';
  }
}

export class TimeConflictError extends TeacherAssignmentError {
  constructor(
    teacherName: string, 
    examDate: string, 
    session: ExamSession,
    conflictingRoom?: string
  ) {
    super(
      `${teacherName} is already assigned to ${conflictingRoom ? `room ${conflictingRoom}` : 'another exam'} ` +
      `on ${examDate} during the ${session} session. ` +
      `A teacher cannot be assigned to multiple exams in the same time slot.`
    );
    this.name = 'TimeConflictError';
  }
}

// Helper to format session display
export function formatSession(session: ExamSession | null): string {
  if (!session) return 'Unknown Session';
  return session;
}

// Helper to get session time range (approximate)
export function getSessionTimeRange(session: ExamSession | null): { start: string; end: string } | null {
  switch (session) {
    case 'Morning':
      return { start: '08:00', end: '12:00' };
    case 'Afternoon':
      return { start: '13:00', end: '17:00' };
    case 'Evening':
      return { start: '18:00', end: '21:00' };
    default:
      return null;
  }
}