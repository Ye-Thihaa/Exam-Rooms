import supabase from "@/utils/supabase";

// Helper function to convert year_level string to number
function yearLevelToNumber(yearLevel: string | number): number {
  // If already a number, return it
  if (typeof yearLevel === "number") return yearLevel;

  // If it's a numeric string, parse it
  const parsed = parseInt(yearLevel, 10);
  if (!isNaN(parsed)) return parsed;

  // Otherwise, try to match word format
  const match = yearLevel.match(/(\w+)\s+Year/i);
  if (!match) return 0;

  const yearWord = match[1].toLowerCase();
  const yearMap: Record<string, number> = {
    first: 1,
    second: 2,
    third: 3,
    fourth: 4,
  };
  return yearMap[yearWord] || 0;
}

// Helper function to convert semester string to number (1 or 2)
function semesterToNumber(semester: string | number): number {
  // If already a number, return it
  if (typeof semester === "number") return semester;

  // If it's a numeric string, parse it
  const parsed = parseInt(semester, 10);
  if (!isNaN(parsed)) return parsed;

  // Otherwise, try to match word format
  const s = semester.toLowerCase();
  if (s.includes("first")) return 1;
  if (s.includes("second")) return 2;
  return 0;
}

// Helper function to calculate cumulative semester number
// Year 1 Sem 1 = 1, Year 1 Sem 2 = 2, Year 2 Sem 1 = 3, etc.
function calculateCumulativeSemester(
  yearLevel: string | number,
  semester: string | number,
): string {
  const year = yearLevelToNumber(yearLevel);
  const sem = semesterToNumber(semester);

  if (year === 0 || sem === 0) return "0";

  const cumulative = (year - 1) * 2 + sem;
  return cumulative.toString();
}

// Helper function to normalize specialization codes
function normalizeSpecializationCode(code: string | null): string {
  if (!code) return "";
  const cleaned = code.trim();

  const specializationMap: Record<string, string> = {
    CST: "CST",
    CS: "CS",
    CT: "CT",
    SE: "Software Engineering",
    KE: "Knowledge Engineering",
    BIS: "Business Information Systems",
    HPC: "High Performance Computing",
    CN: "Communication and Networking",
    ES: "Embedded Systems",
    CSEC: "Cyber Security",
    "Software Engineering": "Software Engineering",
    "Knowledge Engineering": "Knowledge Engineering",
    "Business Information Systems": "Business Information Systems",
    "High Performance Computing": "High Performance Computing",
    "Communication and Networking": "Communication and Networking",
    "Embedded Systems": "Embedded Systems",
    "Embedded System": "Embedded Systems",
    "Cyber Security": "Cyber Security",
  };

  return specializationMap[cleaned] || cleaned;
}

// Helper function to check if exam matches exam_room assignment
function examMatchesAssignment(
  examYearLevel: string,
  examSemester: string,
  examProgram: string,
  examSpecialization: string | null,
  assignmentYearLevel: string | number,
  assignmentSem: string | number,
  assignmentProgram: string,
  assignmentSpecialization: string | null,
): boolean {
  // Convert exam year_level and semester to numbers for comparison
  const examYearNum = yearLevelToNumber(examYearLevel);
  const examSemNum = semesterToNumber(examSemester);

  // The assignment data from exam_room table is stored as-is:
  // - year_level_primary/secondary = actual year (1, 2, 3, 4)
  // - sem_primary/secondary = semester as stored (1 or 2)
  const assignmentYearStr = assignmentYearLevel.toString();
  const assignmentSemStr = assignmentSem.toString();
  const examYearStr = examYearNum.toString();
  const examSemStr = examSemNum.toString();

  // Normalize specializations for comparison
  const normalizedExamSpec = normalizeSpecializationCode(examSpecialization);
  const normalizedAssignmentSpec = normalizeSpecializationCode(
    assignmentSpecialization,
  );

  // Match all criteria: year, semester (as-is), program, and specialization
  const yearMatches = examYearStr === assignmentYearStr;
  const semMatches = examSemStr === assignmentSemStr;
  const programMatches = examProgram === assignmentProgram;
  const specMatches = normalizedExamSpec === normalizedAssignmentSpec;

  return yearMatches && semMatches && programMatches && specMatches;
}

export interface ExamRoom {
  exam_room_id?: number;
  exam_id: number;
  room_id: number;
  assigned_capacity: number;
  year_level_primary?: string;
  sem_primary?: string;
  program_primary?: string;
  specialization_primary?: string;
  students_primary?: number;
  year_level_secondary?: string;
  sem_secondary?: string;
  program_secondary?: string;
  specialization_secondary?: string;
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
  specialization_primary?: string;
  students_primary?: number;
  year_level_secondary?: string;
  sem_secondary?: string;
  program_secondary?: string;
  specialization_secondary?: string;
  students_secondary?: number;
}

