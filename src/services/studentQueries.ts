import supabase from "@/utils/supabase";

export interface Student {
  student_id: number;
  student_number: string;
  name: string;
  year_level: number;
  retake: boolean;
  major?: string | null;
  sem?: number | null;
  specialization?: string | null;
  is_assigned?: boolean;
  id?: number;
}

const TABLE_NAME = "student";

// Helper to add id field to student objects
function addIdField(student: Student): Student & { id: number } {
  return { ...student, id: student.student_id };
}

const STUDENT_SELECT =
  "student_id, student_number, name, year_level, retake, major, sem, specialization, is_assigned";

/**
 * Get total count of students in the database
 */
export async function getTotalStudentCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from(TABLE_NAME)
      .select("*", { count: "exact", head: true });

    if (error) {
      console.error("Error fetching student count:", error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error("Error in getTotalStudentCount:", error);
    return 0;
  }
}

/**
 * Get recent students from the database
 * @param limit - Number of students to fetch (default: 6)
 */
export async function getRecentStudents(
  limit: number = 6,
): Promise<(Student & { id: number })[]> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select(STUDENT_SELECT)
      .order("student_id", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching recent students:", error);
      return [];
    }

    return (data || []).map(addIdField);
  } catch (error) {
    console.error("Error in getRecentStudents:", error);
    return [];
  }
}

/**
 * Get all students from the database
 */
export async function getAllStudents(): Promise<(Student & { id: number })[]> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select(STUDENT_SELECT)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching all students:", error);
      return [];
    }

    return (data || []).map(addIdField);
  } catch (error) {
    console.error("Error in getAllStudents:", error);
    return [];
  }
}

/**
 * Get a single student by ID
 * @param studentId - The student ID to fetch
 */
export async function getStudentById(
  studentId: number,
): Promise<(Student & { id: number }) | null> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select(STUDENT_SELECT)
      .eq("student_id", studentId)
      .single();

    if (error) {
      console.error("Error fetching student by ID:", error);
      return null;
    }

    return data ? addIdField(data as Student) : null;
  } catch (error) {
    console.error("Error in getStudentById:", error);
    return null;
  }
}

/**
 * Get students by year level
 */
export async function getStudentsByYearLevel(
  yearLevel: number,
): Promise<(Student & { id: number })[]> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select(STUDENT_SELECT)
      .eq("year_level", yearLevel)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching students by year level:", error);
      return [];
    }

    return (data || []).map(addIdField);
  } catch (error) {
    console.error("Error in getStudentsByYearLevel:", error);
    return [];
  }
}

/**
 * Get students by major
 */
export async function getStudentsByMajor(
  major: string,
): Promise<(Student & { id: number })[]> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select(STUDENT_SELECT)
      .eq("major", major)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching students by major:", error);
      return [];
    }

    return (data || []).map(addIdField);
  } catch (error) {
    console.error("Error in getStudentsByMajor:", error);
    return [];
  }
}

/**
 * Get students by specialization
 */
export async function getStudentsBySpecialization(
  specialization: string,
): Promise<(Student & { id: number })[]> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select(STUDENT_SELECT)
      .eq("specialization", specialization)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching students by specialization:", error);
      return [];
    }

    return (data || []).map(addIdField);
  } catch (error) {
    console.error("Error in getStudentsBySpecialization:", error);
    return [];
  }
}

/**
 * Get retake students
 */
export async function getRetakeStudents(): Promise<
  (Student & { id: number })[]
> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select(STUDENT_SELECT)
      .eq("retake", true)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching retake students:", error);
      return [];
    }

    return (data || []).map(addIdField);
  } catch (error) {
    console.error("Error in getRetakeStudents:", error);
    return [];
  }
}

/**
 * Search students by name
 */
export async function searchStudentsByName(
  searchTerm: string,
): Promise<(Student & { id: number })[]> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select(STUDENT_SELECT)
      .ilike("name", `%${searchTerm}%`)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error searching students:", error);
      return [];
    }

    return (data || []).map(addIdField);
  } catch (error) {
    console.error("Error in searchStudentsByName:", error);
    return [];
  }
}

/**
 * Get dashboard statistics for students
 */
