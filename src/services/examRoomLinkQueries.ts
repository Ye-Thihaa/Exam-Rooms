import supabase from "@/utils/supabase";
import type { Exam } from "@/services/examQueries";
import type { ExamRoomWithDetails } from "@/services/examroomQueries";
import type { ExamSession } from "@/services/teacherAssignmentTypes";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ExamRoomLink {
  link_id: number;
  exam_room_id: number;
  exam_id: number;
  group_type: "primary" | "secondary";
  created_at: string;
}

export interface HydratedLink {
  link_id: number;
  group_type: "primary" | "secondary";
  exam: Exam;
  examRoom: ExamRoomWithDetails;
}

/**
 * One room card for ONE specific exam date.
 * A physical room can appear multiple times across different dates.
 */
export interface RoomCardData {
  /** Composite key: examRoomId + examDate */
  key: string;
  examRoomId: number;
  roomNumber: string;
  roomCapacity: number;
  examDate: string;
  dayOfWeek: string;
  /** "Morning" (start < 12:00) | "Afternoon" (start >= 12:00) */
  examSession: ExamSession;
  examTime: { start: string; end: string } | undefined;
  /** All primary-group exams for this room on this specific date */
  primaryExams: Exam[];
  /** All secondary-group exams for this room on this specific date */
  secondaryExams: Exam[];
  totalStudents: number;
  primaryGroupLabel: string | null;
  secondaryGroupLabel: string | null;
}