// NEW INTERFACE FOR DETAILED EXAM ROOM DATA
export interface ExamRoomWithDetails extends ExamRoom {
  room?: {
    room_id: number;
    room_number: string;
    capacity: number;
    rows?: number;
    cols?: number;
  };
  exam?: {
    exam_id: number;
    exam_name: string;
    exam_date: string;
    start_time?: string;
    end_time?: string;
    subject_code?: string;
    day_of_week?: string;
  };
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

// ============================================================================
// NEW FUNCTIONS ADDED BELOW - For ExamsOverview and Teacher Assignment
// ============================================================================

/**
 * NEW: Get all exam room assignments with full details (room + exam info)
 * This is specifically for the ExamsOverview page
 */
export const getAllWithDetails = async (): Promise<{
  success: boolean;
  data?: ExamRoomWithDetails[];
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
          capacity,
          rows,
          cols
        ),
        exam:exam_id (
          exam_id,
          exam_name,
          exam_date,
          start_time,
          end_time,
          subject_code,
          day_of_week
        )
      `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching exam rooms with full details:", error);
      return { success: false, error };
    }

    return { success: true, data: data as ExamRoomWithDetails[] };
  } catch (error) {
    console.error("Exception fetching exam rooms with full details:", error);
    return { success: false, error };
  }
};

/**
 * NEW: Get exam rooms by specific date (for teacher assignment)
 */
export const getExamRoomsByDate = async (
  examDate: string,
): Promise<{
  success: boolean;
  data?: ExamRoomWithDetails[];
  error?: any;
}> => {
  try {
    // First get all exam IDs for this date
    const { data: examsOnDate, error: examError } = await supabase
      .from("exam")
      .select("exam_id")
      .eq("exam_date", examDate);

    if (examError) {
      console.error("Error fetching exams by date:", examError);
      return { success: false, error: examError };
    }

    if (!examsOnDate || examsOnDate.length === 0) {
      return { success: true, data: [] };
    }

    const examIds = examsOnDate.map((e: any) => e.exam_id);

    // Then get exam rooms for those exams
    const { data, error } = await supabase
      .from("exam_room")
      .select(
        `
        *,
        room:room_id (
          room_id,
          room_number,
          capacity,
          rows,
          cols
        ),
        exam:exam_id (
          exam_id,
          exam_name,
          exam_date,
          start_time,
          end_time,
          subject_code,
          day_of_week
        )
      `,
      )
      .in("exam_id", examIds)
      .order("exam.start_time", { ascending: true });

    if (error) {
      console.error("Error fetching exam rooms by date:", error);
      return { success: false, error };
    }

    return { success: true, data: data as ExamRoomWithDetails[] };
  } catch (error) {
    console.error("Exception fetching exam rooms by date:", error);
    return { success: false, error };
  }
};

/**
 * NEW: Get exam room by ID with full details
 */
export const getExamRoomById = async (
  examRoomId: number,
): Promise<{
  success: boolean;
  data?: ExamRoomWithDetails;
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
          capacity,
          rows,
          cols
        ),
        exam:exam_id (
          exam_id,
          exam_name,
          exam_date,
          start_time,
          end_time,
          subject_code,
          day_of_week
        )
      `,
      )
      .eq("exam_room_id", examRoomId)
      .single();

    if (error) {
      console.error("Error fetching exam room by ID:", error);
      return { success: false, error };
    }

    return { success: true, data: data as ExamRoomWithDetails };
  } catch (error) {
    console.error("Exception fetching exam room by ID:", error);
    return { success: false, error };
  }
};

/**
 * NEW: Get active rooms grouped by date
 * Returns rooms that are active on each exam date based on their assigned groups
 */
