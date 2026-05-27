import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  X,
  CheckCircle2,
  Loader2,
  UserCheck,
  AlertCircle,
  Zap,
  ShieldCheck,
  UserX,
} from "lucide-react";
import { teacherAssignmentQueries } from "@/services/teacherassignmentQueries";
import type {
  TeacherRole,
  ExamSession,
  TeacherWithAvailability,
} from "@/services/teacherAssignmentTypes";
import type { AssignmentRankConfig } from "@/services/rankConfig";

// ─── Re-export so existing imports of RankPeriodLimits still work ─────────────
export type { RankPeriodLimits } from "@/services/rankConfig";

// ─────────────────────────────────────────────────────────────────────────────
// Algorithm — fully driven by AssignmentRankConfig
// ─────────────────────────────────────────────────────────────────────────────

function eligible(t: TeacherWithAvailability, cfg: AssignmentRankConfig): boolean {
  const limit = cfg.periodLimits[t.rank];
  return (
    t.availability.is_available &&
    (limit === undefined || (t.total_periods_assigned ?? 0) < limit)
  );
}

function minWorkload(pool: TeacherWithAvailability[]): TeacherWithAvailability {
  const minLoad = Math.min(...pool.map((t) => t.total_periods_assigned ?? 0));
  const tied = pool.filter((t) => (t.total_periods_assigned ?? 0) === minLoad);
  return tied[Math.floor(Math.random() * tied.length)];
}

type PairResult = {
  supervisor: TeacherWithAvailability | null;
  assistant: TeacherWithAvailability | null;
  pairLabel: string | null;
};

function pickPairedTeachers(
  supervisors: TeacherWithAvailability[],
  assistants: TeacherWithAvailability[],
  cfg: AssignmentRankConfig,
): PairResult {
  const supervisorRanks = new Set(
    cfg.ranks.filter((r) => r.canSupervise).map((r) => r.name),
  );
  const assistantRanks = new Set(
    cfg.ranks.filter((r) => r.canAssist).map((r) => r.name),
  );

  const eSups = supervisors.filter(
    (t) => supervisorRanks.has(t.rank) && eligible(t, cfg),
  );
  const eAssts = assistants.filter(
    (t) => assistantRanks.has(t.rank) && eligible(t, cfg),
  );

  if (eSups.length === 0) return { supervisor: null, assistant: null, pairLabel: null };

  // Find first viable pairing rule that has eligible teachers on both sides
  for (const rule of cfg.pairingRules) {
    const supCandidates = eSups.filter((t) => t.rank === rule.supervisorRank);
    const asstCandidates = eAssts.filter((t) => t.rank === rule.assistantRank);
    if (supCandidates.length === 0 || asstCandidates.length === 0) continue;

    const supervisor = minWorkload(supCandidates);
    supervisor.total_periods_assigned = (supervisor.total_periods_assigned ?? 0) + 1;

    const asstFiltered = asstCandidates.filter(
      (t) => t.teacher_id !== supervisor.teacher_id && eligible(t, cfg),
    );
    if (asstFiltered.length === 0) continue;

    const assistant = minWorkload(asstFiltered);
    assistant.total_periods_assigned = (assistant.total_periods_assigned ?? 0) + 1;

    return {
      supervisor,
      assistant,
      pairLabel: `${rule.supervisorRank} + ${rule.assistantRank}`,
    };
  }

  // Fallback: best supervisor alone
  const supervisor = minWorkload(eSups);
  supervisor.total_periods_assigned = (supervisor.total_periods_assigned ?? 0) + 1;
  return { supervisor, assistant: null, pairLabel: null };
}

// ─────────────────────────────────────────────────────────────────────────────
// Props & types
// ─────────────────────────────────────────────────────────────────────────────

interface AutoAssignModalProps {
  examRoomId: number;
  roomNumber: string;
  examDate: string;
  examSession: ExamSession;
  examTime?: { start: string; end: string };
  /** Full rank config — replaces the old rankLimits prop */
  rankConfig: AssignmentRankConfig;
  onClose: () => void;
  onSuccess: () => void;
}

type AssignResult = {
  role: TeacherRole;
  teacher: TeacherWithAvailability | null;
  reason?: string;
};

// ─── Role result card ─────────────────────────────────────────────────────────

const RoleResultCard: React.FC<{
  result: AssignResult;
  cfg: AssignmentRankConfig;
}> = ({ result, cfg }) => {
  const { role, teacher, reason } = result;
  const limit = teacher ? (cfg.periodLimits[teacher.rank] ?? Infinity) : null;
  const assigned = teacher?.total_periods_assigned ?? 0;

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-xl border ${
        teacher ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"
      }`}
    >
      <div
        className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
          teacher ? "bg-emerald-100" : "bg-amber-100"
        }`}
      >
        {teacher ? (
          <UserCheck className="h-5 w-5 text-emerald-600" />
        ) : (
          <UserX className="h-5 w-5 text-amber-600" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {role}
          </span>
          {teacher && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-200 text-emerald-800">
              <CheckCircle2 className="h-3 w-3" /> Auto-selected
            </span>
          )}
        </div>
        {teacher ? (
          <>
            <p className="font-semibold text-gray-900 truncate">{teacher.name}</p>
            <p className="text-xs text-muted-foreground">
              {teacher.rank} · Dept {teacher.department_id ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {limit === Infinity
                ? `${assigned} period${assigned !== 1 ? "s" : ""} total after assignment`
                : `${assigned} / ${limit} after assignment`}
            </p>
          </>
        ) : (
          <>
            <p className="font-semibold text-amber-800">No teacher available</p>
            <p className="text-xs text-amber-700">{reason}</p>
          </>
        )}
      </div>
    </div>
  );
};

