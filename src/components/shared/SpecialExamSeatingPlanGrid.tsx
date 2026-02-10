import React, { useRef, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, User, Download, X, Search, UserPlus } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { getRetakeStudents, Student } from "@/services/studentQueries";

interface SeatAssignment {
  seatNumber: string;
  row: string;
  column: number;
  isOccupied: boolean;
  studentId?: number;
  studentNumber?: string;
  studentName?: string;
  studentGroup: "A" | "B"; // Primary or Secondary group
}

interface SpecialExamSeatingPlanGridProps {
  seats: SeatAssignment[];
  rows: number;
  seatsPerRow: number;
  roomName: string;
  hasGroupA: boolean; // Does group A have an exam?
  hasGroupB: boolean; // Does group B have an exam?
  onSeatClick?: (row: string, column: number, isOccupied: boolean) => void;
  onSeatsUpdated?: (updatedSeats: SeatAssignment[]) => void; // Callback when seats are updated
}

const SpecialExamSeatingPlanGrid: React.FC<SpecialExamSeatingPlanGridProps> = ({
  seats,
  rows,
  seatsPerRow,
  roomName,
  hasGroupA,
  hasGroupB,
  onSeatClick,
  onSeatsUpdated,
}) => {
  const seatingRef = useRef<HTMLDivElement>(null);
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);

  // Local state for seat assignments (allows for temporary edits)
  const [localSeats, setLocalSeats] = useState<SeatAssignment[]>(seats);

  // Retake student assignment state
  const [retakeStudents, setRetakeStudents] = useState<
    (Student & { id: number })[]
  >([]);
  const [isLoadingRetake, setIsLoadingRetake] = useState(false);
  const [showStudentSelector, setShowStudentSelector] = useState(false);
  const [selectedSeatForAssignment, setSelectedSeatForAssignment] = useState<{
    row: string;
    column: number;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Update local seats when props change
  useEffect(() => {
    setLocalSeats(seats);
  }, [seats]);

  // Load retake students on mount
  useEffect(() => {
    loadRetakeStudents();
  }, []);

  /**
   * Load all retake students from the database
   */
  const loadRetakeStudents = async () => {
    setIsLoadingRetake(true);
    try {
      const students = await getRetakeStudents();
      setRetakeStudents(students);
    } catch (error) {
      console.error("Error loading retake students:", error);
    } finally {
      setIsLoadingRetake(false);
    }
  };

  // Determine which groups to display
  const showGroupA = hasGroupA;
  const showGroupB = hasGroupB;
  const showBothGroups = hasGroupA && hasGroupB;

  // Filter seats based on active groups
  const getFilteredSeats = () => {
    if (showBothGroups) {
      return localSeats; // Show all seats
    } else if (showGroupA) {
      return localSeats.filter((seat) => seat.studentGroup === "A");
    } else if (showGroupB) {
      return localSeats.filter((seat) => seat.studentGroup === "B");
    }
    return [];
  };

  const filteredSeats = getFilteredSeats();

  // Create a map of seat positions
  const seatMap = new Map<string, SeatAssignment>();
  filteredSeats.forEach((seat) => {
    const key = `${seat.row}-${seat.column}`;
    seatMap.set(key, seat);
  });

  // Generate row labels (A, B, C, etc.)
  const rowLabels = Array.from({ length: rows }, (_, i) =>
    String.fromCharCode(65 + i),
  );

  // Get group label
  const getGroupLabel = (group: "A" | "B") => {
    return group === "A" ? "Primary" : "Secondary";
  };

  // Count students by group
  const groupACounts = filteredSeats.filter(
    (s) => s.studentGroup === "A",
  ).length;
  const groupBCounts = filteredSeats.filter(
    (s) => s.studentGroup === "B",
  ).length;

  /**
   * Get list of already assigned student IDs
   */
  const getAssignedStudentIds = (): number[] => {
    return localSeats
      .filter((seat) => seat.isOccupied && seat.studentId)
      .map((seat) => seat.studentId!);
  };

  /**
   * Filter retake students - exclude already assigned ones
   */
  const getAvailableRetakeStudents = () => {
    const assignedIds = getAssignedStudentIds();
    const available = retakeStudents.filter(
      (student) => !assignedIds.includes(student.student_id),
    );

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      return available.filter(
        (student) =>
          student.name.toLowerCase().includes(term) ||
          student.student_number.toLowerCase().includes(term),
      );
    }

    return available;
  };

  /**
   * Handle clicking on a seat
   */
  const handleSeatClick = (
    row: string,
    column: number,
    isOccupied: boolean,
  ) => {
    const seatKey = `${row}-${column}`;
    setSelectedSeat(seatKey);

    // If seat is empty, show student selector
    if (!isOccupied) {
      setSelectedSeatForAssignment({ row, column });
      setShowStudentSelector(true);
      setSearchTerm("");
    }

    if (onSeatClick) {
      onSeatClick(row, column, isOccupied);
    }
  };

  /**
   * Assign a student to the selected seat
   */
  const handleAssignStudent = (student: Student & { id: number }) => {
    if (!selectedSeatForAssignment) return;

    const { row, column } = selectedSeatForAssignment;
    const seatKey = `${row}-${column}`;
    const seatNumber = `${row}${column}`;

    // Determine student group (default to A if only one group, otherwise let user choose)
    // For simplicity, we'll use "A" by default
    const studentGroup: "A" | "B" = showBothGroups
      ? "A"
      : showGroupA
        ? "A"
        : "B";

    const newSeat: SeatAssignment = {
      seatNumber,
      row,
      column,
      isOccupied: true,
      studentId: student.student_id,
      studentNumber: student.student_number,
      studentName: student.name,
      studentGroup,
    };

    // Update local seats
    const updatedSeats = [...localSeats];
    const existingIndex = updatedSeats.findIndex(
      (s) => s.row === row && s.column === column,
    );

    if (existingIndex >= 0) {
      updatedSeats[existingIndex] = newSeat;
    } else {
      updatedSeats.push(newSeat);
    }

    setLocalSeats(updatedSeats);

    // Notify parent component
    if (onSeatsUpdated) {
      onSeatsUpdated(updatedSeats);
    }

    // Close selector
    setShowStudentSelector(false);
    setSelectedSeatForAssignment(null);
    setSearchTerm("");
  };

  /**
   * Remove a student from a seat
   */
  const handleRemoveStudent = (row: string, column: number) => {
    const updatedSeats = localSeats.map((seat) => {
      if (seat.row === row && seat.column === column) {
        return {
          ...seat,
          isOccupied: false,
          studentId: undefined,
          studentNumber: undefined,
          studentName: undefined,
        };
      }
      return seat;
    });

    setLocalSeats(updatedSeats);

    if (onSeatsUpdated) {
      onSeatsUpdated(updatedSeats);
    }
  };

  /**
   * Export seating plan to PDF
   */
  const handleExportToPDF = async () => {
    if (!seatingRef.current) return;

    try {
      // Hide the export button temporarily
      const exportButton = document.getElementById("pdf-export-button");
      if (exportButton) exportButton.style.display = "none";

      // Capture the seating plan as canvas
      const canvas = await html2canvas(seatingRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      // Show the button again
      if (exportButton) exportButton.style.display = "";

      // Calculate PDF dimensions
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Create PDF
      const pdf = new jsPDF({
        orientation: imgHeight > imgWidth ? "portrait" : "landscape",
        unit: "mm",
        format: "a4",
      });

      // Add the image to PDF
      const imgData = canvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);

      // Save the PDF
      pdf.save(`${roomName}_seating_plan.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  const availableStudents = getAvailableRetakeStudents();

  return (
    <div className="space-y-6">
      {/* Header Section with Stats */}
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          {showGroupA && (
            <Badge
              variant="outline"
              className="bg-gray-500/10 border-gray-500 text-gray-700 dark:text-gray-300"
            >
              <Users className="h-3 w-3 mr-1" />
              Primary: {groupACounts}
            </Badge>
          )}
          {showGroupB && (
            <Badge
              variant="outline"
              className="bg-gray-500/10 border-gray-500 text-gray-700 dark:text-gray-300"
            >
              <Users className="h-3 w-3 mr-1" />
              Secondary: {groupBCounts}
            </Badge>
          )}
          <Badge
            variant="outline"
            className="bg-purple-500/10 border-purple-500 text-purple-700 dark:text-purple-300"
          >
            <UserPlus className="h-3 w-3 mr-1" />
            Available Retake: {availableStudents.length}
          </Badge>
        </div>
        <Button
          id="pdf-export-button"
          variant="outline"
          size="sm"
          onClick={handleExportToPDF}
        >
          <Download className="h-4 w-4 mr-2" />
          Export to PDF
        </Button>
      </div>

      {/* Main Grid Container with Sidebar */}
      <div className="flex gap-4">
        {/* Seating Plan Content */}
        <div className={`${showStudentSelector ? "flex-1" : "w-full"}`}>
          <div ref={seatingRef} className="bg-white p-8">
            {/* Room Header */}
            <div className="text-center mb-8 pb-4 border-b-2 border-gray-800">
              <h1 className="text-3xl font-bold mb-2 text-gray-900">
                SPECIAL EXAMINATION SEATING PLAN
              </h1>
              <h2 className="text-2xl font-semibold mb-2 text-gray-900">
                Room {roomName}
              </h2>
              {showBothGroups && (
                <p className="text-sm text-gray-600 mt-2">
                  <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 rounded mr-2">
                    Primary Group (A)
                  </span>
                  <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 rounded">
                    Secondary Group (B)
                  </span>
                </p>
              )}
            </div>

            {/* Front of Room Indicator */}
            <div className="border-2 border-gray-800 rounded-lg p-4 text-center bg-gray-100 mb-6">
              <span className="text-lg font-bold text-gray-800">
                ▼ FRONT OF EXAMINATION ROOM ▼
              </span>
            </div>

            {/* Seating Grid */}
            <div className="space-y-3 mb-6">
              {/* Column headers */}
              <div className="flex items-center gap-2 justify-center mb-2">
                <div className="w-8"></div> {/* Spacer for row labels */}
                <div
                  className="grid gap-2"
                  style={{
                    gridTemplateColumns: `repeat(${seatsPerRow}, minmax(0, 1fr))`,
                  }}
                >
                  {Array.from({ length: seatsPerRow }, (_, i) => (
                    <div
                      key={i}
                      className="text-center text-xs font-medium text-gray-500"
                      style={{ width: "120px" }}
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>
              </div>

              {rowLabels.map((rowLabel) => (
                <div
                  key={rowLabel}
                  className="flex items-center gap-2 justify-center"
                >
                  {/* Row label */}
                  <div className="w-8 text-center text-sm font-medium text-gray-500">
                    {rowLabel}
                  </div>

                  {/* Seats in this row */}
                  <div
                    className="grid gap-2"
                    style={{
                      gridTemplateColumns: `repeat(${seatsPerRow}, minmax(0, 1fr))`,
                    }}
                  >
                    {Array.from({ length: seatsPerRow }, (_, colIndex) => {
                      const column = colIndex + 1;
                      const seatKey = `${rowLabel}-${column}`;
                      const seat = seatMap.get(seatKey);
                      const isOccupied = seat?.isOccupied ?? false;
                      const isSelected = selectedSeat === seatKey;

                      return (
                        <div
                          key={colIndex}
                          onClick={() =>
                            handleSeatClick(rowLabel, column, isOccupied)
                          }
                          className={`p-3 flex flex-col items-center justify-center rounded border-2 relative transition-all cursor-pointer ${
                            isOccupied && seat
                              ? "border-gray-600 bg-gray-50 hover:bg-gray-100"
                              : "border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400"
                          } ${
                            isSelected
                              ? "ring-2 ring-primary ring-offset-2"
                              : ""
                          }`}
                          style={{ width: "120px", height: "120px" }}
                        >
                          {/* Seat position label (subtle, in corner) */}
                          <span className="absolute top-1 left-1 text-[10px] text-gray-400">
                            {rowLabel}
                            {column}
                          </span>

                          {isOccupied && seat && seat.studentNumber ? (
                            <>
                              <span className="font-bold text-sm leading-tight text-center break-all mt-2 text-gray-900">
                                {seat.studentNumber}
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-gray-400">
                              Click to assign
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Student Selector Sidebar */}
        {showStudentSelector && (
          <Card className="w-96 shrink-0">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-primary" />
                  Assign Retake Student
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowStudentSelector(false);
                    setSelectedSeatForAssignment(null);
                    setSearchTerm("");
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {selectedSeatForAssignment && (
                <p className="text-xs text-muted-foreground mt-1">
                  Assigning to seat: {selectedSeatForAssignment.row}
                  {selectedSeatForAssignment.column}
                </p>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              {/* Search */}
              <div className="mb-3">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              {/* Student List */}
              <ScrollArea className="h-[500px]">
                {isLoadingRetake ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    Loading students...
                  </div>
                ) : availableStudents.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    {searchTerm
                      ? "No students found matching your search"
                      : "No available retake students"}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availableStudents.map((student) => (
                      <div
                        key={student.student_id}
                        onClick={() => handleAssignStudent(student)}
                        className="p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">
                              {student.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {student.student_number}
                            </p>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                Y{student.year_level}
                              </Badge>
                              {student.major && (
                                <Badge variant="outline" className="text-xs">
                                  {student.major}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button size="sm" variant="ghost">
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Student List by Group */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {showGroupA && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-600" />
                Primary Group Students ({groupACounts})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {filteredSeats
                    .filter((seat) => seat.studentGroup === "A")
                    .sort((a, b) => a.seatNumber.localeCompare(b.seatNumber))
                    .map((seat) => (
                      <div
                        key={seat.studentId}
                        className="flex items-center justify-between p-2 rounded bg-gray-500/5 border border-gray-500/20"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {seat.studentName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {seat.studentNumber}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="bg-gray-500/10 border-gray-500 text-gray-700"
                        >
                          {seat.seatNumber}
                        </Badge>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {showGroupB && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-600" />
                Secondary Group Students ({groupBCounts})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {filteredSeats
                    .filter((seat) => seat.studentGroup === "B")
                    .sort((a, b) => a.seatNumber.localeCompare(b.seatNumber))
                    .map((seat) => (
                      <div
                        key={seat.studentId}
                        className="flex items-center justify-between p-2 rounded bg-gray-500/5 border border-gray-500/20"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {seat.studentName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {seat.studentNumber}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="bg-gray-500/10 border-gray-500 text-gray-700"
                        >
                          {seat.seatNumber}
                        </Badge>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SpecialExamSeatingPlanGrid;
