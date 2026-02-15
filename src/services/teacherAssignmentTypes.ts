export type TeacherRole = 'Supervisor' | 'Assistant';
export type ExamSession = 'Morning' | 'Afternoon' | 'Evening';

// ✅ STRICTLY LIMITED TO YOUR 4 RANKS
export type TeacherRank = 
  | 'Associate Professor' 
  | 'Lecturer'
  | 'Associate Lecturer'
  | 'Tutor';

// ✅ Supervisor: Only Associate Professors
export const SUPERVISOR_RANKS: TeacherRank[] = [
  'Associate Professor'
];

// ✅ Assistant: All ranks (including Tutors) can be assistants
export const ASSISTANT_RANKS: TeacherRank[] = [
  'Associate Professor',
  'Lecturer',
  'Associate Lecturer',
  'Tutor'
];

export interface TeacherAssignment {
  assignment_id: number;
  exam_room_id: number;
  teacher_id: number;
  role: TeacherRole;
  session: ExamSession | null;
  shift_start: string | null;
  shift_end: string | null;
  assigned_at: string | null;
}

export interface Teacher {
  teacher_id: number;
  name: string;
  rank: TeacherRank;
  department: string;
  total_periods_assigned: number | null;
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

export interface TeacherWithCapability extends Teacher {
  canBeSupervisor: boolean;
  canBeAssistant: boolean;
  eligibleRoles: TeacherRole[];
}

export function enrichTeacherWithCapability(teacher: Teacher): TeacherWithCapability {
  // Cast rank safely to ensure it matches the type
  const rank = teacher.rank as TeacherRank;
  
  const canBeSupervisor = SUPERVISOR_RANKS.includes(rank);
  const canBeAssistant = ASSISTANT_RANKS.includes(rank);
  
  return {
    ...teacher,
    canBeSupervisor,
    canBeAssistant,
    eligibleRoles: getEligibleRoles(rank)
  };
}

export interface ExamRoomAssignmentStatus {
  exam_room_id: number;
  hasSupervisor: boolean;
  hasAssistant: boolean;
  supervisorId: number | null;
  assistantId: number | null;
  supervisorName?: string; 
  assistantName?: string;  
  isFullyStaffed: boolean;
}

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

export interface TeacherWithAvailability extends TeacherWithCapability {
  availability: TeacherAvailability;
  workload_level: 'Light' | 'Medium' | 'High';
}

export function getWorkloadLevel(periods: number | null): 'Light' | 'Medium' | 'High' {
  const p = periods || 0;
  if (p >= 18) return 'High';
  if (p >= 12) return 'Medium';
  return 'Light';
}

export class TeacherAssignmentError extends Error {
  constructor(message: string) { super(message); this.name = 'TeacherAssignmentError'; }
}

export class InvalidRoleError extends TeacherAssignmentError {
  constructor(teacherRank: TeacherRank, attemptedRole: TeacherRole) {
    super(`Invalid Role: ${teacherRank} cannot be ${attemptedRole}`);
    this.name = 'InvalidRoleError';
  }
}

export class RoleAlreadyFilledError extends TeacherAssignmentError {
  constructor(role: TeacherRole, examRoomId: number) {
    super(`Role ${role} is already filled for this room.`);
    this.name = 'RoleAlreadyFilledError';
  }
}

export class TimeConflictError extends TeacherAssignmentError {
  constructor(teacherName: string, examDate: string, session: ExamSession, conflictingRoom?: string) {
    super(`${teacherName} is busy on ${examDate} (${session}).`);
    this.name = 'TimeConflictError';
  }
}

export function formatSession(session: ExamSession | null): string {
  if (!session) return 'Unknown Session';
  return session;
}

export function getSessionTimeRange(session: ExamSession | null): { start: string; end: string } | null {
  switch (session) {
    case 'Morning': return { start: '08:00', end: '12:00' };
    case 'Afternoon': return { start: '13:00', end: '17:00' };
    
    default: return null;
  }
}