import supabase from "@/utils/supabase";
import {
  TeacherAssignment,
  TeacherRole,
  ExamSession,
  TeacherWithCapability,
  TeacherWithAvailability,
  ExamRoomAssignmentStatus,
  enrichTeacherWithCapability,
  getWorkloadLevel,
  SUPERVISOR_RANKS,
  ASSISTANT_RANKS,
} from "./teacherAssignmentTypes";

// ─────────────────────────────────────────────────────────────────────────────
// Bulk-assign pre-fetched context
//
// KEY INSIGHT from schema:
//   - exam_room is NOT per-date. One exam_room_id is reused across many dates.
//   - exam_room_exam_link joins exam_room_id + exam_id, and exam has exam_date.
//   - teacher_assignment.link_id → exam_room_exam_link.link_id
//   - So the correct unique scope for one teacher slot is (link_id, role):
//       link_id already encodes which room + which exam (and therefore which date).
//   - teacher_assignment has NO unique constraint other than its PK, so we
//     cannot use upsert. We delete by (link_id, role) then insert fresh.
// ─────────────────────────────────────────────────────────────────────────────

export interface BulkAssignContext {
  roomIdByNumber: Map<string, number>;
  roomIdByExamRoomId: Map<number, number>;

  // date → Set<exam_room_id> active on that date
  examRoomIdsByDate: Map<string, Set<number>>;

  // "roomNumber|date" → { examRoomId, linkId }
  // One representative primary link per room+date — enough to scope a teacher slot.
  resolvedByRoomDate: Map<string, { examRoomId: number; linkId: number }>;

  supervisors: TeacherWithAvailability[];
  assistants: TeacherWithAvailability[];
  busyByDate: Map<string, Set<number>>;
}

