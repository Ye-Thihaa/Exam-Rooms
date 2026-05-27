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
ShieldAlert,
FileDown,
Search,
UserCog,
ArrowLeftRight,
RefreshCw,
} from "lucide-react";
import AutoAssignModal from "@/components/AutoAssignModal";
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
import {
enrichTeacherWithCapability,
getWorkloadLevel,
} from "@/services/teacherAssignmentTypes";

import supabase from "@/utils/supabase";
import RankConfigModal from "@/components/RankConfigModal";
import {
type RankConfig,
type AssignmentRankConfig,
buildAssignmentConfig,
loadRankConfig,
saveRankConfig,
DEFAULT_RANKS,
} from "@/services/rankConfig";
// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────



// ─────────────────────────────────────────────────────────────────────────────
// Replace your existing pickPairedTeachers with this
// ─────────────────────────────────────────────────────────────────────────────

function pickPairedTeachersWithCounter(
  allTeachers: TeacherWithAvailability[],
  rankConfig: AssignmentRankConfig,
  dayUsedIds: Set<number>,
  blockedDeptIds: Set<number> = new Set(),
  ruleCounter: Map<string, number>,  // ← shared across rooms for this date
): {
  supervisor: TeacherWithAvailability | null;
  assistant: TeacherWithAvailability | null;
} {
  const supervisorRanks = new Set(
    rankConfig.ranks.filter((r) => r.canSupervise).map((r) => r.name),
  );
  const assistantRanks = new Set(
    rankConfig.ranks.filter((r) => r.canAssist).map((r) => r.name),
  );

  const eligible = allTeachers.filter((t) =>
    isEligible(t, rankConfig, dayUsedIds, blockedDeptIds),
  );

  const eligibleSups  = eligible.filter((t) => supervisorRanks.has(t.rank));
  const eligibleAssts = eligible.filter((t) => assistantRanks.has(t.rank));

  if (eligibleSups.length === 0) return { supervisor: null, assistant: null };

  // All viable pairing rules that have candidates available right now
  const viablePairs = rankConfig.pairingRules.filter((rule) =>
    eligibleSups.some((t) => t.rank === rule.supervisorRank) &&
    eligibleAssts.some((t) => t.rank === rule.assistantRank),
  );

  if (viablePairs.length === 0) {
    return { supervisor: lowestWorkload(eligibleSups), assistant: null };
  }

  // ── True round-robin: pick the viable rule used least times this date ──────
  const chosenRule = viablePairs.reduce((best, rule) => {
    const key = `${rule.supervisorRank}|${rule.assistantRank}`;
    const bestKey = `${best.supervisorRank}|${best.assistantRank}`;
    return (ruleCounter.get(key) ?? 0) < (ruleCounter.get(bestKey) ?? 0) ? rule : best;
  });

  // Increment counter for chosen rule
  const chosenKey = `${chosenRule.supervisorRank}|${chosenRule.assistantRank}`;
  ruleCounter.set(chosenKey, (ruleCounter.get(chosenKey) ?? 0) + 1);

  // Pick lowest-workload supervisor of the chosen rank
  const supCandidates = eligibleSups.filter((t) => t.rank === chosenRule.supervisorRank);
  const supervisor = lowestWorkload(supCandidates);

  // Pick lowest-workload assistant of the chosen rank, excluding supervisor
  const asstCandidates = eligibleAssts.filter(
    (t) => t.rank === chosenRule.assistantRank && t.teacher_id !== supervisor.teacher_id,
  );
  const assistant = asstCandidates.length > 0 ? lowestWorkload(asstCandidates) : null;

  return { supervisor, assistant };
}

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