export async function getStudentStatistics() {
  try {
    const [
      { count: totalCount, error: totalErr },
      { count: retakeCount, error: retakeErr },
      yearLevelRows,
      majorRows,
      specializationRows,
    ] = await Promise.all([
      supabase.from(TABLE_NAME).select("*", { count: "exact", head: true }),
      supabase
        .from(TABLE_NAME)
        .select("*", { count: "exact", head: true })
        .eq("retake", true),
      supabase.from(TABLE_NAME).select("year_level"),
      supabase.from(TABLE_NAME).select("major"),
      supabase.from(TABLE_NAME).select("specialization"),
    ]);

    if (totalErr) console.error("Error totalCount:", totalErr);
    if (retakeErr) console.error("Error retakeCount:", retakeErr);

    const yearLevelDistribution: Record<number, number> = {};
    (yearLevelRows.data || []).forEach((row: { year_level: number }) => {
      yearLevelDistribution[row.year_level] =
        (yearLevelDistribution[row.year_level] || 0) + 1;
    });

    const majorDistribution: Record<string, number> = {};
    (majorRows.data || []).forEach((row: { major: string | null }) => {
      if (row.major) {
        majorDistribution[row.major] = (majorDistribution[row.major] || 0) + 1;
      }
    });

    const specializationDistribution: Record<string, number> = {};
    (specializationRows.data || []).forEach(
      (row: { specialization: string | null }) => {
        if (row.specialization) {
          specializationDistribution[row.specialization] =
            (specializationDistribution[row.specialization] || 0) + 1;
        }
      },
    );

    return {
      totalStudents: totalCount || 0,
      retakeStudents: retakeCount || 0,
      yearLevelDistribution,
      majorDistribution,
      specializationDistribution,
    };
  } catch (error) {
    console.error("Error getting student statistics:", error);
    return {
      totalStudents: 0,
      retakeStudents: 0,
      yearLevelDistribution: {},
      majorDistribution: {},
      specializationDistribution: {},
    };
  }
}

/**
 * Get unique semesters from all students
 */
export async function getUniqueSemesters(): Promise<number[]> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("sem")
      .not("sem", "is", null);

    if (error) {
      console.error("Error fetching unique semesters:", error);
      return [];
    }

    return [...new Set((data || []).map((x: { sem: number }) => x.sem))].sort(
      (a, b) => a - b,
    );
  } catch (error) {
    console.error("Error in getUniqueSemesters:", error);
    return [];
  }
}

/**
 * Get unique year levels from all students
 */
export async function getUniqueYearLevels(): Promise<number[]> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("year_level");

    if (error) {
      console.error("Error fetching unique year levels:", error);
      return [];
    }

    return [
      ...new Set((data || []).map((x: { year_level: number }) => x.year_level)),
    ].sort((a, b) => a - b);
  } catch (error) {
    console.error("Error in getUniqueYearLevels:", error);
    return [];
  }
}

/**
 * Get unique majors from all students
 */
export async function getUniqueMajors(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("major")
      .not("major", "is", null);

    if (error) {
      console.error("Error fetching unique majors:", error);
      return [];
    }

    return [
      ...new Set((data || []).map((x: { major: string }) => x.major)),
    ].sort();
  } catch (error) {
    console.error("Error in getUniqueMajors:", error);
    return [];
  }
}

/**
 * Get unique specializations from all students
 */
export async function getUniqueSpecializations(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("specialization")
      .not("specialization", "is", null);

    if (error) {
      console.error("Error fetching unique specializations:", error);
      return [];
    }

    return [
      ...new Set(
        (data || []).map((x: { specialization: string }) => x.specialization),
      ),
    ].sort();
  } catch (error) {
    console.error("Error in getUniqueSpecializations:", error);
    return [];
  }
}

// ========================================
// NEW FUNCTIONS FOR PENDING ASSIGNMENT
// ========================================

/**
 * Mark students as pending assignment (temporary hold)
 * This prevents them from being selected for other rooms
 * @param studentIds - Array of student IDs to mark as pending
 */
export async function markStudentsAsPending(
  studentIds: number[],
): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .update({ is_assigned: true })
      .in("student_id", studentIds);

    if (error) {
      console.error("Error marking students as pending:", error);
      return { success: false, error };
    }

    console.log(`✅ Marked ${studentIds.length} students as pending`);
    return { success: true };
  } catch (error) {
    console.error("Error in markStudentsAsPending:", error);
    return { success: false, error };
  }
}

/**
 * Release students from pending status
 * Used when user cancels the preview or navigates away
 * @param studentIds - Array of student IDs to release
 */
export async function releaseStudentsFromPending(
  studentIds: number[],
): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .update({ is_assigned: false })
      .in("student_id", studentIds);

    if (error) {
      console.error("Error releasing students from pending:", error);
      return { success: false, error };
    }

    console.log(`✅ Released ${studentIds.length} students from pending`);
    return { success: true };
  } catch (error) {
    console.error("Error in releaseStudentsFromPending:", error);
    return { success: false, error };
  }
}
