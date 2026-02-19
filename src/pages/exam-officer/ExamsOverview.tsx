import React, { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  X,
  BookOpen,
  ChevronRight,
  Sun,
  Sunset,
  Settings,
  RotateCcw,
  Zap,
  CheckSquare,
  Square,
  Loader2,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  UserX,
  Save,
  Eye,
} from "lucide-react";
import AutoAssignModal, {
  type RankPeriodLimits,
} from "@/components/AutoAssignModal";
import { type BulkAssignContext } from "@/services/teacherassignmentQueries";
import { teacherAssignmentQueries } from "@/services/teacherassignmentQueries";
import {
  examRoomLinkQueries,
  type DateGroup,
  type RoomCardData,
} from "@/services/examRoomLinkQueries";
import type { Exam } from "@/services/examQueries";
import type {
  ExamSession,
  TeacherRole,
  TeacherWithAvailability,
} from "@/services/teacherAssignmentTypes";
import supabase from "@/utils/supabase";

// ─────────────────────────────────────────────────────────────────────────────
// Default limits
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_RANK_LIMITS: RankPeriodLimits = {
  "Associate Professor": 5,
  Lecturer: 7,
  "Assistant Lecturer": 8,
  Tutor: 10,
};

// ─────────────────────────────────────────────────────────────────────────────
// Pairing rules
// NOTE: Associate Professor is intentionally excluded here.
// AP will only be used as an assistant as a last resort (fallback),
// and even then is capped at 1 AP+AP pair per 2-day window.
// ─────────────────────────────────────────────────────────────────────────────

const SUPERVISOR_RANK = "Associate Professor";

const SUPERVISOR_ASSISTANT_PAIRS: Array<[string, string]> = [
  [SUPERVISOR_RANK, "Lecturer"],
  [SUPERVISOR_RANK, "Assistant Lecturer"],
  [SUPERVISOR_RANK, "Tutor"],
  // Associate Professor intentionally omitted — AP+AP is last resort only
];

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type PairRecord = { supervisorId: number | null; assistantId: number | null };
type PairHistory = Map<string, PairRecord[]>;

interface PlannedAssignment {
  examRoomId: number;
  linkId: number;
  teacherId: number;
  teacherName: string;
  teacherRank: string;
  role: TeacherRole;
  examDate: string;
  session: ExamSession;
  shiftStart?: string;
  shiftEnd?: string;
}

interface RoomPreview {
  room: RoomCardData;
  examRoomId: number | null;
  ok: boolean;
  msg?: string;
  supervisor: TeacherWithAvailability | null;
  assistant: TeacherWithAvailability | null;
}

type BulkPhase = "calculating" | "preview" | "saving" | "done";

