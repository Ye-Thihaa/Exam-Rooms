import { getStudentById } from "./studentQueries";
import { seatingAssignmentQueries } from "./seatingassignmentQueries";
import { examRoomQueries } from "./examroomQueries";
import { examQueries } from "./examQueries";
import type { Student } from "./studentQueries";
import type { SeatingAssignment } from "./seatingassignmentQueries";
import type { ExamRoomWithDetails } from "./examroomQueries";
import type { Exam } from "./examQueries";

export interface StudentExamInfo {
  exam: Exam;
  examRoom: ExamRoomWithDetails;
  seatingAssignment: SeatingAssignment;
}

export interface StudentDashboardData {
  student: (Student & { id: number }) | null;
  exams: StudentExamInfo[];
  upcomingExams: StudentExamInfo[];
  pastExams: StudentExamInfo[];
}

/**
 * Fetch complete dashboard data for a student
 * @param studentId - The student ID to fetch data for
 */
export async function getStudentDashboardData(
  studentId: number,
): Promise<StudentDashboardData> {
  try {
    // 1. Fetch student data
    const student = await getStudentById(studentId);
    if (!student) {
      console.log("Student not found:", studentId);
      return {
        student: null,
        exams: [],
        upcomingExams: [],
        pastExams: [],
      };
    }

    // 2. Fetch all seating assignments for this student (simple query without nested relations)
    let seatingAssignments: SeatingAssignment[];
    try {
      const allAssignments = await seatingAssignmentQueries.getAll();
      seatingAssignments = allAssignments.filter(
        (assignment) => assignment.student_id === studentId,
      );
      console.log("Found seating assignments:", seatingAssignments.length);
    } catch (err) {
      console.error("Error fetching seating assignments:", err);
      return {
        student,
        exams: [],
        upcomingExams: [],
        pastExams: [],
      };
    }

    if (!seatingAssignments || seatingAssignments.length === 0) {
      console.log("No seating assignments found for student");
      return {
        student,
        exams: [],
        upcomingExams: [],
        pastExams: [],
      };
    }

    // 3. For each seating assignment, fetch exam room and exam details
    const examInfoPromises = seatingAssignments.map(async (seating) => {
      try {
        console.log(
          "Processing seating assignment for exam_room_id:",
          seating.exam_room_id,
        );

        // Get exam room details
        const examRoomResult = await examRoomQueries.getExamRoomById(
          seating.exam_room_id,
        );
        if (!examRoomResult.success || !examRoomResult.data) {
          console.log("Exam room not found:", seating.exam_room_id);
          return null;
        }

        const examRoom = examRoomResult.data;

        // Determine which group this student belongs to (A or B)
        const isGroupA = seating.student_group === "A";
        console.log("Student is in group:", seating.student_group);

        // Get the appropriate year, sem, program, and specialization
        const yearLevel = isGroupA
          ? examRoom.year_level_primary
          : examRoom.year_level_secondary;
        const sem = isGroupA ? examRoom.sem_primary : examRoom.sem_secondary;
        const program = isGroupA
          ? examRoom.program_primary
          : examRoom.program_secondary;
        const specialization = isGroupA
          ? examRoom.specialization_primary
          : examRoom.specialization_secondary;

        console.log("Looking for exams with:", {
          yearLevel,
          sem,
          program,
          specialization,
        });

        if (!yearLevel || !sem || !program) {
          console.log("Missing exam room group data");
          return null;
        }

        // Fetch exams matching this student's criteria
        const examsForGroup = await examQueries.getByProgramYearSpecialization(
          program,
          yearLevel,
          specialization || null,
        );

        if (!examsForGroup || examsForGroup.length === 0) {
          console.log("No exams found for this group");
          return null;
        }

        console.log("Found exams:", examsForGroup.length);

        // Return info for each exam
        return examsForGroup.map((exam) => ({
          exam,
          examRoom,
          seatingAssignment: seating,
        }));
      } catch (err) {
        console.error("Error fetching exam info:", err);
        return null;
      }
    });

    const examInfoArrays = await Promise.all(examInfoPromises);
    const allExams = examInfoArrays
      .filter((arr) => arr !== null)
      .flat()
      .filter((info) => info !== null) as StudentExamInfo[];

    console.log("Total exams before deduplication:", allExams.length);

    // Remove duplicates based on exam_id
    const uniqueExams = Array.from(
      new Map(allExams.map((item) => [item.exam.exam_id, item])).values(),
    );

    console.log("Unique exams:", uniqueExams.length);

    // Sort by exam date
    uniqueExams.sort(
      (a, b) =>
        new Date(a.exam.exam_date).getTime() -
        new Date(b.exam.exam_date).getTime(),
    );

    // Split into upcoming and past exams
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingExams = uniqueExams.filter(
      (e) => new Date(e.exam.exam_date) >= today,
    );

    const pastExams = uniqueExams.filter(
      (e) => new Date(e.exam.exam_date) < today,
    );

    console.log("Upcoming:", upcomingExams.length, "Past:", pastExams.length);

    return {
      student,
      exams: uniqueExams,
      upcomingExams,
      pastExams,
    };
  } catch (err) {
    console.error("Error fetching student dashboard data:", err);
    throw err;
  }
}

/**
 * Fetch student exams for a specific date range
 * @param studentId - The student ID
 * @param startDate - Start date (ISO string)
 * @param endDate - End date (ISO string)
 */
export async function getStudentExamsByDateRange(
  studentId: number,
  startDate: string,
  endDate: string,
): Promise<StudentExamInfo[]> {
  try {
    const dashboardData = await getStudentDashboardData(studentId);

    return dashboardData.exams.filter((examInfo) => {
      const examDate = new Date(examInfo.exam.exam_date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return examDate >= start && examDate <= end;
    });
  } catch (err) {
    console.error("Error fetching student exams by date range:", err);
    return [];
  }
}

/**
 * Get student's next upcoming exam
 * @param studentId - The student ID
 */
export async function getStudentNextExam(
  studentId: number,
): Promise<StudentExamInfo | null> {
  try {
    const dashboardData = await getStudentDashboardData(studentId);
    return dashboardData.upcomingExams[0] || null;
  } catch (err) {
    console.error("Error fetching student next exam:", err);
    return null;
  }
}

/**
 * Get count of student's upcoming exams
 * @param studentId - The student ID
 */
export async function getStudentUpcomingExamCount(
  studentId: number,
): Promise<number> {
  try {
    const dashboardData = await getStudentDashboardData(studentId);
    return dashboardData.upcomingExams.length;
  } catch (err) {
    console.error("Error fetching upcoming exam count:", err);
    return 0;
  }
}
