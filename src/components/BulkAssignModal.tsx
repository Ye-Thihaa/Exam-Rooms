import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Zap,
  Calendar,
  UserCheck,
  UserX,
  Save,
  Eye,
} from "lucide-react";
import { type RankPeriodLimits } from "@/components/AutoAssignModal";
import { type BulkAssignContext } from "@/services/teacherassignmentQueries";
import { teacherAssignmentQueries } from "@/services/teacherassignmentQueries";
import { type RoomCardData } from "@/services/examRoomLinkQueries";
import type {
  ExamSession,
  TeacherRole,
  TeacherWithAvailability,
} from "@/services/teacherAssignmentTypes";

// ─── Pairing constants ────────────────────────────────────────────────────────

const SUPERVISOR_RANK = "Associate Professor";

const SUPERVISOR_ASSISTANT_PAIRS: Array<[string, string]> = [
  [SUPERVISOR_RANK, "Lecturer"],
  [SUPERVISOR_RANK, "Assistant Lecturer"],
  [SUPERVISOR_RANK, "Tutor"],
  [SUPERVISOR_RANK, "Associate Professor"],
];

// ─── Algorithm helpers ────────────────────────────────────────────────────────

type PairRecord = { supervisorId: number | null; assistantId: number | null };
type PairHistory = Map<string, PairRecord[]>;

/**
 * A teacher is eligible if:
 *  1. Available for the date (not already assigned elsewhere)
 *  2. Not already used in this bulk session (dayUsedIds)
 *  3. Their LIVE period count (mutated in-place as rooms are processed) is
 *     still below their rank limit.
 *
 * KEY: total_periods_assigned is mutated after each pick via
 * incrementPeriodCount(), so this check correctly enforces limits across
 * ALL rooms in the bulk run — not just within a single room's decision.
 */
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
 * After picking a teacher, increment their period count in ALL pool arrays
 * that reference them (both supervisors and assistants pools, since APs appear
 * in both). This keeps the running total live so future room picks respect
 * the rank limit correctly.
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

