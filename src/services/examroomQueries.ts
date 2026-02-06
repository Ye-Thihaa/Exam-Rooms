import supabase from "@/utils/supabase";

// Helper function to convert year_level string to number
function yearLevelToNumber(yearLevel: string | number): number {
  if (typeof yearLevel === "number") return yearLevel;
  const parsed = parseInt(yearLevel, 10);
  if (!isNaN(parsed)) return parsed;
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
  if (typeof semester === "number") return semester;
  const parsed = parseInt(semester, 10);
  if (!isNaN(parsed)) return parsed;
  const s = semester.toLowerCase();
  if (s.includes("first")) return 1;
  if (s.includes("second")) return 2;
  return 0;
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
  const examYearNum = yearLevelToNumber(examYearLevel);
  const examSemNum = semesterToNumber(examSemester);
  const assignmentYearStr = assignmentYearLevel.toString();
  const assignmentSemStr = assignmentSem.toString();
  const examYearStr = examYearNum.toString();
  const examSemStr = examSemNum.toString();

  const normalizedExamSpec = normalizeSpecializationCode(examSpecialization);
  const normalizedAssignmentSpec = normalizeSpecializationCode(
    assignmentSpecialization,
  );

  const yearMatches = examYearStr === assignmentYearStr;
  const semMatches = examSemStr === assignmentSemStr;
  const programMatches = examProgram === assignmentProgram;
  const specMatches = normalizedExamSpec === normalizedAssignmentSpec;

  return yearMatches && semMatches && programMatches && specMatches;
}

export interface ExamRoom {
  exam_room_id?: number;
  exam_id?: number;
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
  exam_id?: number;
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
 * Save room assignments without requiring exam_id
 */
export const saveExamRoomAssignments = async (
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
 * Delete all exam room assignments
 */
export const deleteExamRoomAssignments = async (): Promise<{
  success: boolean;
  error?: any;
}> => {
  try {
    const { error } = await supabase
      .from("exam_room")
      .delete()
      .neq("exam_room_id", 0);

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
 * Check if a room is already assigned
 */
export const isRoomAssigned = async (
  roomId: number,
): Promise<{ success: boolean; isAssigned?: boolean; error?: any }> => {
  try {
    const { data, error } = await supabase
      .from("exam_room")
      .select("exam_room_id")
      .eq("room_id", roomId)
      .single();

    if (error && error.code !== "PGRST116") {
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

/**
 * Get all exam room assignments with full details (room info only)
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
 * Get exam room by ID with full details
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
 * ✅ NEW: Get rooms for a specific date by matching with exams
 * This function finds all exam_rooms that have groups matching exams on the given date
 */
export const getRoomsByDate = async (
  examDate: string,
): Promise<{
  success: boolean;
  data?: Record<string, ExamRoomWithDetails[]>;
  error?: any;
}> => {
  try {
    // 1. Get all exams for this specific date
    const { data: examsOnDate, error: examError } = await supabase
      .from("exam")
      .select("*")
      .eq("exam_date", examDate);

    if (examError) {
      console.error("Error fetching exams by date:", examError);
      return { success: false, error: examError };
    }

    if (!examsOnDate || examsOnDate.length === 0) {
      // No exams on this date
      return { success: true, data: { [examDate]: [] } };
    }

    // 2. Get all exam room assignments with room details
    const { data: allExamRooms, error: examRoomError } = await supabase
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
        )
      `,
      );

    if (examRoomError) {
      console.error("Error fetching exam rooms:", examRoomError);
      return { success: false, error: examRoomError };
    }

    if (!allExamRooms || allExamRooms.length === 0) {
      return { success: true, data: { [examDate]: [] } };
    }

    // 3. Filter exam rooms that have groups matching exams on this date
    const matchingRooms: ExamRoomWithDetails[] = [];

    for (const examRoom of allExamRooms) {
      let hasMatchingExam = false;

      // Check if primary group matches any exam on this date
      if (
        examRoom.year_level_primary &&
        examRoom.sem_primary &&
        examRoom.program_primary
      ) {
        const primaryMatches = examsOnDate.some((exam: any) =>
          examMatchesAssignment(
            exam.year_level,
            exam.semester,
            exam.program,
            exam.specialization,
            examRoom.year_level_primary!,
            examRoom.sem_primary!,
            examRoom.program_primary!,
            examRoom.specialization_primary || null,
          ),
        );

        if (primaryMatches) {
          hasMatchingExam = true;
        }
      }

      // Check if secondary group matches any exam on this date
      if (
        examRoom.year_level_secondary &&
        examRoom.sem_secondary &&
        examRoom.program_secondary
      ) {
        const secondaryMatches = examsOnDate.some((exam: any) =>
          examMatchesAssignment(
            exam.year_level,
            exam.semester,
            exam.program,
            exam.specialization,
            examRoom.year_level_secondary!,
            examRoom.sem_secondary!,
            examRoom.program_secondary!,
            examRoom.specialization_secondary || null,
          ),
        );

        if (secondaryMatches) {
          hasMatchingExam = true;
        }
      }

      // If either group matches, add this room to the results
      if (hasMatchingExam) {
        matchingRooms.push(examRoom as ExamRoomWithDetails);
      }
    }

    return {
      success: true,
      data: { [examDate]: matchingRooms },
    };
  } catch (error) {
    console.error("Exception getting rooms by date:", error);
    return { success: false, error };
  }
};

// Export as object for cleaner imports
export const examRoomQueries = {
  getAllWithDetails,
  getExamRoomById,
  getRoomsByDate, // ✅ NEW function
  getAll: getAllExamRoomAssignments,
  create: saveExamRoomAssignments,
  update: updateExamRoomAssignment,
  delete: deleteExamRoomAssignments,
  isRoomAssigned: isRoomAssigned,
  getWithDetails: getExamRoomsWithDetails,
};