export const getRoomsGroupedByDate = async (): Promise<{
  success: boolean;
  data?: Record<string, ExamRoomWithDetails[]>;
  error?: any;
}> => {
  try {
    // Get all exam rooms with details
    const result = await getAllWithDetails();
    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    const examRooms = result.data;

    // Get all exams to find date ranges for each group
    const { data: allExams, error: examError } = await supabase
      .from("exam")
      .select("exam_date, year_level, semester, program, specialization")
      .order("exam_date", { ascending: true });

    if (examError) {
      console.error("Error fetching all exams:", examError);
      return { success: false, error: examError };
    }

    // Group rooms by date
    const roomsByDate: Record<string, ExamRoomWithDetails[]> = {};

    for (const examRoom of examRooms) {
      // Find all dates for primary group
      if (
        examRoom.year_level_primary &&
        examRoom.sem_primary &&
        examRoom.program_primary
      ) {
        const primaryDates = allExams
          .filter((e: any) =>
            examMatchesAssignment(
              e.year_level,
              e.semester,
              e.program,
              e.specialization,
              examRoom.year_level_primary!,
              examRoom.sem_primary!,
              examRoom.program_primary!,
              examRoom.specialization_primary || null,
            ),
          )
          .map((e: any) => e.exam_date);

        // Get unique dates
        const uniquePrimaryDates = [...new Set(primaryDates)];

        // Add this exam room to each date
        for (const date of uniquePrimaryDates) {
          if (!roomsByDate[date]) {
            roomsByDate[date] = [];
          }
          // Check if this room is already added for this date
          const exists = roomsByDate[date].some(
            (r) =>
              r.room_id === examRoom.room_id &&
              r.exam_room_id === examRoom.exam_room_id,
          );
          if (!exists) {
            roomsByDate[date].push(examRoom);
          }
        }
      }

      // Find all dates for secondary group (if exists)
      if (
        examRoom.year_level_secondary &&
        examRoom.sem_secondary &&
        examRoom.program_secondary
      ) {
        const secondaryDates = allExams
          .filter((e: any) =>
            examMatchesAssignment(
              e.year_level,
              e.semester,
              e.program,
              e.specialization,
              examRoom.year_level_secondary!,
              examRoom.sem_secondary!,
              examRoom.program_secondary!,
              examRoom.specialization_secondary || null,
            ),
          )
          .map((e: any) => e.exam_date);

        // Get unique dates
        const uniqueSecondaryDates = [...new Set(secondaryDates)];

        // Add this exam room to each date
        for (const date of uniqueSecondaryDates) {
          if (!roomsByDate[date]) {
            roomsByDate[date] = [];
          }
          // Check if this room is already added for this date
          const exists = roomsByDate[date].some(
            (r) =>
              r.room_id === examRoom.room_id &&
              r.exam_room_id === examRoom.exam_room_id,
          );
          if (!exists) {
            roomsByDate[date].push(examRoom);
          }
        }
      }
    }

    return { success: true, data: roomsByDate };
  } catch (error) {
    console.error("Exception grouping rooms by date:", error);
    return { success: false, error };
  }
};

/**
 * NEW: Get specific exam details for a room on a specific date
 * This shows what actual exam is happening in this room on this date
 */
export const getRoomExamDetailsForDate = async (
  roomId: number,
  examDate: string,
): Promise<{
  success: boolean;
  data?: {
    primaryExam?: any;
    secondaryExam?: any;
  };
  error?: any;
}> => {
  try {
    // Get the exam room assignment for this room
    const { data: examRoomData, error: examRoomError } = await supabase
      .from("exam_room")
      .select("*")
      .eq("room_id", roomId);

    if (examRoomError) {
      console.error("Error fetching exam room:", examRoomError);
      return { success: false, error: examRoomError };
    }

    if (!examRoomData || examRoomData.length === 0) {
      return { success: true, data: {} };
    }

    const examRoom = examRoomData[0];

    // Get exams for this date
    const { data: examsOnDate, error: examError } = await supabase
      .from("exam")
      .select("*")
      .eq("exam_date", examDate);

    if (examError) {
      console.error("Error fetching exams on date:", examError);
      return { success: false, error: examError };
    }

    // Find primary exam - match using cumulative semester logic
    let primaryExam = null;
    if (
      examRoom.year_level_primary &&
      examRoom.sem_primary &&
      examRoom.program_primary
    ) {
      primaryExam = examsOnDate.find((e: any) =>
        examMatchesAssignment(
          e.year_level,
          e.semester,
          e.program,
          e.specialization,
          examRoom.year_level_primary,
          examRoom.sem_primary,
          examRoom.program_primary,
          examRoom.specialization_primary || null,
        ),
      );
    }

    // Find secondary exam - match using cumulative semester logic
    let secondaryExam = null;
    if (
      examRoom.year_level_secondary &&
      examRoom.sem_secondary &&
      examRoom.program_secondary
    ) {
      secondaryExam = examsOnDate.find((e: any) =>
        examMatchesAssignment(
          e.year_level,
          e.semester,
          e.program,
          e.specialization,
          examRoom.year_level_secondary,
          examRoom.sem_secondary,
          examRoom.program_secondary,
          examRoom.specialization_secondary || null,
        ),
      );
    }

    return {
      success: true,
      data: {
        primaryExam,
        secondaryExam,
      },
    };
  } catch (error) {
    console.error("Exception fetching room exam details:", error);
    return { success: false, error };
  }
};

// NEW: Export as object for cleaner imports (optional, but recommended)
export const examRoomQueries = {
  getAllWithDetails,
  getExamRoomsByDate,
  getExamRoomById,
  getRoomsGroupedByDate,
  getRoomExamDetailsForDate,
  getAll: getAllExamRoomAssignments,
  getByExamId: getExamRoomAssignments,
  create: saveExamRoomAssignments,
  update: updateExamRoomAssignment,
  delete: deleteExamRoomAssignments,
  isRoomAssigned: isRoomAssignedToExam,
  getWithDetails: getExamRoomsWithDetails,
};