function pickPairedTeachers(
  supervisors: TeacherWithAvailability[],
  assistants: TeacherWithAvailability[],
  limits: RankPeriodLimits,
  dayUsedIds: Set<number>,
  pastPairs: PairRecord[],
  pairTypeUsage: Map<string, number>,
): {
  supervisor: TeacherWithAvailability | null;
  assistant: TeacherWithAvailability | null;
} {
  // Only APs can supervise; live period count checked via isEligible
  const eligibleSups = supervisors.filter(
    (t) => t.rank === SUPERVISOR_RANK && isEligible(t, limits, dayUsedIds),
  );
  const eligibleAssts = assistants.filter((t) =>
    isEligible(t, limits, dayUsedIds),
  );

  if (eligibleSups.length === 0) return { supervisor: null, assistant: null };

  const pastSupIds = new Set(
    pastPairs.map((p) => p.supervisorId).filter(Boolean) as number[],
  );
  const pastAsstIds = new Set(
    pastPairs.map((p) => p.assistantId).filter(Boolean) as number[],
  );

  // Build list of rank pairs that have at least one eligible assistant
  const viablePairs: Array<{ key: string; asstRank: string; usage: number }> =
    [];
  for (const [, asstRank] of SUPERVISOR_ASSISTANT_PAIRS) {
    const asstCandidates = eligibleAssts.filter((t) => t.rank === asstRank);
    if (asstCandidates.length === 0) continue;
    const key = `AP|${asstRank}`;
    viablePairs.push({ key, asstRank, usage: pairTypeUsage.get(key) ?? 0 });
  }

  if (viablePairs.length === 0) {
    // No eligible assistant of any rank — assign supervisor only
    const supPool = eligibleSups.filter((t) => !pastSupIds.has(t.teacher_id));
    return {
      supervisor: lowestWorkload(supPool.length > 0 ? supPool : eligibleSups),
      assistant: null,
    };
  }

  // Pick the least-used pair type for fair distribution
  const chosen = viablePairs.reduce((best, cur) =>
    cur.usage < best.usage ? cur : best,
  );
  pairTypeUsage.set(chosen.key, (pairTypeUsage.get(chosen.key) ?? 0) + 1);

  // Prefer supervisors not recently used for this room group
  const supFresh = eligibleSups.filter((t) => !pastSupIds.has(t.teacher_id));
  const supervisor = lowestWorkload(
    supFresh.length > 0 ? supFresh : eligibleSups,
  );

  // Pick assistant of chosen rank, excluding the supervisor
  const asstOfRank = eligibleAssts
    .filter((t) => t.rank === chosen.asstRank)
    .filter((t) => t.teacher_id !== supervisor.teacher_id);

  if (asstOfRank.length === 0) {
    // Fallback: any eligible assistant
    const anyAsst = eligibleAssts.filter(
      (t) => t.teacher_id !== supervisor.teacher_id,
    );
    if (anyAsst.length === 0) return { supervisor, assistant: null };
    const asstFresh = anyAsst.filter((t) => !pastAsstIds.has(t.teacher_id));
    return {
      supervisor,
      assistant: lowestWorkload(asstFresh.length > 0 ? asstFresh : anyAsst),
    };
  }

  const asstFresh = asstOfRank.filter((t) => !pastAsstIds.has(t.teacher_id));
  return {
    supervisor,
    assistant: lowestWorkload(asstFresh.length > 0 ? asstFresh : asstOfRank),
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

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

type Phase = "calculating" | "preview" | "saving" | "done";

// ─── Pure calculation (zero DB writes) ───────────────────────────────────────
//
// CRITICAL: after each teacher pick, call incrementPeriodCount() to update
// their total_periods_assigned in the shared ctx pools. Every subsequent room
// then sees the correct running total, so a rank limit (e.g. AP = 5) is
// enforced across ALL rooms in the bulk run — not just per individual room.
// ─────────────────────────────────────────────────────────────────────────────

function calculateAssignments(
  rooms: RoomCardData[],
  rankLimits: RankPeriodLimits,
  ctx: BulkAssignContext,
): { previews: RoomPreview[]; planned: PlannedAssignment[] } {
  const dayUsedIds = new Map<string, Set<number>>();
  const pairHistory: PairHistory = new Map();
  const pairTypeUsageByDate = new Map<string, Map<string, number>>();

  const previews: RoomPreview[] = [];
  const planned: PlannedAssignment[] = [];

  for (const room of rooms) {
    const date = room.examDate;

    if (!dayUsedIds.has(date)) {
      const existingBusy = ctx.busyByDate.get(date) ?? new Set<number>();
      dayUsedIds.set(date, new Set(existingBusy));
    }
    if (!pairTypeUsageByDate.has(date)) {
      pairTypeUsageByDate.set(date, new Map());
    }

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

    const { supervisor, assistant } = pickPairedTeachers(
      supervisors,
      assistants,
      rankLimits,
      todayUsed,
      pastPairs,
      pairTypeUsage,
    );

    if (supervisor) {
      todayUsed.add(supervisor.teacher_id);
      // ── Increment live count so future rooms respect the rank limit ──────
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
      // ── Increment live count so future rooms respect the rank limit ──────
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

// ─── TeacherChip sub-component ────────────────────────────────────────────────

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
      className={`shrink-0 h-6 w-6 rounded-full flex items-center justify-center ${
        found ? "bg-emerald-100" : "bg-amber-100"
      }`}
    >
      {found ? (
        <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
      ) : (
        <UserX className="h-3.5 w-3.5 text-amber-600" />
      )}
    </div>
    <div className="min-w-0">
      <span
        className={`font-bold uppercase tracking-wide text-[10px] block ${
          found ? "text-emerald-700" : "text-amber-700"
        }`}
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

// ─── Main modal ───────────────────────────────────────────────────────────────

interface BulkAssignModalProps {
  rooms: RoomCardData[];
  rankLimits: RankPeriodLimits;
  onClose: () => void;
  onSuccess: () => void;
}

const BulkAssignModal: React.FC<BulkAssignModalProps> = ({
  rooms,
  rankLimits,
  onClose,
  onSuccess,
}) => {
  const [phase, setPhase] = useState<Phase>("calculating");
  const [statusMsg, setStatusMsg] = useState("Pre-fetching data…");
  const [previews, setPreviews] = useState<RoomPreview[]>([]);
  const [planned, setPlanned] = useState<PlannedAssignment[]>([]);
  const [saveResults, setSaveResults] = useState<
    { roomKey: string; ok: boolean; msg?: string }[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  // Phase 1: prefetch + calculate (pure, no DB writes)
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
    await new Promise((r) => setTimeout(r, 120));

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

  // Phase 3: write to DB
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

    const resultMap = new Map<number, { ok: boolean; msg?: string }>();

    try {
      await teacherAssignmentQueries.batchCommitAssignments(toCommit);
      previews.forEach((pv) => {
        if (pv.examRoomId !== null)
          resultMap.set(pv.examRoomId, { ok: pv.ok, msg: pv.msg });
      });
    } catch (e: any) {
      setError("Database write failed: " + (e?.message ?? "Unknown error"));
      previews.forEach((pv) => {
        if (pv.examRoomId !== null)
          resultMap.set(pv.examRoomId, { ok: false, msg: "DB write failed" });
      });
    }

    setSaveResults(
      previews.map((pv) => {
        if (pv.examRoomId === null)
          return {
            roomKey: pv.room.key,
            ok: false,
            msg: pv.msg ?? "Room not found",
          };
        const r = resultMap.get(pv.examRoomId);
        return { roomKey: pv.room.key, ok: r?.ok ?? false, msg: r?.msg };
      }),
    );

    setPhase("done");
    onSuccess();
  };

  // ── Derived ────────────────────────────────────────────────────────────────

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

  // ── Rank limit summary for preview banner ─────────────────────────────────

  const rankLimitSummary = Object.entries(rankLimits)
    .map(([rank, limit]) => `${rank} (max ${limit})`)
    .join(" · ");

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white border rounded-xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Calculating */}
          {phase === "calculating" && (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">{statusMsg}</p>
                <p className="text-xs mt-1">
                  This may take a moment for large schedules…
                </p>
              </div>
            </div>
          )}

          {/* Saving */}
          {phase === "saving" && (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">{statusMsg}</p>
                <p className="text-xs mt-1">
                  Writing {totalTeachers} teacher assignment
                  {totalTeachers !== 1 ? "s" : ""} to database…
                </p>
              </div>
            </div>
          )}

          {/* Preview */}
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

              {/* Period limits banner */}
              {rankLimitSummary && (
                <div className="px-4 py-2.5 rounded-lg bg-blue-50 border border-blue-100">
                  <p className="text-xs text-blue-700">
                    <span className="font-semibold">
                      Period limits enforced:
                    </span>{" "}
                    {rankLimitSummary}
                  </p>
                </div>
              )}

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

          {/* Done */}
          {phase === "done" && (
            <>
              <div
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                  error
                    ? "bg-amber-50 border-amber-200"
                    : "bg-emerald-50 border-emerald-200"
                }`}
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
                      : "Saved to database successfully"}
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

        {/* Footer */}
        <div className="px-6 py-4 border-t shrink-0 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {phase === "preview" &&
              `${totalTeachers} assignment${totalTeachers !== 1 ? "s" : ""} ready to save`}
            {phase === "done" &&
              `${saveResults.filter((r) => r.ok).length} of ${rooms.length} rooms saved to database`}
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

export default BulkAssignModal;
