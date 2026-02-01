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
import { RefreshCw, Users, ArrowLeft, Download } from "lucide-react";
import { getExamRoomsWithDetails } from "@/services/examroomQueries";
import { toast } from "sonner";

interface ExamRoomDetails {
  exam_room_id: number;
  exam_id: number;
  room_id: number;
  assigned_capacity: number;
  year_level_primary: string;
  sem_primary: string;
  program_primary: string;
  students_primary: number;
  year_level_secondary: string;
  sem_secondary: string;
  program_secondary: string;
  students_secondary: number;
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
  studentId?: string;
  studentName?: string;
  studentGroup?: string;
  rollNumber?: string;
}

interface RollNumberConfig {
  primaryStarting: string;
  secondaryStarting: string;
}

const SeatingGenerator: React.FC = () => {
  const [examRooms, setExamRooms] = useState<ExamRoomDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExamRoom, setSelectedExamRoom] =
    useState<ExamRoomDetails | null>(null);
  const [showSeatingPlan, setShowSeatingPlan] = useState(false);
  const [generatedSeats, setGeneratedSeats] = useState<SeatAssignment[]>([]);

  // Roll number dialog state
  const [showRollNumberDialog, setShowRollNumberDialog] = useState(false);
  const [pendingExamRoom, setPendingExamRoom] =
    useState<ExamRoomDetails | null>(null);
  const [primaryStartingRoll, setPrimaryStartingRoll] = useState("");
  const [secondaryStartingRoll, setSecondaryStartingRoll] = useState("");
  const [rollNumberErrors, setRollNumberErrors] = useState({
    primary: "",
    secondary: "",
  });

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
   * Parse room number to extract building, floor, and room
   * Example: "321" -> Building 3, Floor 2, Room 1
   */
  const parseRoomNumber = (roomNumber: string) => {
    if (!roomNumber || roomNumber.length < 3) {
      return {
        building: "N/A",
        floor: "N/A",
        room: roomNumber || "N/A",
      };
    }

    const building = roomNumber.charAt(0);
    const floor = roomNumber.charAt(1);
    const room = roomNumber.substring(2);

    return {
      building,
      floor,
      room,
    };
  };

  /**
   * Validate roll number format
   * Should be in format: TNT followed by numbers (e.g., TNT001, TNT2024001)
   * Or just numbers (TNT will be auto-added)
   */
  const validateRollNumber = (rollNumber: string): boolean => {
    // Basic validation: non-empty
    if (!rollNumber || rollNumber.trim() === "") {
      return false;
    }

    let numericPart = rollNumber.trim();

    // Remove TNT prefix if present
    if (numericPart.toUpperCase().startsWith("TNT")) {
      numericPart = numericPart.substring(3);
    }

    // Check if the remaining part is a valid number
    const num = parseInt(numericPart, 10);
    if (isNaN(num) || num < 1) {
      return false;
    }

    return true;
  };

  /**
   * Format roll number with TNT prefix and leading zeros if needed
   */
  const formatRollNumber = (baseRoll: string, index: number): string => {
    // Extract numeric part (remove TNT prefix if present)
    let numericPart = baseRoll;
    let hasPrefix = false;

    if (baseRoll.toUpperCase().startsWith("TNT")) {
      numericPart = baseRoll.substring(3);
      hasPrefix = true;
    }

    const rollNum = parseInt(numericPart, 10) + index;
    // Pad with zeros to match the length of the numeric part
    const paddedLength = numericPart.length;
    const paddedNumber = rollNum.toString().padStart(paddedLength, "0");

    // Always add TNT prefix
    return `TNT${paddedNumber}`;
  };

  /**
   * Generate seating plan with zig-zag pattern and real roll numbers
   */
  const generateSeatingPlan = (
    examRoom: ExamRoomDetails,
    rollConfig: RollNumberConfig,
  ) => {
    const rows = examRoom.room.rows;
    const cols = examRoom.room.cols;
    const seats: SeatAssignment[] = [];
    const rowLabels = "ABCDEFGHIJKLMNOPQRST".split("").slice(0, rows);

    // Create array of students for both groups with real roll numbers
    const primaryStudents = Array.from(
      { length: examRoom.students_primary },
      (_, i) => {
        const rollNumber = formatRollNumber(rollConfig.primaryStarting, i);
        return {
          id: rollNumber,
          rollNumber: rollNumber,
          name: `Roll No: ${rollNumber}`,
          group: "primary",
          groupLabel: `Y${examRoom.year_level_primary}-S${examRoom.sem_primary}-${examRoom.program_primary}`,
        };
      },
    );

    const secondaryStudents = Array.from(
      { length: examRoom.students_secondary },
      (_, i) => {
        const rollNumber = formatRollNumber(rollConfig.secondaryStarting, i);
        return {
          id: rollNumber,
          rollNumber: rollNumber,
          name: `Roll No: ${rollNumber}`,
          group: "secondary",
          groupLabel: `Y${examRoom.year_level_secondary}-S${examRoom.sem_secondary}-${examRoom.program_secondary}`,
        };
      },
    );

    // Merge students in alternating pattern (zig-zag)
    const allStudents: any[] = [];
    let primaryIndex = 0;
    let secondaryIndex = 0;

    while (
      primaryIndex < primaryStudents.length ||
      secondaryIndex < secondaryStudents.length
    ) {
      if (primaryIndex < primaryStudents.length) {
        allStudents.push(primaryStudents[primaryIndex++]);
      }
      if (secondaryIndex < secondaryStudents.length) {
        allStudents.push(secondaryStudents[secondaryIndex++]);
      }
    }

    // Generate seats with zig-zag pattern
    let studentIndex = 0;
    const roomPrefix = examRoom.room.room_number.replace(/\s/g, "");

    for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
      const isRightToLeft = rowIndex % 2 === 1; // Zig-zag: alternate direction
      const rowLabel = rowLabels[rowIndex];

      for (let col = 0; col < cols; col++) {
        const actualCol = isRightToLeft ? cols - 1 - col : col;
        const seatIndex = rowIndex * cols + actualCol + 1;
        const seatNumber = `${roomPrefix}-${seatIndex}`;

        if (studentIndex < allStudents.length) {
          const student = allStudents[studentIndex];
          seats.push({
            seatNumber,
            row: rowLabel,
            column: actualCol + 1,
            isOccupied: true,
            studentId: student.id,
            studentName: student.name,
            studentGroup: student.groupLabel,
            rollNumber: student.rollNumber,
          });
          studentIndex++;
        } else {
          // Empty seat
          seats.push({
            seatNumber,
            row: rowLabel,
            column: actualCol + 1,
            isOccupied: false,
          });
        }
      }
    }

    return seats;
  };

  /**
   * Show dialog to collect starting roll numbers
   */
  const handleInitiateSeatingPlan = (examRoom: ExamRoomDetails) => {
    setPendingExamRoom(examRoom);
    setPrimaryStartingRoll("");
    setSecondaryStartingRoll("");
    setRollNumberErrors({ primary: "", secondary: "" });
    setShowRollNumberDialog(true);
  };

  /**
   * Validate and generate seating plan with roll numbers
   */
  const handleConfirmRollNumbers = () => {
    const errors = { primary: "", secondary: "" };
    let hasErrors = false;

    // Validate primary roll number
    if (!validateRollNumber(primaryStartingRoll)) {
      errors.primary = "Please enter a valid starting roll number";
      hasErrors = true;
    }

    // Validate secondary roll number
    if (!validateRollNumber(secondaryStartingRoll)) {
      errors.secondary = "Please enter a valid starting roll number";
      hasErrors = true;
    }

    if (hasErrors) {
      setRollNumberErrors(errors);
      return;
    }

    if (!pendingExamRoom) return;

    // Generate seating plan with roll numbers
    const rollConfig: RollNumberConfig = {
      primaryStarting: primaryStartingRoll,
      secondaryStarting: secondaryStartingRoll,
    };

    const seats = generateSeatingPlan(pendingExamRoom, rollConfig);
    setGeneratedSeats(seats);
    setSelectedExamRoom(pendingExamRoom);
    setShowSeatingPlan(true);
    setShowRollNumberDialog(false);

    toast.success(
      `Generated seating plan for Room ${pendingExamRoom.room.room_number} with roll numbers`,
    );
  };

  const handleBackToList = () => {
    setShowSeatingPlan(false);
    setSelectedExamRoom(null);
    setGeneratedSeats([]);
  };

  const handleCancelRollNumberDialog = () => {
    setShowRollNumberDialog(false);
    setPendingExamRoom(null);
    setPrimaryStartingRoll("");
    setSecondaryStartingRoll("");
    setRollNumberErrors({ primary: "", secondary: "" });
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
      // Prepare CSV content
      const headers = [
        "Seat Number",
        "Row",
        "Column",
        "Roll Number",
        "Student Group",
        "Status",
      ];

      const rows = generatedSeats.map((seat) => [
        seat.seatNumber,
        seat.row,
        seat.column,
        seat.rollNumber || "N/A",
        seat.studentGroup || "N/A",
        seat.isOccupied ? "Occupied" : "Empty",
      ]);

      // Create CSV string
      const csvContent = [
        `Seating Plan - Room ${selectedExamRoom.room.room_number}`,
        `Generated on: ${new Date().toLocaleString()}`,
        "",
        `Primary Group: Y${selectedExamRoom.year_level_primary}-S${selectedExamRoom.sem_primary}-${selectedExamRoom.program_primary} (${selectedExamRoom.students_primary} students)`,
        `Primary Roll Range: ${primaryStartingRoll} - ${formatRollNumber(primaryStartingRoll, selectedExamRoom.students_primary - 1)}`,
        "",
        `Secondary Group: Y${selectedExamRoom.year_level_secondary}-S${selectedExamRoom.sem_secondary}-${selectedExamRoom.program_secondary} (${selectedExamRoom.students_secondary} students)`,
        `Secondary Roll Range: ${secondaryStartingRoll} - ${formatRollNumber(secondaryStartingRoll, selectedExamRoom.students_secondary - 1)}`,
        "",
        `Total Assigned: ${selectedExamRoom.assigned_capacity} / ${selectedExamRoom.room.capacity}`,
        "",
        headers.join(","),
        ...rows.map((row) => row.join(",")),
      ].join("\n");

      // Create blob and download
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

  /**
   * Export seating plan to SVG format
   */
  const handleExportSeatingPlanSVG = () => {
    if (!selectedExamRoom || generatedSeats.length === 0) {
      toast.error("No seating plan to export");
      return;
    }

    try {
      const rows = selectedExamRoom.room.rows;
      const cols = selectedExamRoom.room.cols;
      const rowLabels = "ABCDEFGHIJKLMNOPQRST".split("").slice(0, rows);

      // SVG dimensions
      const seatWidth = 80;
      const seatHeight = 80;
      const seatGap = 10;
      const marginLeft = 60;
      const marginTop = 150;
      const headerHeight = 120;
      const columnLabelHeight = 40;

      const svgWidth = marginLeft + cols * (seatWidth + seatGap) + 100;
      const svgHeight =
        marginTop +
        headerHeight +
        columnLabelHeight +
        rows * (seatHeight + seatGap) +
        100;

      // Start SVG
      let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
  <!-- Define styles -->
  <defs>
    <style>
      .seat-occupied { fill: #2563eb; stroke: #1e40af; stroke-width: 2; }
      .seat-empty { fill: #f1f5f9; stroke: #cbd5e1; stroke-width: 2; stroke-dasharray: 5,5; }
      .seat-text { fill: white; font-family: Arial, sans-serif; font-size: 11px; font-weight: bold; text-anchor: middle; }
      .seat-text-empty { fill: #94a3b8; font-family: Arial, sans-serif; font-size: 10px; text-anchor: middle; }
      .label-text { fill: #64748b; font-family: Arial, sans-serif; font-size: 14px; font-weight: 600; text-anchor: middle; }
      .header-text { fill: #1e293b; font-family: Arial, sans-serif; font-size: 20px; font-weight: bold; text-anchor: middle; }
      .subheader-text { fill: #475569; font-family: Arial, sans-serif; font-size: 12px; text-anchor: middle; }
      .room-label { fill: #2563eb; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-anchor: middle; }
    </style>
  </defs>
  
  <!-- Background -->
  <rect width="${svgWidth}" height="${svgHeight}" fill="white"/>
  
  <!-- Header -->
  <text x="${svgWidth / 2}" y="40" class="header-text">Seating Plan - Room ${selectedExamRoom.room.room_number}</text>
  <text x="${svgWidth / 2}" y="65" class="subheader-text">Generated on: ${new Date().toLocaleString()}</text>
  
  <!-- Group Info -->
  <text x="${svgWidth / 2}" y="95" class="subheader-text">Primary: Y${selectedExamRoom.year_level_primary}-S${selectedExamRoom.sem_primary}-${selectedExamRoom.program_primary} (${primaryStartingRoll} - ${formatRollNumber(primaryStartingRoll, selectedExamRoom.students_primary - 1)})</text>
  <text x="${svgWidth / 2}" y="115" class="subheader-text">Secondary: Y${selectedExamRoom.year_level_secondary}-S${selectedExamRoom.sem_secondary}-${selectedExamRoom.program_secondary} (${secondaryStartingRoll} - ${formatRollNumber(secondaryStartingRoll, selectedExamRoom.students_secondary - 1)})</text>
  
  <!-- Front Label -->
  <rect x="${marginLeft}" y="${marginTop}" width="${cols * (seatWidth + seatGap) - seatGap}" height="40" fill="#dbeafe" stroke="#2563eb" stroke-width="2" stroke-dasharray="5,5" rx="5"/>
  <text x="${marginLeft + (cols * (seatWidth + seatGap) - seatGap) / 2}" y="${marginTop + 25}" class="room-label">FRONT - ${selectedExamRoom.room.room_number}</text>
  
  <!-- Column numbers -->
`;

      for (let col = 0; col < cols; col++) {
        const x = marginLeft + col * (seatWidth + seatGap) + seatWidth / 2;
        const y = marginTop + headerHeight + columnLabelHeight - 10;
        svg += `  <text x="${x}" y="${y}" class="label-text">${col + 1}</text>\n`;
      }

      // Generate seats
      for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
        const rowLabel = rowLabels[rowIndex];
        const y =
          marginTop +
          headerHeight +
          columnLabelHeight +
          rowIndex * (seatHeight + seatGap);

        // Row label
        svg += `  <text x="${marginLeft - 20}" y="${y + seatHeight / 2 + 5}" class="label-text">${rowLabel}</text>\n`;

        for (let col = 0; col < cols; col++) {
          const x = marginLeft + col * (seatWidth + seatGap);
          const seatIndex = rowIndex * cols + col + 1;
          const seatNumber = `${selectedExamRoom.room.room_number.replace(/\s/g, "")}-${seatIndex}`;
          const seat = generatedSeats.find((s) => s.seatNumber === seatNumber);

          if (seat?.isOccupied && seat.rollNumber) {
            // Occupied seat
            svg += `  <rect x="${x}" y="${y}" width="${seatWidth}" height="${seatHeight}" rx="8" class="seat-occupied"/>\n`;
            svg += `  <text x="${x + seatWidth / 2}" y="${y + seatHeight / 2 + 5}" class="seat-text">${seat.rollNumber}</text>\n`;
          } else {
            // Empty seat
            svg += `  <rect x="${x}" y="${y}" width="${seatWidth}" height="${seatHeight}" rx="8" class="seat-empty"/>\n`;
            svg += `  <text x="${x + seatWidth / 2}" y="${y + seatHeight / 2 + 5}" class="seat-text-empty">Empty</text>\n`;
          }
        }
      }

      svg += `</svg>`;

      // Create blob and download
      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `Seating_Plan_Room_${selectedExamRoom.room.room_number}_${new Date().toISOString().split("T")[0]}.svg`,
      );
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Seating plan exported as SVG");
    } catch (error) {
      console.error("Error exporting seating plan as SVG:", error);
      toast.error("Failed to export seating plan as SVG");
    }
  };

  // If showing seating plan, render the plan view
  if (showSeatingPlan && selectedExamRoom) {
    return (
      <DashboardLayout>
        <PageHeader
          title={`Seating Plan - Room ${selectedExamRoom.room.room_number}`}
          description={`${selectedExamRoom.assigned_capacity} students assigned`}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportSeatingPlan}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" onClick={handleExportSeatingPlanSVG}>
                <Download className="h-4 w-4 mr-2" />
                Export SVG
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
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-3">Student Groups</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-muted-foreground">Primary</span>
                    <Badge variant="secondary" className="text-xs">
                      {selectedExamRoom.students_primary}
                    </Badge>
                  </div>
                  <p className="text-xs">
                    Y{selectedExamRoom.year_level_primary}-S
                    {selectedExamRoom.sem_primary}-
                    {selectedExamRoom.program_primary}
                  </p>
                  <p className="text-xs font-medium mt-1 text-primary">
                    Roll: {primaryStartingRoll} -{" "}
                    {formatRollNumber(
                      primaryStartingRoll,
                      selectedExamRoom.students_primary - 1,
                    )}
                  </p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-muted-foreground">Secondary</span>
                    <Badge variant="secondary" className="text-xs">
                      {selectedExamRoom.students_secondary}
                    </Badge>
                  </div>
                  <p className="text-xs">
                    Y{selectedExamRoom.year_level_secondary}-S
                    {selectedExamRoom.sem_secondary}-
                    {selectedExamRoom.program_secondary}
                  </p>
                  <p className="text-xs font-medium mt-1 text-primary">
                    Roll: {secondaryStartingRoll} -{" "}
                    {formatRollNumber(
                      secondaryStartingRoll,
                      selectedExamRoom.students_secondary - 1,
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
                Students are arranged in alternating rows (left-to-right, then
                right-to-left) with primary and secondary groups interleaved.
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

      {/* Roll Number Input Dialog */}
      <Dialog
        open={showRollNumberDialog}
        onOpenChange={handleCancelRollNumberDialog}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enter Starting Roll Numbers</DialogTitle>
            <DialogDescription>
              Please provide the starting roll number for each semester group.
              All roll numbers will have the TNT prefix (e.g., TNT001,
              TNT2024001). You can enter with or without the TNT prefix - it
              will be added automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Primary Group */}
            <div className="space-y-2">
              <Label htmlFor="primary-roll" className="font-semibold">
                Primary Group - Starting Roll Number
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                Y{pendingExamRoom?.year_level_primary}-S
                {pendingExamRoom?.sem_primary}-
                {pendingExamRoom?.program_primary} (
                {pendingExamRoom?.students_primary} students)
              </p>
              <Input
                id="primary-roll"
                type="text"
                placeholder="e.g., TNT001 or TNT2024001"
                value={primaryStartingRoll}
                onChange={(e) => {
                  setPrimaryStartingRoll(e.target.value);
                  setRollNumberErrors({ ...rollNumberErrors, primary: "" });
                }}
                className={rollNumberErrors.primary ? "border-red-500" : ""}
              />
              {rollNumberErrors.primary && (
                <p className="text-xs text-red-500">
                  {rollNumberErrors.primary}
                </p>
              )}
            </div>

            {/* Secondary Group */}
            <div className="space-y-2">
              <Label htmlFor="secondary-roll" className="font-semibold">
                Secondary Group - Starting Roll Number
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                Y{pendingExamRoom?.year_level_secondary}-S
                {pendingExamRoom?.sem_secondary}-
                {pendingExamRoom?.program_secondary} (
                {pendingExamRoom?.students_secondary} students)
              </p>
              <Input
                id="secondary-roll"
                type="text"
                placeholder="e.g., TNT101 or TNT2024101"
                value={secondaryStartingRoll}
                onChange={(e) => {
                  setSecondaryStartingRoll(e.target.value);
                  setRollNumberErrors({ ...rollNumberErrors, secondary: "" });
                }}
                className={rollNumberErrors.secondary ? "border-red-500" : ""}
              />
              {rollNumberErrors.secondary && (
                <p className="text-xs text-red-500">
                  {rollNumberErrors.secondary}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={handleCancelRollNumberDialog}>
              Cancel
            </Button>
            <Button onClick={handleConfirmRollNumbers}>
              Generate Seating Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            const roomInfo = parseRoomNumber(examRoom.room?.room_number || "");

            return (
              <Card
                key={examRoom.exam_room_id}
                className="p-6 hover:shadow-lg transition-shadow"
              >
                {/* Room Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-2xl text-foreground mb-2">
                      Room {examRoom.room?.room_number || "N/A"}
                    </h3>
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

                {/* Action Button */}
                <Button
                  className="w-full mt-4"
                  size="sm"
                  onClick={() => handleInitiateSeatingPlan(examRoom)}
                >
                  Generate Seating Plan
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
};

export default SeatingGenerator;