export const teacherAssignmentQueries = {
  // ── Single-room: get correct exam_room_id (used by AutoAssignModal) ────────
  async getCorrectExamRoomId(
    roomNumber: string,
    examDate: string,
    session: ExamSession,
  ): Promise<number | null> {
    const { data: roomData } = await supabase
      .from("room")
      .select("room_id")
      .eq("room_number", roomNumber)
      .limit(1)
      .single();
    if (!roomData) return null;

    const { data: examData } = await supabase
      .from("exam")
      .select("exam_id")
      .eq("exam_date", examDate);
    if (!examData || examData.length === 0) return null;

    const examIds = examData.map((e: any) => e.exam_id as number);

    const { data: linkData } = await supabase
      .from("exam_room_exam_link")
      .select("exam_room_id")
      .in("exam_id", examIds);
    if (!linkData || linkData.length === 0) return null;

    const linkedIds = [
      ...new Set(linkData.map((l: any) => l.exam_room_id as number)),
    ];

    const { data: erData } = await supabase
      .from("exam_room")
      .select("exam_room_id")
      .eq("room_id", roomData.room_id)
      .in("exam_room_id", linkedIds)
      .limit(1)
      .single();
    return erData ? erData.exam_room_id : null;
  },

  // ── Single-room: get link_id for a room+date (used by AutoAssignModal) ─────
  async getLinkIdForRoomDate(
    roomNumber: string,
    examDate: string,
  ): Promise<number | null> {
    const { data: roomData } = await supabase
      .from("room")
      .select("room_id")
      .eq("room_number", roomNumber)
      .limit(1)
      .single();
    if (!roomData) return null;

    const { data: examRoomData } = await supabase
      .from("exam_room")
      .select("exam_room_id")
      .eq("room_id", roomData.room_id);
    if (!examRoomData || examRoomData.length === 0) return null;

    const examRoomIds = examRoomData.map(
      (er: any) => er.exam_room_id as number,
    );

    const { data: examData } = await supabase
      .from("exam")
      .select("exam_id")
      .eq("exam_date", examDate);
    if (!examData || examData.length === 0) return null;

    const examIds = examData.map((e: any) => e.exam_id as number);

    const { data: linkData } = await supabase
      .from("exam_room_exam_link")
      .select("link_id")
      .in("exam_room_id", examRoomIds)
      .in("exam_id", examIds)
      .eq("group_type", "primary")
      .limit(1)
      .single();

    return linkData ? (linkData.link_id as number) : null;
  },

  // ── Pre-fetch everything needed for bulk assign (called ONCE) ─────────────
  async prefetchBulkContext(dates: string[]): Promise<BulkAssignContext> {
    const empty: BulkAssignContext = {
      roomIdByNumber: new Map(),
      roomIdByExamRoomId: new Map(),
      examRoomIdsByDate: new Map(),
      resolvedByRoomDate: new Map(),
      supervisors: [],
      assistants: [],
      busyByDate: new Map(),
    };
    if (dates.length === 0) return empty;

    // 1. All physical rooms
    const { data: rooms, error: roomsErr } = await supabase
      .from("room")
      .select("room_id, room_number");
    if (roomsErr) throw roomsErr;

    const roomIdByNumber = new Map<string, number>(
      (rooms || []).map((r: any) => [
        r.room_number as string,
        r.room_id as number,
      ]),
    );
    const roomNumberById = new Map<number, string>(
      (rooms || []).map((r: any) => [
        r.room_id as number,
        r.room_number as string,
      ]),
    );

    // 2. All exam_room records
    const { data: examRooms, error: examRoomsErr } = await supabase
      .from("exam_room")
      .select("exam_room_id, room_id");
    if (examRoomsErr) throw examRoomsErr;

    const roomIdByExamRoomId = new Map<number, number>();
    (examRooms || []).forEach((er: any) =>
      roomIdByExamRoomId.set(er.exam_room_id as number, er.room_id as number),
    );

    // 3. All exams on the requested dates
    const { data: exams, error: examsErr } = await supabase
      .from("exam")
      .select("exam_id, exam_date")
      .in("exam_date", dates);
    if (examsErr) throw examsErr;

    const allExamIds = (exams || []).map((e: any) => e.exam_id as number);
    const examIdToDate = new Map<number, string>(
      (exams || []).map((e: any) => [
        e.exam_id as number,
        e.exam_date as string,
      ]),
    );

    const examRoomIdsByDate = new Map<string, Set<number>>();
    const resolvedByRoomDate = new Map<
      string,
      { examRoomId: number; linkId: number }
    >();

    // 4. All links for those exams — gives us link_id, exam_room_id, exam_id, group_type
    if (allExamIds.length > 0) {
      const { data: links, error: linksErr } = await supabase
        .from("exam_room_exam_link")
        .select("link_id, exam_id, exam_room_id, group_type")
        .in("exam_id", allExamIds);
      if (linksErr) throw linksErr;

      (links || []).forEach((l: any) => {
        const date = examIdToDate.get(l.exam_id as number);
        if (!date) return;

        // Build examRoomIdsByDate
        if (!examRoomIdsByDate.has(date))
          examRoomIdsByDate.set(date, new Set());
        examRoomIdsByDate.get(date)!.add(l.exam_room_id as number);

        // Build resolvedByRoomDate — keyed by "roomNumber|date"
        const roomId = roomIdByExamRoomId.get(l.exam_room_id as number);
        if (roomId === undefined) return;
        const roomNumber = roomNumberById.get(roomId);
        if (!roomNumber) return;

        const key = `${roomNumber}|${date}`;
        const existing = resolvedByRoomDate.get(key);

        if (!existing) {
          // Store whatever we find first
          resolvedByRoomDate.set(key, {
            examRoomId: l.exam_room_id as number,
            linkId: l.link_id as number,
          });
        } else if (l.group_type === "primary" && existing) {
          // Prefer primary links over secondary
          resolvedByRoomDate.set(key, {
            examRoomId: l.exam_room_id as number,
            linkId: l.link_id as number,
          });
        }
      });
    }

    // 5. All teachers
    const { data: allTeachers, error: teachersErr } = await supabase
      .from("teacher")
      .select("*")
      .order("name");
    if (teachersErr) throw teachersErr;

    const allEnriched: TeacherWithCapability[] = (allTeachers || []).map(
      enrichTeacherWithCapability,
    );

    const baseAvailability = (
      t: TeacherWithCapability,
    ): TeacherWithAvailability => ({
      ...t,
      availability: {
        teacher_id: t.teacher_id,
        is_available: true,
        conflict_reason: null,
      },
      workload_level: getWorkloadLevel(t.total_periods_assigned),
    });

    const supervisors = allEnriched
      .filter((t) => new Set(SUPERVISOR_RANKS).has(t.rank))
      .map(baseAvailability);
    const assistants = allEnriched
      .filter((t) => new Set(ASSISTANT_RANKS).has(t.rank))
      .map(baseAvailability);

    // 6. Existing assignments on those dates → seed busyByDate
    const { data: existing, error: existingErr } = await supabase
      .from("teacher_assignment")
      .select("teacher_id, exam_date")
      .in("exam_date", dates);
    if (existingErr) throw existingErr;

    const busyByDate = new Map<string, Set<number>>();
    (existing || []).forEach((a: any) => {
      if (!busyByDate.has(a.exam_date)) busyByDate.set(a.exam_date, new Set());
      busyByDate.get(a.exam_date)!.add(a.teacher_id as number);
    });

    return {
      roomIdByNumber,
      roomIdByExamRoomId,
      examRoomIdsByDate,
      resolvedByRoomDate,
      supervisors,
      assistants,
      busyByDate,
    };
  },

  // ── Resolve { examRoomId, linkId } from context (no DB call) ─────────────
  resolveRoomLink(
    roomNumber: string,
    examDate: string,
    ctx: BulkAssignContext,
  ): { examRoomId: number; linkId: number } | null {
    return ctx.resolvedByRoomDate.get(`${roomNumber}|${examDate}`) ?? null;
  },

  // ── Backward-compat shim ───────────────────────────────────────────────────
  resolveExamRoomId(
    roomNumber: string,
    examDate: string,
    ctx: BulkAssignContext,
  ): number | null {
    return this.resolveRoomLink(roomNumber, examDate, ctx)?.examRoomId ?? null;
  },

  // ── Get teachers with availability from context (no DB call) ──────────────
  getTeachersFromContext(
    role: "Supervisor" | "Assistant",
    examDate: string,
    ctx: BulkAssignContext,
    sessionUsedIds: Set<number>,
  ): TeacherWithAvailability[] {
    const pool = role === "Supervisor" ? ctx.supervisors : ctx.assistants;
    const busyIds = ctx.busyByDate.get(examDate) ?? new Set<number>();
    return pool.map((t) => ({
      ...t,
      availability: {
        teacher_id: t.teacher_id,
        is_available:
          !busyIds.has(t.teacher_id) && !sessionUsedIds.has(t.teacher_id),
        conflict_reason:
          busyIds.has(t.teacher_id) || sessionUsedIds.has(t.teacher_id)
            ? "Already Assigned"
            : null,
      },
    }));
  },

  // ── Batch commit ──────────────────────────────────────────────────────────
  //
  // Requires the constraint to be:
  //   UNIQUE (exam_room_id, role, exam_date)
  //
  // If you are seeing 409 errors, run this in Supabase SQL editor first:
  //   ALTER TABLE teacher_assignment
  //     DROP CONSTRAINT teacher_assignment_unique_role_per_room;
  //   ALTER TABLE teacher_assignment
  //     ADD CONSTRAINT teacher_assignment_unique_role_per_room
  //     UNIQUE (exam_room_id, role, exam_date);
  //
  // Strategy:
  //   Pass 1 — delete all existing (exam_room_id, role, exam_date) slots
  //            for every assignment in the batch (deduped, covers null link_id too)
  //   Pass 2 — insert all new rows with link_id populated
  //
  async batchCommitAssignments(
    assignments: Array<{
      examRoomId: number;
      linkId: number;
      teacherId: number;
      role: TeacherRole;
      examDate: string;
      session: ExamSession;
      shiftStart?: string;
      shiftEnd?: string;
    }>,
  ): Promise<void> {
    if (assignments.length === 0) return;

    // ── PASS 1: Delete all slots (deduped by examRoomId + role + examDate) ───
    const deleteKeys = new Set<string>();
    for (const a of assignments) {
      deleteKeys.add(`${a.examRoomId}|${a.role}|${a.examDate}`);
    }

    for (const key of deleteKeys) {
      const [examRoomId, role, examDate] = key.split("|");
      const { error } = await supabase
        .from("teacher_assignment")
        .delete()
        .eq("exam_room_id", Number(examRoomId))
        .eq("role", role)
        .eq("exam_date", examDate);
      if (error) throw error;
    }

    // ── PASS 2: Insert all new rows ──────────────────────────────────────────
    for (const a of assignments) {
      const { error } = await supabase.from("teacher_assignment").insert({
        exam_room_id: a.examRoomId,
        link_id: a.linkId,
        teacher_id: a.teacherId,
        role: a.role,
        exam_date: a.examDate,
        session: a.session,
        shift_start: a.shiftStart ?? null,
        shift_end: a.shiftEnd ?? null,
        assigned_at: new Date().toISOString(),
      });
      if (error) throw error;
    }
  },

  // ── getAll ────────────────────────────────────────────────────────────────
  async getAll(): Promise<TeacherAssignment[]> {
    const { data, error } = await supabase
      .from("teacher_assignment")
      .select("*")
      .order("assigned_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getByExamRoom(examRoomId: number): Promise<TeacherAssignment[]> {
    const { data, error } = await supabase
      .from("teacher_assignment")
      .select("*")
      .eq("exam_room_id", examRoomId);
    if (error) throw error;
    return data || [];
  },

  async getExamRoomStatus(
    examRoomId: number,
    examDate?: string,
    session?: ExamSession,
  ): Promise<ExamRoomAssignmentStatus> {
    const assignments = await this.getByExamRoom(examRoomId);
    const relevant = assignments.filter((a) =>
      !examDate ? true : a.exam_date === examDate && a.session === session,
    );
    const supervisor = relevant.find((a) => a.role === "Supervisor");
    const assistant = relevant.find((a) => a.role === "Assistant");
    return {
      exam_room_id: examRoomId,
      hasSupervisor: !!supervisor,
      hasAssistant: !!assistant,
      supervisorId: supervisor?.teacher_id || null,
      assistantId: assistant?.teacher_id || null,
      supervisorName: supervisor?.teacher?.name,
      assistantName: assistant?.teacher?.name,
      isFullyStaffed: !!supervisor && !!assistant,
    };
  },

  async getEligibleTeachers(
    role: TeacherRole,
  ): Promise<TeacherWithCapability[]> {
    const ranks = role === "Supervisor" ? SUPERVISOR_RANKS : ASSISTANT_RANKS;
    if (!ranks || ranks.length === 0) return [];
    const { data, error } = await supabase
      .from("teacher")
      .select("*")
      .in("rank", ranks)
      .order("name");
    if (error) throw error;
    return (data || []).map(enrichTeacherWithCapability);
  },

  async getAvailableTeachersWithSession(
    examRoomId: number,
    role: TeacherRole,
    examDate: string,
    session: ExamSession,
  ): Promise<TeacherWithAvailability[]> {
    const eligibleTeachers = await this.getEligibleTeachers(role);
    const { data: busy } = await supabase
      .from("teacher_assignment")
      .select("teacher_id")
      .eq("exam_date", examDate);
    const busyIds = (busy || []).map((b: any) => b.teacher_id as number);
    return eligibleTeachers
      .map((t) => ({
        ...t,
        availability: {
          teacher_id: t.teacher_id,
          is_available: !busyIds.includes(t.teacher_id),
          conflict_reason: busyIds.includes(t.teacher_id)
            ? "Already Assigned"
            : null,
        },
        workload_level: getWorkloadLevel(t.total_periods_assigned),
      }))
      .sort((a, b) =>
        a.availability.is_available === b.availability.is_available
          ? 0
          : a.availability.is_available
            ? -1
            : 1,
      );
  },

  // ── create — single-room insert (AutoAssignModal) ─────────────────────────
  async create(
    examRoomId: number,
    teacherId: number,
    role: TeacherRole,
    examDate: string,
    session: ExamSession,
    shiftStart?: string,
    shiftEnd?: string,
    linkId?: number,
  ): Promise<TeacherAssignment> {
    const { data, error } = await supabase
      .from("teacher_assignment")
      .insert({
        exam_room_id: examRoomId,
        link_id: linkId ?? null,
        teacher_id: teacherId,
        role,
        exam_date: examDate,
        session,
        shift_start: shiftStart ?? null,
        shift_end: shiftEnd ?? null,
        assigned_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ── deleteByRoomAndRole ───────────────────────────────────────────────────
  // Scoped by (exam_room_id, role, exam_date) matching the constraint.
  async deleteByRoomAndRole(
    examRoomId: number,
    role: TeacherRole,
    examDate: string,
    linkId?: number,
  ): Promise<void> {
    const { error } = await supabase
      .from("teacher_assignment")
      .delete()
      .eq("exam_room_id", examRoomId)
      .eq("role", role)
      .eq("exam_date", examDate);
    if (error) throw error;
  },
};