interface RoomAssignment {
  teacher_name: string;
  teacher_rank: string;
  role: TeacherRole;
  session: ExamSession;
  shift_start: string | null;
  shift_end: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Targeted fetch — teacher_assignment JOIN teacher via FK
// ─────────────────────────────────────────────────────────────────────────────

async function fetchRoomAssignments(
  examRoomId: number,
  examDate: string,
): Promise<RoomAssignment[]> {
  const { data, error } = await supabase
    .from("teacher_assignment")
    .select(
      `
      role,
      session,
      shift_start,
      shift_end,
      teacher:teacher_id (
        name,
        rank
      )
    `,
    )
    .eq("exam_room_id", examRoomId)
    .eq("exam_date", examDate);

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    teacher_name: row.teacher?.name ?? "Unknown",
    teacher_rank: row.teacher?.rank ?? "",
    role: row.role as TeacherRole,
    session: (row.session ?? "Morning") as ExamSession,
    shift_start: row.shift_start ?? null,
    shift_end: row.shift_end ?? null,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Algorithm helpers
// ─────────────────────────────────────────────────────────────────────────────

function isEligible(
  t: TeacherWithAvailability,
  limits: RankPeriodLimits,
  dayUsedIds: Set<number>,
): boolean {
  return (
    t.availability.is_available &&
    !dayUsedIds.has(t.teacher_id) &&
    (limits[t.rank] === undefined ||
      (t.total_periods_assigned ?? 0) < limits[t.rank])
  );
}

function lowestWorkload(
  candidates: TeacherWithAvailability[],
): TeacherWithAvailability {
  return candidates.reduce((best, t) =>
    (t.total_periods_assigned ?? 0) < (best.total_periods_assigned ?? 0)
      ? t
      : best,
  );
}

/**
 * Increment a teacher's period count in both pools so every subsequent
 * room sees the correct running total.
 */
function incrementPeriodCount(teacherId: number, ctx: BulkAssignContext): void {
  for (const t of ctx.supervisors) {
    if (t.teacher_id === teacherId) {
      t.total_periods_assigned = (t.total_periods_assigned ?? 0) + 1;
    }
  }
  for (const t of ctx.assistants) {
    if (t.teacher_id === teacherId) {
      t.total_periods_assigned = (t.total_periods_assigned ?? 0) + 1;
    }
  }
}

/**
 * Pick a supervisor + assistant pair for one room.
 *
 * Assistant priority order:
 *   1. Lecturer
 *   2. Assistant Lecturer
 *   3. Tutor
 *   4. Associate Professor — ONLY as absolute last resort,
 *      and only when apApAllowed = true (quota: 1 per 2-day window)
 */
function pickPairedTeachers(
  supervisors: TeacherWithAvailability[],
  assistants: TeacherWithAvailability[],
  limits: RankPeriodLimits,
  dayUsedIds: Set<number>,
  pastPairs: PairRecord[],
  pairTypeUsage: Map<string, number>,
  apApAllowed: boolean,
): {
  supervisor: TeacherWithAvailability | null;
  assistant: TeacherWithAvailability | null;
} {
  const eligibleSups = supervisors.filter(
    (t) => t.rank === SUPERVISOR_RANK && isEligible(t, limits, dayUsedIds),
  );

  // Exclude APs from normal assistant pool — AP+AP only via last-resort path
  const eligibleAssts = assistants.filter(
    (t) => isEligible(t, limits, dayUsedIds) && t.rank !== SUPERVISOR_RANK,
  );

  if (eligibleSups.length === 0) return { supervisor: null, assistant: null };

  const pastSupIds = new Set(
    pastPairs.map((p) => p.supervisorId).filter(Boolean) as number[],
  );
  const pastAsstIds = new Set(
    pastPairs.map((p) => p.assistantId).filter(Boolean) as number[],
  );

  // Pick supervisor (prefer fresh / lowest workload)
  const supFresh = eligibleSups.filter((t) => !pastSupIds.has(t.teacher_id));
  const supervisor = lowestWorkload(
    supFresh.length > 0 ? supFresh : eligibleSups,
  );

  // Helper: try AP as assistant (last resort)
  function tryApAssistant(): TeacherWithAvailability | null {
    if (!apApAllowed) return null;
    const apAssts = assistants.filter(
      (t) =>
        t.rank === SUPERVISOR_RANK &&
        isEligible(t, limits, dayUsedIds) &&
        t.teacher_id !== supervisor.teacher_id,
    );
    if (apAssts.length === 0) return null;
    const apFresh = apAssts.filter((t) => !pastAsstIds.has(t.teacher_id));
    return lowestWorkload(apFresh.length > 0 ? apFresh : apAssts);
  }

  // Build viable non-AP pair types
  const viablePairs: Array<{ key: string; asstRank: string; usage: number }> =
    [];
  for (const [, asstRank] of SUPERVISOR_ASSISTANT_PAIRS) {
    if (eligibleAssts.some((t) => t.rank === asstRank)) {
      const key = `AP|${asstRank}`;
      viablePairs.push({ key, asstRank, usage: pairTypeUsage.get(key) ?? 0 });
    }
  }

  // No non-AP assistants at all → last resort AP
  if (viablePairs.length === 0) {
    return { supervisor, assistant: tryApAssistant() };
  }

  // Pick least-used non-AP pair type
  const chosen = viablePairs.reduce((best, cur) =>
    cur.usage < best.usage ? cur : best,
  );
  pairTypeUsage.set(chosen.key, (pairTypeUsage.get(chosen.key) ?? 0) + 1);

  const asstOfRank = eligibleAssts
    .filter((t) => t.rank === chosen.asstRank)
    .filter((t) => t.teacher_id !== supervisor.teacher_id);

  if (asstOfRank.length === 0) {
    // Chosen rank exhausted → try any other non-AP assistant
    const anyAsst = eligibleAssts.filter(
      (t) => t.teacher_id !== supervisor.teacher_id,
    );
    if (anyAsst.length > 0) {
      const asstFresh = anyAsst.filter((t) => !pastAsstIds.has(t.teacher_id));
      return {
        supervisor,
        assistant: lowestWorkload(asstFresh.length > 0 ? asstFresh : anyAsst),
      };
    }
    // All non-AP exhausted → last resort AP
    return { supervisor, assistant: tryApAssistant() };
  }

  const asstFresh = asstOfRank.filter((t) => !pastAsstIds.has(t.teacher_id));
  return {
    supervisor,
    assistant: lowestWorkload(asstFresh.length > 0 ? asstFresh : asstOfRank),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure calculation — NO database writes
//
// AP+AP quota: at most 1 AP+AP pairing per every 2-day window.
// Dates are sorted and grouped: [day0,day1]=window0, [day2,day3]=window1, …
// ─────────────────────────────────────────────────────────────────────────────

function calculateAssignments(
  rooms: RoomCardData[],
  rankLimits: RankPeriodLimits,
  ctx: BulkAssignContext,
): { previews: RoomPreview[]; planned: PlannedAssignment[] } {
  const dayUsedIds = new Map<string, Set<number>>();
  const pairHistory: PairHistory = new Map();
  const pairTypeUsageByDate = new Map<string, Map<string, number>>();

  // Build 2-day window index
  const sortedDates = [...new Set(rooms.map((r) => r.examDate))].sort();
  const apApQuotaByWindow = new Map<string, number>();
  function getWindowKey(date: string): string {
    return String(Math.floor(sortedDates.indexOf(date) / 2));
  }

  const previews: RoomPreview[] = [];
  const planned: PlannedAssignment[] = [];

  for (const room of rooms) {
    const date = room.examDate;

    if (!dayUsedIds.has(date)) {
      const existingBusy = ctx.busyByDate.get(date) ?? new Set<number>();
      dayUsedIds.set(date, new Set(existingBusy));
    }
    if (!pairTypeUsageByDate.has(date))
      pairTypeUsageByDate.set(date, new Map());

    const todayUsed = dayUsedIds.get(date)!;
    const pairTypeUsage = pairTypeUsageByDate.get(date)!;

    const resolved = teacherAssignmentQueries.resolveRoomLink(
      room.roomNumber,
      date,
      ctx,
    );

    if (resolved === null) {
      previews.push({
        room,
        examRoomId: null,
        ok: false,
        msg: "Room not found for this date",
        supervisor: null,
        assistant: null,
      });
      continue;
    }

    const { examRoomId, linkId } = resolved;
    const effectiveSession: ExamSession = room.examSession || "Morning";

    const supervisors = teacherAssignmentQueries.getTeachersFromContext(
      "Supervisor",
      date,
      ctx,
      todayUsed,
    );
    const assistants = teacherAssignmentQueries.getTeachersFromContext(
      "Assistant",
      date,
      ctx,
      todayUsed,
    );

    const historyKey = room.primaryGroupLabel || room.roomNumber;
    const pastPairs = pairHistory.get(historyKey) ?? [];

    // AP+AP allowed only if this 2-day window hasn't used its quota yet
    const windowKey = getWindowKey(date);
    const apApAllowed = (apApQuotaByWindow.get(windowKey) ?? 0) < 1;

    const { supervisor, assistant } = pickPairedTeachers(
      supervisors,
      assistants,
      rankLimits,
      todayUsed,
      pastPairs,
      pairTypeUsage,
      apApAllowed,
    );

    // Consume AP+AP quota if we used it
    if (supervisor && assistant && assistant.rank === SUPERVISOR_RANK) {
      apApQuotaByWindow.set(
        windowKey,
        (apApQuotaByWindow.get(windowKey) ?? 0) + 1,
      );
    }

    if (supervisor) {
      todayUsed.add(supervisor.teacher_id);
      incrementPeriodCount(supervisor.teacher_id, ctx);
      planned.push({
        examRoomId,
        linkId,
        teacherId: supervisor.teacher_id,
        teacherName: supervisor.name,
        teacherRank: supervisor.rank,
        role: "Supervisor",
        examDate: date,
        session: effectiveSession,
        shiftStart: room.examTime?.start,
        shiftEnd: room.examTime?.end,
      });
    }

    if (assistant) {
      todayUsed.add(assistant.teacher_id);
      incrementPeriodCount(assistant.teacher_id, ctx);
      planned.push({
        examRoomId,
        linkId,
        teacherId: assistant.teacher_id,
        teacherName: assistant.name,
        teacherRank: assistant.rank,
        role: "Assistant",
        examDate: date,
        session: effectiveSession,
        shiftStart: room.examTime?.start,
        shiftEnd: room.examTime?.end,
      });
    }

    pairHistory.set(historyKey, [
      ...pastPairs,
      {
        supervisorId: supervisor?.teacher_id ?? null,
        assistantId: assistant?.teacher_id ?? null,
      },
    ]);

    previews.push({
      room,
      examRoomId,
      ok: supervisor !== null || assistant !== null,
      msg:
        supervisor === null && assistant === null
          ? "No available teachers"
          : undefined,
      supervisor,
      assistant,
    });
  }

  return { previews, planned };
}

// ─────────────────────────────────────────────────────────────────────────────
// Period-limits settings modal
// ─────────────────────────────────────────────────────────────────────────────

const PeriodLimitsModal: React.FC<{
  limits: RankPeriodLimits;
  onSave: (limits: RankPeriodLimits) => void;
  onClose: () => void;
}> = ({ limits, onSave, onClose }) => {
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(limits).map(([k, v]) => [k, String(v)])),
  );
  const [newRank, setNewRank] = useState("");
  const [newLimit, setNewLimit] = useState<string>("1");
  const [addError, setAddError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleChange = (rank: string, raw: string) => {
    if (raw === "" || /^\d+$/.test(raw))
      setDraft((prev) => ({ ...prev, [rank]: raw }));
  };

  const handleSave = () => {
    const invalid = Object.entries(draft).find(
      ([, v]) => v === "" || isNaN(Number(v)) || Number(v) < 1,
    );
    if (invalid) {
      setSaveError(`"${invalid[0]}" must have a limit of at least 1.`);
      return;
    }
    onSave(
      Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, Number(v)])),
    );
    onClose();
  };

