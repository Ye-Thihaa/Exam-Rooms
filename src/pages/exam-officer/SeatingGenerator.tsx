// pages/SeatingGenerator.tsx

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import PageHeader from "@/components/shared/PageHeader";
import SeatingPlanGrid from "@/components/shared/SeatingPlanGrid";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  dynamicSeatingAssignment,
  SeatingGrid,
} from "@/services/dynamicSeatingAlgorithm";
import { validateSeatingArrangement } from "@/services/dynamicSeatingAlgorithm";

import {
  RefreshCw,
  Users,
  ArrowLeft,
  Download,
  Save,
  AlertCircle,
  CheckCircle2,
  Eye,
  Loader2,
} from "lucide-react";
import { getExamRoomsWithDetails } from "@/services/examroomQueries";
import { toast } from "sonner";
import {
  getUnassignedStudentsByGroup,
  saveSeatingAssignments,
  checkExistingSeatingAssignments,
  clearSeatingAssignments,
  getSeatingAssignmentsByExamRoom,
  SeatingAssignmentInput,
  SeatingAssignmentWithStudent,
} from "@/services/seatingQueries";
import { Student } from "@/services/studentQueries";

interface ExamRoomDetails {
  exam_room_id: number;
  exam_id: number;
  room_id: number;
  assigned_capacity: number;
  year_level_primary: string;
  sem_primary: string;
  program_primary: string;
  specialization_primary?: string;
  students_primary: number;
  year_level_secondary: string;
  sem_secondary: string;
  program_secondary: string;
  specialization_secondary?: string;
  students_secondary: number;
  stu_assigned?: boolean;
  room: {
    room_id: number;
    room_number: string;
    capacity: number;
    rows: number;
    cols: number;
  };
}

interface SeatAssignment {
  seatNumber: string;
  row: string;
  column: number;
  isOccupied: boolean;
  studentId?: number;
  studentNumber?: string;
  studentName?: string;
  studentGroup?: string;
}

interface StudentData {
  primaryStudents: Student[];
  secondaryStudents: Student[];
}

