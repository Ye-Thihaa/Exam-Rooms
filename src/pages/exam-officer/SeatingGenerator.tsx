// pages/SeatingGenerator.tsx

import React, { useState, useEffect, useRef } from "react";
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
  PlayCircle,
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
  groupType?: "A" | "B";
}

interface StudentData {
  primaryStudents: Student[];
  secondaryStudents: Student[];
}

// ✅ NEW: Holds a fully generated (but not yet saved) room plan
interface GeneratedRoomPlan {
  examRoom: ExamRoomDetails;
  seats: SeatAssignment[];
  studentData: StudentData;
  assignments: SeatingAssignmentInput[];
  status: "ready" | "skipped" | "error";
  message: string;
}

const SeatingGenerator: React.FC = () => {
  const [examRooms, setExamRooms] = useState<ExamRoomDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExamRoom, setSelectedExamRoom] =
    useState<ExamRoomDetails | null>(null);
  const [showSeatingPlan, setShowSeatingPlan] = useState(false);
  const [generatedSeats, setGeneratedSeats] = useState<SeatAssignment[]>([]);
  const [studentData, setStudentData] = useState<StudentData | null>(null);

  // Single room preview state
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatingRoomId, setGeneratingRoomId] = useState<number | null>(null);
  const [viewingRoomId, setViewingRoomId] = useState<number | null>(null);

  // ✅ NEW: Generate All state
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [generateAllProgress, setGenerateAllProgress] = useState<{
    current: number;
    total: number;
    currentRoom: string;
  } | null>(null);
  const [generatedPlans, setGeneratedPlans] = useState<GeneratedRoomPlan[]>([]);
  const [showGenerateAllSummary, setShowGenerateAllSummary] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);

  // ✅ NEW: In-memory claimed student ID set to prevent cross-room duplicates
  // during batch generation (before any saves happen)
  const claimedStudentIds = useRef<Set<number>>(new Set());

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

  const getProgramCode = (displayName: string): string => {
    const mapping: Record<string, string> = {
      "Computer Science and Technology": "CST",
      "Computer Science": "CS",
      "Computer Technology": "CT",
    };
    return mapping[displayName] || displayName;
  };

  /**
   * Fetch students for both groups.
   * @param excludeIds - Student IDs already claimed by previously generated rooms (batch mode)
   */
  const fetchStudentsForGroups = async (
    examRoom: ExamRoomDetails,
    excludeIds: Set<number> = new Set(),
  ): Promise<StudentData | null> => {
    try {
      const primaryProgram = getProgramCode(examRoom.program_primary);
      const secondaryProgram = getProgramCode(examRoom.program_secondary);

      const [primaryResult, secondaryResult] = await Promise.all([
        getUnassignedStudentsByGroup(
          parseInt(examRoom.year_level_primary),
          parseInt(examRoom.sem_primary),
          primaryProgram,
          examRoom.specialization_primary,
          // Fetch more than needed so we can filter out claimed ones
          examRoom.students_primary + excludeIds.size,
        ),
        getUnassignedStudentsByGroup(
          parseInt(examRoom.year_level_secondary),
          parseInt(examRoom.sem_secondary),
          secondaryProgram,
          examRoom.specialization_secondary,
          examRoom.students_secondary + excludeIds.size,
        ),
      ]);

      if (!primaryResult.success || !secondaryResult.success) {
        toast.error("Failed to fetch students");
        return null;
      }

      // ✅ Filter out students already claimed by earlier rooms in this batch
      const primaryStudents = (primaryResult.data || [])
        .filter((s) => !excludeIds.has(s.student_id))
        .slice(0, examRoom.students_primary);

      const secondaryStudents = (secondaryResult.data || [])
        .filter((s) => !excludeIds.has(s.student_id))
        .slice(0, examRoom.students_secondary);

      if (primaryStudents.length < examRoom.students_primary) {
        toast.warning(
          `Room ${examRoom.room.room_number}: Only ${primaryStudents.length} unassigned primary students available (need ${examRoom.students_primary})`,
        );
      }
      if (secondaryStudents.length < examRoom.students_secondary) {
        toast.warning(
          `Room ${examRoom.room.room_number}: Only ${secondaryStudents.length} unassigned secondary students available (need ${examRoom.students_secondary})`,
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
    const rows = examRoom.room.rows;
    const cols = examRoom.room.cols;
    const roomPrefix = examRoom.room.room_number.replace(/\s/g, "");

    const assignmentMap = new Map<string, (typeof result.assignments)[0]>();
    result.assignments.forEach((assignment) => {
      const key = `${assignment.row_label}-${assignment.column_number}`;
      assignmentMap.set(key, assignment);
    });

    for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
      const rowLabel =
        result.rowLabels[rowIndex] || "ABCDEFGHIJKLMNOPQRST"[rowIndex];

      for (let colIndex = 0; colIndex < cols; colIndex++) {
        const column = colIndex + 1;
        const seatKey = `${rowLabel}-${column}`;
        const assignment = assignmentMap.get(seatKey);

        if (assignment) {
          const student = result.grid[rowIndex]?.[colIndex];
          if (student) {
            const isPrimary = primaryStudentIds.has(student.student_id);
            const groupType: "A" | "B" = isPrimary ? "A" : "B";
            const groupLabel = isPrimary
              ? `Y${examRoom.year_level_primary}-S${examRoom.sem_primary}-${examRoom.program_primary}${examRoom.specialization_primary ? ` (${examRoom.specialization_primary})` : ""}`
              : `Y${examRoom.year_level_secondary}-S${examRoom.sem_secondary}-${examRoom.program_secondary}${examRoom.specialization_secondary ? ` (${examRoom.specialization_secondary})` : ""}`;

            seats.push({
              seatNumber: assignment.seat_number,
              row: rowLabel,
              column,
              isOccupied: true,
              studentId: student.student_id,
              studentNumber: student.student_number,
              studentName: student.name,
              studentGroup: groupLabel,
              groupType,
            });
          } else {
            seats.push({
              seatNumber: assignment.seat_number,
              row: rowLabel,
              column,
              isOccupied: false,
            });
          }
        } else {
          seats.push({
            seatNumber: `${roomPrefix}-${rowIndex * cols + colIndex + 1}`,
            row: rowLabel,
            column,
            isOccupied: false,
          });
        }
      }
    }

    return seats;
  };

  /**
   * Run the seating algorithm for one exam room
   */
  const generateSeatingPlan = (
    examRoom: ExamRoomDetails,
    studentData: StudentData,
  ): SeatAssignment[] => {
    const { primaryStudents, secondaryStudents } = studentData;

    const result: SeatingGrid = dynamicSeatingAssignment(
      primaryStudents,
      secondaryStudents,
      examRoom.room.cols,
      examRoom.room.rows,
      examRoom.exam_room_id,
    );

    const groupAIds = new Set(primaryStudents.map((s) => s.student_id));
    const groupBIds = new Set(secondaryStudents.map((s) => s.student_id));

    const validation = validateSeatingArrangement(result, groupAIds, groupBIds);
    if (!validation.valid) {
      console.error("Seating validation errors:", validation.errors);
    }

    return convertAlgorithmResultToSeats(
      result,
      examRoom,
      groupAIds,
      groupBIds,
    );
  };

  /**
   * Convert DB seating assignments → SeatAssignment[] for display
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

    const assignmentMap = new Map<string, SeatingAssignmentWithStudent>();
    assignments.forEach((a) => {
      assignmentMap.set(`${a.row_label}-${a.column_number}`, a);
    });

    for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
      const rowLabel = rowLabels[rowIndex];
      for (let col = 1; col <= cols; col++) {
        const assignment = assignmentMap.get(`${rowLabel}-${col}`);
        if (assignment?.student) {
          seats.push({
            seatNumber: assignment.seat_number,
            row: assignment.row_label,
            column: assignment.column_number,
            isOccupied: true,
            studentId: assignment.student.student_id,
            studentNumber: assignment.student.student_number,
            studentName: assignment.student.name,
            studentGroup: `Y${assignment.student.year_level}-S${assignment.student.sem}-${assignment.student.major}${assignment.student.specialization ? ` (${assignment.student.specialization})` : ""}`,
            groupType: assignment.student_group,
          });
        } else {
          seats.push({
            seatNumber: `${roomPrefix}-${rowIndex * cols + (col - 1) + 1}`,
            row: rowLabel,
            column: col,
            isOccupied: false,
          });
        }
      }
    }
    return seats;
  };

  // ─── Single Room Handlers ──────────────────────────────────────────────────

  const handleViewSeatingPlan = async (examRoom: ExamRoomDetails) => {
    try {
      setViewingRoomId(examRoom.exam_room_id);
      const result = await getSeatingAssignmentsByExamRoom(
        examRoom.exam_room_id,
      );

      if (!result.success || !result.data) {
        toast.error("Failed to load seating assignments");
        return;
      }

      const seats = convertSeatingAssignmentsToSeats(
        result.data,
        examRoom.room.rows,
        examRoom.room.cols,
        examRoom.room.room_number,
      );

      const assignedStudents = result.data
        .filter((a) => a.student)
        .map((a) => a.student);
      const primaryProgram = getProgramCode(examRoom.program_primary);
      const secondaryProgram = getProgramCode(examRoom.program_secondary);

      const primaryStudents = assignedStudents.filter(
        (s) =>
          s.year_level === parseInt(examRoom.year_level_primary) &&
          s.sem === parseInt(examRoom.sem_primary) &&
          s.major === primaryProgram &&
          (!examRoom.specialization_primary ||
            s.specialization === examRoom.specialization_primary),
      );
      const secondaryStudents = assignedStudents.filter(
        (s) =>
          s.year_level === parseInt(examRoom.year_level_secondary) &&
          s.sem === parseInt(examRoom.sem_secondary) &&
          s.major === secondaryProgram &&
          (!examRoom.specialization_secondary ||
            s.specialization === examRoom.specialization_secondary),
      );

      setStudentData({ primaryStudents, secondaryStudents });
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

  const handleRegenerateSeatingPlan = async (examRoom: ExamRoomDetails) => {
    if (
      !window.confirm(
        "This will delete the existing seating plan and generate a new one. Are you sure?",
      )
    )
      return;

    try {
      setGeneratingRoomId(examRoom.exam_room_id);
      await clearSeatingAssignments(examRoom.exam_room_id);
      toast.info("Cleared existing seating assignments");
      await loadExamRooms();
      await handleGenerateSeatingPlan(examRoom);
    } catch (error) {
      console.error("Error regenerating seating plan:", error);
      toast.error("Failed to regenerate seating plan");
    } finally {
      setGeneratingRoomId(null);
    }
  };

  const handleGenerateSeatingPlan = async (examRoom: ExamRoomDetails) => {
    setGeneratingRoomId(examRoom.exam_room_id);
    try {
      const existingCheck = await checkExistingSeatingAssignments(
        examRoom.exam_room_id,
      );
      if (existingCheck.hasAssignments) {
        if (
          !window.confirm(
            `This exam room already has ${existingCheck.count} seating assignments. Clear and regenerate?`,
          )
        ) {
          return;
        }
        await clearSeatingAssignments(examRoom.exam_room_id);
        toast.info("Cleared existing seating assignments");
      }

      const students = await fetchStudentsForGroups(examRoom);
      if (!students) return;

      if (
        students.primaryStudents.length === 0 &&
        students.secondaryStudents.length === 0
      ) {
        toast.error("No unassigned students found for these groups");
        return;
      }

      const seats = generateSeatingPlan(examRoom, students);
      setSelectedExamRoom(examRoom);
      setGeneratedSeats(seats);
      setStudentData(students);
      setShowPreviewDialog(true);
    } catch (error) {
      console.error("Error generating seating plan:", error);
      toast.error("Failed to generate seating plan");
    } finally {
      setGeneratingRoomId(null);
    }
  };

  const handleConfirmPreview = () => {
    setShowPreviewDialog(false);
    setShowSeatingPlan(true);
    toast.success("Seating plan generated successfully");
  };

  const handleSaveSeatingPlan = async () => {
    if (!selectedExamRoom || generatedSeats.length === 0 || !studentData) {
      toast.error("No seating plan to save");
      return;
    }

    setIsSaving(true);
    try {
      const assignments: SeatingAssignmentInput[] = generatedSeats
        .filter((seat) => seat.isOccupied && seat.studentId)
        .map((seat) => ({
          exam_room_id: selectedExamRoom.exam_room_id,
          student_id: seat.studentId!,
          seat_number: seat.seatNumber,
          row_label: seat.row,
          column_number: seat.column,
          student_group: seat.groupType || "A",
        }));

      const result = await saveSeatingAssignments(assignments);
      if (result.success) {
        toast.success(
          `Successfully saved ${assignments.length} seating assignments!`,
        );
        await loadExamRooms();
      } else {
        toast.error("Failed to save seating assignments");
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
        "Group Type",
        "Status",
      ];
      const rows = generatedSeats.map((seat) => [
        seat.seatNumber,
        seat.row,
        seat.column,
        seat.studentNumber || "N/A",
        seat.studentName || "N/A",
        seat.studentGroup || "N/A",
        seat.groupType || "N/A",
        seat.isOccupied ? "Assigned" : "Vacant",
      ]);

      const csvContent = [
        `Seating Plan - Room ${selectedExamRoom.room.room_number}`,
        `Generated on: ${new Date().toLocaleString()}`,
        "",
        `Primary Group (A): Y${selectedExamRoom.year_level_primary}-S${selectedExamRoom.sem_primary}-${selectedExamRoom.program_primary}${selectedExamRoom.specialization_primary ? ` (${selectedExamRoom.specialization_primary})` : ""} (${selectedExamRoom.students_primary} students)`,
        `Secondary Group (B): Y${selectedExamRoom.year_level_secondary}-S${selectedExamRoom.sem_secondary}-${selectedExamRoom.program_secondary}${selectedExamRoom.specialization_secondary ? ` (${selectedExamRoom.specialization_secondary})` : ""} (${selectedExamRoom.students_secondary} students)`,
        "",
        `Total Assigned: ${selectedExamRoom.assigned_capacity} / ${selectedExamRoom.room.capacity}`,
        "",
        headers.join(","),
        ...rows.map((row) => row.join(",")),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.setAttribute("href", URL.createObjectURL(blob));
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

  // ─── Generate All Handler ──────────────────────────────────────────────────

  const handleGenerateAllSeatingPlans = async () => {
    const unassignedRooms = examRooms.filter((r) => !r.stu_assigned);

    if (unassignedRooms.length === 0) {
      toast.info("All rooms already have seating plans. Nothing to generate.");
      return;
    }

    setIsGeneratingAll(true);
    setGeneratedPlans([]);
    // Reset the claimed IDs set for this batch run
    claimedStudentIds.current = new Set();

    setGenerateAllProgress({
      current: 0,
      total: unassignedRooms.length,
      currentRoom: "",
    });

    const plans: GeneratedRoomPlan[] = [];

    // ✅ Sequential loop — each room fetches from the SAME DB snapshot,
    // but we use claimedStudentIds to prevent overlap between rooms
    // since we're not saving between rooms in this flow.
    for (let i = 0; i < unassignedRooms.length; i++) {
      const examRoom = unassignedRooms[i];

      setGenerateAllProgress({
        current: i + 1,
        total: unassignedRooms.length,
        currentRoom: examRoom.room.room_number,
      });

      try {
        // Pass the current claimed set so this room won't pick already-claimed students
        const students = await fetchStudentsForGroups(
          examRoom,
          claimedStudentIds.current,
        );

        if (!students) {
          plans.push({
            examRoom,
            seats: [],
            studentData: { primaryStudents: [], secondaryStudents: [] },
            assignments: [],
            status: "error",
            message: "Failed to fetch students",
          });
          continue;
        }

        if (
          students.primaryStudents.length === 0 &&
          students.secondaryStudents.length === 0
        ) {
          plans.push({
            examRoom,
            seats: [],
            studentData: students,
            assignments: [],
            status: "skipped",
            message: "No unassigned students available",
          });
          continue;
        }

        // Generate seating plan (no save yet)
        const seats = generateSeatingPlan(examRoom, students);
        const occupiedSeats = seats.filter((s) => s.isOccupied && s.studentId);

        if (occupiedSeats.length === 0) {
          plans.push({
            examRoom,
            seats,
            studentData: students,
            assignments: [],
            status: "skipped",
            message: "Algorithm produced no seat assignments",
          });
          continue;
        }

        // Build assignments array for later save
        const assignments: SeatingAssignmentInput[] = occupiedSeats.map(
          (seat) => ({
            exam_room_id: examRoom.exam_room_id,
            student_id: seat.studentId!,
            seat_number: seat.seatNumber,
            row_label: seat.row,
            column_number: seat.column,
            student_group: seat.groupType || "A",
          }),
        );

        // ✅ Mark all assigned students as claimed so subsequent rooms skip them
        occupiedSeats.forEach((seat) => {
          if (seat.studentId) claimedStudentIds.current.add(seat.studentId);
        });

        plans.push({
          examRoom,
          seats,
          studentData: students,
          assignments,
          status: "ready",
          message: `${assignments.length} students ready to assign`,
        });
      } catch (error) {
        console.error(
          `Error processing room ${examRoom.room.room_number}:`,
          error,
        );
        plans.push({
          examRoom,
          seats: [],
          studentData: { primaryStudents: [], secondaryStudents: [] },
          assignments: [],
          status: "error",
          message: "Unexpected error during generation",
        });
      }
    }

    setGeneratedPlans(plans);
    setIsGeneratingAll(false);
    setGenerateAllProgress(null);
    // Show the combined summary dialog for user to review before saving
    setShowGenerateAllSummary(true);
  };

  /**
   * User confirmed the summary — save all ready plans
   */
  const handleConfirmSaveAll = async () => {
    const readyPlans = generatedPlans.filter((p) => p.status === "ready");
    if (readyPlans.length === 0) {
      toast.info("No plans to save");
      setShowGenerateAllSummary(false);
      return;
    }

    setIsSavingAll(true);
    let savedCount = 0;
    let failedCount = 0;

    for (const plan of readyPlans) {
      try {
        const result = await saveSeatingAssignments(plan.assignments);
        if (result.success) {
          savedCount++;
        } else {
          failedCount++;
          console.error(
            `Failed to save room ${plan.examRoom.room.room_number}:`,
            result.error,
          );
        }
      } catch (error) {
        failedCount++;
        console.error(
          `Exception saving room ${plan.examRoom.room.room_number}:`,
          error,
        );
      }
    }

    setIsSavingAll(false);
    setShowGenerateAllSummary(false);
    setGeneratedPlans([]);
    claimedStudentIds.current = new Set();

    if (failedCount === 0) {
      toast.success(`All ${savedCount} room(s) saved successfully!`);
    } else {
      toast.warning(
        `${savedCount} saved, ${failedCount} failed. Check console for details.`,
      );
    }

    await loadExamRooms();
  };

  const handleCancelSaveAll = () => {
    setShowGenerateAllSummary(false);
    setGeneratedPlans([]);
    claimedStudentIds.current = new Set();
  };

  // ─── Dialogs ───────────────────────────────────────────────────────────────

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
            {(primaryAssigned < selectedExamRoom.students_primary ||
              secondaryAssigned < selectedExamRoom.students_secondary) && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Insufficient Students</AlertTitle>
                <AlertDescription>
                  Some groups have fewer unassigned students than required.
                </AlertDescription>
              </Alert>
            )}
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

  // ✅ NEW: Generate All — progress dialog (shown while generating, closes automatically)
  const GenerateAllProgressDialog = () => (
    <Dialog open={isGeneratingAll}>
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Generating Seating Plans…</DialogTitle>
          <DialogDescription>
            Processing rooms one at a time. Please wait.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {generateAllProgress && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Room:{" "}
                  <span className="font-medium text-foreground">
                    {generateAllProgress.currentRoom}
                  </span>
                </span>
                <span className="font-medium">
                  {generateAllProgress.current} / {generateAllProgress.total}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{
                    width: `${(generateAllProgress.current / generateAllProgress.total) * 100}%`,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Do not close this window
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  // ✅ NEW: Combined summary dialog — shown after generation, before saving
  const GenerateAllSummaryDialog = () => {
    const readyPlans = generatedPlans.filter((p) => p.status === "ready");
    const skippedPlans = generatedPlans.filter((p) => p.status === "skipped");
    const errorPlans = generatedPlans.filter((p) => p.status === "error");
    const totalStudents = readyPlans.reduce(
      (sum, p) => sum + p.assignments.length,
      0,
    );

    return (
      <Dialog
        open={showGenerateAllSummary}
        onOpenChange={(open) => {
          if (!isSavingAll) setShowGenerateAllSummary(open);
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generation Summary</DialogTitle>
            <DialogDescription>
              Review all generated seating plans before saving them to the
              database.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Totals bar */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-2xl font-bold text-green-700">
                  {readyPlans.length}
                </p>
                <p className="text-xs text-green-600 mt-1">Ready to Save</p>
                <p className="text-xs text-muted-foreground">
                  {totalStudents} students
                </p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-2xl font-bold text-yellow-700">
                  {skippedPlans.length}
                </p>
                <p className="text-xs text-yellow-600 mt-1">Skipped</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                <p className="text-2xl font-bold text-red-700">
                  {errorPlans.length}
                </p>
                <p className="text-xs text-red-600 mt-1">Errors</p>
              </div>
            </div>

            {/* Per-room breakdown */}
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {generatedPlans.map((plan, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between p-3 rounded-lg border text-sm ${
                    plan.status === "ready"
                      ? "bg-green-50 border-green-200"
                      : plan.status === "skipped"
                        ? "bg-yellow-50 border-yellow-200"
                        : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {plan.status === "ready" && (
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    )}
                    {plan.status === "skipped" && (
                      <AlertCircle className="h-4 w-4 text-yellow-600 shrink-0" />
                    )}
                    {plan.status === "error" && (
                      <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                    )}
                    <div>
                      <p className="font-medium">
                        Room {plan.examRoom.room.room_number}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Y{plan.examRoom.year_level_primary}{" "}
                        {plan.examRoom.program_primary}
                        {plan.examRoom.specialization_primary
                          ? ` • ${plan.examRoom.specialization_primary}`
                          : ""}
                        {" + "}Y{plan.examRoom.year_level_secondary}{" "}
                        {plan.examRoom.program_secondary}
                        {plan.examRoom.specialization_secondary
                          ? ` • ${plan.examRoom.specialization_secondary}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      plan.status === "ready"
                        ? "text-green-700"
                        : plan.status === "skipped"
                          ? "text-yellow-700"
                          : "text-red-700"
                    }`}
                  >
                    {plan.message}
                  </span>
                </div>
              ))}
            </div>

            {readyPlans.length > 0 && (
              <Alert className="border-blue-200 bg-blue-50">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-700 text-sm">
                  Clicking <strong>Save All</strong> will commit {totalStudents}{" "}
                  student seat assignments across {readyPlans.length} room(s) to
                  the database. This cannot be undone without regenerating.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCancelSaveAll}
              disabled={isSavingAll}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSaveAll}
              disabled={isSavingAll || readyPlans.length === 0}
            >
              {isSavingAll ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save All ({readyPlans.length} rooms)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // ─── Seating Plan View ─────────────────────────────────────────────────────

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
                  <span className="text-muted-foreground">Primary</span>
                  <p className="text-xs mt-1">
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
                  <span className="text-muted-foreground">Secondary</span>
                  <p className="text-xs mt-1">
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
                Students are arranged alternating in a checkerboard pattern
                across the room.
              </p>
            </Card>
          </div>
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

  // ─── Room List View ────────────────────────────────────────────────────────

  const unassignedCount = examRooms.filter((r) => !r.stu_assigned).length;

  return (
    <DashboardLayout>
      <PageHeader
        title="Seating Plan Generator"
        description="Select an exam room to generate seating arrangements"
        actions={
          <div className="flex gap-2">
            {/* ✅ NEW: Generate All button */}
            <Button
              variant="default"
              onClick={handleGenerateAllSeatingPlans}
              disabled={isGeneratingAll || loading || unassignedCount === 0}
            >
              {isGeneratingAll ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Generate All ({unassignedCount} rooms)
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={loadExamRooms}
              disabled={loading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        }
      />

      {/* All dialogs */}
      <PreviewDialog />
      <GenerateAllProgressDialog />
      <GenerateAllSummaryDialog />

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
            const parseRoomNumber = (rn: string) => {
              if (!rn || rn.length < 3)
                return { building: "N/A", floor: "N/A", room: rn || "N/A" };
              return {
                building: rn.charAt(0),
                floor: rn.charAt(1),
                room: rn.substring(2),
              };
            };
            const roomInfo = parseRoomNumber(examRoom.room?.room_number || "");

            return (
              <Card
                key={examRoom.exam_room_id}
                className="p-6 hover:shadow-lg transition-shadow"
              >
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

                <div className="mt-4">
                  {examRoom.stu_assigned ? (
                    <div className="space-y-2">
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
                      className="w-full"
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
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
};

export default SeatingGenerator;