// ─── Main modal ───────────────────────────────────────────────────────────────

const AutoAssignModal: React.FC<AutoAssignModalProps> = ({
  examRoomId,
  roomNumber,
  examDate,
  examSession,
  examTime,
  rankConfig,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [results, setResults] = useState<AssignResult[]>([]);
  const [pairLabel, setPairLabel] = useState<string | null>(null);
  const [activeExamRoomId, setActiveExamRoomId] = useState(examRoomId);

  const effectiveSession: ExamSession = examSession || "Morning";

  useEffect(() => { loadAndPreview(); }, []);

  const loadAndPreview = async () => {
    setLoading(true);
    setError(null);
    try {
      let currentId = examRoomId;
      const correctId = await teacherAssignmentQueries.getCorrectExamRoomId(
        roomNumber, examDate, effectiveSession,
      );
      if (correctId) { currentId = correctId; setActiveExamRoomId(correctId); }

      const [supervisors, assistants] = await Promise.all([
        teacherAssignmentQueries.getAvailableTeachersWithSession(
          currentId, "Supervisor", examDate, effectiveSession,
        ),
        teacherAssignmentQueries.getAvailableTeachersWithSession(
          currentId, "Assistant", examDate, effectiveSession,
        ),
      ]);

      const { supervisor, assistant, pairLabel: label } = pickPairedTeachers(
        supervisors, assistants, rankConfig,
      );
      setPairLabel(label);

      const supReason = !supervisor
        ? supervisors.length === 0
          ? "No supervisors found in database"
          : supervisors.every((t) => !t.availability.is_available)
            ? "All teachers are already assigned today"
            : "All eligible teachers have reached their period limit or rank is not configured as supervisor"
        : undefined;

      const asstReason = !assistant
        ? assistants.length === 0
          ? "No assistants found in database"
          : assistants.every((t) => !t.availability.is_available)
            ? "All assistants are already assigned today"
            : "All eligible assistants have reached their period limit or rank is not configured as assistant"
        : undefined;

      setResults([
        { role: "Supervisor", teacher: supervisor, reason: supReason },
        { role: "Assistant", teacher: assistant, reason: asstReason },
      ]);
    } catch (err: any) {
      setError(err.message || "Failed to load teacher data");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    const toAssign = results.filter((r) => r.teacher !== null);
    if (toAssign.length === 0) {
      setError("No teachers could be auto-selected for this room.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      for (const r of toAssign) {
        await teacherAssignmentQueries.deleteByRoomAndRole(
          activeExamRoomId, r.role, examDate,
        );
        await teacherAssignmentQueries.create(
          activeExamRoomId,
          r.teacher!.teacher_id,
          r.role,
          examDate,
          effectiveSession,
          examTime?.start,
          examTime?.end,
        );
      }
      setSuccessMessage("Assignments saved successfully!");
      onSuccess();
      setTimeout(() => { setSuccessMessage(null); onClose(); }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to save assignments");
    } finally {
      setSubmitting(false);
    }
  };

  const canConfirm = results.some((r) => r.teacher !== null);

  // ── Pairing summary for display ───────────────────────────────────────────
  const pairingSummary = rankConfig.pairingRules
    .map((p) => `${p.supervisorRank.split(" ")[0]}→${p.assistantRank.split(" ")[0]}`)
    .join(", ");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white border rounded-xl max-w-lg w-full shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-primary/5 to-transparent rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Auto-Assign Invigilators</h2>
              <p className="text-xs text-muted-foreground">
                {roomNumber} · {examDate} · {effectiveSession}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-muted-foreground">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-sm">Finding best available teachers…</p>
            </div>
          ) : (
            <>
              {/* Config summary */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100">
                <ShieldCheck className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                <div className="text-xs text-blue-700 space-y-1">
                  <p className="font-semibold">Active rank configuration:</p>
                  <div className="flex flex-wrap gap-1">
                    {rankConfig.ranks.map((r) => (
                      <span
                        key={r.name}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800"
                      >
                        {r.name}
                        {r.canSupervise && <span className="text-blue-500" title="Supervisor">S</span>}
                        {r.canAssist && <span className="text-purple-500" title="Assistant">A</span>}
                        {r.periodLimit > 0 && <span className="text-gray-500">·{r.periodLimit}</span>}
                      </span>
                    ))}
                  </div>
                  <p className="text-blue-600">Pairings: {pairingSummary || "None configured"}</p>
                </div>
              </div>

              {pairLabel && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
                  <span className="text-xs font-semibold text-primary">Selected pairing:</span>
                  <span className="text-xs text-muted-foreground">{pairLabel}</span>
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                Review the suggested pair below. The system picked according to your configured rank rules and lowest current workload.
              </p>

              <div className="space-y-3">
                {results.map((r) => (
                  <RoleResultCard key={r.role} result={r} cfg={rankConfig} />
                ))}
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {successMessage && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  <p className="text-sm font-medium">{successMessage}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && (
          <div className="px-6 py-4 border-t flex items-center justify-end gap-2 bg-gray-50 rounded-b-xl">
            <Button variant="outline" size="sm" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={submitting || !canConfirm}
              className="gap-2"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
              {submitting ? "Saving…" : "Confirm Assignment"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AutoAssignModal;