const SeatingGenerator: React.FC = () => {
  const [examRooms, setExamRooms] = useState<ExamRoomDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExamRoom, setSelectedExamRoom] =
    useState<ExamRoomDetails | null>(null);
  const [showSeatingPlan, setShowSeatingPlan] = useState(false);
  const [generatedSeats, setGeneratedSeats] = useState<SeatAssignment[]>([]);
  const [studentData, setStudentData] = useState<StudentData | null>(null);

  // Preview state
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatingRoomId, setGeneratingRoomId] = useState<number | null>(null);
  const [viewingRoomId, setViewingRoomId] = useState<number | null>(null);

  useEffect(() => {
    loadExamRooms();
  }, []);

  const loadExamRooms = async () => {
    try {
      setLoading(true);
      const result = await getExamRoomsWithDetails();

      if (result.success && result.data) {
        setExamRooms(result.data);
        toast.success(`Loaded ${result.data.length} exam room assignments`);
      } else {
        toast.error("Failed to load exam rooms");
      }
    } catch (error) {
      console.error("Error loading exam rooms:", error);
      toast.error("An error occurred while loading exam rooms");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch students for both groups
   */
  const fetchStudentsForGroups = async (
    examRoom: ExamRoomDetails,
  ): Promise<StudentData | null> => {
    try {
      // Map program display names back to database values
      const getProgramCode = (displayName: string): string => {
        const mapping: Record<string, string> = {
          "Computer Science and Technology": "CST",
          "Computer Science": "CS",
          "Computer Technology": "CT",
        };
        return mapping[displayName] || displayName;
      };

      const primaryProgram = getProgramCode(examRoom.program_primary);
      const secondaryProgram = getProgramCode(examRoom.program_secondary);

      console.log("Fetching students for:");
      console.log("Primary:", {
        year: parseInt(examRoom.year_level_primary),
        sem: parseInt(examRoom.sem_primary),
        program: primaryProgram,
        specialization: examRoom.specialization_primary,
        needed: examRoom.students_primary,
      });
      console.log("Secondary:", {
        year: parseInt(examRoom.year_level_secondary),
        sem: parseInt(examRoom.sem_secondary),
        program: secondaryProgram,
        specialization: examRoom.specialization_secondary,
        needed: examRoom.students_secondary,
      });

      const [primaryResult, secondaryResult] = await Promise.all([
        getUnassignedStudentsByGroup(
          parseInt(examRoom.year_level_primary),
          parseInt(examRoom.sem_primary),
          primaryProgram,
          examRoom.specialization_primary,
          examRoom.students_primary,
        ),
        getUnassignedStudentsByGroup(
          parseInt(examRoom.year_level_secondary),
          parseInt(examRoom.sem_secondary),
          secondaryProgram,
          examRoom.specialization_secondary,
          examRoom.students_secondary,
        ),
      ]);

      if (!primaryResult.success || !secondaryResult.success) {
        toast.error("Failed to fetch students");
        return null;
      }

      const primaryStudents = primaryResult.data || [];
      const secondaryStudents = secondaryResult.data || [];

      console.log(`Found ${primaryStudents.length} primary students`);
      console.log(`Found ${secondaryStudents.length} secondary students`);

      // Check if we have enough students
      if (primaryStudents.length < examRoom.students_primary) {
        toast.warning(
          `Only ${primaryStudents.length} unassigned primary students available (need ${examRoom.students_primary})`,
        );
      }
      if (secondaryStudents.length < examRoom.students_secondary) {
        toast.warning(
          `Only ${secondaryStudents.length} unassigned secondary students available (need ${examRoom.students_secondary})`,
        );
      }

      return { primaryStudents, secondaryStudents };
    } catch (error) {
      console.error("Error fetching students:", error);
      toast.error("Failed to fetch student data");
      return null;
    }
  };

  /**
   * Convert algorithm SeatingGrid output to SeatAssignment format for UI
   */
  const convertAlgorithmResultToSeats = (
    result: SeatingGrid,
    examRoom: ExamRoomDetails,
    primaryStudentIds: Set<number>,
    secondaryStudentIds: Set<number>,
  ): SeatAssignment[] => {
    const seats: SeatAssignment[] = [];
    const roomPrefix = examRoom.room.room_number.replace(/\s/g, "");
    const rows = examRoom.room.rows;
    const cols = examRoom.room.cols;

    // Create a map of all assignments for quick lookup
    const assignmentMap = new Map<string, (typeof result.assignments)[0]>();
    result.assignments.forEach((assignment) => {
      const key = `${assignment.row_label}-${assignment.column_number}`;
      assignmentMap.set(key, assignment);
    });

    console.log(`Converting ${result.assignments.length} assignments to seats`);
    console.log("Sample assignment:", result.assignments[0]);

    // Generate all seats row by row
    for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
      const rowLabel =
        result.rowLabels[rowIndex] || "ABCDEFGHIJKLMNOPQRST"[rowIndex];

      for (let colIndex = 0; colIndex < cols; colIndex++) {
        const column = colIndex + 1;
        const seatKey = `${rowLabel}-${column}`;
        const assignment = assignmentMap.get(seatKey);

        if (assignment) {
          // Find the student in the grid
          const student = result.grid[rowIndex]?.[colIndex];

          if (student) {
            // Determine if student is from primary or secondary group using the ID sets
            const isPrimary = primaryStudentIds.has(student.student_id);

            const groupLabel = isPrimary
              ? `Y${examRoom.year_level_primary}-S${examRoom.sem_primary}-${examRoom.program_primary}${examRoom.specialization_primary ? ` (${examRoom.specialization_primary})` : ""}`
              : `Y${examRoom.year_level_secondary}-S${examRoom.sem_secondary}-${examRoom.program_secondary}${examRoom.specialization_secondary ? ` (${examRoom.specialization_secondary})` : ""}`;

            seats.push({
              seatNumber: assignment.seat_number,
              row: rowLabel,
              column: column,
              isOccupied: true,
              studentId: student.student_id,
              studentNumber: student.student_number,
              studentName: student.name,
              studentGroup: groupLabel,
            });
          } else {
            // Assignment exists but no student (shouldn't happen)
            seats.push({
              seatNumber: assignment.seat_number,
              row: rowLabel,
              column: column,
              isOccupied: false,
            });
          }
        } else {
          // No assignment for this seat - it's empty
          const seatNumber = `${roomPrefix}-${rowIndex * cols + colIndex + 1}`;
          seats.push({
            seatNumber,
            row: rowLabel,
            column: column,
            isOccupied: false,
          });
        }
      }
    }

    console.log(`Generated ${seats.length} total seats`);
    console.log(`Occupied: ${seats.filter((s) => s.isOccupied).length}`);
    console.log(
      "Sample occupied seat:",
      seats.find((s) => s.isOccupied),
    );

    return seats;
  };

  /**
   * Generate seating plan using the dynamic algorithm
   */
  const generateSeatingPlan = (
    examRoom: ExamRoomDetails,
    studentData: StudentData,
  ): SeatAssignment[] => {
    const { primaryStudents, secondaryStudents } = studentData;

    console.log("Generating seating with:", {
      primaryCount: primaryStudents.length,
      secondaryCount: secondaryStudents.length,
      cols: examRoom.room.cols,
      rows: examRoom.room.rows,
      capacity: examRoom.room.capacity,
    });

    // Use the dynamic seating algorithm
    const result: SeatingGrid = dynamicSeatingAssignment(
      primaryStudents,
      secondaryStudents,
      examRoom.room.cols,
      examRoom.room.rows,
      examRoom.exam_room_id,
    );

    console.log("Algorithm result:", {
      gridRows: result.grid.length,
      gridCols: result.grid[0]?.length,
      assignmentsCount: result.assignments.length,
      rowLabels: result.rowLabels,
    });

    console.log("First few assignments:", result.assignments.slice(0, 5));
    console.log(
      "Grid row 0:",
      result.grid[0]?.map((s) => s?.student_number),
    );

    // Create ID sets for validation and conversion
    const groupAIds = new Set(primaryStudents.map((s) => s.student_id));
    const groupBIds = new Set(secondaryStudents.map((s) => s.student_id));

    // Validate
    const validation = validateSeatingArrangement(result, groupAIds, groupBIds);

    if (!validation.valid) {
      console.error("Seating validation errors:", validation.errors);
      toast.error("Seating arrangement has validation errors");
    } else {
      console.log("✅ Seating arrangement validated successfully");
    }

    // Convert algorithm output to SeatAssignment format
    return convertAlgorithmResultToSeats(
      result,
      examRoom,
      groupAIds,
      groupBIds,
    );
  };

  /**
   * Helper function to convert seating assignments to SeatAssignment format
   */
  const convertSeatingAssignmentsToSeats = (
    assignments: SeatingAssignmentWithStudent[],
    rows: number,
    cols: number,
    roomNumber: string,
  ): SeatAssignment[] => {
    const seats: SeatAssignment[] = [];
    const rowLabels = "ABCDEFGHIJKLMNOPQRST".split("").slice(0, rows);
    const roomPrefix = roomNumber.replace(/\s/g, "");

    console.log("=== convertSeatingAssignmentsToSeats DEBUG ===");
    console.log("Assignments received:", assignments.length);
    console.log("Room dimensions:", rows, "x", cols);
    console.log("Room number:", roomNumber, "Prefix:", roomPrefix);
    console.log("Sample assignment:", assignments[0]);

    // Create a map for quick lookup by row_label and column_number
    const assignmentMap = new Map<string, SeatingAssignmentWithStudent>();
    assignments.forEach((assignment) => {
      const key = `${assignment.row_label}-${assignment.column_number}`;
      assignmentMap.set(key, assignment);
    });

    console.log("Assignment map size:", assignmentMap.size);
    console.log(
      "First few map keys:",
      Array.from(assignmentMap.keys()).slice(0, 5),
    );

    // Create all seats
    for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
      const rowLabel = rowLabels[rowIndex];

      for (let col = 1; col <= cols; col++) {
        const mapKey = `${rowLabel}-${col}`;
        const assignment = assignmentMap.get(mapKey);

        if (assignment && assignment.student) {
          seats.push({
            seatNumber: assignment.seat_number,
            row: assignment.row_label,
            column: assignment.column_number,
            isOccupied: true,
            studentId: assignment.student.student_id,
            studentNumber: assignment.student.student_number,
            studentName: assignment.student.name,
            studentGroup: `Y${assignment.student.year_level}-S${assignment.student.sem}-${assignment.student.major}${assignment.student.specialization ? ` (${assignment.student.specialization})` : ""}`,
          });
        } else {
          // Empty seat
          const seatIndex = rowIndex * cols + (col - 1) + 1;
          const seatNumber = `${roomPrefix}-${seatIndex}`;
          seats.push({
            seatNumber,
            row: rowLabel,
            column: col,
            isOccupied: false,
          });
        }
      }
    }

    console.log("Total seats created:", seats.length);
    console.log("Occupied seats:", seats.filter((s) => s.isOccupied).length);
    console.log(
      "Sample occupied seat:",
      seats.find((s) => s.isOccupied),
    );
    console.log("=== END DEBUG ===");

    return seats;
  };

  /**
   * View existing seating plan
   */
  const handleViewSeatingPlan = async (examRoom: ExamRoomDetails) => {
    try {
      setViewingRoomId(examRoom.exam_room_id);

      // Fetch existing seating assignments
      const result = await getSeatingAssignmentsByExamRoom(
        examRoom.exam_room_id,
      );

      if (!result.success || !result.data) {
        toast.error("Failed to load seating assignments");
        setViewingRoomId(null);
        return;
      }

      console.log("Fetched seating assignments:", result.data);
      console.log("Number of assignments:", result.data.length);

      // Convert seating assignments to SeatAssignment format
      const seats = convertSeatingAssignmentsToSeats(
        result.data,
        examRoom.room.rows,
        examRoom.room.cols,
        examRoom.room.room_number,
      );

      console.log("Converted seats:", seats);
      console.log("Occupied seats:", seats.filter((s) => s.isOccupied).length);
      console.log(
        "Sample occupied seat:",
        seats.find((s) => s.isOccupied),
      );

      // Extract students from assignments and separate them into groups
      const assignedStudents = result.data
        .filter((a) => a.student)
        .map((a) => a.student);

      // Map program display names back to database values for comparison
      const getProgramCode = (displayName: string): string => {
        const mapping: Record<string, string> = {
          "Computer Science and Technology": "CST",
          "Computer Science": "CS",
          "Computer Technology": "CT",
        };
        return mapping[displayName] || displayName;
      };

      const primaryProgram = getProgramCode(examRoom.program_primary);
      const secondaryProgram = getProgramCode(examRoom.program_secondary);

      // Separate students into primary and secondary groups based on their attributes
      const primaryStudents = assignedStudents.filter((student) => {
        return (
          student.year_level === parseInt(examRoom.year_level_primary) &&
          student.sem === parseInt(examRoom.sem_primary) &&
          student.major === primaryProgram &&
          (examRoom.specialization_primary
            ? student.specialization === examRoom.specialization_primary
            : true)
        );
      });

      const secondaryStudents = assignedStudents.filter((student) => {
        return (
          student.year_level === parseInt(examRoom.year_level_secondary) &&
          student.sem === parseInt(examRoom.sem_secondary) &&
          student.major === secondaryProgram &&
          (examRoom.specialization_secondary
            ? student.specialization === examRoom.specialization_secondary
            : true)
        );
      });

      console.log("Separated students:", {
        primary: primaryStudents.length,
        secondary: secondaryStudents.length,
        total: assignedStudents.length,
      });

      setStudentData({
        primaryStudents,
        secondaryStudents,
      });

      setSelectedExamRoom(examRoom);
      setGeneratedSeats(seats);
      setShowSeatingPlan(true);
      toast.success("Loaded existing seating plan");
    } catch (error) {
      console.error("Error loading seating plan:", error);
      toast.error("Failed to load seating plan");
    } finally {
      setViewingRoomId(null);
    }
  };

  /**
   * Regenerate seating plan (clear and generate new)
   */
  const handleRegenerateSeatingPlan = async (examRoom: ExamRoomDetails) => {
    const confirmed = window.confirm(
      `This will delete the existing seating plan and generate a new one. Are you sure?`,
    );

    if (!confirmed) return;

    try {
      setGeneratingRoomId(examRoom.exam_room_id);

      // Clear existing assignments (trigger will set stu_assigned to false)
      await clearSeatingAssignments(examRoom.exam_room_id);
      toast.info("Cleared existing seating assignments");

      // Reload exam rooms to get updated stu_assigned status
      await loadExamRooms();

      // Then generate new seating plan
      await handleGenerateSeatingPlan(examRoom);
    } catch (error) {
      console.error("Error regenerating seating plan:", error);
      toast.error("Failed to regenerate seating plan");
    } finally {
      setGeneratingRoomId(null);
    }
  };

  /**
   * Handle generate seating plan - fetch students and show preview
   */
  const handleGenerateSeatingPlan = async (examRoom: ExamRoomDetails) => {
    setGeneratingRoomId(examRoom.exam_room_id);
    try {
      // Check if this exam room already has seating assignments
      const existingCheck = await checkExistingSeatingAssignments(
        examRoom.exam_room_id,
      );

      if (existingCheck.hasAssignments) {
        const confirmed = window.confirm(
          `This exam room already has ${existingCheck.count} seating assignments. Do you want to clear them and generate new seating?`,
        );

        if (!confirmed) {
          setGeneratingRoomId(null);
          return;
        }

        // Clear existing assignments
        await clearSeatingAssignments(examRoom.exam_room_id);
        toast.info("Cleared existing seating assignments");
      }

      // Fetch students
      const students = await fetchStudentsForGroups(examRoom);

      if (!students) {
        setGeneratingRoomId(null);
        return;
      }

      // Check if we have any students
      if (
        students.primaryStudents.length === 0 &&
        students.secondaryStudents.length === 0
      ) {
        toast.error("No unassigned students found for these groups");
        setGeneratingRoomId(null);
        return;
      }

      // Generate seating
      const seats = generateSeatingPlan(examRoom, students);

      setSelectedExamRoom(examRoom);
      setGeneratedSeats(seats);
      setStudentData(students);

      // Show preview dialog
      setShowPreviewDialog(true);
    } catch (error) {
      console.error("Error generating seating plan:", error);
      toast.error("Failed to generate seating plan");
    } finally {
      setGeneratingRoomId(null);
    }
  };

  /**
   * Confirm preview and show seating plan
   */
  const handleConfirmPreview = () => {
    setShowPreviewDialog(false);
    setShowSeatingPlan(true);
    toast.success("Seating plan generated successfully");
  };

  /**
   * Save seating plan to database
   */
  const handleSaveSeatingPlan = async () => {
    if (!selectedExamRoom || generatedSeats.length === 0 || !studentData) {
      toast.error("No seating plan to save");
      return;
    }

    setIsSaving(true);
    try {
      // Prepare assignments for database
      const assignments: SeatingAssignmentInput[] = generatedSeats
        .filter((seat) => seat.isOccupied && seat.studentId)
        .map((seat) => ({
          exam_room_id: selectedExamRoom.exam_room_id,
          student_id: seat.studentId!,
          seat_number: seat.seatNumber,
          row_label: seat.row,
          column_number: seat.column,
        }));

      console.log(`Saving ${assignments.length} seating assignments...`);

      const result = await saveSeatingAssignments(assignments);

      if (result.success) {
        toast.success(
          `Successfully saved ${assignments.length} seating assignments!`,
        );

        // Refresh exam rooms to update assignment status
        await loadExamRooms();
      } else {
        toast.error("Failed to save seating assignments");
        console.error("Save error:", result.error);
      }
    } catch (error) {
      console.error("Error saving seating plan:", error);
      toast.error("An error occurred while saving");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackToList = () => {
    setShowSeatingPlan(false);
    setSelectedExamRoom(null);
    setGeneratedSeats([]);
    setStudentData(null);
  };

  const handleCancelPreview = () => {
    setShowPreviewDialog(false);
    setSelectedExamRoom(null);
    setGeneratedSeats([]);
    setStudentData(null);
  };

  /**
   * Export seating plan to CSV format
   */
  const handleExportSeatingPlan = () => {
    if (!selectedExamRoom || generatedSeats.length === 0) {
      toast.error("No seating plan to export");
      return;
    }

    try {
      const headers = [
        "Seat Number",
        "Row",
        "Column",
        "Student Number",
        "Student Name",
        "Student Group",
        "Status",
      ];

      const rows = generatedSeats.map((seat) => [
        seat.seatNumber,
        seat.row,
        seat.column,
        seat.studentNumber || "N/A",
        seat.studentName || "N/A",
        seat.studentGroup || "N/A",
        seat.isOccupied ? "Assigned" : "Vacant",
      ]);

      const csvContent = [
        `Seating Plan - Room ${selectedExamRoom.room.room_number}`,
        `Generated on: ${new Date().toLocaleString()}`,
        "",
        `Primary Group: Y${selectedExamRoom.year_level_primary}-S${selectedExamRoom.sem_primary}-${selectedExamRoom.program_primary}${selectedExamRoom.specialization_primary ? ` (${selectedExamRoom.specialization_primary})` : ""} (${selectedExamRoom.students_primary} students)`,
        `Secondary Group: Y${selectedExamRoom.year_level_secondary}-S${selectedExamRoom.sem_secondary}-${selectedExamRoom.program_secondary}${selectedExamRoom.specialization_secondary ? ` (${selectedExamRoom.specialization_secondary})` : ""} (${selectedExamRoom.students_secondary} students)`,
        "",
        `Total Assigned: ${selectedExamRoom.assigned_capacity} / ${selectedExamRoom.room.capacity}`,
        "",
        headers.join(","),
        ...rows.map((row) => row.join(",")),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `Seating_Plan_Room_${selectedExamRoom.room.room_number}_${new Date().toISOString().split("T")[0]}.csv`,
      );
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Seating plan exported successfully");
    } catch (error) {
      console.error("Error exporting seating plan:", error);
      toast.error("Failed to export seating plan");
    }
  };

  // Preview Dialog Component
  const PreviewDialog = () => {
    if (!selectedExamRoom || !studentData) return null;

    const occupiedSeats = generatedSeats.filter((s) => s.isOccupied).length;
    const primaryAssigned = studentData.primaryStudents.length;
    const secondaryAssigned = studentData.secondaryStudents.length;

    return (
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview Seating Plan</DialogTitle>
            <DialogDescription>
              Review the seating arrangement before saving to the database
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Room Info */}
            <Card className="p-4">
              <h3 className="font-semibold mb-2">Room Information</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Room:</span>
                  <span className="ml-2 font-medium">
                    {selectedExamRoom.room.room_number}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Layout:</span>
                  <span className="ml-2 font-medium">
                    {selectedExamRoom.room.rows} × {selectedExamRoom.room.cols}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Capacity:</span>
                  <span className="ml-2 font-medium">
                    {selectedExamRoom.room.capacity}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Assigned:</span>
                  <span className="ml-2 font-medium">{occupiedSeats}</span>
                </div>
              </div>
            </Card>

            {/* Student Groups */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Student Groups</h3>
              <div className="space-y-3">
                <div className="p-2 bg-blue-50 rounded">
                  <div className="text-sm font-medium">Primary Group</div>
                  <div className="text-xs text-muted-foreground">
                    Y{selectedExamRoom.year_level_primary}-S
                    {selectedExamRoom.sem_primary}-
                    {selectedExamRoom.program_primary}
                    {selectedExamRoom.specialization_primary && (
                      <> ({selectedExamRoom.specialization_primary})</>
                    )}
                  </div>
                </div>

                <div className="p-2 bg-green-50 rounded">
                  <div className="text-sm font-medium">Secondary Group</div>
                  <div className="text-xs text-muted-foreground">
                    Y{selectedExamRoom.year_level_secondary}-S
                    {selectedExamRoom.sem_secondary}-
                    {selectedExamRoom.program_secondary}
                    {selectedExamRoom.specialization_secondary && (
                      <> ({selectedExamRoom.specialization_secondary})</>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Warnings */}
            {(primaryAssigned < selectedExamRoom.students_primary ||
              secondaryAssigned < selectedExamRoom.students_secondary) && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Insufficient Students</AlertTitle>
                <AlertDescription>
                  Some student groups have fewer unassigned students than
                  required. The seating plan will be generated with available
                  students only.
                </AlertDescription>
              </Alert>
            )}

            {/* Success indicator */}
            {primaryAssigned > 0 && secondaryAssigned > 0 && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">
                  Ready to Generate
                </AlertTitle>
                <AlertDescription className="text-green-700">
                  Total of {occupiedSeats} students will be assigned seats in a
                  zig-zag pattern.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={handleCancelPreview}>
              Cancel
            </Button>
            <Button onClick={handleConfirmPreview}>
              <Eye className="h-4 w-4 mr-2" />
              View Seating Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // If showing seating plan, render the plan view
  if (showSeatingPlan && selectedExamRoom) {
    const occupiedSeats = generatedSeats.filter((s) => s.isOccupied).length;

    return (
      <DashboardLayout>
        <PageHeader
          title={`Seating Plan - Room ${selectedExamRoom.room.room_number}`}
          description={`${occupiedSeats} students assigned`}
          actions={
            <div className="flex gap-2">
              <Button
                variant="default"
                onClick={handleSaveSeatingPlan}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save to Database
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleExportSeatingPlan}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" onClick={handleBackToList}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Rooms
              </Button>
            </div>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Info Panel */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Room Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Room</span>
                  <span className="font-medium">
                    {selectedExamRoom.room.room_number}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Capacity</span>
                  <span className="font-medium">
                    {selectedExamRoom.room.capacity}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Layout</span>
                  <span className="font-medium">
                    {selectedExamRoom.room.rows} × {selectedExamRoom.room.cols}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Assigned</span>
                  <span className="font-medium text-primary">
                    {occupiedSeats}
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-3">Student Groups</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="mb-1">
                    <span className="text-muted-foreground">Primary</span>
                  </div>
                  <p className="text-xs">
                    Y{selectedExamRoom.year_level_primary}-S
                    {selectedExamRoom.sem_primary}-
                    {selectedExamRoom.program_primary}
                    {selectedExamRoom.specialization_primary && (
                      <span className="text-muted-foreground">
                        {" "}
                        • {selectedExamRoom.specialization_primary}
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <div className="mb-1">
                    <span className="text-muted-foreground">Secondary</span>
                  </div>
                  <p className="text-xs">
                    Y{selectedExamRoom.year_level_secondary}-S
                    {selectedExamRoom.sem_secondary}-
                    {selectedExamRoom.program_secondary}
                    {selectedExamRoom.specialization_secondary && (
                      <span className="text-muted-foreground">
                        {" "}
                        • {selectedExamRoom.specialization_secondary}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-3">Pattern Info</h3>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  Zig-Zag Pattern:
                </span>{" "}
                Students are arranged with primary and secondary groups
                alternating in a checkerboard pattern, distributed evenly across
                the room using band-based selection.
              </p>
            </Card>
          </div>

          {/* Seating Plan Grid */}
          <div className="lg:col-span-3">
            <Card className="p-6">
              <SeatingPlanGrid
                seats={generatedSeats}
                rows={selectedExamRoom.room.rows}
                seatsPerRow={selectedExamRoom.room.cols}
                roomName={selectedExamRoom.room.room_number}
                seatPrefix={selectedExamRoom.room.room_number.replace(
                  /\s/g,
                  "",
                )}
              />
            </Card>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Default view: Room list
  return (
    <DashboardLayout>
      <PageHeader
        title="Seating Plan Generator"
        description="Select an exam room to generate seating arrangements"
        actions={
          <Button variant="outline" onClick={loadExamRooms} disabled={loading}>
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        }
      />

      {/* Preview Dialog */}
      <PreviewDialog />

      {loading ? (
        <Card className="p-12 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading exam rooms...</p>
        </Card>
      ) : examRooms.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-lg font-medium text-muted-foreground mb-2">
            No exam rooms found
          </p>
          <p className="text-sm text-muted-foreground">
            Please create room assignments first in the Room Assignment page
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {examRooms.map((examRoom) => {
            const parseRoomNumber = (roomNumber: string) => {
              if (!roomNumber || roomNumber.length < 3) {
                return {
                  building: "N/A",
                  floor: "N/A",
                  room: roomNumber || "N/A",
                };
              }
              return {
                building: roomNumber.charAt(0),
                floor: roomNumber.charAt(1),
                room: roomNumber.substring(2),
              };
            };

            const roomInfo = parseRoomNumber(examRoom.room?.room_number || "");

            return (
              <Card
                key={examRoom.exam_room_id}
                className="p-6 hover:shadow-lg transition-shadow"
              >
                {/* Room Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-2xl text-foreground">
                        Room {examRoom.room?.room_number || "N/A"}
                      </h3>
                      {examRoom.stu_assigned && (
                        <Badge variant="default" className="text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Assigned
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">
                          Building
                        </span>
                        <span className="font-medium">{roomInfo.building}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">
                          Floor
                        </span>
                        <span className="font-medium">{roomInfo.floor}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">
                          Room No.
                        </span>
                        <span className="font-medium">{roomInfo.room}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline">ID: {examRoom.exam_room_id}</Badge>
                </div>

                {/* Room Capacity */}
                <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">
                      Room Capacity
                    </span>
                    <span className="font-bold text-foreground">
                      {examRoom.room?.capacity || 0} seats
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Layout</span>
                    <span className="font-medium text-foreground">
                      {examRoom.room?.rows || 0} × {examRoom.room?.cols || 0}
                    </span>
                  </div>
                </div>

                {/* Student Groups */}
                <div className="border-t pt-4 space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">
                        Primary Group
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {examRoom.students_primary} students
                      </Badge>
                    </div>
                    <p className="text-sm font-medium">
                      Year {examRoom.year_level_primary} • Sem{" "}
                      {examRoom.sem_primary} • {examRoom.program_primary}
                      {examRoom.specialization_primary && (
                        <span className="text-muted-foreground">
                          {" "}
                          • {examRoom.specialization_primary}
                        </span>
                      )}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">
                        Secondary Group
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {examRoom.students_secondary} students
                      </Badge>
                    </div>
                    <p className="text-sm font-medium">
                      Year {examRoom.year_level_secondary} • Sem{" "}
                      {examRoom.sem_secondary} • {examRoom.program_secondary}
                      {examRoom.specialization_secondary && (
                        <span className="text-muted-foreground">
                          {" "}
                          • {examRoom.specialization_secondary}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Total Students & Progress */}
                <div className="border-t mt-4 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Users className="h-4 w-4 mr-2" />
                      <span>Assigned Students</span>
                    </div>
                    <span className="font-bold text-primary text-lg">
                      {examRoom.assigned_capacity}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{
                        width: `${(examRoom.assigned_capacity / (examRoom.room?.capacity || 1)) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-right mt-1">
                    {Math.round(
                      (examRoom.assigned_capacity /
                        (examRoom.room?.capacity || 1)) *
                        100,
                    )}
                    % utilized
                  </p>
                </div>

                {/* Action Buttons */}
                {examRoom.stu_assigned ? (
                  <div className="space-y-2 mt-4">
                    <Button
                      className="w-full"
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewSeatingPlan(examRoom)}
                      disabled={viewingRoomId === examRoom.exam_room_id}
                    >
                      {viewingRoomId === examRoom.exam_room_id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          View Seating Plan
                        </>
                      )}
                    </Button>
                    <Button
                      className="w-full"
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRegenerateSeatingPlan(examRoom)}
                      disabled={generatingRoomId === examRoom.exam_room_id}
                    >
                      {generatingRoomId === examRoom.exam_room_id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Regenerating...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Regenerate Seating
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="w-full mt-4"
                    size="sm"
                    onClick={() => handleGenerateSeatingPlan(examRoom)}
                    disabled={generatingRoomId === examRoom.exam_room_id}
                  >
                    {generatingRoomId === examRoom.exam_room_id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      "Generate Seating Plan"
                    )}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
};

export default SeatingGenerator;
