import React, { useEffect, useState } from "react";
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
} from "lucide-react";
import AssignTeachersModal, {
  type RankPeriodLimits,
} from "@/components/AssignTeachersModal";
import { teacherAssignmentQueries } from "@/services/teacherassignmentQueries";
import {
  examRoomLinkQueries,
  type DateGroup,
  type RoomCardData,
} from "@/services/examRoomLinkQueries";
import type { Exam } from "@/services/examQueries";
import type { ExamSession } from "@/services/teacherAssignmentTypes";

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
// Period-limits settings modal
// ─────────────────────────────────────────────────────────────────────────────

const PeriodLimitsModal: React.FC<{
  limits: RankPeriodLimits;
  onSave: (limits: RankPeriodLimits) => void;
  onClose: () => void;
}> = ({ limits, onSave, onClose }) => {
  // Use string values so the input is fully editable (empty string allowed while typing)
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(limits).map(([k, v]) => [k, String(v)])),
  );
  const [newRank, setNewRank] = useState("");
  const [newLimit, setNewLimit] = useState<string>("1");
  const [addError, setAddError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleChange = (rank: string, raw: string) => {
    // Allow empty or any numeric string while the user is editing
    if (raw === "" || /^\d+$/.test(raw)) {
      setDraft((prev) => ({ ...prev, [rank]: raw }));
    }
  };

  const handleSave = () => {
    // Validate all entries before committing
    const invalid = Object.entries(draft).find(
      ([, v]) => v === "" || isNaN(Number(v)) || Number(v) < 1,
    );
    if (invalid) {
      setSaveError(`"${invalid[0]}" must have a limit of at least 1.`);
      return;
    }
    const result: RankPeriodLimits = Object.fromEntries(
      Object.entries(draft).map(([k, v]) => [k, Number(v)]),
    );
    onSave(result);
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
        {/* Header */}
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

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
          <p className="text-sm text-muted-foreground">
            Set the maximum number of exam periods each rank may be assigned.
          </p>

          {/* Existing ranks — no delete, just editable inputs */}
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
                  className={`w-24 text-center h-8 text-sm ${
                    value === "" || Number(value) < 1
                      ? "border-destructive"
                      : ""
                  }`}
                />
              </div>
            ))}
          </div>

          {/* Add new rank */}
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

        {/* Footer */}
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
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getTodayISO() {
  return new Date().toISOString().split("T")[0];
}
function deriveStatus(examDate: string): "scheduled" | "completed" {
  return examDate >= getTodayISO() ? "scheduled" : "completed";
}
function fmtTime(t: string | undefined) {
  if (!t) return "";
  return t.length >= 5 ? t.slice(0, 5) : t;
}

// ─────────────────────────────────────────────────────────────────────────────
// Session badge
// ─────────────────────────────────────────────────────────────────────────────

const SessionBadge: React.FC<{ session: ExamSession }> = ({ session }) => (
  <span
    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
      session === "Morning"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
        : "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
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

// ─────────────────────────────────────────────────────────────────────────────
// Exam row
// ─────────────────────────────────────────────────────────────────────────────

const ExamRow: React.FC<{ exam: Exam; badge: "primary" | "secondary" }> = ({
  exam,
  badge,
}) => (
  <div className="flex items-start gap-3 py-3 border-b last:border-0">
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
  onClose: () => void;
}> = ({ room, onClose }) => (
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
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {room.primaryExams.length}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Primary Subjects
          </p>
        </div>
        <div className="px-6 py-4 text-center">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {room.secondaryExams.length}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Secondary Subjects
          </p>
        </div>
      </div>

      <div className="p-6">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Exams on {room.examDate}
        </h3>
        {room.primaryExams.length === 0 && room.secondaryExams.length === 0 ? (
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
);

// ─────────────────────────────────────────────────────────────────────────────
// Room card
// ─────────────────────────────────────────────────────────────────────────────

const RoomCard: React.FC<{
  room: RoomCardData;
  assignmentCount: number;
  onCardClick: (room: RoomCardData) => void;
  onAssignClick: (e: React.MouseEvent, room: RoomCardData) => void;
}> = ({ room, assignmentCount, onCardClick, onAssignClick }) => (
  <div className="border rounded-xl p-4 bg-background hover:shadow-md transition-all duration-200 flex flex-col gap-3">
    <div className="cursor-pointer flex-1" onClick={() => onCardClick(room)}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
            {room.primaryExams.length} primary subject
            {room.primaryExams.length !== 1 ? "s" : ""}
          </span>
        )}
        {room.secondaryExams.length > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
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
      </div>
    </div>

    <Button
      variant="outline"
      size="sm"
      className="w-full"
      onClick={(e) => onAssignClick(e, room)}
    >
      <Users className="h-4 w-4 mr-2" />
      {assignmentCount > 0
        ? `${assignmentCount} Invigilator${assignmentCount !== 1 ? "s" : ""} Assigned`
        : "Assign Invigilators"}
    </Button>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

type AssignmentTarget = RoomCardData;

const ExamsOverview: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dateGroups, setDateGroups] = useState<DateGroup[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<RoomCardData | null>(null);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTarget, setAssignTarget] = useState<AssignmentTarget | null>(
    null,
  );
  const [assignmentCounts, setAssignmentCounts] = useState<
    Record<string, number>
  >({});

  const [rankLimits, setRankLimits] = useState<RankPeriodLimits>({
    ...DEFAULT_RANK_LIMITS,
  });
  const [showLimitsModal, setShowLimitsModal] = useState(false);

  const loadAssignmentCounts = async () => {
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
  };

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
        if (!mounted) return;
        setIsLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const handleCardClick = (room: RoomCardData) => setSelectedRoom(room);

  const handleAssignClick = (e: React.MouseEvent, room: RoomCardData) => {
    e.stopPropagation();
    setAssignTarget(room);
    setShowAssignModal(true);
  };

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
      </div>

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
          <div className="text-center py-12 text-muted-foreground">
            Loading exam schedules…
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
                  <div className="ml-auto">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        status === "scheduled"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                          : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
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
                        onCardClick={handleCardClick}
                        onAssignClick={handleAssignClick}
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
          onClose={() => setSelectedRoom(null)}
        />
      )}

      {showAssignModal && assignTarget && (
        <AssignTeachersModal
          examRoomId={assignTarget.examRoomId}
          roomNumber={assignTarget.roomNumber}
          examDate={assignTarget.examDate}
          examSession={assignTarget.examSession}
          examTime={assignTarget.examTime}
          roomCardData={assignTarget}
          rankLimits={rankLimits}
          onClose={() => {
            setShowAssignModal(false);
            setAssignTarget(null);
          }}
          onSuccess={async () => {
            await loadAssignmentCounts();
          }}
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
