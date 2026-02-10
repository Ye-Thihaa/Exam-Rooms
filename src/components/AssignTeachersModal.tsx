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
} from "lucide-react";
import { teacherAssignmentQueries } from "@/services/teacherAssignmentQueries_v2";
import {
  TeacherRole,
  ExamSession,
  TeacherWithAvailability,
  ExamRoomAssignmentStatus,
} from "@/types/teacherAssignmentTypes";

interface AssignTeachersModalProps {
  examRoomId: number;
  roomNumber: string;
  examDate: string;
  examSession: ExamSession; // Now required!
  examTime?: { start: string; end: string };
  onClose: () => void;
  onSuccess: () => void;
}

const AssignTeachersModal: React.FC<AssignTeachersModalProps> = ({
  examRoomId,
  roomNumber,
  examDate,
  examSession,
  examTime,
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

  // Load initial data
  useEffect(() => {
    loadData();
  }, [examRoomId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get current assignment status
      const roomStatus =
        await teacherAssignmentQueries.getExamRoomStatus(examRoomId);
      setStatus(roomStatus);

      // Load available teachers for each role WITH session checking
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

      // Reset selection
      if (role === "Supervisor") {
        setSelectedSupervisor(null);
      } else {
        setSelectedAssistant(null);
      }

      // Reload data and notify parent
      await loadData();
      onSuccess();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || `Failed to assign ${role.toLowerCase()}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (role: TeacherRole) => {
    if (
      !window.confirm(
        `Are you sure you want to remove the ${role.toLowerCase()}?`,
      )
    ) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await teacherAssignmentQueries.deleteByRoomAndRole(examRoomId, role);
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

  // Get workload badge color
  const getWorkloadColor = (level: "Light" | "Medium" | "High") => {
    switch (level) {
      case "Light":
        return "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400";
      case "Medium":
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400";
      case "High":
        return "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400";
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-card border rounded-lg max-w-3xl w-full p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">
                Loading available teachers...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-card z-10">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Assign Invigilators
              </h2>
              <p className="text-sm text-muted-foreground">
                {roomNumber} • {examDate} • {examSession} Session
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="flex items-start gap-3 p-4 rounded-lg border border-green-200 bg-green-50 dark:border-green-900/30 dark:bg-green-900/10 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">{successMessage}</p>
              </div>
            </div>
          )}

          {/* Exam Time Info */}
          {examTime && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Exam Time: {examTime.start} - {examTime.end}
              </span>
            </div>
          )}

          {/* Assignment Status Banner */}
          <div className="grid grid-cols-2 gap-4">
            <div
              className={`p-4 rounded-lg border ${
                status?.hasSupervisor
                  ? "border-green-200 bg-green-50 dark:border-green-900/30 dark:bg-green-900/10"
                  : "border-orange-200 bg-orange-50 dark:border-orange-900/30 dark:bg-orange-900/10"
              }`}
            >
              <p className="text-sm font-medium mb-1">Supervisor</p>
              <p
                className={`text-xs ${
                  status?.hasSupervisor
                    ? "text-green-600 dark:text-green-400"
                    : "text-orange-600 dark:text-orange-400"
                }`}
              >
                {status?.hasSupervisor ? "✓ Assigned" : "⚠ Not Assigned"}
              </p>
            </div>
            <div
              className={`p-4 rounded-lg border ${
                status?.hasAssistant
                  ? "border-green-200 bg-green-50 dark:border-green-900/30 dark:bg-green-900/10"
                  : "border-orange-200 bg-orange-50 dark:border-orange-900/30 dark:bg-orange-900/10"
              }`}
            >
              <p className="text-sm font-medium mb-1">Assistant</p>
              <p
                className={`text-xs ${
                  status?.hasAssistant
                    ? "text-green-600 dark:text-green-400"
                    : "text-orange-600 dark:text-orange-400"
                }`}
              >
                {status?.hasAssistant ? "✓ Assigned" : "⚠ Not Assigned"}
              </p>
            </div>
          </div>

          {/* Supervisor Assignment */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-foreground">Supervisor</h3>
                <p className="text-xs text-muted-foreground">
                  Professors and Associate Professors only
                </p>
              </div>
              {status?.hasSupervisor && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRemove("Supervisor")}
                  disabled={submitting}
                >
                  Remove
                </Button>
              )}
            </div>

            {!status?.hasSupervisor && (
              <>
                <select
                  className="w-full px-3 py-2 border rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-primary"
                  value={selectedSupervisor || ""}
                  onChange={(e) =>
                    setSelectedSupervisor(Number(e.target.value) || null)
                  }
                  disabled={submitting}
                >
                  <option value="">Select a supervisor...</option>
                  {supervisors.map((teacher) => (
                    <option
                      key={teacher.teacher_id}
                      value={teacher.teacher_id}
                      disabled={!teacher.availability.is_available}
                    >
                      {teacher.name} - {teacher.rank} ({teacher.department})
                      {" • "}
                      {teacher.workload_level} workload (
                      {teacher.total_periods_assigned || 0} exams)
                      {!teacher.availability.is_available && " - UNAVAILABLE"}
                    </option>
                  ))}
                </select>

                {/* Selected teacher info */}
                {selectedSupervisor &&
                  supervisors.find(
                    (t) => t.teacher_id === selectedSupervisor,
                  ) && (
                    <div className="mb-3 p-3 rounded-lg bg-muted/50 text-sm">
                      {(() => {
                        const teacher = supervisors.find(
                          (t) => t.teacher_id === selectedSupervisor,
                        )!;
                        return (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-4 w-4" />
                              <span>Workload: </span>
                              <span
                                className={`px-2 py-0.5 rounded text-xs ${getWorkloadColor(teacher.workload_level)}`}
                              >
                                {teacher.workload_level}
                              </span>
                              <span className="text-muted-foreground">
                                ({teacher.total_periods_assigned || 0} exam
                                assignments)
                              </span>
                            </div>
                            {!teacher.availability.is_available && (
                              <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                                <AlertTriangle className="h-4 w-4" />
                                <span>
                                  {teacher.availability.conflict_reason}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                <Button
                  onClick={() => handleAssign("Supervisor")}
                  disabled={!selectedSupervisor || submitting}
                  className="w-full"
                >
                  {submitting ? "Assigning..." : "Assign Supervisor"}
                </Button>

                {supervisors.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-2 text-center">
                    No available supervisors for this time slot
                  </p>
                )}
                {supervisors.length > 0 &&
                  supervisors.filter((t) => t.availability.is_available)
                    .length === 0 && (
                    <p className="text-sm text-orange-600 dark:text-orange-400 mt-2 text-center">
                      ⚠ All supervisors are already assigned to other exams
                      during this session
                    </p>
                  )}
              </>
            )}

            {status?.hasSupervisor && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm font-medium text-foreground">
                  ✓ Supervisor assigned
                </p>
              </div>
            )}
          </div>

          {/* Assistant Assignment */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-foreground">Assistant</h3>
                <p className="text-xs text-muted-foreground">
                  Lecturers, Assistant Professors, and Instructors only
                </p>
              </div>
              {status?.hasAssistant && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRemove("Assistant")}
                  disabled={submitting}
                >
                  Remove
                </Button>
              )}
            </div>

            {!status?.hasAssistant && (
              <>
                <select
                  className="w-full px-3 py-2 border rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-primary"
                  value={selectedAssistant || ""}
                  onChange={(e) =>
                    setSelectedAssistant(Number(e.target.value) || null)
                  }
                  disabled={submitting}
                >
                  <option value="">Select an assistant...</option>
                  {assistants.map((teacher) => (
                    <option
                      key={teacher.teacher_id}
                      value={teacher.teacher_id}
                      disabled={!teacher.availability.is_available}
                    >
                      {teacher.name} - {teacher.rank} ({teacher.department})
                      {" • "}
                      {teacher.workload_level} workload (
                      {teacher.total_periods_assigned || 0} exams)
                      {!teacher.availability.is_available && " - UNAVAILABLE"}
                    </option>
                  ))}
                </select>

                {/* Selected teacher info */}
                {selectedAssistant &&
                  assistants.find(
                    (t) => t.teacher_id === selectedAssistant,
                  ) && (
                    <div className="mb-3 p-3 rounded-lg bg-muted/50 text-sm">
                      {(() => {
                        const teacher = assistants.find(
                          (t) => t.teacher_id === selectedAssistant,
                        )!;
                        return (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-4 w-4" />
                              <span>Workload: </span>
                              <span
                                className={`px-2 py-0.5 rounded text-xs ${getWorkloadColor(teacher.workload_level)}`}
                              >
                                {teacher.workload_level}
                              </span>
                              <span className="text-muted-foreground">
                                ({teacher.total_periods_assigned || 0} exam
                                assignments)
                              </span>
                            </div>
                            {!teacher.availability.is_available && (
                              <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                                <AlertTriangle className="h-4 w-4" />
                                <span>
                                  {teacher.availability.conflict_reason}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                <Button
                  onClick={() => handleAssign("Assistant")}
                  disabled={!selectedAssistant || submitting}
                  className="w-full"
                >
                  {submitting ? "Assigning..." : "Assign Assistant"}
                </Button>

                {assistants.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-2 text-center">
                    No available assistants for this time slot
                  </p>
                )}
                {assistants.length > 0 &&
                  assistants.filter((t) => t.availability.is_available)
                    .length === 0 && (
                    <p className="text-sm text-orange-600 dark:text-orange-400 mt-2 text-center">
                      ⚠ All assistants are already assigned to other exams
                      during this session
                    </p>
                  )}
              </>
            )}

            {status?.hasAssistant && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm font-medium text-foreground">
                  ✓ Assistant assigned
                </p>
              </div>
            )}
          </div>

          {/* Completion Status */}
          {status?.isFullyStaffed && (
            <div className="p-4 rounded-lg border border-green-200 bg-green-50 dark:border-green-900/30 dark:bg-green-900/10">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                <p className="font-medium">This exam room is fully staffed!</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-6 border-t bg-muted/30">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AssignTeachersModal;