  const handleAddRank = () => {
    setAddError(null);
    const rankTrimmed = newRank.trim();
    if (!rankTrimmed) {
      setAddError("Rank name cannot be empty.");
      return;
    }
    if (draft[rankTrimmed] !== undefined) {
      setAddError(`"${rankTrimmed}" already exists.`);
      return;
    }
    const parsed = Number(newLimit);
    if (newLimit === "" || isNaN(parsed) || parsed < 1) {
      setAddError("Limit must be at least 1.");
      return;
    }
    setDraft((prev) => ({ ...prev, [rankTrimmed]: newLimit }));
    setNewRank("");
    setNewLimit("1");
  };

  const handleReset = () =>
    setDraft(
      Object.fromEntries(
        Object.entries(DEFAULT_RANK_LIMITS).map(([k, v]) => [k, String(v)]),
      ),
    );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white border rounded-xl max-w-md w-full shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-gray-900">
              Period Limits per Rank
            </h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
          <p className="text-sm text-muted-foreground">
            Set the maximum number of exam periods each teacher of that rank may
            be assigned.
          </p>
          <div className="space-y-2">
            {Object.entries(draft).map(([rank, value]) => (
              <div
                key={rank}
                className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50"
              >
                <span className="flex-1 text-sm font-medium text-gray-800 truncate">
                  {rank}
                </span>
                <Input
                  type="number"
                  min={1}
                  value={value}
                  onChange={(e) => handleChange(rank, e.target.value)}
                  className={`w-24 text-center h-8 text-sm ${value === "" || Number(value) < 1 ? "border-destructive" : ""}`}
                />
              </div>
            ))}
          </div>
          <div className="border-t pt-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Add rank
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="Rank name"
                value={newRank}
                onChange={(e) => {
                  setNewRank(e.target.value);
                  setAddError(null);
                }}
                className="flex-1 h-9 text-sm"
              />
              <Input
                type="number"
                min={1}
                placeholder="Limit"
                value={newLimit}
                onChange={(e) => {
                  setNewLimit(e.target.value);
                  setAddError(null);
                }}
                className="w-24 h-9 text-sm text-center"
              />
              <Button size="sm" className="h-9 px-4" onClick={handleAddRank}>
                Add
              </Button>
            </div>
            {addError && <p className="text-xs text-destructive">{addError}</p>}
          </div>
          {saveError && (
            <p className="text-xs text-destructive pt-1">{saveError}</p>
          )}
        </div>
        <div className="px-6 py-4 border-t flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground gap-1"
            onClick={handleReset}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to defaults
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Teacher chip
// ─────────────────────────────────────────────────────────────────────────────

const TeacherChip: React.FC<{
  label: string;
  name: string;
  rank: string;
  found: boolean;
}> = ({ label, name, rank, found }) => (
  <div
    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
      found
        ? "bg-emerald-50 border border-emerald-200"
        : "bg-amber-50 border border-amber-200"
    }`}
  >
    <div
      className={`shrink-0 h-6 w-6 rounded-full flex items-center justify-center ${found ? "bg-emerald-100" : "bg-amber-100"}`}
    >
      {found ? (
        <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
      ) : (
        <UserX className="h-3.5 w-3.5 text-amber-600" />
      )}
    </div>
    <div className="min-w-0">
      <span
        className={`font-bold uppercase tracking-wide text-[10px] block ${found ? "text-emerald-700" : "text-amber-700"}`}
      >
        {label}
      </span>
      {found ? (
        <p className="font-semibold text-gray-800 truncate">
          {name}{" "}
          <span className="font-normal text-muted-foreground">· {rank}</span>
        </p>
      ) : (
        <p className="text-amber-700 truncate">{name}</p>
      )}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Bulk assign modal
// ─────────────────────────────────────────────────────────────────────────────

const BulkAssignModal: React.FC<{
  rooms: RoomCardData[];
  rankLimits: RankPeriodLimits;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ rooms, rankLimits, onClose, onSuccess }) => {
  const [phase, setPhase] = useState<BulkPhase>("calculating");
  const [statusMsg, setStatusMsg] = useState("Pre-fetching data…");
  const [previews, setPreviews] = useState<RoomPreview[]>([]);
  const [planned, setPlanned] = useState<PlannedAssignment[]>([]);
  const [saveResults, setSaveResults] = useState<
    { roomKey: string; ok: boolean; msg?: string }[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  const calculate = useCallback(async () => {
    setPhase("calculating");
    setStatusMsg("Pre-fetching data from database…");
    setError(null);

    const dates = [...new Set(rooms.map((r) => r.examDate))];
    let ctx: BulkAssignContext;
    try {
      ctx = await teacherAssignmentQueries.prefetchBulkContext(dates);
    } catch (e: any) {
      setError("Failed to fetch data: " + (e?.message ?? "Unknown error"));
      setPhase("done");
      return;
    }

    setStatusMsg("Calculating best assignments…");
    await new Promise((r) => setTimeout(r, 80));

    const { previews: p, planned: pl } = calculateAssignments(
      rooms,
      rankLimits,
      ctx,
    );
    setPreviews(p);
    setPlanned(pl);
    setPhase("preview");
  }, [rooms, rankLimits]);

  useEffect(() => {
    calculate();
  }, []);

  const handleSave = async () => {
    setPhase("saving");
    setStatusMsg(`Saving ${planned.length} assignments…`);
    setError(null);

    const toCommit = planned.map((p) => ({
      examRoomId: p.examRoomId,
      linkId: p.linkId,
      teacherId: p.teacherId,
      role: p.role,
      examDate: p.examDate,
      session: p.session,
      shiftStart: p.shiftStart,
      shiftEnd: p.shiftEnd,
    }));

    let dbError: string | null = null;
    try {
      await teacherAssignmentQueries.batchCommitAssignments(toCommit);
    } catch (e: any) {
      dbError = e?.message ?? "Unknown database error";
      setError("Database write failed: " + dbError);
    }

    setSaveResults(
      previews.map((pv) => {
        if (pv.examRoomId === null)
          return {
            roomKey: pv.room.key,
            ok: false,
            msg: pv.msg ?? "Room not found",
          };
        if (dbError)
          return { roomKey: pv.room.key, ok: false, msg: "DB write failed" };
        return { roomKey: pv.room.key, ok: pv.ok, msg: pv.msg };
      }),
    );

    setPhase("done");
    onSuccess();
  };

  const dates = [...new Set(rooms.map((r) => r.examDate))].sort();
  const previewsByDate = previews.reduce<Record<string, RoomPreview[]>>(
    (acc, pv) => {
      const d = pv.room.examDate;
      if (!acc[d]) acc[d] = [];
      acc[d].push(pv);
      return acc;
    },
    {},
  );
  const assignableCount = previews.filter((p) => p.ok).length;
  const totalTeachers = planned.length;
  const savedCount = saveResults.filter((r) => r.ok).length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white border rounded-xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Bulk Auto-Assign
              </h2>
              <p className="text-xs text-muted-foreground">
                {rooms.length} room{rooms.length !== 1 ? "s" : ""} ·{" "}
                {dates.length} date{dates.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          {(phase === "preview" || phase === "done") && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {(phase === "calculating" || phase === "saving") && (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">{statusMsg}</p>
                <p className="text-xs mt-1">
                  {phase === "calculating"
                    ? "This may take a moment for large schedules…"
                    : `Writing ${totalTeachers} teacher assignment${totalTeachers !== 1 ? "s" : ""} to database…`}
                </p>
              </div>
            </div>
          )}

          {phase === "preview" && (
            <>
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/5 border border-primary/15">
                <Eye className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    Preview — {assignableCount} of {rooms.length} rooms can be
                    assigned
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {totalTeachers} teacher assignment
                    {totalTeachers !== 1 ? "s" : ""} ready · Review below then
                    click{" "}
                    <strong className="text-gray-700">Save to Database</strong>
                  </p>
                </div>
              </div>

              {dates.map((date) => {
                const datePreviews = previewsByDate[date] ?? [];
                const okCount = datePreviews.filter((p) => p.ok).length;
                return (
                  <div key={date} className="border rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-bold text-gray-800">
                          {date}
                        </span>
                      </div>
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                          okCount === datePreviews.length
                            ? "bg-emerald-100 text-emerald-700"
                            : okCount === 0
                              ? "bg-amber-100 text-amber-700"
                              : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {okCount}/{datePreviews.length} rooms ready
                      </span>
                    </div>
                    <div className="divide-y">
                      {datePreviews.map((pv) => (
                        <div
                          key={pv.room.key}
                          className={`px-4 py-3 ${!pv.ok ? "bg-amber-50/40" : ""}`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            {pv.ok ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                            )}
                            <span className="text-sm font-bold text-gray-900">
                              Room {pv.room.roomNumber}
                            </span>
                            {pv.room.examSession && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                {pv.room.examSession}
                              </span>
                            )}
                            {pv.room.examTime && (
                              <span className="text-xs text-muted-foreground ml-auto">
                                {pv.room.examTime.start} –{" "}
                                {pv.room.examTime.end}
                              </span>
                            )}
                          </div>
                          {pv.ok ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <TeacherChip
                                label="Supervisor"
                                name={pv.supervisor?.name ?? "—"}
                                rank={pv.supervisor?.rank ?? ""}
                                found={pv.supervisor !== null}
                              />
                              <TeacherChip
                                label="Assistant"
                                name={
                                  pv.assistant?.name ?? "No assistant available"
                                }
                                rank={pv.assistant?.rank ?? ""}
                                found={pv.assistant !== null}
                              />
                            </div>
                          ) : (
                            <p className="text-xs text-amber-700 pl-6">
                              {pv.msg ?? "Could not assign"}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {phase === "done" && (
            <>
              <div
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${error ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"}`}
              >
                {error ? (
                  <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                )}
                <div>
                  <p
                    className={`text-sm font-semibold ${error ? "text-amber-800" : "text-emerald-800"}`}
                  >
                    {error
                      ? "Save completed with errors"
                      : `Saved successfully — ${savedCount} of ${rooms.length} rooms assigned`}
                  </p>
                  {error && (
                    <p className="text-xs text-amber-700 mt-0.5">{error}</p>
                  )}
                </div>
              </div>

              {dates.map((date) => {
                const datePreviews = previewsByDate[date] ?? [];
                const okCount = saveResults.filter(
                  (r) =>
                    r.ok && datePreviews.some((p) => p.room.key === r.roomKey),
                ).length;
                return (
                  <div key={date} className="border rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-bold text-gray-800">
                          {date}
                        </span>
                      </div>
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                          okCount === datePreviews.length
                            ? "bg-emerald-100 text-emerald-700"
                            : okCount === 0
                              ? "bg-amber-100 text-amber-700"
                              : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {okCount}/{datePreviews.length} saved
                      </span>
                    </div>
                    <div className="divide-y">
                      {datePreviews.map((pv) => {
                        const sr = saveResults.find(
                          (r) => r.roomKey === pv.room.key,
                        );
                        return (
                          <div
                            key={pv.room.key}
                            className={`px-4 py-3 flex items-start gap-3 ${sr?.ok ? "" : "bg-amber-50/40"}`}
                          >
                            {sr?.ok ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-900">
                                Room {pv.room.roomNumber}
                              </p>
                              {sr?.ok ? (
                                <div className="mt-1 space-y-0.5">
                                  {pv.supervisor && (
                                    <p className="text-xs text-emerald-700">
                                      <span className="font-semibold">
                                        Supervisor:
                                      </span>{" "}
                                      {pv.supervisor.name} ·{" "}
                                      {pv.supervisor.rank}
                                    </p>
                                  )}
                                  {pv.assistant && (
                                    <p className="text-xs text-emerald-700">
                                      <span className="font-semibold">
                                        Assistant:
                                      </span>{" "}
                                      {pv.assistant.name} · {pv.assistant.rank}
                                    </p>
                                  )}
                                  {!pv.supervisor && !pv.assistant && (
                                    <p className="text-xs text-amber-700">
                                      No teachers assigned
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <p className="text-xs text-amber-700 mt-0.5">
                                  {sr?.msg ?? pv.msg ?? "Not saved"}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t shrink-0 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {phase === "preview" &&
              `${totalTeachers} assignment${totalTeachers !== 1 ? "s" : ""} ready to save`}
            {phase === "done" &&
              `${savedCount} of ${rooms.length} rooms saved to database`}
          </p>
          <div className="flex gap-2">
            {phase === "preview" && (
              <>
                <Button variant="outline" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="gap-2"
                  disabled={assignableCount === 0}
                  onClick={handleSave}
                >
                  <Save className="h-4 w-4" />
                  Save to Database
                  {assignableCount > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-white/20 text-[10px] font-bold">
                      {assignableCount}
                    </span>
                  )}
                </Button>
              </>
            )}
            {phase === "done" && (
              <Button size="sm" onClick={onClose}>
                Done
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Misc helpers
// ─────────────────────────────────────────────────────────────────────────────

function getTodayISO() {
  return new Date().toISOString().split("T")[0];
}
function deriveStatus(examDate: string): "scheduled" | "completed" {
  return examDate >= getTodayISO() ? "scheduled" : "completed";
}
function fmtTime(t: string | null | undefined) {
  if (!t) return "";
  return t.length >= 5 ? t.slice(0, 5) : t;
}

const SessionBadge: React.FC<{ session: ExamSession }> = ({ session }) => (
  <span
    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
      session === "Morning"
        ? "bg-amber-100 text-amber-700"
        : "bg-orange-100 text-orange-700"
    }`}
  >
    {session === "Morning" ? (
      <Sun className="h-2.5 w-2.5" />
    ) : (
      <Sunset className="h-2.5 w-2.5" />
    )}
    {session}
  </span>
);

const ExamRow: React.FC<{ exam: Exam; badge: "primary" | "secondary" }> = ({
  exam,
  badge,
}) => (
  <div className="flex items-start gap-3 py-3 border-b last:border-0">
    <span
      className={`mt-0.5 shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${
        badge === "primary"
          ? "bg-blue-100 text-blue-700"
          : "bg-green-100 text-green-700"
      }`}
    >
      {badge}
    </span>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-foreground truncate">
        {exam.subject_code} — {exam.exam_name}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">
        {exam.program}
        {exam.specialization ? ` · ${exam.specialization}` : ""} | Y
        {exam.year_level} S{exam.semester}
      </p>
    </div>
    <div className="text-right shrink-0">
      <p className="text-xs font-medium text-foreground flex items-center gap-1 justify-end">
        <Clock className="h-3 w-3" />
        {fmtTime(exam.start_time)} – {fmtTime(exam.end_time)}
      </p>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Room detail modal
// ─────────────────────────────────────────────────────────────────────────────

const RoomDetailModal: React.FC<{
  room: RoomCardData;
  assignments: RoomAssignment[];
  assignmentsLoading: boolean;
  onClose: () => void;
}> = ({ room, assignments, assignmentsLoading, onClose }) => {
  const supervisors = assignments.filter((a) => a.role === "Supervisor");
  const assistants = assignments.filter((a) => a.role === "Assistant");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-card z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">
                  Room {room.roomNumber}
                </h2>
                <SessionBadge session={room.examSession} />
              </div>
              <p className="text-sm text-muted-foreground">
                {room.examDate} · {room.dayOfWeek} · Capacity:{" "}
                {room.roomCapacity}
                {room.examTime && (
                  <>
                    {" "}
                    · {room.examTime.start} – {room.examTime.end}
                  </>
                )}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid grid-cols-3 divide-x border-b">
          <div className="px-6 py-4 text-center">
            <p className="text-2xl font-bold text-foreground">
              {room.totalStudents}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Students Assigned
            </p>
          </div>
          <div className="px-6 py-4 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {room.primaryExams.length}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Primary Subjects
            </p>
          </div>
          <div className="px-6 py-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {room.secondaryExams.length}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Secondary Subjects
            </p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Assigned Invigilators
              {assignments.length > 0 && (
                <span className="ml-1 inline-flex items-center justify-center h-4 min-w-4 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                  {assignments.length}
                </span>
              )}
            </h3>

            {assignmentsLoading ? (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-gray-50 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin shrink-0 text-primary" />
                Loading invigilators…
              </div>
            ) : assignments.length === 0 ? (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed bg-gray-50/60">
                <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <UserX className="h-4 w-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    No invigilators assigned yet
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Use "Auto Assign" on the card to assign teachers.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {supervisors.map((a, i) => (
                  <div
                    key={`sup-${i}`}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-blue-50 border-blue-200"
                  >
                    <div className="shrink-0 h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center">
                      <UserCheck className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-blue-600 block">
                        Supervisor
                      </span>
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {a.teacher_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {a.teacher_rank}
                        {a.shift_start && a.shift_end && (
                          <>
                            {" "}
                            · {fmtTime(a.shift_start)} – {fmtTime(a.shift_end)}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
                {assistants.map((a, i) => (
                  <div
                    key={`asst-${i}`}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-purple-50 border-purple-200"
                  >
                    <div className="shrink-0 h-9 w-9 rounded-full bg-purple-100 flex items-center justify-center">
                      <UserCheck className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-purple-600 block">
                        Assistant
                      </span>
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {a.teacher_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {a.teacher_rank}
                        {a.shift_start && a.shift_end && (
                          <>
                            {" "}
                            · {fmtTime(a.shift_start)} – {fmtTime(a.shift_end)}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Exams on {room.examDate}
            </h3>
            {room.primaryExams.length === 0 &&
            room.secondaryExams.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No exams on this date.
              </p>
            ) : (
              <div>
                {room.primaryExams.map((e) => (
                  <ExamRow key={e.exam_id} exam={e} badge="primary" />
                ))}
                {room.secondaryExams.map((e) => (
                  <ExamRow key={e.exam_id} exam={e} badge="secondary" />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Room card
// ─────────────────────────────────────────────────────────────────────────────

const RoomCard: React.FC<{
  room: RoomCardData;
  assignmentCount: number;
  selected: boolean;
  selectionMode: boolean;
  onCardClick: (room: RoomCardData) => void;
  onAutoAssign: (e: React.MouseEvent, room: RoomCardData) => void;
  onToggleSelect: (e: React.MouseEvent, room: RoomCardData) => void;
}> = ({
  room,
  assignmentCount,
  selected,
  selectionMode,
  onCardClick,
  onAutoAssign,
  onToggleSelect,
}) => (
  <div
    className={`border rounded-xl p-4 bg-background transition-all duration-200 flex flex-col gap-3 ${
      selected
        ? "ring-2 ring-primary border-primary shadow-md"
        : "hover:shadow-md"
    }`}
  >
    <div className="cursor-pointer flex-1" onClick={() => onCardClick(room)}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {selectionMode && (
            <button
              onClick={(e) => onToggleSelect(e, room)}
              className="shrink-0 text-primary"
            >
              {selected ? (
                <CheckSquare className="h-5 w-5" />
              ) : (
                <Square className="h-5 w-5 text-muted-foreground" />
              )}
            </button>
          )}
          <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <MapPin className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-bold text-foreground leading-tight">
              {room.roomNumber}
            </p>
            <p className="text-xs text-muted-foreground">
              Cap: {room.roomCapacity}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <SessionBadge session={room.examSession} />
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {room.examTime && (
        <div className="flex items-center gap-1 mb-2">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {room.examTime.start} – {room.examTime.end}
          </span>
        </div>
      )}

      <div className="space-y-1.5">
        {room.primaryGroupLabel && (
          <div className="flex items-start gap-1.5">
            <span className="mt-1 h-2 w-2 rounded-full bg-blue-500 shrink-0" />
            <p className="text-xs text-muted-foreground leading-tight">
              {room.primaryGroupLabel}
            </p>
          </div>
        )}
        {room.secondaryGroupLabel && (
          <div className="flex items-start gap-1.5">
            <span className="mt-1 h-2 w-2 rounded-full bg-green-500 shrink-0" />
            <p className="text-xs text-muted-foreground leading-tight">
              {room.secondaryGroupLabel}
            </p>
          </div>
        )}
        {!room.primaryGroupLabel && !room.secondaryGroupLabel && (
          <p className="text-xs text-muted-foreground italic">
            No groups linked
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 mt-3">
        {room.primaryExams.length > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">
            {room.primaryExams.length} primary subject
            {room.primaryExams.length !== 1 ? "s" : ""}
          </span>
        )}
        {room.secondaryExams.length > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">
            {room.secondaryExams.length} secondary subject
            {room.secondaryExams.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 mt-3 pt-3 border-t">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground">
          {room.totalStudents} students
        </span>
        {assignmentCount > 0 && (
          <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary">
            <CheckCircle2 className="h-3 w-3" />
            {assignmentCount} invigilator{assignmentCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    </div>

    <Button
      variant={assignmentCount > 0 ? "outline" : "default"}
      size="sm"
      className="w-full gap-2"
      onClick={(e) => onAutoAssign(e, room)}
    >
      <Zap className="h-4 w-4" />
      {assignmentCount > 0 ? "Re-assign Invigilators" : "Auto Assign"}
    </Button>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

const ExamsOverview: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dateGroups, setDateGroups] = useState<DateGroup[]>([]);

  const [selectedRoom, setSelectedRoom] = useState<RoomCardData | null>(null);
  const [roomAssignments, setRoomAssignments] = useState<RoomAssignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);

  const [showAutoAssignModal, setShowAutoAssignModal] = useState(false);
  const [autoAssignTarget, setAutoAssignTarget] = useState<RoomCardData | null>(
    null,
  );

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedRoomKeys, setSelectedRoomKeys] = useState<Set<string>>(
    new Set(),
  );
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkRooms, setBulkRooms] = useState<RoomCardData[]>([]);

  const [assignmentCounts, setAssignmentCounts] = useState<
    Record<string, number>
  >({});

  const [rankLimits, setRankLimits] = useState<RankPeriodLimits>({
    ...DEFAULT_RANK_LIMITS,
  });
  const [showLimitsModal, setShowLimitsModal] = useState(false);

  const loadAssignmentCounts = useCallback(async () => {
    try {
      const all = await teacherAssignmentQueries.getAll();
      const counts: Record<string, number> = {};
      all.forEach((a) => {
        const k = `${a.exam_room_id}-${a.exam_date || ""}`;
        counts[k] = (counts[k] || 0) + 1;
      });
      setAssignmentCounts(counts);
    } catch (err) {
      console.error("Error loading assignment counts:", err);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const groups = await examRoomLinkQueries.getAllDateGroups();
        if (!mounted) return;
        setDateGroups(groups);
        await loadAssignmentCounts();
      } catch (err: any) {
        if (!mounted) return;
        setErrorMsg(err?.message ?? "Failed to load exam schedules");
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [loadAssignmentCounts]);

  const filteredGroups = dateGroups.filter((group) => {
    const status = deriveStatus(group.examDate);
    if (statusFilter !== "all" && status !== statusFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return group.rooms.some(
      (r) =>
        r.roomNumber.toLowerCase().includes(q) ||
        r.primaryExams.some(
          (e) =>
            e.program.toLowerCase().includes(q) ||
            (e.specialization ?? "").toLowerCase().includes(q) ||
            e.exam_name.toLowerCase().includes(q) ||
            e.subject_code.toLowerCase().includes(q),
        ) ||
        r.secondaryExams.some(
          (e) =>
            e.program.toLowerCase().includes(q) ||
            (e.specialization ?? "").toLowerCase().includes(q) ||
            e.exam_name.toLowerCase().includes(q) ||
            e.subject_code.toLowerCase().includes(q),
        ),
    );
  });

  const allVisibleRooms = filteredGroups.flatMap((g) => g.rooms);

  const handleCardClick = async (room: RoomCardData) => {
    if (selectionMode) return;
    setSelectedRoom(room);
    setRoomAssignments([]);
    setAssignmentsLoading(true);
    try {
      const assignments = await fetchRoomAssignments(
        room.examRoomId,
        room.examDate,
      );
      setRoomAssignments(assignments);
    } catch (err) {
      console.error("Failed to load room assignments:", err);
    } finally {
      setAssignmentsLoading(false);
    }
  };

  const handleAutoAssign = (e: React.MouseEvent, room: RoomCardData) => {
    e.stopPropagation();
    setAutoAssignTarget(room);
    setShowAutoAssignModal(true);
  };

  const handleToggleSelect = (e: React.MouseEvent, room: RoomCardData) => {
    e.stopPropagation();
    setSelectedRoomKeys((prev) => {
      const next = new Set(prev);
      if (next.has(room.key)) next.delete(room.key);
      else next.add(room.key);
      return next;
    });
  };

  const handleAssignAll = () => {
    if (allVisibleRooms.length === 0) return;
    setBulkRooms(allVisibleRooms);
    setShowBulkModal(true);
  };

  const handleAssignSelected = () => {
    const rooms = allVisibleRooms.filter((r) => selectedRoomKeys.has(r.key));
    if (rooms.length === 0) return;
    setBulkRooms(rooms);
    setShowBulkModal(true);
  };

  const handleBulkDone = async () => {
    setShowBulkModal(false);
    setBulkRooms([]);
    setSelectionMode(false);
    setSelectedRoomKeys(new Set());
    await loadAssignmentCounts();
  };

  const toggleSelectionMode = () => {
    setSelectionMode((v) => !v);
    setSelectedRoomKeys(new Set());
  };

  const handleCloseDetailModal = () => {
    setSelectedRoom(null);
    setRoomAssignments([]);
  };

  const selectedCount = selectedRoomKeys.size;

  return (
    <DashboardLayout>
      <PageHeader
        title="Exam Schedule"
        description="View exam schedules grouped by date with room & invigilator assignments"
      />

      {errorMsg && (
        <div className="mb-6 p-4 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive">
          {errorMsg}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap gap-2">
          {(["all", "scheduled", "completed"] as const).map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setShowLimitsModal(true)}
          >
            <Settings className="h-4 w-4" />
            Period Limits
            {Object.keys(rankLimits).length > 0 && (
              <span className="ml-1 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                {Object.keys(rankLimits).length}
              </span>
            )}
          </Button>
          <Button
            variant={selectionMode ? "default" : "outline"}
            size="sm"
            className="gap-2"
            onClick={toggleSelectionMode}
          >
            <CheckSquare className="h-4 w-4" />
            {selectionMode ? "Cancel Select" : "Select Rooms"}
          </Button>
          {selectionMode && (
            <Button
              size="sm"
              className="gap-2"
              disabled={selectedCount === 0}
              onClick={handleAssignSelected}
            >
              <Zap className="h-4 w-4" />
              Assign Selected
              {selectedCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-white/20 text-white text-[10px] font-bold">
                  {selectedCount}
                </span>
              )}
            </Button>
          )}
          {!selectionMode && (
            <Button
              size="sm"
              className="gap-2"
              disabled={allVisibleRooms.length === 0}
              onClick={handleAssignAll}
            >
              <Zap className="h-4 w-4" />
              Assign All Rooms
            </Button>
          )}
        </div>
      </div>

      {selectionMode && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-lg bg-primary/5 border border-primary/20 text-sm text-primary font-medium">
          <CheckSquare className="h-4 w-4 shrink-0" />
          <span>
            {selectedCount === 0
              ? 'Click room checkboxes to select, then click "Assign Selected"'
              : `${selectedCount} room${selectedCount !== 1 ? "s" : ""} selected`}
          </span>
          {selectedCount > 0 && (
            <button
              className="ml-auto text-xs underline text-muted-foreground"
              onClick={() => setSelectedRoomKeys(new Set())}
            >
              Clear
            </button>
          )}
        </div>
      )}

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by room, program, specialization, subject…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
        />
      </div>

      <div className="space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm">Loading exam schedules…</span>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No exam schedules found
          </div>
        ) : (
          filteredGroups.map((group) => {
            const status = deriveStatus(group.examDate);
            return (
              <div
                key={group.examDate}
                className="bg-card border rounded-xl p-6"
              >
                <div className="flex items-center gap-3 mb-5 pb-4 border-b">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">
                      {group.examDate}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {group.dayOfWeek} · {group.rooms.length} room
                      {group.rooms.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        status === "scheduled"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                  </div>
                </div>
                {group.rooms.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No rooms assigned for this date
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.rooms.map((room) => (
                      <RoomCard
                        key={room.key}
                        room={room}
                        assignmentCount={assignmentCounts[room.key] ?? 0}
                        selected={selectedRoomKeys.has(room.key)}
                        selectionMode={selectionMode}
                        onCardClick={handleCardClick}
                        onAutoAssign={handleAutoAssign}
                        onToggleSelect={handleToggleSelect}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {selectedRoom && (
        <RoomDetailModal
          room={selectedRoom}
          assignments={roomAssignments}
          assignmentsLoading={assignmentsLoading}
          onClose={handleCloseDetailModal}
        />
      )}

      {showAutoAssignModal && autoAssignTarget && (
        <AutoAssignModal
          examRoomId={autoAssignTarget.examRoomId}
          roomNumber={autoAssignTarget.roomNumber}
          examDate={autoAssignTarget.examDate}
          examSession={autoAssignTarget.examSession}
          examTime={autoAssignTarget.examTime}
          rankLimits={rankLimits}
          onClose={() => {
            setShowAutoAssignModal(false);
            setAutoAssignTarget(null);
          }}
          onSuccess={loadAssignmentCounts}
        />
      )}

      {showBulkModal && bulkRooms.length > 0 && (
        <BulkAssignModal
          rooms={bulkRooms}
          rankLimits={rankLimits}
          onClose={handleBulkDone}
          onSuccess={loadAssignmentCounts}
        />
      )}

      {showLimitsModal && (
        <PeriodLimitsModal
          limits={rankLimits}
          onSave={setRankLimits}
          onClose={() => setShowLimitsModal(false)}
        />
      )}
    </DashboardLayout>
  );
};

export default ExamsOverview;
