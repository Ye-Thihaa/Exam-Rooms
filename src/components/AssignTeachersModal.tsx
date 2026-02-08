import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Users,
  Plus,
  Trash2,
  Clock,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react";
import { teacherQueries, Teacher } from "@/services/teacherQueries";
import {
  teacherAssignmentQueries,
  TeacherAssignmentWithDetails,
} from "@/services/teacherAssignmentQueries";

interface AssignTeachersModalProps {
  examRoomId: number;
  roomNumber: string;
  examDate: string;
  examTime?: { start: string; end: string };
  onClose: () => void;
  onSuccess?: () => void;
}

type InvigilatorRole =
  | "Chief Invigilator"
  | "Invigilator"
  | "Relief Invigilator"
  | "Technical Support"
  | "Roving Invigilator";

const ROLES: InvigilatorRole[] = [
  "Chief Invigilator",
  "Invigilator",
  "Relief Invigilator",
  "Technical Support",
  "Roving Invigilator",
];

interface AssignmentForm {
  teacher_id: number;
  role: InvigilatorRole;
  shift_start: string;
  shift_end: string;
}

const AssignTeachersModal: React.FC<AssignTeachersModalProps> = ({
  examRoomId,
  roomNumber,
  examDate,
  examTime,
  onClose,
  onSuccess,
}) => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [existingAssignments, setExistingAssignments] = useState<
    TeacherAssignmentWithDetails[]
  >([]);
  const [newAssignments, setNewAssignments] = useState<AssignmentForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load teachers and existing assignments
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Load all teachers
        const teachersData = await teacherQueries.getAll();
        setTeachers(teachersData);

        // Load existing assignments for this exam room
        const assignments =
          await teacherAssignmentQueries.getByExamRoomId(examRoomId);
        setExistingAssignments(assignments);
      } catch (err: any) {
        console.error("Error loading data:", err);
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [examRoomId]);

  // Add a new assignment form
  const handleAddAssignment = () => {
    setNewAssignments([
      ...newAssignments,
      {
        teacher_id: 0,
        role: "Invigilator",
        shift_start: examTime?.start || "09:00:00",
        shift_end: examTime?.end || "12:00:00",
      },
    ]);
  };

  // Remove assignment form
  const handleRemoveAssignment = (index: number) => {
    setNewAssignments(newAssignments.filter((_, i) => i !== index));
  };

  // Update assignment form
  const handleUpdateAssignment = (
    index: number,
    field: keyof AssignmentForm,
    value: any
  ) => {
    const updated = [...newAssignments];
    updated[index] = { ...updated[index], [field]: value };
    setNewAssignments(updated);
  };

  // Delete existing assignment
  const handleDeleteExisting = async (assignmentId: number) => {
    if (!confirm("Are you sure you want to remove this assignment?")) return;

    try {
      await teacherAssignmentQueries.delete(assignmentId);
      setExistingAssignments(
        existingAssignments.filter((a) => a.assignment_id !== assignmentId)
      );
    } catch (err: any) {
      setError(err.message || "Failed to delete assignment");
    }
  };

  // Save new assignments
  const handleSave = async () => {
    // Validate
    const invalidAssignments = newAssignments.filter(
      (a) => !a.teacher_id || !a.role || !a.shift_start || !a.shift_end
    );

    if (invalidAssignments.length > 0) {
      setError("Please fill in all fields for each assignment");
      return;
    }

    // Check for duplicate teachers
    const teacherIds = newAssignments.map((a) => a.teacher_id);
    const hasDuplicates = teacherIds.length !== new Set(teacherIds).size;

    if (hasDuplicates) {
      setError("Cannot assign the same teacher multiple times");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Create assignments
      const assignmentsToCreate = newAssignments.map((a) => ({
        exam_room_id: examRoomId,
        teacher_id: a.teacher_id,
        role: a.role,
        shift_start: a.shift_start,
        shift_end: a.shift_end,
      }));

      await teacherAssignmentQueries.createMany(assignmentsToCreate);

      setSuccess(true);
      setNewAssignments([]);

      // Reload existing assignments
      const updated =
        await teacherAssignmentQueries.getByExamRoomId(examRoomId);
      setExistingAssignments(updated);

      setTimeout(() => {
        setSuccess(false);
        if (onSuccess) onSuccess();
      }, 2000);
    } catch (err: any) {
      console.error("Error saving assignments:", err);
      setError(err.message || "Failed to save assignments");
    } finally {
      setSaving(false);
    }
  };

  // Get available teachers (not already assigned to this exam room)
  const assignedTeacherIds = new Set([
    ...existingAssignments.map((a) => a.teacher_id),
    ...newAssignments.map((a) => a.teacher_id),
  ]);

  const availableTeachers = teachers.filter(
    (t) => !assignedTeacherIds.has(t.teacher_id)
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-card z-10">
          <div>
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Assign Invigilators
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {roomNumber} - {examDate}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Error/Success Messages */}
          {error && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive flex items-start gap-2">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <span>Assignments saved successfully!</span>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading...
            </div>
          ) : (
            <>
              {/* Existing Assignments */}
              {existingAssignments.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">
                    Current Assignments ({existingAssignments.length})
                  </h3>
                  <div className="space-y-2">
                    {existingAssignments.map((assignment) => (
                      <div
                        key={assignment.assignment_id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-muted/30"
                      >
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Teacher
                            </p>
                            <p className="font-medium">
                              {assignment.teacher?.name || "Unknown"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {assignment.teacher?.department}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Role
                            </p>
                            <p className="font-medium">{assignment.role}</p>
                          </div>
                          <div className="col-span-1 md:col-span-2">
                            <p className="text-sm text-muted-foreground">
                              Shift Time
                            </p>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <p className="font-medium">
                                {assignment.shift_start.slice(0, 5)} -{" "}
                                {assignment.shift_end.slice(0, 5)}
                              </p>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleDeleteExisting(assignment.assignment_id)
                          }
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Assignments */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-foreground">
                    Add New Assignments
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddAssignment}
                    disabled={availableTeachers.length === 0}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Assignment
                  </Button>
                </div>

                {availableTeachers.length === 0 &&
                  newAssignments.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground border rounded-lg bg-muted/30">
                      All available teachers have been assigned
                    </div>
                  )}

                {newAssignments.length > 0 && (
                  <div className="space-y-4">
                    {newAssignments.map((assignment, index) => (
                      <div
                        key={index}
                        className="p-4 rounded-lg border bg-background"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Teacher Selection */}
                          <div>
                            <label className="text-sm font-medium text-foreground mb-1 block">
                              Teacher *
                            </label>
                            <select
                              value={assignment.teacher_id}
                              onChange={(e) =>
                                handleUpdateAssignment(
                                  index,
                                  "teacher_id",
                                  parseInt(e.target.value)
                                )
                              }
                              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              <option value={0}>Select a teacher</option>
                              {teachers
                                .filter(
                                  (t) =>
                                    !assignedTeacherIds.has(t.teacher_id) ||
                                    t.teacher_id === assignment.teacher_id
                                )
                                .map((teacher) => (
                                  <option
                                    key={teacher.teacher_id}
                                    value={teacher.teacher_id}
                                  >
                                    {teacher.name} ({teacher.rank}) -{" "}
                                    {teacher.department}
                                  </option>
                                ))}
                            </select>
                          </div>

                          {/* Role Selection */}
                          <div>
                            <label className="text-sm font-medium text-foreground mb-1 block">
                              Role *
                            </label>
                            <select
                              value={assignment.role}
                              onChange={(e) =>
                                handleUpdateAssignment(
                                  index,
                                  "role",
                                  e.target.value as InvigilatorRole
                                )
                              }
                              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              {ROLES.map((role) => (
                                <option key={role} value={role}>
                                  {role}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Shift Start */}
                          <div>
                            <label className="text-sm font-medium text-foreground mb-1 block">
                              Shift Start *
                            </label>
                            <input
                              type="time"
                              value={assignment.shift_start}
                              onChange={(e) =>
                                handleUpdateAssignment(
                                  index,
                                  "shift_start",
                                  e.target.value + ":00"
                                )
                              }
                              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>

                          {/* Shift End */}
                          <div>
                            <label className="text-sm font-medium text-foreground mb-1 block">
                              Shift End *
                            </label>
                            <input
                              type="time"
                              value={assignment.shift_end}
                              onChange={(e) =>
                                handleUpdateAssignment(
                                  index,
                                  "shift_end",
                                  e.target.value + ":00"
                                )
                              }
                              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>
                        </div>

                        {/* Remove Button */}
                        <div className="mt-3 flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveAssignment(index)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="p-4 rounded-lg bg-muted/30 border">
                <p className="text-sm text-muted-foreground">
                  <strong>Total Invigilators:</strong>{" "}
                  {existingAssignments.length + newAssignments.length}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Available Teachers:</strong>{" "}
                  {teachers.length - assignedTeacherIds.size}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-6 border-t sticky bottom-0 bg-card">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || newAssignments.length === 0}
          >
            {saving ? "Saving..." : `Save ${newAssignments.length} Assignment${newAssignments.length !== 1 ? "s" : ""}`}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AssignTeachersModal;