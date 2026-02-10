import { examQueries, Exam } from "@/services/examQueries";
import {
  examRoomQueries,
  ExamRoomWithDetails,
} from "@/services/examroomQueries";

// ────────────────────────────────────────────────
// Helper functions
// ────────────────────────────────────────────────

function yearLevelToNumber(yearLevel: string): number {
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

function semesterToNumber(semester: string): number {
  const parsed = parseInt(semester, 10);
  if (!isNaN(parsed)) return parsed;

  const s = (semester || "").toLowerCase();
  if (s.includes("first")) return 1;
  if (s.includes("second")) return 2;
  return 0;
}

// ────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────

export interface GroupCriteria {
  yearLevel: string;
  semester: string;
  program: string;
  specialization?: string;
}

export interface ExamRoomLinkage {
  examRoomId: number;
  roomNumber: string;
  roomCapacity: number;
  examDate: string;
  primaryGroup: GroupCriteria | null;
  secondaryGroup: GroupCriteria | null;
  linkedExams: {
    primary: Exam[];
    secondary: Exam[];
  };
  totalLinkedExams: number;
  totalStudents: number;
}

export interface DateGroupedLinkage {
  examDate: string;
  dayOfWeek: string;
  linkages: ExamRoomLinkage[];
  totalRooms: number;
  totalExams: number;
}

// ────────────────────────────────────────────────
// Matching Logic
// ────────────────────────────────────────────────

export function matchExamToGroup(exam: Exam, group: GroupCriteria): boolean {
  const examYearNum = yearLevelToNumber(exam.year_level);
  const examSemNum = semesterToNumber(exam.semester);

  const groupSpec = normalizeSpecializationCode(group.specialization || "");
  const examSpec = normalizeSpecializationCode(exam.specialization || "");

  return (
    examYearNum.toString() === group.yearLevel &&
    examSemNum.toString() === group.semester &&
    exam.program === group.program &&
    groupSpec === examSpec
  );
}

// ────────────────────────────────────────────────
// Service Functions
// ────────────────────────────────────────────────

/**
 * Get all exam room linkages grouped by date
 */
export async function getAllExamRoomLinkages(): Promise<{
  success: boolean;
  data?: DateGroupedLinkage[];
  error?: any;
}> {
  try {
    // Get all unique exam dates
    const uniqueDates = await examQueries.getUniqueDates();
    const dateLinkages: DateGroupedLinkage[] = [];

    for (const dateInfo of uniqueDates) {
      const date = dateInfo.exam_date;

      // Get exams and rooms for this date
      const examsOnDate = await examQueries.getByDate(date);
      const roomsResult = await examRoomQueries.getRoomsByDate(date);

      if (!roomsResult.success) {
        console.error(`Failed to load rooms for ${date}:`, roomsResult.error);
        continue;
      }

      const roomsOnDate = roomsResult.data?.[date] || [];

      // Create linkages
      const linkages: ExamRoomLinkage[] = roomsOnDate.map((examRoom) => {
        const primaryGroup: GroupCriteria | null = examRoom.year_level_primary
          ? {
              yearLevel: examRoom.year_level_primary,
              semester: examRoom.sem_primary || "",
              program: examRoom.program_primary || "",
              specialization: examRoom.specialization_primary || "",
            }
          : null;

        const secondaryGroup: GroupCriteria | null =
          examRoom.year_level_secondary
            ? {
                yearLevel: examRoom.year_level_secondary,
                semester: examRoom.sem_secondary || "",
                program: examRoom.program_secondary || "",
                specialization: examRoom.specialization_secondary || "",
              }
            : null;

        // Match exams to groups
        const primaryExams = primaryGroup
          ? examsOnDate.filter((exam) => matchExamToGroup(exam, primaryGroup))
          : [];

        const secondaryExams = secondaryGroup
          ? examsOnDate.filter((exam) => matchExamToGroup(exam, secondaryGroup))
          : [];

        return {
          examRoomId: examRoom.exam_room_id || 0,
          roomNumber: examRoom.room?.room_number || "Unknown",
          roomCapacity: examRoom.room?.capacity || 0,
          examDate: date,
          primaryGroup,
          secondaryGroup,
          linkedExams: {
            primary: primaryExams,
            secondary: secondaryExams,
          },
          totalLinkedExams: primaryExams.length + secondaryExams.length,
          totalStudents:
            (examRoom.students_primary || 0) +
            (examRoom.students_secondary || 0),
        };
      });

      // Calculate totals
      const totalExams = new Set(
        linkages.flatMap((link) => [
          ...link.linkedExams.primary.map((e) => e.exam_id),
          ...link.linkedExams.secondary.map((e) => e.exam_id),
        ]),
      ).size;

      dateLinkages.push({
        examDate: date,
        dayOfWeek: dateInfo.day_of_week,
        linkages,
        totalRooms: linkages.length,
        totalExams,
      });
    }

    return { success: true, data: dateLinkages };
  } catch (error) {
    console.error("Error loading exam room linkages:", error);
    return { success: false, error };
  }
}

/**
 * Get exam room linkages for a specific date
 */
export async function getExamRoomLinkagesByDate(examDate: string): Promise<{
  success: boolean;
  data?: ExamRoomLinkage[];
  error?: any;
}> {
  try {
    // Get exams and rooms for this date
    const examsOnDate = await examQueries.getByDate(examDate);
    const roomsResult = await examRoomQueries.getRoomsByDate(examDate);

    if (!roomsResult.success) {
      return { success: false, error: roomsResult.error };
    }

    const roomsOnDate = roomsResult.data?.[examDate] || [];

    // Create linkages
    const linkages: ExamRoomLinkage[] = roomsOnDate.map((examRoom) => {
      const primaryGroup: GroupCriteria | null = examRoom.year_level_primary
        ? {
            yearLevel: examRoom.year_level_primary,
            semester: examRoom.sem_primary || "",
            program: examRoom.program_primary || "",
            specialization: examRoom.specialization_primary || "",
          }
        : null;

      const secondaryGroup: GroupCriteria | null = examRoom.year_level_secondary
        ? {
            yearLevel: examRoom.year_level_secondary,
            semester: examRoom.sem_secondary || "",
            program: examRoom.program_secondary || "",
            specialization: examRoom.specialization_secondary || "",
          }
        : null;

      // Match exams to groups
      const primaryExams = primaryGroup
        ? examsOnDate.filter((exam) => matchExamToGroup(exam, primaryGroup))
        : [];

      const secondaryExams = secondaryGroup
        ? examsOnDate.filter((exam) => matchExamToGroup(exam, secondaryGroup))
        : [];

      return {
        examRoomId: examRoom.exam_room_id || 0,
        roomNumber: examRoom.room?.room_number || "Unknown",
        roomCapacity: examRoom.room?.capacity || 0,
        examDate,
        primaryGroup,
        secondaryGroup,
        linkedExams: {
          primary: primaryExams,
          secondary: secondaryExams,
        },
        totalLinkedExams: primaryExams.length + secondaryExams.length,
        totalStudents:
          (examRoom.students_primary || 0) + (examRoom.students_secondary || 0),
      };
    });

    return { success: true, data: linkages };
  } catch (error) {
    console.error("Error loading linkages for date:", error);
    return { success: false, error };
  }
}

/**
 * Get detailed linkage for a specific exam room
 */
export async function getExamRoomLinkageById(examRoomId: number): Promise<{
  success: boolean;
  data?: ExamRoomLinkage;
  error?: any;
}> {
  try {
    // Get exam room details
    const examRoomResult = await examRoomQueries.getExamRoomById(examRoomId);

    if (!examRoomResult.success || !examRoomResult.data) {
      return { success: false, error: "Exam room not found" };
    }

    const examRoom = examRoomResult.data;

    // Get all exams to find matches
    const allExams = await examQueries.getAll();

    const primaryGroup: GroupCriteria | null = examRoom.year_level_primary
      ? {
          yearLevel: examRoom.year_level_primary,
          semester: examRoom.sem_primary || "",
          program: examRoom.program_primary || "",
          specialization: examRoom.specialization_primary || "",
        }
      : null;

    const secondaryGroup: GroupCriteria | null = examRoom.year_level_secondary
      ? {
          yearLevel: examRoom.year_level_secondary,
          semester: examRoom.sem_secondary || "",
          program: examRoom.program_secondary || "",
          specialization: examRoom.specialization_secondary || "",
        }
      : null;

    // Match exams to groups
    const primaryExams = primaryGroup
      ? allExams.filter((exam) => matchExamToGroup(exam, primaryGroup))
      : [];

    const secondaryExams = secondaryGroup
      ? allExams.filter((exam) => matchExamToGroup(exam, secondaryGroup))
      : [];

    const linkage: ExamRoomLinkage = {
      examRoomId: examRoom.exam_room_id || 0,
      roomNumber: examRoom.room?.room_number || "Unknown",
      roomCapacity: examRoom.room?.capacity || 0,
      examDate: "", // Not available without date context
      primaryGroup,
      secondaryGroup,
      linkedExams: {
        primary: primaryExams,
        secondary: secondaryExams,
      },
      totalLinkedExams: primaryExams.length + secondaryExams.length,
      totalStudents:
        (examRoom.students_primary || 0) + (examRoom.students_secondary || 0),
    };

    return { success: true, data: linkage };
  } catch (error) {
    console.error("Error loading linkage by ID:", error);
    return { success: false, error };
  }
}

/**
 * Get statistics about exam room linkages
 */
export async function getExamRoomLinkageStats(): Promise<{
  success: boolean;
  data?: {
    totalRooms: number;
    totalExams: number;
    totalDates: number;
    roomsWithoutExams: number;
    examsWithoutRooms: number;
    averageExamsPerRoom: number;
  };
  error?: any;
}> {
  try {
    const linkagesResult = await getAllExamRoomLinkages();

    if (!linkagesResult.success || !linkagesResult.data) {
      return { success: false, error: "Failed to load linkages" };
    }

    const allLinkages = linkagesResult.data;
    const totalDates = allLinkages.length;
    const totalRooms = allLinkages.reduce(
      (sum, date) => sum + date.totalRooms,
      0,
    );

    const allLinkedExamIds = new Set<number>();
    let roomsWithoutExams = 0;
    let totalExamsInRooms = 0;

    allLinkages.forEach((dateGroup) => {
      dateGroup.linkages.forEach((link) => {
        if (link.totalLinkedExams === 0) {
          roomsWithoutExams++;
        }
        totalExamsInRooms += link.totalLinkedExams;

        link.linkedExams.primary.forEach((exam) =>
          allLinkedExamIds.add(exam.exam_id),
        );
        link.linkedExams.secondary.forEach((exam) =>
          allLinkedExamIds.add(exam.exam_id),
        );
      });
    });

    const totalExams = allLinkedExamIds.size;
    const allExamsInDb = await examQueries.getAll();
    const examsWithoutRooms = allExamsInDb.length - totalExams;
    const averageExamsPerRoom =
      totalRooms > 0 ? totalExamsInRooms / totalRooms : 0;

    return {
      success: true,
      data: {
        totalRooms,
        totalExams,
        totalDates,
        roomsWithoutExams,
        examsWithoutRooms,
        averageExamsPerRoom: Math.round(averageExamsPerRoom * 100) / 100,
      },
    };
  } catch (error) {
    console.error("Error calculating linkage stats:", error);
    return { success: false, error };
  }
}

// Export as object for cleaner imports
export const examRoomLinkageService = {
  getAll: getAllExamRoomLinkages,
  getByDate: getExamRoomLinkagesByDate,
  getById: getExamRoomLinkageById,
  getStats: getExamRoomLinkageStats,
  matchExamToGroup,
};
