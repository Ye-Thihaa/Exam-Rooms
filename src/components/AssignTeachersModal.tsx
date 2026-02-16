import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Users,
  CheckCircle2,
  Search,
  UserPlus,
  Loader2,
  UserCheck,
  AlertCircle,
  Save,
} from "lucide-react";
import { teacherAssignmentQueries } from "@/services/teacherassignmentQueries";
import {
  TeacherRole,
  ExamSession,
  TeacherWithAvailability,
  ExamRoomAssignmentStatus,
} from "@/services/teacherAssignmentTypes";

interface AssignTeachersModalProps {
  examRoomId: number;
  roomNumber: string;
  examDate: string;
  examSession: ExamSession;
  examTime?: { start: string; end: string };
  onClose: () => void;
  onSuccess: () => void;
}

// Helper Component for List Selection
const TeacherSelector = ({
  teachers,
  selectedId,
  onSelect,
  roleLabel,
}: {
  teachers: TeacherWithAvailability[];
  selectedId: number | null;
  onSelect: (teacherId: number) => void;
  roleLabel: string;
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredTeachers = teachers.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.department.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="flex flex-col h-[350px] border rounded-md bg-white">
      {/* Search Header */}
      <div className="p-3 border-b bg-gray-50/50">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${roleLabel.toLowerCase()}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 bg-white"
          />
        </div>
      </div>

      {/* Scrollable List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filteredTeachers.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            {searchTerm ? "No match found" : `No available ${roleLabel}s`}
          </div>
        ) : (
          filteredTeachers.map((teacher) => {
            const isSelected = selectedId === teacher.teacher_id;

            return (
              <div
                key={teacher.teacher_id}
                onClick={() =>
                  teacher.availability.is_available &&
                  onSelect(teacher.teacher_id)
                }
                className={`group flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all 
                  ${
                    isSelected
                      ? "bg-primary/5 border-primary ring-1 ring-primary/20"
                      : "hover:bg-accent hover:border-primary/30"
                  }
                  ${!teacher.availability.is_available ? "opacity-60 cursor-not-allowed bg-gray-50" : ""}
                `}
              >
                <div className="flex-1 min-w-0 mr-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`font-medium text-sm truncate ${isSelected ? "text-primary" : "text-foreground"}`}
                    >
                      {teacher.name}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground truncate mb-1.5">
                    {teacher.rank} • {teacher.department}
                  </p>

                  <div className="flex gap-2">
                    <Badge
                      variant="secondary"
                      className="text-[10px] h-5 px-1.5 font-normal bg-gray-100 text-gray-600 border-gray-200"
                    >
                      {teacher.total_periods_assigned || 0} exams
                    </Badge>
                  </div>
                </div>

                {/* Selection Indicator */}
                <div
                  className={`
                  h-8 w-8 rounded-full flex items-center justify-center transition-all
                  ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-transparent text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                  }
                `}
                >
                  {isSelected ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <div
                      className={`h-4 w-4 rounded-full border-2 ${teacher.availability.is_available ? "border-current" : "border-gray-300"}`}
                    />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

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
  const [loading, setLoading] = useState(true);

  // ✅ Local Selection State (Pending Assignments)
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<
    number | null
  >(null);
  const [selectedAssistantId, setSelectedAssistantId] = useState<number | null>(
    null,
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [activeExamRoomId, setActiveExamRoomId] = useState<number>(examRoomId);
  const effectiveSession: ExamSession = examSession || "Morning";

  useEffect(() => {
    loadData();
  }, [examRoomId, examDate, effectiveSession]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      let currentId = examRoomId;
      const correctId = await teacherAssignmentQueries.getCorrectExamRoomId(
        roomNumber,
        examDate,
        effectiveSession,
      );

      if (correctId) {
        currentId = correctId;
        setActiveExamRoomId(correctId);
      }

      const roomStatus = await teacherAssignmentQueries.getExamRoomStatus(
        currentId,
        examDate,
        effectiveSession,
      );
      setStatus(roomStatus);

      const [availableSupervisors, availableAssistants] = await Promise.all([
        teacherAssignmentQueries.getAvailableTeachersWithSession(
          currentId,
          "Supervisor",
          examDate,
          effectiveSession,
        ),
        teacherAssignmentQueries.getAvailableTeachersWithSession(
          currentId,
          "Assistant",
          examDate,
          effectiveSession,
        ),
      ]);

      setSupervisors(availableSupervisors);
      setAssistants(availableAssistants);
      // Reset local selections on data reload
      setSelectedSupervisorId(null);
      setSelectedAssistantId(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load teachers");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fixed Batch Save Function
  const handleSaveChanges = async () => {
    if (!selectedSupervisorId && !selectedAssistantId) return;

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    const promises = [];

    try {
      // Delete existing assignments first to avoid unique constraint violation
      if (selectedSupervisorId) {
        await teacherAssignmentQueries.deleteByRoomAndRole(
          activeExamRoomId,
          "Supervisor",
        );
      }

      if (selectedAssistantId) {
        await teacherAssignmentQueries.deleteByRoomAndRole(
          activeExamRoomId,
          "Assistant",
        );
      }

      // Now create the new assignments
      const promises = [];

      if (selectedSupervisorId) {
        promises.push(
          teacherAssignmentQueries.create(
            activeExamRoomId,
            selectedSupervisorId,
            "Supervisor",
            examDate,
            effectiveSession,
            examTime?.start,
            examTime?.end,
          ),
        );
      }

      if (selectedAssistantId) {
        promises.push(
          teacherAssignmentQueries.create(
            activeExamRoomId,
            selectedAssistantId,
            "Assistant",
            examDate,
            effectiveSession,
            examTime?.start,
            examTime?.end,
          ),
        );
      }

      await Promise.all(promises);

      setSuccessMessage("Assignments saved successfully!");
      await loadData();
      onSuccess();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save assignments");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (role: TeacherRole) => {
    setSubmitting(true);
    try {
      await teacherAssignmentQueries.deleteByRoomAndRole(
        activeExamRoomId,
        role,
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

  // Helper to check if we have unsaved changes
  const hasUnsavedChanges =
    selectedSupervisorId !== null || selectedAssistantId !== null;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <div className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-gray-500">Loading available teachers...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white border rounded-lg max-w-5xl w-full max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-white z-10 rounded-t-lg">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Assign Invigilators
              </h2>
              <p className="text-sm text-gray-500">
                {roomNumber} • {examDate} • {effectiveSession}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive mb-6">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="flex items-start gap-3 p-4 rounded-lg border border-green-200 bg-green-50 text-green-700 mb-6">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">{successMessage}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* --- SUPERVISOR SECTION --- */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    Supervisor
                    {status?.hasSupervisor && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Professors & Associate Professors
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

              {!status?.hasSupervisor ? (
                <TeacherSelector
                  teachers={supervisors}
                  roleLabel="Supervisor"
                  selectedId={selectedSupervisorId}
                  onSelect={setSelectedSupervisorId}
                />
              ) : (
                <div className="p-4 rounded-lg bg-green-50 border border-green-100 flex items-start gap-3">
                  <div className="p-2 bg-green-100 rounded-full text-green-600">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-green-900">
                      {status.supervisorName}
                    </p>
                    <p className="text-xs text-green-700 mt-0.5">
                      Assigned Supervisor
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* --- ASSISTANT SECTION --- */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    Assistant
                    {status?.hasAssistant && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Lecturers & Instructors
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

              {!status?.hasAssistant ? (
                <TeacherSelector
                  teachers={assistants}
                  roleLabel="Assistant"
                  selectedId={selectedAssistantId}
                  onSelect={setSelectedAssistantId}
                />
              ) : (
                <div className="p-4 rounded-lg bg-green-50 border border-green-100 flex items-start gap-3">
                  <div className="p-2 bg-green-100 rounded-full text-green-600">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-green-900">
                      {status.assistantName}
                    </p>
                    <p className="text-xs text-green-700 mt-0.5">
                      Assigned Assistant
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer with Save Button */}
        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 rounded-b-lg">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveChanges}
            disabled={!hasUnsavedChanges || submitting}
            className="w-32"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {submitting ? "Saving..." : "Confirm"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AssignTeachersModal;