export interface DateGroup {
  examDate: string;
  dayOfWeek: string;
  rooms: RoomCardData[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildGroupLabel(exam: Exam): string {
  const spec = exam.specialization ? ` (${exam.specialization})` : "";
  return `Year ${exam.year_level} - Semester ${exam.semester} · ${exam.program}${spec}`;
}

function fmtTime(t: string | undefined | null): string {
  if (!t) return "";
  return t.slice(0, 5);
}

/**
 * Derive ExamSession from start_time (HH:MM or HH:MM:SS).
 *   Morning   → hour < 12
 *   Afternoon → hour >= 12
 * Defaults to "Morning" when missing/unparseable.
 */
export function deriveSession(
  startTime: string | undefined | null,
): ExamSession {
  if (!startTime) return "Morning";
  const hour = parseInt(startTime.split(":")[0], 10);
  if (isNaN(hour)) return "Morning";
  return hour < 12 ? "Morning" : "Afternoon";
}

// ─────────────────────────────────────────────────────────────────────────────
// examRoomLinkQueries
// ─────────────────────────────────────────────────────────────────────────────

export const examRoomLinkQueries = {
  // ── 1. Raw rows ──────────────────────────────────────────────────────────────

  async getAll(): Promise<ExamRoomLink[]> {
    const { data, error } = await supabase
      .from("exam_room_exam_link")
      .select("*")
      .order("link_id", { ascending: true });
    if (error) throw error;
    return data as ExamRoomLink[];
  },

  async getByExamRoomId(examRoomId: number): Promise<ExamRoomLink[]> {
    const { data, error } = await supabase
      .from("exam_room_exam_link")
      .select("*")
      .eq("exam_room_id", examRoomId)
      .order("group_type", { ascending: true });
    if (error) throw error;
    return data as ExamRoomLink[];
  },

  async getByExamId(examId: number): Promise<ExamRoomLink[]> {
    const { data, error } = await supabase
      .from("exam_room_exam_link")
      .select("*")
      .eq("exam_id", examId);
    if (error) throw error;
    return data as ExamRoomLink[];
  },

  // ── 2. Hydrated rows ─────────────────────────────────────────────────────────

  async getHydratedByExamRoomId(examRoomId: number): Promise<HydratedLink[]> {
    const links = await examRoomLinkQueries.getByExamRoomId(examRoomId);
    if (links.length === 0) return [];

    const { data: examRoomData, error: erErr } = await supabase
      .from("exam_room")
      .select("*, room:room_id (room_id, room_number, capacity, rows, cols)")
      .eq("exam_room_id", examRoomId)
      .single();
    if (erErr) throw erErr;

    const { data: exams, error: examErr } = await supabase
      .from("exam")
      .select("*")
      .in(
        "exam_id",
        links.map((l) => l.exam_id),
      );
    if (examErr) throw examErr;

    const examMap = new Map<number, Exam>(
      (exams as Exam[]).map((e) => [e.exam_id, e]),
    );

    return links
      .map((link): HydratedLink | null => {
        const exam = examMap.get(link.exam_id);
        if (!exam) return null;
        return {
          link_id: link.link_id,
          group_type: link.group_type,
          exam,
          examRoom: examRoomData as ExamRoomWithDetails,
        };
      })
      .filter(Boolean) as HydratedLink[];
  },

  async getHydratedByExamId(examId: number): Promise<HydratedLink[]> {
    const links = await examRoomLinkQueries.getByExamId(examId);
    if (links.length === 0) return [];

    const { data: examData, error: examErr } = await supabase
      .from("exam")
      .select("*")
      .eq("exam_id", examId)
      .single();
    if (examErr) throw examErr;

    const { data: examRooms, error: erErr } = await supabase
      .from("exam_room")
      .select("*, room:room_id (room_id, room_number, capacity, rows, cols)")
      .in(
        "exam_room_id",
        links.map((l) => l.exam_room_id),
      );
    if (erErr) throw erErr;

    const roomMap = new Map<number, ExamRoomWithDetails>(
      (examRooms as ExamRoomWithDetails[]).map((r) => [r.exam_room_id!, r]),
    );

    return links
      .map((link): HydratedLink | null => {
        const examRoom = roomMap.get(link.exam_room_id);
        if (!examRoom) return null;
        return {
          link_id: link.link_id,
          group_type: link.group_type,
          exam: examData as Exam,
          examRoom,
        };
      })
      .filter(Boolean) as HydratedLink[];
  },

  // ── 3. Main date-grouped loader ──────────────────────────────────────────────
  //
  // Correct algorithm:
  //
  //  Step A  Get all exam_room rows (with room join) so we have the group
  //          descriptors (year_level_primary, sem_primary, program_primary,
  //          specialization_primary … and secondary equivalents).
  //
  //  Step B  For each exam_room, query the exam table using those descriptors
  //          to find ALL matching exams (= the full 6-day schedule for that group).
  //          Do this separately for primary and secondary groups.
  //
  //  Step C  Group the resulting exams by exam_date.  Each (exam_room × date)
  //          pair becomes one RoomCardData entry.
  //
  // This means a room with 6 exam dates appears 6 times in the output, once
  // per date — which is exactly what the UI needs.
  //
  // We use the link table only to know WHICH exam_rooms are active; the actual
  // exam schedules come from a targeted query against the exam table using the
  // group columns stored on exam_room.

  async getAllDateGroups(): Promise<DateGroup[]> {
    // ── A. Fetch all exam_rooms with their group info and room details ─────────
    const { data: examRooms, error: erErr } = await supabase
      .from("exam_room")
      .select(
        `
        exam_room_id,
        room_id,
        assigned_capacity,
        year_level_primary,
        sem_primary,
        program_primary,
        specialization_primary,
        students_primary,
        year_level_secondary,
        sem_secondary,
        program_secondary,
        specialization_secondary,
        students_secondary,
        room:room_id (
          room_id,
          room_number,
          capacity
        )
      `,
      )
      .order("exam_room_id", { ascending: true });

    if (erErr) throw erErr;
    if (!examRooms || examRooms.length === 0) return [];

    // ── B. For each exam_room find all exams for primary AND secondary group ───
    //
    // We batch all the exam lookups to avoid N individual queries.
    // Collect unique (year_level, semester, program, specialization) tuples and
    // fetch all matching exams in one query; then filter in memory.

    // Gather unique group keys → fetch all matching exams in ONE query
    // We'll fetch ALL exams once and filter in memory — simpler and fast enough
    // for typical exam counts (< 200 rows).

    const { data: allExams, error: examErr } = await supabase
      .from("exam")
      .select("*")
      .order("exam_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (examErr) throw examErr;
    const exams = (allExams ?? []) as Exam[];

    // ── Helper: find exams matching a group descriptor ────────────────────────
    function matchExams(
      yearLevel: string | null | undefined,
      semester: string | null | undefined,
      program: string | null | undefined,
      specialization: string | null | undefined,
    ): Exam[] {
      if (!yearLevel || !semester || !program) return [];

      return exams.filter((e) => {
        const examYear = String(parseInt(e.year_level, 10) || e.year_level);
        const examSem = String(parseInt(e.semester, 10) || e.semester);
        const roomYear = String(parseInt(yearLevel, 10) || yearLevel);
        const roomSem = String(parseInt(semester, 10) || semester);

        const yearMatch = examYear === roomYear;
        const semMatch = examSem === roomSem;
        const programMatch = e.program === program;

        // Normalise empty / null specialization to ""
        const eSpec = (e.specialization ?? "").trim();
        const rSpec = (specialization ?? "").trim();
        const specMatch = eSpec === rSpec;

        return yearMatch && semMatch && programMatch && specMatch;
      });
    }

    // ── C. Build (examRoom × date) → RoomCardData entries ────────────────────

    // dateMap: examDate → { dayOfWeek, rooms[] }
    const dateMap = new Map<
      string,
      { dayOfWeek: string; rooms: RoomCardData[] }
    >();

    for (const er of examRooms as any[]) {
      const examRoomId: number = er.exam_room_id;
      const roomNumber: string = er.room?.room_number ?? "Unknown";
      const roomCapacity: number = er.room?.capacity ?? 0;
      const totalStudents: number =
        (er.students_primary ?? 0) + (er.students_secondary ?? 0);

      // Find all exams for primary group
      const primaryExams = matchExams(
        er.year_level_primary,
        er.sem_primary,
        er.program_primary,
        er.specialization_primary,
      );

      // Find all exams for secondary group
      const secondaryExams = matchExams(
        er.year_level_secondary,
        er.sem_secondary,
        er.program_secondary,
        er.specialization_secondary,
      );

      // Collect all unique exam dates this room is active on
      const allDates = new Set<string>([
        ...primaryExams.map((e) => e.exam_date),
        ...secondaryExams.map((e) => e.exam_date),
      ]);

      if (allDates.size === 0) continue;

      // Build one RoomCardData per date
      for (const examDate of allDates) {
        const primaryOnDate = primaryExams.filter(
          (e) => e.exam_date === examDate,
        );
        const secondaryOnDate = secondaryExams.filter(
          (e) => e.exam_date === examDate,
        );

        // Use the first exam on this date for time/session info
        const representativeExam = primaryOnDate[0] ?? secondaryOnDate[0];

        const examSession = deriveSession(representativeExam.start_time);
        const examTime =
          representativeExam.start_time && representativeExam.end_time
            ? {
                start: fmtTime(representativeExam.start_time),
                end: fmtTime(representativeExam.end_time),
              }
            : undefined;

        const dayOfWeek = representativeExam.day_of_week;

        const card: RoomCardData = {
          key: `${examRoomId}-${examDate}`,
          examRoomId,
          roomNumber,
          roomCapacity,
          examDate,
          dayOfWeek,
          examSession,
          examTime,
          primaryExams: primaryOnDate,
          secondaryExams: secondaryOnDate,
          totalStudents,
          primaryGroupLabel:
            primaryOnDate.length > 0 ? buildGroupLabel(primaryOnDate[0]) : null,
          secondaryGroupLabel:
            secondaryOnDate.length > 0
              ? buildGroupLabel(secondaryOnDate[0])
              : null,
        };

        if (!dateMap.has(examDate)) {
          dateMap.set(examDate, { dayOfWeek, rooms: [] });
        }
        dateMap.get(examDate)!.rooms.push(card);
      }
    }

    // ── D. Sort rooms within each date by room number, then sort dates ─────────
    const result: DateGroup[] = Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([examDate, { dayOfWeek, rooms }]) => ({
        examDate,
        dayOfWeek,
        rooms: rooms.sort((a, b) => a.roomNumber.localeCompare(b.roomNumber)),
      }));

    return result;
  },

  async getDateGroupByDate(targetDate: string): Promise<DateGroup | null> {
    const all = await examRoomLinkQueries.getAllDateGroups();
    return all.find((g) => g.examDate === targetDate) ?? null;
  },

  // ── 4. Mutations ─────────────────────────────────────────────────────────────

  async create(
    payload: Omit<ExamRoomLink, "link_id" | "created_at">,
  ): Promise<ExamRoomLink> {
    const { data, error } = await supabase
      .from("exam_room_exam_link")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as ExamRoomLink;
  },

  async deleteById(linkId: number): Promise<void> {
    const { error } = await supabase
      .from("exam_room_exam_link")
      .delete()
      .eq("link_id", linkId);
    if (error) throw error;
  },

  async deleteByExamRoomId(examRoomId: number): Promise<void> {
    const { error } = await supabase
      .from("exam_room_exam_link")
      .delete()
      .eq("exam_room_id", examRoomId);
    if (error) throw error;
  },

  async deleteByExamId(examId: number): Promise<void> {
    const { error } = await supabase
      .from("exam_room_exam_link")
      .delete()
      .eq("exam_id", examId);
    if (error) throw error;
  },
};