interface StandbyAssignment {
teacherId: number;
teacherName: string;
teacherRank: string;
teacherDepartment?: string;
examDate: string;
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
role: TeacherRole | "Standby";
session: ExamSession;
shift_start: string | null;
shift_end: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// DB helpers
// ─────────────────────────────────────────────────────────────────────────────

async function fetchRoomAssignments(
examRoomId: number,
examDate: string,
): Promise<RoomAssignment[]> {
const { data, error } = await supabase
  .from("teacher_assignment")
  .select(
    `role, session, shift_start, shift_end,
      teacher:teacher_id (name, rank)`,
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

async function fetchAllStandbyAssignments(): Promise<StandbyAssignment[]> {
const { data, error } = await supabase
  .from("teacher_assignment")
  .select(
    `exam_date, teacher:teacher_id (teacher_id, name, rank, department_id)`,
  )
  .eq("role", "Standby")
  .is("exam_room_id", null)
  .order("exam_date", { ascending: true });

if (error) throw error;

return (data ?? []).map((row: any) => ({
  teacherId: row.teacher?.teacher_id,
  teacherName: row.teacher?.name ?? "Unknown",
  teacherRank: row.teacher?.rank ?? "",
  teacherDepartment: row.teacher?.department ?? "",
  examDate: row.exam_date,
}));
}

async function fetchStandbyByDate(
examDate: string,
): Promise<StandbyAssignment[]> {
const { data, error } = await supabase
  .from("teacher_assignment")
  .select(
    `exam_date, teacher:teacher_id (teacher_id, name, rank, department_id)`,
  )
  .eq("role", "Standby")
  .eq("exam_date", examDate)
  .is("exam_room_id", null);

if (error) throw error;

return (data ?? []).map((row: any) => ({
  teacherId: row.teacher?.teacher_id,
  teacherName: row.teacher?.name ?? "Unknown",
  teacherRank: row.teacher?.rank ?? "",
  teacherDepartment: row.teacher?.department_id?.toString() ?? "",
  examDate: row.exam_date,
}));
}

async function commitStandbyAssignments(
standbys: StandbyAssignment[],
): Promise<void> {
if (standbys.length === 0) return;
const rows = standbys.map((s) => ({
  teacher_id: s.teacherId,
  role: "Standby",
  exam_date: s.examDate,
  session: "Morning",
  exam_room_id: null,
  shift_start: null,
  shift_end: null,
}));
const { error } = await supabase.from("teacher_assignment").insert(rows);
if (error) throw error;
}

async function deleteStandbyByDateAndTeacher(
examDate: string,
teacherId: number,
): Promise<void> {
const { error } = await supabase
  .from("teacher_assignment")
  .delete()
  .eq("role", "Standby")
  .eq("exam_date", examDate)
  .eq("teacher_id", teacherId)
  .is("exam_room_id", null);
if (error) throw error;
}

async function fetchAvailableTeachersForDate(
examDate: string,
): Promise<TeacherWithAvailability[]> {
const { data: teachers, error: tErr } = await supabase
  .from("teacher")
  .select("teacher_id, name, rank, department_id, total_periods_assigned")
  .order("name");
if (tErr) throw tErr;

const { data: assigned, error: aErr } = await supabase
  .from("teacher_assignment")
  .select("teacher_id")
  .eq("exam_date", examDate);
if (aErr) throw aErr;

const assignedIds = new Set((assigned ?? []).map((a: any) => a.teacher_id));

return (teachers ?? []).map((t: any) => {
  const enriched = enrichTeacherWithCapability(t);
  const isBusy = assignedIds.has(t.teacher_id);
  return {
    ...enriched,
    total_periods_assigned: isBusy ? 999 : (t.total_periods_assigned ?? 0),
    availability: {
      teacher_id: t.teacher_id,
      is_available: !isBusy,
      conflict_reason: isBusy ? "Already Assigned" : null,
    },
    workload_level: getWorkloadLevel(t.total_periods_assigned),
  };
});
}

// ─────────────────────────────────────────────────────────────────────────────
// Algorithm helpers
// ─────────────────────────────────────────────────────────────────────────────

function isEligible(t, rankConfig, dayUsedIds, blockedDeptIds) {
const limit = rankConfig.periodLimits[t.rank];
return (
  t.availability.is_available &&
  !dayUsedIds.has(t.teacher_id) &&
  !blockedDeptIds.has(t.department_id ?? -1) &&
  (limit === undefined || (t.total_periods_assigned ?? 0) < limit)
);
}
function lowestWorkload(
candidates: TeacherWithAvailability[],
): TeacherWithAvailability {
const minLoad = Math.min(...candidates.map(t => t.total_periods_assigned ?? 0));
const tied = candidates.filter(t => (t.total_periods_assigned ?? 0) === minLoad);
return tied[Math.floor(Math.random() * tied.length)];
}

// ── Replace incrementPeriodCount ─────────────────────────────────────────────
function incrementPeriodCount(teacherId: number, ctx: BulkAssignContext): void {
  // Update ALL pools so workload stays consistent across rooms
  for (const t of ctx.supervisors) {
    if (t.teacher_id === teacherId)
      t.total_periods_assigned = (t.total_periods_assigned ?? 0) + 1;
  }
  for (const t of ctx.assistants) {
    if (t.teacher_id === teacherId)
      t.total_periods_assigned = (t.total_periods_assigned ?? 0) + 1;
  }
  for (const t of ctx.allTeachers) {   // ← ADD THIS: keep allTeachers in sync
    if (t.teacher_id === teacherId)
      t.total_periods_assigned = (t.total_periods_assigned ?? 0) + 1;
  }
}
function calculateAssignments(
  rooms: RoomCardData[],
  rankConfig: AssignmentRankConfig,
  ctx: BulkAssignContext,
): { previews: RoomPreview[]; planned: PlannedAssignment[] } {
  const dayUsedIds = new Map<string, Set<number>>();
  // ── Per-date rule usage counter for round-robin ───────────────────────────
  const ruleCounterByDate = new Map<string, Map<string, number>>();
  const previews: RoomPreview[] = [];
  const planned: PlannedAssignment[] = [];

  for (const room of rooms) {
    const date = room.examDate;

    if (!dayUsedIds.has(date)) {
      dayUsedIds.set(date, new Set(ctx.busyByDate.get(date) ?? new Set()));
    }
    if (!ruleCounterByDate.has(date)) {
      ruleCounterByDate.set(date, new Map());
    }

    const todayUsed = dayUsedIds.get(date)!;
    const ruleCounter = ruleCounterByDate.get(date)!;

    const resolved = teacherAssignmentQueries.resolveRoomLink(
      room.roomNumber, date, ctx,
    );
    if (resolved === null) {
      previews.push({ room, examRoomId: null, ok: false, msg: "Room not found for this date", supervisor: null, assistant: null });
      continue;
    }

    const { examRoomId, linkId } = resolved;
    const effectiveSession: ExamSession = room.examSession || "Morning";

    const allAvailable: TeacherWithAvailability[] = ctx.allTeachers.map((t) => ({
      ...t,
      availability: {
        teacher_id: t.teacher_id,
        is_available: !todayUsed.has(t.teacher_id),
        conflict_reason: todayUsed.has(t.teacher_id) ? "Already Assigned" : null,
      },
    }));

    const blockedDeptIds = new Set<number>([
      ...room.primaryExams.map((e: any) => e.department_id).filter(Boolean),
      ...room.secondaryExams.map((e: any) => e.department_id).filter(Boolean),
    ]);

    const { supervisor, assistant } = pickPairedTeachersWithCounter(
      allAvailable,
      rankConfig,
      todayUsed,
      blockedDeptIds,
      ruleCounter,   // ← pass counter in
    );

    if (supervisor) {
      todayUsed.add(supervisor.teacher_id);
      incrementPeriodCount(supervisor.teacher_id, ctx);
      planned.push({
        examRoomId, linkId,
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
        examRoomId, linkId,
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

    previews.push({
      room, examRoomId,
      ok: supervisor !== null || assistant !== null,
      msg: supervisor === null && assistant === null ? "No available teachers" : undefined,
      supervisor,
      assistant,
    });
  }

  return { previews, planned };
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF Export utility
// ─────────────────────────────────────────────────────────────────────────────

function exportStandbyPDF(standbys: StandbyAssignment[]) {
if (standbys.length === 0) return;

const byDate: Record<string, StandbyAssignment[]> = {};
standbys.forEach((s) => {
  if (!byDate[s.examDate]) byDate[s.examDate] = [];
  byDate[s.examDate].push(s);
});

const today = new Date().toLocaleDateString("en-GB", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const rows = Object.entries(byDate)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([date, teachers]) => {
    return teachers
      .map(
        (t, i) => `
        <tr>
          ${i === 0 ? `<td rowspan="${teachers.length}" class="date-cell">${date}</td>` : ""}
          <td>${i + 1}</td>
          <td>${t.teacherName}</td>
          <td>${t.teacherRank}</td>
          <td>${t.teacherDepartment ?? "—"}</td>
        </tr>`,
      )
      .join("");
  })
  .join("");

const totalTeachers = standbys.length;
const totalDates = Object.keys(byDate).length;

const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <title>Standby Teacher List</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #1a1a2e; padding: 32px 40px; background: #fff; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #4f46e5; padding-bottom: 16px; margin-bottom: 24px; }
      .header-left h1 { font-size: 20pt; font-weight: 800; color: #4f46e5; letter-spacing: -0.5px; }
      .header-left p { font-size: 9.5pt; color: #6b7280; margin-top: 4px; }
      .header-right { text-align: right; font-size: 9pt; color: #6b7280; line-height: 1.6; }
      .summary-row { display: flex; gap: 16px; margin-bottom: 24px; }
      .summary-card { flex: 1; background: #f0f0ff; border: 1px solid #c7d2fe; border-radius: 8px; padding: 12px 16px; text-align: center; }
      .summary-card .num { font-size: 22pt; font-weight: 800; color: #4f46e5; }
      .summary-card .lbl { font-size: 8.5pt; color: #6b7280; margin-top: 2px; }
      table { width: 100%; border-collapse: collapse; font-size: 10pt; }
      thead tr { background: #4f46e5; color: #fff; }
      thead th { padding: 10px 12px; text-align: left; font-weight: 700; font-size: 9pt; letter-spacing: 0.3px; }
      tbody tr:nth-child(even) { background: #f8f8ff; }
      tbody td { padding: 9px 12px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
      .date-cell { font-weight: 700; color: #4f46e5; background: #eef2ff !important; border-right: 2px solid #c7d2fe; white-space: nowrap; }
      .footer { margin-top: 32px; font-size: 8.5pt; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px; display: flex; justify-content: space-between; }
      @media print { body { padding: 20px 24px; } thead { display: table-header-group; } tr { page-break-inside: avoid; } }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="header-left"><h1>🛡️ Standby Teacher List</h1><p>Exam Invigilation — Standby Assignments by Date</p></div>
      <div class="header-right"><div>Generated: ${today}</div><div>Document: STANDBY-${new Date().getFullYear()}</div></div>
    </div>
    <div class="summary-row">
      <div class="summary-card"><div class="num">${totalTeachers}</div><div class="lbl">Total Standby Teachers</div></div>
      <div class="summary-card"><div class="num">${totalDates}</div><div class="lbl">Exam Dates</div></div>
    </div>
    <table>
      <thead><tr><th style="width:120px">Exam Date</th><th style="width:36px">#</th><th>Teacher Name</th><th>Rank</th><th>Department</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="footer"><span>Confidential — For Internal Use Only</span><span>Total: ${totalTeachers} standby teacher${totalTeachers !== 1 ? "s" : ""} across ${totalDates} date${totalDates !== 1 ? "s" : ""}</span></div>
  </body>
  </html>
`;

const win = window.open("", "_blank", "width=900,height=700");
if (!win) return;
win.document.write(html);
win.document.close();
win.focus();
setTimeout(() => { win.print(); }, 500);
}

// ─────────────────────────────────────────────────────────────────────────────
// Manual Pair Modal
// ─────────────────────────────────────────────────────────────────────────────

interface ManualPairTarget {
room: RoomCardData;
examRoomId: number;
examSession: ExamSession;
examTime?: { start: string; end: string } | null;
}

const ManualPairModal: React.FC<{
target: ManualPairTarget;
  rankConfig: AssignmentRankConfig; 
onClose: () => void;
onSuccess: () => void;
}> = ({ target, rankConfig,onClose, onSuccess }) => {
const { room, examRoomId, examSession, examTime } = target;

const [loadingTeachers, setLoadingTeachers] = useState(true);
const [saving, setSaving] = useState(false);
const [error, setError] = useState<string | null>(null);

const [allTeachers, setAllTeachers] = useState<TeacherWithAvailability[]>([]);
const [supervisorId, setSupervisorId] = useState<number | null>(null);
const [assistantId, setAssistantId] = useState<number | null>(null);

const [supSearch, setSupSearch] = useState("");
const [asstSearch, setAsstSearch] = useState("");
const [activePanel, setActivePanel] = useState<"supervisor" | "assistant">("supervisor");

useEffect(() => {
  (async () => {
    setLoadingTeachers(true);
    try {
      const { data, error: tErr } = await supabase
        .from("teacher")
        .select("teacher_id, name, rank, department_id, total_periods_assigned")
        .order("name");
      if (tErr) throw tErr;

      const { data: assigned, error: aErr } = await supabase
        .from("teacher_assignment")
        .select("teacher_id")
        .eq("exam_date", room.examDate);
      if (aErr) throw aErr;

      const assignedIds = new Set((assigned ?? []).map((a: any) => a.teacher_id));

      const enriched = (data ?? []).map((t: any) => ({
        ...enrichTeacherWithCapability(t),
        total_periods_assigned: t.total_periods_assigned ?? 0,
        availability: {
          teacher_id: t.teacher_id,
          is_available: !assignedIds.has(t.teacher_id),
          conflict_reason: assignedIds.has(t.teacher_id) ? "Already Assigned" : null,
        },
        workload_level: getWorkloadLevel(t.total_periods_assigned),
      }));

      setAllTeachers(enriched);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load teachers");
    } finally {
      setLoadingTeachers(false);
    }
  })();
}, [room.examDate]);

const supervisorTeacher = allTeachers.find((t) => t.teacher_id === supervisorId) ?? null;
const assistantTeacher = allTeachers.find((t) => t.teacher_id === assistantId) ?? null;

const rankConflict =
  supervisorTeacher &&
  assistantTeacher &&
  (rankConfig.rankOrder[supervisorTeacher.rank] ?? 0) <= (rankConfig.rankOrder[assistantTeacher.rank] ?? 0);

const supFiltered = allTeachers.filter(
  (t) =>
    t.teacher_id !== assistantId &&
    (t.name.toLowerCase().includes(supSearch.toLowerCase()) ||
      t.rank.toLowerCase().includes(supSearch.toLowerCase())),
);

const asstFiltered = allTeachers.filter(
  (t) =>
    t.teacher_id !== supervisorId &&
    (t.name.toLowerCase().includes(asstSearch.toLowerCase()) ||
      t.rank.toLowerCase().includes(asstSearch.toLowerCase())),
);

const workloadBadge = (periods: number) => {
  if (periods >= 8) return { label: "High", cls: "bg-red-100 text-red-700" };
  if (periods >= 5) return { label: "Med", cls: "bg-amber-100 text-amber-700" };
  return { label: "Low", cls: "bg-emerald-100 text-emerald-700" };
};

const handleSave = async () => {
  if (!supervisorId && !assistantId) {
    setError("Please select at least a supervisor.");
    return;
  }
  if (rankConflict) {
    setError("Supervisor rank must be higher than assistant rank.");
    return;
  }

  setSaving(true);
  setError(null);
  try {
    await supabase
      .from("teacher_assignment")
      .delete()
      .eq("exam_room_id", examRoomId)
      .eq("exam_date", room.examDate);

    const rows: any[] = [];
    if (supervisorId) {
      rows.push({
        exam_room_id: examRoomId,
        teacher_id: supervisorId,
        role: "Supervisor",
        exam_date: room.examDate,
        session: examSession,
        shift_start: examTime?.start ?? null,
        shift_end: examTime?.end ?? null,
      });
    }
    if (assistantId) {
      rows.push({
        exam_room_id: examRoomId,
        teacher_id: assistantId,
        role: "Assistant",
        exam_date: room.examDate,
        session: examSession,
        shift_start: examTime?.start ?? null,
        shift_end: examTime?.end ?? null,
      });
    }

    if (rows.length > 0) {
      const { error: insErr } = await supabase
        .from("teacher_assignment")
        .insert(rows);
      if (insErr) throw insErr;
    }

    onSuccess();
    onClose();
  } catch (e: any) {
    setError(e?.message ?? "Failed to save assignment");
  } finally {
    setSaving(false);
  }
};

const TeacherPickerList: React.FC<{
  role: "supervisor" | "assistant";
  teachers: TeacherWithAvailability[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  search: string;
  onSearchChange: (v: string) => void;
}> = ({ role, teachers, selectedId, onSelect, search, onSearchChange }) => {
  const isSup = role === "supervisor";
  const accentCls = isSup
    ? "border-blue-300 bg-blue-50/60 ring-blue-300"
    : "border-purple-300 bg-purple-50/60 ring-purple-300";
  const headerCls = isSup ? "text-blue-700 bg-blue-50" : "text-purple-700 bg-purple-50";
  const iconCls = isSup ? "text-blue-500" : "text-purple-500";
  const label = isSup ? "Supervisor" : "Assistant";

  return (
    <div className="flex flex-col min-h-0">
      <div className={`flex items-center gap-2 px-3 py-2 rounded-t-lg border-b ${headerCls}`}>
        {isSup ? (
          <UserCheck className={`h-4 w-4 shrink-0 ${iconCls}`} />
        ) : (
          <UserCog className={`h-4 w-4 shrink-0 ${iconCls}`} />
        )}
        <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
        {selectedId && (
          <button
            onClick={() => onSelect(null)}
            className="ml-auto text-[10px] font-semibold text-muted-foreground hover:text-destructive transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {selectedId ? (
        (() => {
          const sel = teachers.find((t) => t.teacher_id === selectedId) ??
            allTeachers.find((t) => t.teacher_id === selectedId);
          if (!sel) return null;
          const wb = workloadBadge(sel.total_periods_assigned ?? 0);
          return (
            <div className={`mx-2 mt-2 mb-1 flex items-center gap-2 p-2 rounded-lg border-2 ${accentCls}`}>
              <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${isSup ? "bg-blue-100" : "bg-purple-100"}`}>
                <UserCheck className={`h-3.5 w-3.5 ${iconCls}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-900 truncate">{sel.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{sel.rank}</p>
              </div>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${wb.cls}`}>{wb.label}</span>
            </div>
          );
        })()
      ) : (
        <div className="mx-2 mt-2 mb-1 flex items-center gap-2 p-2 rounded-lg border border-dashed border-gray-200 text-xs text-muted-foreground italic">
          <UserX className="h-3.5 w-3.5 shrink-0" />
          No {label.toLowerCase()} selected
        </div>
      )}

      <div className="relative mx-2 mb-1">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder={`Search ${label.toLowerCase()}…`}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 h-8 text-xs"
          onFocus={() => setActivePanel(role)}
        />
      </div>

      <div className="flex-1 overflow-y-auto mx-2 mb-2 space-y-0.5 max-h-64">
        {teachers.length === 0 ? (
          <p className="text-center py-6 text-xs text-muted-foreground">No teachers found</p>
        ) : (
          teachers.map((t) => {
            const isSelected = t.teacher_id === selectedId;
            const isBusy = !t.availability.is_available;
            const wb = workloadBadge(t.total_periods_assigned ?? 0);
            return (
              <button
                key={t.teacher_id}
                onClick={() => onSelect(isSelected ? null : t.teacher_id)}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all text-xs ${
                  isSelected
                    ? `${accentCls} ring-1`
                    : isBusy
                      ? "opacity-50 bg-gray-50 border border-gray-100 hover:opacity-70"
                      : "bg-white border border-gray-100 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className={`shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  isSelected
                    ? (isSup ? "bg-blue-500 border-blue-500" : "bg-purple-500 border-purple-500")
                    : "border-gray-300"
                }`}>
                  {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{t.name}</p>
                  <p className="text-[10px] text-muted-foreground">{t.rank}</p>
                </div>
                <div className="flex flex-col items-end gap-0.5 shrink-0">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${wb.cls}`}>{wb.label}</span>
                  {isBusy && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      Busy
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

return (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[65] p-4">
    <div className="bg-white border rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh]">
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-indigo-100 flex items-center justify-center">
            <ArrowLeftRight className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Manual Pair Assignment</h2>
            <p className="text-xs text-muted-foreground">
              Room {room.roomNumber} · {room.examDate} · {examSession}
              {examTime && ` · ${examTime.start}–${examTime.end}`}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="mx-6 mt-4 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-indigo-50 border border-indigo-200 text-xs text-indigo-800 shrink-0">
        <RefreshCw className="h-3.5 w-3.5 shrink-0 mt-0.5 text-indigo-500" />
        <span>
          <strong>Reassignment mode:</strong> Saving will <strong>replace</strong> any existing invigilators for this room. Busy teachers can still be selected (admin override).
        </span>
      </div>

      {rankConflict && (
        <div className="mx-6 mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 shrink-0">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>
            <strong>{supervisorTeacher?.name}</strong> ({supervisorTeacher?.rank}) cannot supervise{" "}
            <strong>{assistantTeacher?.name}</strong> ({assistantTeacher?.rank}) — supervisor rank must be higher.
          </span>
        </div>
      )}

      <div className="flex-1 overflow-hidden grid grid-cols-2 divide-x mt-4 min-h-0">
        {loadingTeachers ? (
          <div className="col-span-2 flex items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
            <span className="text-sm">Loading teachers…</span>
          </div>
        ) : (
          <>
            <TeacherPickerList
              role="supervisor"
              teachers={supFiltered}
              selectedId={supervisorId}
              onSelect={setSupervisorId}
              search={supSearch}
              onSearchChange={setSupSearch}
            />
            <TeacherPickerList
              role="assistant"
              teachers={asstFiltered}
              selectedId={assistantId}
              onSelect={setAssistantId}
              search={asstSearch}
              onSearchChange={setAsstSearch}
            />
          </>
        )}
      </div>

      {(supervisorId || assistantId) && !loadingTeachers && (
        <div className="mx-6 mt-2 mb-1 flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 border text-xs text-gray-700 shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-blue-400" />
            <span className="font-medium">Supervisor:</span>
            <span>{supervisorTeacher?.name ?? <span className="italic text-muted-foreground">None</span>}</span>
          </div>
          <ArrowLeftRight className="h-3 w-3 text-muted-foreground shrink-0" />
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-purple-400" />
            <span className="font-medium">Assistant:</span>
            <span>{assistantTeacher?.name ?? <span className="italic text-muted-foreground">None</span>}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="mx-6 mb-2 flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs shrink-0">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <div className="px-6 py-4 border-t shrink-0 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {!supervisorId && !assistantId
            ? "Select at least one teacher to save"
            : `${[supervisorId && "1 supervisor", assistantId && "1 assistant"].filter(Boolean).join(" + ")} ready`}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="gap-2 bg-indigo-600 hover:bg-indigo-700"
            onClick={handleSave}
            disabled={saving || loadingTeachers || (!supervisorId && !assistantId) || !!rankConflict}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Saving…" : "Save Pair"}
          </Button>
        </div>
      </div>
    </div>
  </div>
);
};

// ─────────────────────────────────────────────────────────────────────────────
// Standby Modal
// ─────────────────────────────────────────────────────────────────────────────

const StandbyAssignModal: React.FC<{
examDate: string;
existingStandbys: StandbyAssignment[];
onClose: () => void;
onSaved: (standbys: StandbyAssignment[]) => void;
}> = ({ examDate, existingStandbys, onClose, onSaved }) => {
const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState(false);
const [error, setError] = useState<string | null>(null);
const [teachers, setTeachers] = useState<TeacherWithAvailability[]>([]);
const [selectedIds, setSelectedIds] = useState<Set<number>>(
  new Set(existingStandbys.map((s) => s.teacherId)),
);
const [search, setSearch] = useState("");

useEffect(() => {
  (async () => {
    setLoading(true);
    try {
      const list = await fetchAvailableTeachersForDate(examDate);
      setTeachers(list);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load teachers");
    } finally {
      setLoading(false);
    }
  })();
}, [examDate]);

const filtered = teachers.filter(
  (t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.rank.toLowerCase().includes(search.toLowerCase()) ||
    (t.department_id?.toString() ?? "").toLowerCase().includes(search.toLowerCase()),
);

const toggleTeacher = (id: number) => {
  setSelectedIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
};

const handleSave = async () => {
  setSaving(true);
  setError(null);
  try {
    for (const s of existingStandbys) {
      await deleteStandbyByDateAndTeacher(examDate, s.teacherId);
    }
    const newStandbys: StandbyAssignment[] = teachers
      .filter((t) => selectedIds.has(t.teacher_id))
      .map((t) => ({
        teacherId: t.teacher_id,
        teacherName: t.name,
        teacherRank: t.rank,
        teacherDepartment_id: t.department_id,
        examDate,
      }));
    await commitStandbyAssignments(newStandbys);
    onSaved(newStandbys);
    onClose();
  } catch (e: any) {
    setError(e?.message ?? "Failed to save standby assignments");
  } finally {
    setSaving(false);
  }
};

return (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
    <div className="bg-white border rounded-xl max-w-lg w-full shadow-2xl flex flex-col max-h-[88vh]">
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-violet-100 flex items-center justify-center">
            <ShieldAlert className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Assign Standby Teachers</h2>
            <p className="text-xs text-muted-foreground">{examDate}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="px-4 pt-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, rank, or department…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        {selectedIds.size > 0 && (
          <p className="text-xs text-violet-700 font-semibold mt-2">
            {selectedIds.size} teacher{selectedIds.size !== 1 ? "s" : ""} selected
          </p>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5">
        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
            <span className="text-sm">Loading teachers…</span>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center py-8 text-sm text-muted-foreground">No teachers found</p>
        ) : (
          filtered.map((t) => {
            const isSelected = selectedIds.has(t.teacher_id);
            const isBusy = !t.availability.is_available;
            return (
              <button
                key={t.teacher_id}
                onClick={() => toggleTeacher(t.teacher_id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all ${
                  isSelected
                    ? "bg-violet-50 border-violet-300 ring-1 ring-violet-300"
                    : isBusy
                      ? "bg-gray-50 border-gray-200 opacity-60"
                      : "bg-white border-gray-200 hover:border-violet-200 hover:bg-violet-50/30"
                }`}
              >
                <div className={`shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? "bg-violet-500 border-violet-500" : "border-gray-300"}`}>
                  {isSelected && <CheckCircle2 className="h-4 w-4 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{t.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {t.rank}{t.department_id ? ` · ${t.department_id}` : ""}
                  </p>
                </div>
                {isBusy && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                    Assigned
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
      {error && (
        <div className="mx-4 mb-2 flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}
      <div className="px-6 py-4 border-t flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {selectedIds.size} standby teacher{selectedIds.size !== 1 ? "s" : ""} for {examDate}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button
            size="sm"
            className="gap-2 bg-violet-600 hover:bg-violet-700"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving…" : "Save Standby"}
          </Button>
        </div>
      </div>
    </div>
  </div>
);
};
const TeacherChip: React.FC<{
label: string;
name: string;
rank: string;
found: boolean;
}> = ({ label, name, rank, found }) => (
<div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${found ? "bg-emerald-50 border border-emerald-200" : "bg-amber-50 border border-amber-200"}`}>
  <div className={`shrink-0 h-6 w-6 rounded-full flex items-center justify-center ${found ? "bg-emerald-100" : "bg-amber-100"}`}>
    {found ? <UserCheck className="h-3.5 w-3.5 text-emerald-600" /> : <UserX className="h-3.5 w-3.5 text-amber-600" />}
  </div>
  <div className="min-w-0">
    <span className={`font-bold uppercase tracking-wide text-[10px] block ${found ? "text-emerald-700" : "text-amber-700"}`}>{label}</span>
    {found ? (
      <p className="font-semibold text-gray-800 truncate">{name} <span className="font-normal text-muted-foreground">· {rank}</span></p>
    ) : (
      <p className="text-amber-700 truncate">{name}</p>
    )}
  </div>
</div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Standby chip
// ─────────────────────────────────────────────────────────────────────────────

const StandbyChip: React.FC<{ standby: StandbyAssignment; index: number }> = ({ standby, index }) => (
<div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs bg-violet-50 border border-violet-200">
  <div className="shrink-0 h-6 w-6 rounded-full bg-violet-100 flex items-center justify-center">
    <ShieldAlert className="h-3.5 w-3.5 text-violet-600" />
  </div>
  <div className="min-w-0">
    <span className="font-bold uppercase tracking-wide text-[10px] block text-violet-700">Standby {index + 1}</span>
    <p className="font-semibold text-gray-800 truncate">{standby.teacherName} <span className="font-normal text-muted-foreground">· {standby.teacherRank}</span></p>
  </div>
</div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Bulk assign modal (inline, uses same fixed pickPairedTeachers above)
// ─────────────────────────────────────────────────────────────────────────────

const BulkAssignModal: React.FC<{
rooms: RoomCardData[];
rankConfig: AssignmentRankConfig; //
onClose: () => void;
onSuccess: () => void;
}> = ({ rooms, rankConfig, onClose, onSuccess }) => {
const [phase, setPhase] = useState<BulkPhase>("calculating");
const [statusMsg, setStatusMsg] = useState("Pre-fetching data…");
const [previews, setPreviews] = useState<RoomPreview[]>([]);
const [planned, setPlanned] = useState<PlannedAssignment[]>([]);
const [saveResults, setSaveResults] = useState<{ roomKey: string; ok: boolean; msg?: string }[]>([]);
const [error, setError] = useState<string | null>(null);

const calculate = useCallback(async () => {
  setPhase("calculating");
  setStatusMsg("Pre-fetching data from database…");
  setError(null);

  const dates = [...new Set(rooms.map((r) => r.examDate))];
  let ctx: BulkAssignContext;
  try {
    ctx = await teacherAssignmentQueries.prefetchBulkContext(dates, rankConfig);
  } catch (e: any) {
    setError("Failed to fetch data: " + (e?.message ?? "Unknown error"));
    setPhase("done");
    return;
  }

  setStatusMsg("Calculating best assignments…");
  await new Promise((r) => setTimeout(r, 80));

  const { previews: p, planned: pl } = calculateAssignments(rooms, rankConfig, ctx);
  setPreviews(p);
  setPlanned(pl);
  setPhase("preview");
}, [rooms, rankConfig]);

useEffect(() => { calculate(); }, []);

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
      if (pv.examRoomId === null) return { roomKey: pv.room.key, ok: false, msg: pv.msg ?? "Room not found" };
      if (dbError) return { roomKey: pv.room.key, ok: false, msg: "DB write failed" };
      return { roomKey: pv.room.key, ok: pv.ok, msg: pv.msg };
    }),
  );

  setPhase("done");
  onSuccess();
};

const dates = [...new Set(rooms.map((r) => r.examDate))].sort();
const previewsByDate = previews.reduce<Record<string, RoomPreview[]>>((acc, pv) => {
  const d = pv.room.examDate;
  if (!acc[d]) acc[d] = [];
  acc[d].push(pv);
  return acc;
}, {});

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
            <h2 className="text-base font-bold text-gray-900">Bulk Auto-Assign</h2>
            <p className="text-xs text-muted-foreground">{rooms.length} room{rooms.length !== 1 ? "s" : ""} · {dates.length} date{dates.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        {(phase === "preview" || phase === "done") && (
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {(phase === "calculating" || phase === "saving") && (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">{statusMsg}</p>
              <p className="text-xs mt-1">{phase === "calculating" ? "This may take a moment…" : `Writing ${totalTeachers} assignments…`}</p>
            </div>
          </div>
        )}

        {phase === "preview" && (
          <>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/5 border border-primary/15">
              <Eye className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">Preview — {assignableCount} of {rooms.length} rooms can be assigned</p>
                <p className="text-xs text-muted-foreground">{totalTeachers} assignments ready</p>
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
                      <span className="text-sm font-bold text-gray-800">{date}</span>
                    </div>
                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${okCount === datePreviews.length ? "bg-emerald-100 text-emerald-700" : okCount === 0 ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                      {okCount}/{datePreviews.length} rooms ready
                    </span>
                  </div>
                  <div className="divide-y">
                    {datePreviews.map((pv) => (
                      <div key={pv.room.key} className={`px-4 py-3 ${!pv.ok ? "bg-amber-50/40" : ""}`}>
                        <div className="flex items-center gap-2 mb-2">
                          {pv.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> : <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />}
                          <span className="text-sm font-bold text-gray-900">Room {pv.room.roomNumber}</span>
                          {pv.room.examSession && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{pv.room.examSession}</span>}
                          {pv.room.examTime && <span className="text-xs text-muted-foreground ml-auto">{pv.room.examTime.start} – {pv.room.examTime.end}</span>}
                        </div>
                        {pv.ok ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <TeacherChip label="Supervisor" name={pv.supervisor?.name ?? "—"} rank={pv.supervisor?.rank ?? ""} found={pv.supervisor !== null} />
                            <TeacherChip label="Assistant" name={pv.assistant?.name ?? "No assistant available"} rank={pv.assistant?.rank ?? ""} found={pv.assistant !== null} />
                          </div>
                        ) : (
                          <p className="text-xs text-amber-700 pl-6">{pv.msg ?? "Could not assign"}</p>
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
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${error ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"}`}>
              {error ? <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" /> : <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />}
              <p className={`text-sm font-semibold ${error ? "text-amber-800" : "text-emerald-800"}`}>
                {error ? "Save completed with errors" : `Saved — ${savedCount} of ${rooms.length} rooms`}
              </p>
            </div>
            {dates.map((date) => {
              const datePreviews = previewsByDate[date] ?? [];
              const okCount = saveResults.filter((r) => r.ok && datePreviews.some((p) => p.room.key === r.roomKey)).length;
              return (
                <div key={date} className="border rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-bold text-gray-800">{date}</span>
                    </div>
                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${okCount === datePreviews.length ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {okCount}/{datePreviews.length} saved
                    </span>
                  </div>
                  <div className="divide-y">
                    {datePreviews.map((pv) => {
                      const sr = saveResults.find((r) => r.roomKey === pv.room.key);
                      return (
                        <div key={pv.room.key} className={`px-4 py-3 flex items-start gap-3 ${sr?.ok ? "" : "bg-amber-50/40"}`}>
                          {sr?.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900">Room {pv.room.roomNumber}</p>
                            {sr?.ok ? (
                              <div className="mt-1 space-y-0.5">
                                {pv.supervisor && <p className="text-xs text-emerald-700"><span className="font-semibold">Supervisor:</span> {pv.supervisor.name} · {pv.supervisor.rank}</p>}
                                {pv.assistant && <p className="text-xs text-emerald-700"><span className="font-semibold">Assistant:</span> {pv.assistant.name} · {pv.assistant.rank}</p>}
                              </div>
                            ) : (
                              <p className="text-xs text-amber-700 mt-0.5">{sr?.msg ?? "Not saved"}</p>
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
          {phase === "preview" && `${totalTeachers} assignments ready to save`}
          {phase === "done" && `${savedCount} of ${rooms.length} rooms saved`}
        </p>
        <div className="flex gap-2">
          {phase === "preview" && (
            <>
              <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
              <Button size="sm" className="gap-2" disabled={assignableCount === 0} onClick={handleSave}>
                <Save className="h-4 w-4" />
                Save to Database
                {assignableCount > 0 && <span className="ml-1 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-white/20 text-[10px] font-bold">{assignableCount}</span>}
              </Button>
            </>
          )}
          {phase === "done" && <Button size="sm" onClick={onClose}>Done</Button>}
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
<span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${session === "Morning" ? "bg-amber-100 text-amber-700" : "bg-orange-100 text-orange-700"}`}>
  {session === "Morning" ? <Sun className="h-2.5 w-2.5" /> : <Sunset className="h-2.5 w-2.5" />}
  {session}
</span>
);

const ExamRow: React.FC<{ exam: Exam; badge: "primary" | "secondary" }> = ({ exam, badge }) => (
<div className="flex items-start gap-3 py-3 border-b last:border-0">
  <span className={`mt-0.5 shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${badge === "primary" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
    {badge}
  </span>
  <div className="flex-1 min-w-0">
    <p className="text-sm font-semibold text-foreground truncate">{exam.subject_code} — {exam.exam_name}</p>
    <p className="text-xs text-muted-foreground mt-0.5">
      {exam.program}{exam.specialization ? ` · ${exam.specialization}` : ""} | Y{exam.year_level} S{exam.semester}
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
              <h2 className="text-xl font-bold text-foreground">Room {room.roomNumber}</h2>
              <SessionBadge session={room.examSession} />
            </div>
            <p className="text-sm text-muted-foreground">
              {room.examDate} · {room.dayOfWeek} · Capacity: {room.roomCapacity}
              {room.examTime && <> · {room.examTime.start} – {room.examTime.end}</>}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
      </div>

      <div className="grid grid-cols-3 divide-x border-b">
        <div className="px-6 py-4 text-center">
          <p className="text-2xl font-bold text-foreground">{room.totalStudents}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Students Assigned</p>
        </div>
        <div className="px-6 py-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{room.primaryExams.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Primary Subjects</p>
        </div>
        <div className="px-6 py-4 text-center">
          <p className="text-2xl font-bold text-green-600">{room.secondaryExams.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Secondary Subjects</p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Assigned Invigilators
          </h3>
          {assignmentsLoading ? (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-gray-50 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin shrink-0 text-primary" />Loading invigilators…
            </div>
          ) : assignments.length === 0 ? (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed bg-gray-50/60">
              <UserX className="h-4 w-4 text-gray-400" />
              <p className="text-sm text-gray-500">No invigilators assigned yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {supervisors.map((a, i) => (
                <div key={`sup-${i}`} className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-blue-50 border-blue-200">
                  <div className="shrink-0 h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center">
                    <UserCheck className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-blue-600 block">Supervisor</span>
                    <p className="text-sm font-semibold text-gray-900 truncate">{a.teacher_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{a.teacher_rank}</p>
                  </div>
                </div>
              ))}
              {assistants.map((a, i) => (
                <div key={`asst-${i}`} className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-purple-50 border-purple-200">
                  <div className="shrink-0 h-9 w-9 rounded-full bg-purple-100 flex items-center justify-center">
                    <UserCheck className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-purple-600 block">Assistant</span>
                    <p className="text-sm font-semibold text-gray-900 truncate">{a.teacher_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{a.teacher_rank}</p>
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
          {room.primaryExams.length === 0 && room.secondaryExams.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No exams on this date.</p>
          ) : (
            <div>
              {room.primaryExams.map((e) => <ExamRow key={e.exam_id} exam={e} badge="primary" />)}
              {room.secondaryExams.map((e) => <ExamRow key={e.exam_id} exam={e} badge="secondary" />)}
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
onManualPair: (e: React.MouseEvent, room: RoomCardData) => void;
onToggleSelect: (e: React.MouseEvent, room: RoomCardData) => void;
}> = ({
room,
assignmentCount,
selected,
selectionMode,
onCardClick,
onAutoAssign,
onManualPair,
onToggleSelect,
}) => (
<div className={`border rounded-xl p-4 bg-background transition-all duration-200 flex flex-col gap-3 ${selected ? "ring-2 ring-primary border-primary shadow-md" : "hover:shadow-md"}`}>
  <div className="cursor-pointer flex-1" onClick={() => onCardClick(room)}>
    <div className="flex items-start justify-between gap-2 mb-2">
      <div className="flex items-center gap-2">
        {selectionMode && (
          <button onClick={(e) => onToggleSelect(e, room)} className="shrink-0 text-primary">
            {selected ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5 text-muted-foreground" />}
          </button>
        )}
        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
          <MapPin className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="font-bold text-foreground leading-tight">{room.roomNumber}</p>
          <p className="text-xs text-muted-foreground">Cap: {room.roomCapacity}</p>
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
        <span className="text-xs text-muted-foreground">{room.examTime.start} – {room.examTime.end}</span>
      </div>
    )}
    <div className="space-y-1.5">
      {room.primaryGroupLabel && (
        <div className="flex items-start gap-1.5">
          <span className="mt-1 h-2 w-2 rounded-full bg-blue-500 shrink-0" />
          <p className="text-xs text-muted-foreground leading-tight">{room.primaryGroupLabel}</p>
        </div>
      )}
      {room.secondaryGroupLabel && (
        <div className="flex items-start gap-1.5">
          <span className="mt-1 h-2 w-2 rounded-full bg-green-500 shrink-0" />
          <p className="text-xs text-muted-foreground leading-tight">{room.secondaryGroupLabel}</p>
        </div>
      )}
      {!room.primaryGroupLabel && !room.secondaryGroupLabel && (
        <p className="text-xs text-muted-foreground italic">No groups linked</p>
      )}
    </div>
    <div className="flex flex-wrap gap-1.5 mt-3">
      {room.primaryExams.length > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">
          {room.primaryExams.length} primary subject{room.primaryExams.length !== 1 ? "s" : ""}
        </span>
      )}
      {room.secondaryExams.length > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">
          {room.secondaryExams.length} secondary subject{room.secondaryExams.length !== 1 ? "s" : ""}
        </span>
      )}
    </div>
    <div className="flex items-center gap-1.5 mt-3 pt-3 border-t">
      <Users className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-semibold text-foreground">{room.totalStudents} students</span>
      {assignmentCount > 0 && (
        <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary">
          <CheckCircle2 className="h-3 w-3" />
          {assignmentCount} invigilator{assignmentCount !== 1 ? "s" : ""}
        </span>
      )}
    </div>
  </div>

  <div className="flex gap-1.5">
    <Button
      variant={assignmentCount > 0 ? "outline" : "default"}
      size="sm"
      className="flex-1 gap-1.5 text-xs"
      onClick={(e) => onAutoAssign(e, room)}
    >
      <Zap className="h-3.5 w-3.5" />
      {assignmentCount > 0 ? "Re-assign" : "Auto Assign"}
    </Button>
    <Button
      variant="outline"
      size="sm"
      className="flex-1 gap-1.5 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300"
      onClick={(e) => onManualPair(e, room)}
    >
      <ArrowLeftRight className="h-3.5 w-3.5" />
      Manual Pair
    </Button>
  </div>
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
const [autoAssignTarget, setAutoAssignTarget] = useState<RoomCardData | null>(null);

const [manualPairTarget, setManualPairTarget] = useState<ManualPairTarget | null>(null);

const [selectionMode, setSelectionMode] = useState(false);
const [selectedRoomKeys, setSelectedRoomKeys] = useState<Set<string>>(new Set());
const [showBulkModal, setShowBulkModal] = useState(false);
const [bulkRooms, setBulkRooms] = useState<RoomCardData[]>([]);

const [assignmentCounts, setAssignmentCounts] = useState<Record<string, number>>({});
// ─────────────────────────────────────────────────────────────────────────
const [standbyByDate, setStandbyByDate] = useState<Record<string, StandbyAssignment[]>>({});
const [standbyModalDate, setStandbyModalDate] = useState<string | null>(null);
const [exportingPDF, setExportingPDF] = useState(false);
  const [rankConfigRaw, setRankConfigRaw] = useState<RankConfig[]>(loadRankConfig);
const rankConfig: AssignmentRankConfig = buildAssignmentConfig(rankConfigRaw);
const [showRankConfigModal, setShowRankConfigModal] = useState(false);

const handleSaveRankConfig = useCallback((ranks: RankConfig[]) => {
  saveRankConfig(ranks);
  setRankConfigRaw(ranks);
}, []);
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

const loadAllStandbys = useCallback(async () => {
  try {
    const all = await fetchAllStandbyAssignments();
    const grouped: Record<string, StandbyAssignment[]> = {};
    all.forEach((s) => {
      if (!grouped[s.examDate]) grouped[s.examDate] = [];
      grouped[s.examDate].push(s);
    });
    setStandbyByDate(grouped);
  } catch (err) {
    console.error("Error loading standbys:", err);
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
      await Promise.all([loadAssignmentCounts(), loadAllStandbys()]);
    } catch (err: any) {
      if (!mounted) return;
      setErrorMsg(err?.message ?? "Failed to load exam schedules");
    } finally {
      if (mounted) setIsLoading(false);
    }
  }
  load();
  return () => { mounted = false; };
}, [loadAssignmentCounts, loadAllStandbys]);

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
const unassignedVisibleRooms = allVisibleRooms.filter((r) => (assignmentCounts[r.key] ?? 0) === 0);

const handleCardClick = async (room: RoomCardData) => {
  if (selectionMode) return;
  setSelectedRoom(room);
  setRoomAssignments([]);
  setAssignmentsLoading(true);
  try {
    const assignments = await fetchRoomAssignments(room.examRoomId, room.examDate);
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

const handleManualPair = (e: React.MouseEvent, room: RoomCardData) => {
  e.stopPropagation();
  setManualPairTarget({
    room,
    examRoomId: room.examRoomId,
    examSession: room.examSession || "Morning",
    examTime: room.examTime,
  });
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
  if (unassignedVisibleRooms.length === 0) return;
  setBulkRooms(unassignedVisibleRooms);
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

const handleExportStandbyPDF = async () => {
  setExportingPDF(true);
  try {
    const all = await fetchAllStandbyAssignments();
    exportStandbyPDF(all);
  } catch (e) {
    console.error("PDF export failed:", e);
  } finally {
    setExportingPDF(false);
  }
};

const totalStandbyCount = Object.values(standbyByDate).reduce((sum, arr) => sum + arr.length, 0);
const selectedCount = selectedRoomKeys.size;

return (
  <DashboardLayout>
    <PageHeader
      title="Exam Schedule"
      description="View exam schedules grouped by date with room & invigilator assignments"
    />

    {errorMsg && (
      <div className="mb-6 p-4 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive">{errorMsg}</div>
    )}

    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div className="flex flex-wrap gap-2">
        {(["all", "scheduled", "completed"] as const).map((s) => (
          <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(s)}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline" size="sm"
          className="gap-2 border-violet-300 text-violet-700 hover:bg-violet-50"
          onClick={handleExportStandbyPDF}
          disabled={exportingPDF || totalStandbyCount === 0}
        >
          {exportingPDF ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          Export Standby PDF
          {totalStandbyCount > 0 && (
            <span className="ml-1 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold">{totalStandbyCount}</span>
          )}
        </Button>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowRankConfigModal(true)}>
<Settings className="h-4 w-4" />
Rank Config
<span className="ml-1 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
  {rankConfigRaw.length}
</span>
</Button>
        <Button variant={selectionMode ? "default" : "outline"} size="sm" className="gap-2" onClick={toggleSelectionMode}>
          <CheckSquare className="h-4 w-4" />
          {selectionMode ? "Cancel Select" : "Select Rooms"}
        </Button>
        {selectionMode && (
          <Button size="sm" className="gap-2" disabled={selectedCount === 0} onClick={handleAssignSelected}>
            <Zap className="h-4 w-4" />
            Assign Selected
            {selectedCount > 0 && <span className="ml-1 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-white/20 text-white text-[10px] font-bold">{selectedCount}</span>}
          </Button>
        )}
        {!selectionMode && (
          <Button size="sm" className="gap-2" disabled={unassignedVisibleRooms.length === 0} onClick={handleAssignAll}>
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
          <button className="ml-auto text-xs underline text-muted-foreground" onClick={() => setSelectedRoomKeys(new Set())}>Clear</button>
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
        <div className="text-center py-12 text-muted-foreground">No exam schedules found</div>
      ) : (
        filteredGroups.map((group) => {
          const status = deriveStatus(group.examDate);
          const dateStandbys = standbyByDate[group.examDate] ?? [];
          return (
            <div key={group.examDate} className="bg-card border rounded-xl p-6">
              <div className="flex items-center gap-3 mb-5 pb-4 border-b">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">{group.examDate}</h3>
                  <p className="text-sm text-muted-foreground">{group.dayOfWeek} · {group.rooms.length} room{group.rooms.length !== 1 ? "s" : ""}</p>
                </div>
                <div className="ml-auto">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${status === "scheduled" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </span>
                </div>
              </div>

              <div className="mb-5 p-4 rounded-xl border border-violet-200 bg-violet-50/40">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-violet-600" />
                    <span className="text-sm font-bold text-violet-800">
                      Standby Teachers
                      {dateStandbys.length > 0 && (
                        <span className="ml-2 inline-flex items-center justify-center h-4 min-w-4 px-1.5 rounded-full bg-violet-200 text-violet-800 text-[10px] font-bold">{dateStandbys.length}</span>
                      )}
                    </span>
                  </div>
                  <Button
                    variant="outline" size="sm"
                    className="gap-1.5 border-violet-300 text-violet-700 hover:bg-violet-100 h-8 text-xs"
                    onClick={() => setStandbyModalDate(group.examDate)}
                  >
                    <ShieldAlert className="h-3.5 w-3.5" />
                    {dateStandbys.length > 0 ? "Edit Standby" : "Assign Standby"}
                  </Button>
                </div>
                {dateStandbys.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-violet-500 italic">
                    <UserX className="h-4 w-4" />
                    No standby teachers assigned for this date yet
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {dateStandbys.map((sb, i) => <StandbyChip key={sb.teacherId} standby={sb} index={i} />)}
                  </div>
                )}
              </div>

              {group.rooms.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No rooms assigned for this date</p>
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
                      onManualPair={handleManualPair}
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
        onClose={() => { setSelectedRoom(null); setRoomAssignments([]); }}
      />
    )}

    {showAutoAssignModal && autoAssignTarget && (
      <AutoAssignModal
examRoomId={autoAssignTarget.examRoomId}
roomNumber={autoAssignTarget.roomNumber}
examDate={autoAssignTarget.examDate}
examSession={autoAssignTarget.examSession}
examTime={autoAssignTarget.examTime}
rankConfig={rankConfig}          // ← changed from rankLimits
onClose={() => { setShowAutoAssignModal(false); setAutoAssignTarget(null); }}
onSuccess={loadAssignmentCounts}
/>
    )}

    {manualPairTarget && (
      <ManualPairModal
        target={manualPairTarget}
            rankConfig={rankConfig}    
        onClose={() => setManualPairTarget(null)}
        onSuccess={loadAssignmentCounts}
      />
    )}

    {showBulkModal && bulkRooms.length > 0 && (
    <BulkAssignModal
rooms={bulkRooms}
rankConfig={rankConfig}          // ← changed from rankLimits
onClose={handleBulkDone}
onSuccess={loadAssignmentCounts}
/>
    )}

    {showRankConfigModal && (
<RankConfigModal
  ranks={rankConfigRaw}
  onSave={handleSaveRankConfig}
  onClose={() => setShowRankConfigModal(false)}
/>
)}

    {standbyModalDate && (
      <StandbyAssignModal
        examDate={standbyModalDate}
        existingStandbys={standbyByDate[standbyModalDate] ?? []}
        onClose={() => setStandbyModalDate(null)}
        onSaved={(newStandbys) => {
          setStandbyByDate((prev) => ({ ...prev, [standbyModalDate]: newStandbys }));
        }}
      />
    )}
  </DashboardLayout>
);
};

export default ExamsOverview;