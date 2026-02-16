import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  X,
  Users,
  Clock,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  MapPin,
  BookOpen,
  Sun,
  Sunset,
} from "lucide-react";
import { teacherAssignmentQueries } from "@/services/teacherassignmentQueries";
import {
  TeacherRole,
  ExamSession,
  TeacherWithAvailability,
  ExamRoomAssignmentStatus,
} from "@/services/teacherAssignmentTypes";
import type { RoomCardData } from "@/services/examRoomLinkQueries";
import type { Exam } from "@/services/examQueries";

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface AssignTeachersModalProps {
  examRoomId: number;
  roomNumber: string;
  examDate: string;
  examSession: ExamSession;
  examTime?: { start: string; end: string };
  /** Pass the full RoomCardData so we can render the exam detail card */
  roomCardData?: RoomCardData;
  onClose: () => void;
  onSuccess: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Small sub-components
// ─────────────────────────────────────────────────────────────────────────────

const SessionBadge: React.FC<{ session: ExamSession }> = ({ session }) => (
  <span
    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
      session === "Morning"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
        : "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
    }`}
  >
    {session === "Morning" ? (
      <Sun className="h-3 w-3" />
    ) : (
      <Sunset className="h-3 w-3" />
    )}
    {session}
  </span>
);

const ExamPill: React.FC<{ exam: Exam; badge: "primary" | "secondary" }> = ({
  exam,
  badge,
}) => (
  <div className="flex items-start gap-3 py-2.5 border-b last:border-0">
    <span
      className={`mt-0.5 shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${
        badge === "primary"
          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
          : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
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
        {exam.specialization ? ` · ${exam.specialization}` : ""}
        {" | "}Y{exam.year_level} S{exam.semester}
      </p>
    </div>
    <div className="shrink-0 text-right">
      <p className="text-xs font-medium text-foreground flex items-center gap-1 justify-end">
        <Clock className="h-3 w-3" />
        {exam.start_time?.slice(0, 5)} – {exam.end_time?.slice(0, 5)}
      </p>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Room detail card (embedded at top of modal)
// ─────────────────────────────────────────────────────────────────────────────

const RoomDetailCard: React.FC<{
  room: RoomCardData;
}> = ({ room }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border rounded-xl overflow-hidden bg-muted/20">
      {/* Card header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b bg-background">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <MapPin className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-base text-foreground">
              Room {room.roomNumber}
            </span>
            <SessionBadge session={room.examSession} />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {room.examDate} · {room.dayOfWeek} · Capacity: {room.roomCapacity}
            {room.examTime && (
              <>
                {" "}
                · {room.examTime.start} – {room.examTime.end}
              </>
            )}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 divide-x border-b bg-background">
        <div className="px-4 py-3 text-center">
          <p className="text-xl font-bold text-foreground">
            {room.totalStudents}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">
            Students
          </p>
        </div>
        <div className="px-4 py-3 text-center">
          <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
            {room.primaryExams.length}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">
            Primary
          </p>
        </div>
        <div className="px-4 py-3 text-center">
          <p className="text-xl font-bold text-green-600 dark:text-green-400">
            {room.secondaryExams.length}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">
            Secondary
          </p>
        </div>
      </div>

      {/* Exam list — collapsible */}
      <div className="px-5 py-3">
        <button
          className="flex items-center gap-2 w-full text-left"
          onClick={() => setExpanded((v) => !v)}
        >
          <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Exams on {room.examDate}
          </span>
          <span className="ml-auto text-[10px] text-muted-foreground">
            {expanded ? "▲ hide" : "▼ show"}
          </span>
        </button>

        {expanded && (
          <div className="mt-2">
            {room.primaryExams.length === 0 &&
            room.secondaryExams.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 text-center">
                No exams on this date.
              </p>
            ) : (
              <>
                {room.primaryExams.map((e) => (
                  <ExamPill key={e.exam_id} exam={e} badge="primary" />
                ))}
                {room.secondaryExams.map((e) => (
                  <ExamPill key={e.exam_id} exam={e} badge="secondary" />
                ))}
              </>
            )}
          </div>
        )}

        {/* Group labels always visible */}
        {!expanded && (
          <div className="mt-2 space-y-1">
            {room.primaryGroupLabel && (
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                <p className="text-xs text-muted-foreground truncate">
                  {room.primaryGroupLabel}
                </p>
              </div>
            )}
            {room.secondaryGroupLabel && (
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                <p className="text-xs text-muted-foreground truncate">
                  {room.secondaryGroupLabel}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main modal
// ─────────────────────────────────────────────────────────────────────────────

const AssignTeachersModal: React.FC<AssignTeachersModalProps> = ({
  examRoomId,
  roomNumber,
  examDate,
  examSession,
  examTime,
  roomCardData,
  onClose,
  onSuccess,
}) => {
  const [status, setStatus] = useState<ExamRoomAssignmentStatus | null>(null);
  const [supervisors, setSupervisors] = useState<TeacherWithAvailability[]>([]);
  const [assistants, setAssistants] = useState<TeacherWithAvailability[]>([]);
  const [selectedSupervisor, setSelectedSupervisor] = useState<number | null>(
    null,
  );
  const [selectedAssistant, setSelectedAssistant] = useState<number | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [examRoomId, examDate]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const roomStatus = await teacherAssignmentQueries.getExamRoomStatus(
        examRoomId,
        examDate,
      );

      setStatus(roomStatus);

      const [availableSupervisors, availableAssistants] = await Promise.all([
        teacherAssignmentQueries.getAvailableTeachersWithSession(
          examRoomId,
          "Supervisor",
          examDate,
          examSession,
        ),
        teacherAssignmentQueries.getAvailableTeachersWithSession(
          examRoomId,
          "Assistant",
          examDate,
          examSession,
        ),
      ]);

      setSupervisors(availableSupervisors);
      setAssistants(availableAssistants);
    } catch (err: any) {
      setError(err.message || "Failed to load teachers");
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (role: TeacherRole) => {
    const teacherId =
      role === "Supervisor" ? selectedSupervisor : selectedAssistant;
    if (!teacherId) {
      setError(`Please select a ${role.toLowerCase()}`);
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await teacherAssignmentQueries.create(
        examRoomId,
        teacherId,
        role,
        examDate,
        examSession,
        examTime?.start,
        examTime?.end,
      );
      setSuccessMessage(`${role} assigned successfully!`);
      if (role === "Supervisor") setSelectedSupervisor(null);
      else setSelectedAssistant(null);
      await loadData();
      onSuccess();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || `Failed to assign ${role.toLowerCase()}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (role: TeacherRole) => {
    if (!window.confirm(`Remove the ${role.toLowerCase()}?`)) return;
    setSubmitting(true);
    setError(null);
    try {
      await teacherAssignmentQueries.deleteByRoomAndRole(
        examRoomId,
        role,
        examDate,
      );

      setSuccessMessage(`${role} removed successfully!`);
      await loadData();
      onSuccess();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || `Failed to remove ${role.toLowerCase()}`);
    } finally {
      setSubmitting(false);
    }
  };

  const getWorkloadColor = (level: "Light" | "Medium" | "High") => {
    switch (level) {
      case "Light":
        return "bg-green-100  dark:bg-green-900/30  text-green-600  dark:text-green-400";
      case "Medium":
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400";
      case "High":
        return "bg-red-100    dark:bg-red-900/30    text-red-600    dark:text-red-400";
    }
  };

  const TeacherSelector = ({
    role,
    teachers,
    selected,
    onSelect,
    hasAssigned,
  }: {
    role: TeacherRole;
    teachers: TeacherWithAvailability[];
    selected: number | null;
    onSelect: (id: number | null) => void;
    hasAssigned: boolean;
  }) => {
    const selectedTeacher = teachers.find((t) => t.teacher_id === selected);
    const allUnavailable =
      teachers.length > 0 &&
      teachers.filter((t) => t.availability.is_available).length === 0;

    return (
      <div className="border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-foreground">{role}</h3>
            <p className="text-xs text-muted-foreground">
              {role === "Supervisor"
                ? "Professors and Associate Professors only"
                : "Lecturers, Assistant Professors, and Instructors only"}
            </p>
          </div>
          {hasAssigned && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleRemove(role)}
              disabled={submitting}
            >
              Remove
            </Button>
          )}
        </div>

        {hasAssigned ? (
          <div className="p-3 rounded-lg bg-muted/50 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
            <p className="text-sm font-medium text-foreground">
              {role} assigned
            </p>
          </div>
        ) : (
          <>
            <select
              className="w-full px-3 py-2 border rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-background"
              value={selected ?? ""}
              onChange={(e) => onSelect(Number(e.target.value) || null)}
              disabled={submitting}
            >
              <option value="">Select a {role.toLowerCase()}…</option>
              {teachers.map((t) => (
                <option
                  key={t.teacher_id}
                  value={t.teacher_id}
                  disabled={!t.availability.is_available}
                >
                  {t.name} — {t.rank} ({t.department}) · {t.workload_level}{" "}
                  workload ({t.total_periods_assigned ?? 0} exams)
                  {!t.availability.is_available ? " — UNAVAILABLE" : ""}
                </option>
              ))}
            </select>

            {/* Selected teacher preview */}
            {selectedTeacher && (
              <div className="mb-3 p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Workload:</span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${getWorkloadColor(selectedTeacher.workload_level)}`}
                  >
                    {selectedTeacher.workload_level}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    ({selectedTeacher.total_periods_assigned ?? 0} assignments)
                  </span>
                </div>
                {!selectedTeacher.availability.is_available && (
                  <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span className="text-xs">
                      {selectedTeacher.availability.conflict_reason}
                    </span>
                  </div>
                )}
              </div>
            )}

            <Button
              onClick={() => handleAssign(role)}
              disabled={!selected || submitting}
              className="w-full"
            >
              {submitting ? "Assigning…" : `Assign ${role}`}
            </Button>

            {teachers.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2 text-center">
                No available {role.toLowerCase()}s for this time slot
              </p>
            )}
            {allUnavailable && (
              <p className="text-sm text-orange-600 dark:text-orange-400 mt-2 text-center">
                ⚠ All {role.toLowerCase()}s are already assigned this session
              </p>
            )}
          </>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-card border rounded-xl max-w-lg w-full p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
            <p className="text-muted-foreground text-sm">
              Loading available teachers…
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* ── Modal header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-card z-10">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Assign Invigilators
              </h2>
              <p className="text-xs text-muted-foreground">
                {roomNumber} · {examDate} · {examSession} Session
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 space-y-5">
          {/* ── Room detail card ──────────────────────────────────────────── */}
          {roomCardData && <RoomDetailCard room={roomCardData} />}

          {/* Fallback time info when no roomCardData */}
          {!roomCardData && examTime && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Exam Time: {examTime.start} – {examTime.end}
              </span>
            </div>
          )}

          {/* ── Alerts ───────────────────────────────────────────────────── */}
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Error</p>
                <p className="text-xs mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="flex items-start gap-3 p-4 rounded-lg border border-green-200 bg-green-50 dark:border-green-900/30 dark:bg-green-900/10 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{successMessage}</p>
            </div>
          )}

          {/* ── Assignment status row ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            {(["Supervisor", "Assistant"] as TeacherRole[]).map((role) => {
              const assigned =
                role === "Supervisor"
                  ? status?.hasSupervisor
                  : status?.hasAssistant;
              return (
                <div
                  key={role}
                  className={`p-3 rounded-lg border text-sm ${
                    assigned
                      ? "border-green-200 bg-green-50 dark:border-green-900/30 dark:bg-green-900/10"
                      : "border-orange-200 bg-orange-50 dark:border-orange-900/30 dark:bg-orange-900/10"
                  }`}
                >
                  <p className="font-medium text-foreground">{role}</p>
                  <p
                    className={`text-xs mt-0.5 ${assigned ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"}`}
                  >
                    {assigned ? "✓ Assigned" : "⚠ Not Assigned"}
                  </p>
                </div>
              );
            })}
          </div>

          {/* ── Teacher selectors ─────────────────────────────────────────── */}
          <TeacherSelector
            role="Supervisor"
            teachers={supervisors}
            selected={selectedSupervisor}
            onSelect={setSelectedSupervisor}
            hasAssigned={!!status?.hasSupervisor}
          />

          <TeacherSelector
            role="Assistant"
            teachers={assistants}
            selected={selectedAssistant}
            onSelect={setSelectedAssistant}
            hasAssigned={!!status?.hasAssistant}
          />

          {/* ── Fully staffed banner ──────────────────────────────────────── */}
          {status?.isFullyStaffed && (
            <div className="p-4 rounded-xl border border-green-200 bg-green-50 dark:border-green-900/30 dark:bg-green-900/10">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                <p className="font-semibold text-sm">
                  This exam room is fully staffed!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t bg-muted/30">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AssignTeachersModal;