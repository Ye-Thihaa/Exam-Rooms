import supabase from "@/utils/supabase";

export interface Student {
  student_id: number;
  student_number: string;
  name: string;
  year_level: number;
  retake: boolean;
  major?: string;
  sem?: number;
  id?: number;
}

const TABLE_NAME = "student";

// Helper to add id field to student objects
function addIdField(student: Student): Student & { id: number } {
  return { ...student, id: student.student_id };
}

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
      .select(
        "student_id, student_number, name, year_level, retake, major, sem",
      )
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
      .select(
        "student_id, student_number, name, year_level, retake, major, sem",
      )
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
      .select(
        "student_id, student_number, name, year_level, retake, major, sem",
      )
      .eq("student_id", studentId)
      .single();

    if (error) {
      console.error("Error fetching student by ID:", error);
      return null;
    }

    return data ? addIdField(data) : null;
  } catch (error) {
    console.error("Error in getStudentById:", error);
    return null;
  }
}

/**
 * Get students by year level
 * @param yearLevel - The year level to filter by
 */
export async function getStudentsByYearLevel(
  yearLevel: number,
): Promise<(Student & { id: number })[]> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select(
        "student_id, student_number, name, year_level, retake, major, sem",
      )
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
 * @param major - The major to filter by
 */
export async function getStudentsByMajor(
  major: string,
): Promise<(Student & { id: number })[]> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select(
        "student_id, student_number, name, year_level, retake, major, sem",
      )
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
 * Get retake students
 */
export async function getRetakeStudents(): Promise<
  (Student & { id: number })[]
> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select(
        "student_id, student_number, name, year_level, retake, major, sem",
      )
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
 * @param searchTerm - The term to search for in student names
 */
export async function searchStudentsByName(
  searchTerm: string,
): Promise<(Student & { id: number })[]> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select(
        "student_id, student_number, name, year_level, retake, major, sem",
      )
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
      { count: totalCount },
      { count: retakeCount },
      yearLevelCounts,
      majorCounts,
    ] = await Promise.all([
      // Total students
      supabase.from(TABLE_NAME).select("*", { count: "exact", head: true }),

      // Retake students
      supabase
        .from(TABLE_NAME)
        .select("*", { count: "exact", head: true })
        .eq("retake", true),

      // Students by year level
      supabase.from(TABLE_NAME).select("year_level"),

      // Students by major
      supabase.from(TABLE_NAME).select("major"),
    ]);

    // Count students by year level
    const yearLevelDistribution: Record<number, number> = {};
    if (yearLevelCounts.data) {
      yearLevelCounts.data.forEach((student: { year_level: number }) => {
        yearLevelDistribution[student.year_level] =
          (yearLevelDistribution[student.year_level] || 0) + 1;
      });
    }

    // Count students by major
    const majorDistribution: Record<string, number> = {};
    if (majorCounts.data) {
      majorCounts.data.forEach((student: { major: string | null }) => {
        if (student.major) {
          majorDistribution[student.major] =
            (majorDistribution[student.major] || 0) + 1;
        }
      });
    }

    return {
      totalStudents: totalCount || 0,
      retakeStudents: retakeCount || 0,
      yearLevelDistribution,
      majorDistribution,
    };
  } catch (error) {
    console.error("Error getting student statistics:", error);
    return {
      totalStudents: 0,
      retakeStudents: 0,
      yearLevelDistribution: {},
      majorDistribution: {},
    };
  }
}

/**
 * Get unique semesters from all students
 * Returns sorted array of unique semester numbers
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

    // Extract unique semesters and sort
    const uniqueSemesters = [
      ...new Set((data || []).map((item: { sem: number }) => item.sem)),
    ].sort((a, b) => a - b);

    return uniqueSemesters;
  } catch (error) {
    console.error("Error in getUniqueSemesters:", error);
    return [];
  }
}

/**
 * Get unique year levels from all students
 * Returns sorted array of unique year level numbers
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

    // Extract unique year levels and sort
    const uniqueYearLevels = [
      ...new Set(
        (data || []).map((item: { year_level: number }) => item.year_level),
      ),
    ].sort((a, b) => a - b);

    return uniqueYearLevels;
  } catch (error) {
    console.error("Error in getUniqueYearLevels:", error);
    return [];
  }
}

/**
 * Get unique majors from all students
 * Returns sorted array of unique major strings (excluding null/undefined)
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

    // Extract unique majors and sort alphabetically
    const uniqueMajors = [
      ...new Set((data || []).map((item: { major: string }) => item.major)),
    ].sort();

    return uniqueMajors;
  } catch (error) {
    console.error("Error in getUniqueMajors:", error);
    return [];
  }
}
