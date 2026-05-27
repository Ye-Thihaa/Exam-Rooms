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
  // ── 1. Fetch all links with their exam and exam_room data in one query ──
  const { data: links, error: linkErr } = await supabase
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
          room_id,
          room_number,
          capacity
        )
      )
    `);

  if (linkErr) throw linkErr;
  if (!links || links.length === 0) return [];

  // ── 2. Group by (exam_room_id × exam_date) ──────────────────────────────
  const cardMap = new Map<string, RoomCardData>();

  for (const link of links as any[]) {
    const exam = link.exam;
    const er = link.exam_room;
    if (!exam || !er) continue;

    const examRoomId: number = er.exam_room_id;
    const examDate: string = exam.exam_date;
    const cardKey = `${examRoomId}-${examDate}`;

    if (!cardMap.has(cardKey)) {
      const examSession = deriveSession(exam.start_time);
      const examTime =
        exam.start_time && exam.end_time
          ? { start: fmtTime(exam.start_time), end: fmtTime(exam.end_time) }
          : undefined;

      cardMap.set(cardKey, {
        key: cardKey,
        examRoomId,
        roomNumber: er.room?.room_number ?? "Unknown",
        roomCapacity: er.room?.capacity ?? 0,
        examDate,
        dayOfWeek: exam.day_of_week ?? "",
        examSession,
        examTime,
        primaryExams: [],
        secondaryExams: [],
        totalStudents: (er.students_primary ?? 0) + (er.students_secondary ?? 0),
        primaryGroupLabel: null,
        secondaryGroupLabel: null,
      });
    }

    const card = cardMap.get(cardKey)!;

    if (link.group_type === "primary") {
      card.primaryExams.push(exam as Exam);
      if (!card.primaryGroupLabel) {
        card.primaryGroupLabel = buildGroupLabel(exam as Exam);
      }
      // Keep examTime in sync with the earliest primary exam
      if (exam.start_time && exam.end_time) {
        card.examTime = {
          start: fmtTime(exam.start_time),
          end: fmtTime(exam.end_time),
        };
        card.examSession = deriveSession(exam.start_time);
      }
    } else {
      card.secondaryExams.push(exam as Exam);
      if (!card.secondaryGroupLabel) {
        card.secondaryGroupLabel = buildGroupLabel(exam as Exam);
      }
    }
  }

  // ── 3. Sort rooms within each date, then sort dates ─────────────────────
  const dateMap = new Map<string, { dayOfWeek: string; rooms: RoomCardData[] }>();

  for (const card of cardMap.values()) {
    if (!dateMap.has(card.examDate)) {
      dateMap.set(card.examDate, { dayOfWeek: card.dayOfWeek, rooms: [] });
    }
    dateMap.get(card.examDate)!.rooms.push(card);
  }

  return Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([examDate, { dayOfWeek, rooms }]) => ({
      examDate,
      dayOfWeek,
      rooms: rooms.sort((a, b) => a.roomNumber.localeCompare(b.roomNumber)),
    }));
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
