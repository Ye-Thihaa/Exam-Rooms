import supabase from "@/utils/supabase";
import type { Exam } from "@/services/examQueries";

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
// Core fetch — single query via join
// ────────────────────────────────────────────────

async function fetchAllLinkRows(): Promise<any[]> {
  const { data, error } = await supabase
    .from("exam_room_exam_link")
    .select(`
      link_id,
      group_type,
      exam:exam_id (
        exam_id,
        subject_code,
        exam_name,
        program,
        specialization,
        year_level,
        semester,
        exam_date,
        day_of_week,
        start_time,
        end_time,
        department_id
      ),
      exam_room:exam_room_id (
        exam_room_id,
        students_primary,
        students_secondary,
        year_level_primary,
        sem_primary,
        program_primary,
        specialization_primary,
        year_level_secondary,
        sem_secondary,
        program_secondary,
        specialization_secondary,
        room:room_id (
          room_number,
          capacity,
          rows,
          cols
        )
      )
    `)
    .order("link_id", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

// ────────────────────────────────────────────────
// Build ExamRoomLinkage map from raw rows
// ────────────────────────────────────────────────

function buildLinkageMap(rows: any[]) {
  const map = new Map<string, ExamRoomLinkage>();

  for (const row of rows) {
    const exam = row.exam as Exam | null;
    const er = row.exam_room as any | null;
    if (!exam || !er) continue;

    const examRoomId: number = er.exam_room_id;
    const examDate: string = exam.exam_date;
    const key = `${examRoomId}-${examDate}`;

    if (!map.has(key)) {
      const primaryGroup: GroupCriteria | null = er.year_level_primary
        ? {
            yearLevel: er.year_level_primary,
            semester: er.sem_primary ?? "",
            program: er.program_primary ?? "",
            specialization: er.specialization_primary ?? "",
          }
        : null;

      const secondaryGroup: GroupCriteria | null = er.year_level_secondary
        ? {
            yearLevel: er.year_level_secondary,
            semester: er.sem_secondary ?? "",
            program: er.program_secondary ?? "",
            specialization: er.specialization_secondary ?? "",
          }
        : null;

      map.set(key, {
        examRoomId,
        roomNumber: er.room?.room_number ?? "Unknown",
        roomCapacity: er.room?.capacity ?? 0,
        examDate,
        primaryGroup,
        secondaryGroup,
        linkedExams: { primary: [], secondary: [] },
        totalLinkedExams: 0,
        totalStudents:
          (er.students_primary ?? 0) + (er.students_secondary ?? 0),
      });
    }

    const linkage = map.get(key)!;

    if (row.group_type === "primary") {
      linkage.linkedExams.primary.push(exam);
    } else {
      linkage.linkedExams.secondary.push(exam);
    }
    linkage.totalLinkedExams =
      linkage.linkedExams.primary.length + linkage.linkedExams.secondary.length;
  }

  return map;
}

// ────────────────────────────────────────────────
// Service functions
// ────────────────────────────────────────────────

async function getAllExamRoomLinkages(): Promise<{
  success: boolean;
  data?: DateGroupedLinkage[];
  error?: any;
}> {
  try {
    const rows = await fetchAllLinkRows();
    const linkageMap = buildLinkageMap(rows);

   const dateMap = new Map<string, { dayOfWeek: string; linkages: ExamRoomLinkage[] }>();

    for (const linkage of linkageMap.values()) {
      // derive dayOfWeek from first exam in this linkage
      const firstExam =
        linkage.linkedExams.primary[0] ?? linkage.linkedExams.secondary[0];
      const dayOfWeek = (firstExam as any)?.day_of_week ?? "";

      if (!dateMap.has(linkage.examDate)) {
        dateMap.set(linkage.examDate, { dayOfWeek, linkages: [] });
      }
      dateMap.get(linkage.examDate)!.linkages.push(linkage);
    }

    const data: DateGroupedLinkage[] = Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([examDate, { dayOfWeek, linkages }]) => {
        const uniqueExamIds = new Set(
          linkages.flatMap((l) => [
            ...l.linkedExams.primary.map((e) => e.exam_id),
            ...l.linkedExams.secondary.map((e) => e.exam_id),
          ]),
        );
        return {
          examDate,
          dayOfWeek,
          linkages: linkages.sort((a, b) =>
            a.roomNumber.localeCompare(b.roomNumber),
          ),
          totalRooms: linkages.length,
          totalExams: uniqueExamIds.size,
        };
      });

    return { success: true, data };
  } catch (error) {
    console.error("Error loading exam room linkages:", error);
    return { success: false, error };
  }
}

async function getExamRoomLinkagesByDate(examDate: string): Promise<{
  success: boolean;
  data?: ExamRoomLinkage[];
  error?: any;
}> {
  try {
    const { data, error } = await supabase
      .from("exam_room_exam_link")
      .select(`
        link_id,
        group_type,
        exam:exam_id (
          exam_id,
          subject_code,
          exam_name,
          program,
          specialization,
          year_level,
          semester,
          exam_date,
          day_of_week,
          start_time,
          end_time,
          department_id
        ),
        exam_room:exam_room_id (
          exam_room_id,
          students_primary,
          students_secondary,
          year_level_primary,
          sem_primary,
          program_primary,
          specialization_primary,
          year_level_secondary,
          sem_secondary,
          program_secondary,
          specialization_secondary,
          room:room_id (
            room_number,
            capacity,
            rows,
            cols
          )
        )
      `)
      .eq("exam.exam_date", examDate);

    if (error) throw error;

    const linkageMap = buildLinkageMap(data ?? []);
    const linkages = Array.from(linkageMap.values()).filter(
      (l) => l.examDate === examDate,
    );

    return { success: true, data: linkages };
  } catch (error) {
    console.error("Error loading linkages for date:", error);
    return { success: false, error };
  }
}

async function getExamRoomLinkageById(examRoomId: number): Promise<{
  success: boolean;
  data?: ExamRoomLinkage;
  error?: any;
}> {
  try {
    const { data, error } = await supabase
      .from("exam_room_exam_link")
      .select(`
        link_id,
        group_type,
        exam:exam_id (
          exam_id,
          subject_code,
          exam_name,
          program,
          specialization,
          year_level,
          semester,
          exam_date,
          day_of_week,
          start_time,
          end_time,
          department_id
        ),
        exam_room:exam_room_id (
          exam_room_id,
          students_primary,
          students_secondary,
          year_level_primary,
          sem_primary,
          program_primary,
          specialization_primary,
          year_level_secondary,
          sem_secondary,
          program_secondary,
          specialization_secondary,
          room:room_id (
            room_number,
            capacity,
            rows,
            cols
          )
        )
      `)
      .eq("exam_room_id", examRoomId);

    if (error) throw error;

    const linkageMap = buildLinkageMap(data ?? []);

    // An exam_room can span multiple dates — return the first one found,
    // or merge all dates into a single linkage (primary/secondary combined)
    const all = Array.from(linkageMap.values());
    if (all.length === 0) {
      return { success: false, error: "Exam room not found in link table" };
    }

    // Merge across dates into a single linkage for theById use-case
    const merged: ExamRoomLinkage = {
      ...all[0],
      linkedExams: {
        primary: all.flatMap((l) => l.linkedExams.primary),
        secondary: all.flatMap((l) => l.linkedExams.secondary),
      },
      totalLinkedExams: all.reduce((s, l) => s + l.totalLinkedExams, 0),
    };

    return { success: true, data: merged };
  } catch (error) {
    console.error("Error loading linkage by ID:", error);
    return { success: false, error };
  }
}

async function getExamRoomLinkageStats(): Promise<{
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
    // Single query for stats — count distinct exam_room_ids and exam_ids
    const { data: linkRows, error: linkErr } = await supabase
      .from("exam_room_exam_link")
      .select("exam_room_id, exam_id");

    if (linkErr) throw linkErr;

    const { data: allExams, error: examErr } = await supabase
      .from("exam")
      .select("exam_id");

    if (examErr) throw examErr;

    const linkedRoomIds = new Set((linkRows ?? []).map((r: any) => r.exam_room_id));
    const linkedExamIds = new Set((linkRows ?? []).map((r: any) => r.exam_id));

    const { data: allRooms, error: roomErr } = await supabase
      .from("exam_room")
      .select("exam_room_id");

    if (roomErr) throw roomErr;

    const totalRooms = (allRooms ?? []).length;
    const totalExams = linkedExamIds.size;
    const roomsWithoutExams = (allRooms ?? []).filter(
      (r: any) => !linkedRoomIds.has(r.exam_room_id),
    ).length;
    const examsWithoutRooms = (allExams ?? []).filter(
      (e: any) => !linkedExamIds.has(e.exam_id),
    ).length;

    // Get date count from linked exams
    const linkagesResult = await getAllExamRoomLinkages();
    const totalDates = linkagesResult.data?.length ?? 0;

    const averageExamsPerRoom =
      totalRooms > 0
        ? Math.round(((linkRows ?? []).length / totalRooms) * 100) / 100
        : 0;

    return {
      success: true,
      data: {
        totalRooms,
        totalExams,
        totalDates,
        roomsWithoutExams,
        examsWithoutRooms,
        averageExamsPerRoom,
      },
    };
  } catch (error) {
    console.error("Error calculating linkage stats:", error);
    return { success: false, error };
  }
}

// ────────────────────────────────────────────────
// Export
// ────────────────────────────────────────────────

export const examRoomLinkageService = {
  getAll: getAllExamRoomLinkages,
  getByDate: getExamRoomLinkagesByDate,
  getById: getExamRoomLinkageById,
  getStats: getExamRoomLinkageStats,
};