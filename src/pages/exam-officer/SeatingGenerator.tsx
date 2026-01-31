import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import PageHeader from "@/components/shared/PageHeader";
import SeatingPlanGrid from "@/components/shared/SeatingPlanGrid";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Users, ArrowLeft } from "lucide-react";
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
}

const SeatingGenerator: React.FC = () => {
  const [examRooms, setExamRooms] = useState<ExamRoomDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExamRoom, setSelectedExamRoom] =
    useState<ExamRoomDetails | null>(null);
  const [showSeatingPlan, setShowSeatingPlan] = useState(false);
  const [generatedSeats, setGeneratedSeats] = useState<SeatAssignment[]>([]);

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
   * Generate seating plan with zig-zag pattern
   * Primary group and secondary group alternate in a zig-zag pattern
   */
  const generateSeatingPlan = (examRoom: ExamRoomDetails) => {
    const rows = examRoom.room.rows;
    const cols = examRoom.room.cols;
    const totalSeats = rows * cols;
    const seats: SeatAssignment[] = [];
    const rowLabels = "ABCDEFGHIJKLMNOPQRST".split("").slice(0, rows);

    // Create array of students for both groups
    const primaryStudents = Array.from(
      { length: examRoom.students_primary },
      (_, i) => ({
        id: `P-${i + 1}`,
        name: `Student P${i + 1}`,
        group: "primary",
        groupLabel: `Y${examRoom.year_level_primary}-S${examRoom.sem_primary}-${examRoom.program_primary}`,
      }),
    );

    const secondaryStudents = Array.from(
      { length: examRoom.students_secondary },
      (_, i) => ({
        id: `S-${i + 1}`,
        name: `Student S${i + 1}`,
        group: "secondary",
        groupLabel: `Y${examRoom.year_level_secondary}-S${examRoom.sem_secondary}-${examRoom.program_secondary}`,
      }),
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

  const handleGenerateSeatingPlan = (examRoom: ExamRoomDetails) => {
    const seats = generateSeatingPlan(examRoom);
    setGeneratedSeats(seats);
    setSelectedExamRoom(examRoom);
    setShowSeatingPlan(true);
    toast.success(
      `Generated seating plan for Room ${examRoom.room.room_number}`,
    );
  };

  const handleBackToList = () => {
    setShowSeatingPlan(false);
    setSelectedExamRoom(null);
    setGeneratedSeats([]);
  };

  // If showing seating plan, render the plan view
  if (showSeatingPlan && selectedExamRoom) {
    return (
      <DashboardLayout>
        <PageHeader
          title={`Seating Plan - Room ${selectedExamRoom.room.room_number}`}
          description={`${selectedExamRoom.assigned_capacity} students assigned`}
          actions={
            <Button variant="outline" onClick={handleBackToList}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Rooms
            </Button>
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
                showLegend={true}
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
                  onClick={() => handleGenerateSeatingPlan(examRoom)}
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
