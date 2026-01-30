import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import PageHeader from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getAvailableRooms, Room } from "@/services/Roomqueries";
import {
  getTotalStudentCount,
  getStudentsByYearLevel,
  getUniqueMajors,
} from "@/services/studentQueries";
import {
  DoorOpen,
  Users,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

interface StudentStats {
  total: number;
  year1: number;
  year2: number;
  year3: number;
  year3_cs: number;
  year3_ct: number;
  year4: number;
  year4_programs: { [key: string]: number };
}

interface RoomPairing {
  id: string;
  room: Room;
  group_primary: {
    year_level: string;
    sem: string;
    program: string;
  };
  group_secondary: {
    year_level: string;
    sem: string;
    program: string;
  };
  students_primary: number;
  students_secondary: number;
}

const RoomAssignment: React.FC = () => {
  // Step management
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Data
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [selectedRooms, setSelectedRooms] = useState<Room[]>([]);
  const [studentStats, setStudentStats] = useState<StudentStats | null>(null);
  const [roomPairings, setRoomPairings] = useState<RoomPairing[]>([]);

  // Available options from database
  const [availableYearLevels, setAvailableYearLevels] = useState<string[]>([]);
  const [availableSemesters, setAvailableSemesters] = useState<string[]>([]);
  const [availablePrograms, setAvailablePrograms] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAvailableRooms();
    loadStudentStatistics();
    loadAvailableOptions();
  }, []);

  const loadAvailableOptions = async () => {
    try {
      // Get all students to extract unique values
      const allStudents = await Promise.all([
        getStudentsByYearLevel(1),
        getStudentsByYearLevel(2),
        getStudentsByYearLevel(3),
        getStudentsByYearLevel(4),
      ]);

      const students = allStudents.flat();

      // Extract unique year levels
      const yearLevels = [
        ...new Set(students.map((s) => s.year_level.toString())),
      ].sort();
      setAvailableYearLevels(yearLevels);

      // Extract unique semesters
      const semesters = [
        ...new Set(students.map((s) => s.sem.toString())),
      ].sort();
      setAvailableSemesters(semesters);

      // Extract unique programs
      const programs = [...new Set(students.map((s) => s.major))]
        .filter(Boolean)
        .sort();
      setAvailablePrograms(programs);

      console.log("Available Options:", { yearLevels, semesters, programs });
    } catch (error) {
      console.error("Error loading available options:", error);
    }
  };

  const loadAvailableRooms = async () => {
    try {
      const rooms = await getAvailableRooms();
      setAvailableRooms(rooms);
      console.log("Available Rooms:", rooms);
    } catch (error) {
      console.error("Error loading rooms:", error);
      toast.error("Failed to load rooms");
    }
  };

  const loadStudentStatistics = async () => {
    try {
      setLoading(true);

      // Get total students
      const total = await getTotalStudentCount();

      // Get students by year level
      const year1Students = await getStudentsByYearLevel(1);
      const year2Students = await getStudentsByYearLevel(2);
      const year3Students = await getStudentsByYearLevel(3);
      const year4Students = await getStudentsByYearLevel(4);

      // For year 3, count by program
      const year3_cs = year3Students.filter(
        (s) => s.major === "CS" || s.major === "Computer Science",
      ).length;
      const year3_ct = year3Students.filter(
        (s) => s.major === "CT" || s.major === "Computer Technology",
      ).length;

      // For year 4, get all unique programs and count
      const year4_programs: { [key: string]: number } = {};
      year4Students.forEach((student) => {
        const program = student.major || "Unknown";
        year4_programs[program] = (year4_programs[program] || 0) + 1;
      });

      const stats: StudentStats = {
        total,
        year1: year1Students.length,
        year2: year2Students.length,
        year3: year3Students.length,
        year3_cs,
        year3_ct,
        year4: year4Students.length,
        year4_programs,
      };

      setStudentStats(stats);
      console.log("Student Statistics:", stats);
      toast.success("Student statistics loaded");
    } catch (error) {
      console.error("Error loading student statistics:", error);
      toast.error("Failed to load student statistics");
    } finally {
      setLoading(false);
    }
  };

  const toggleRoomSelection = (room: Room) => {
    setSelectedRooms((prev) => {
      const isSelected = prev.some((r) => r.room_id === room.room_id);
      if (isSelected) {
        return prev.filter((r) => r.room_id !== room.room_id);
      } else {
        return [...prev, room];
      }
    });
  };

  const proceedToStep2 = () => {
    if (selectedRooms.length === 0) {
      toast.error("Please select at least one room");
      return;
    }
    setCurrentStep(2);

    // Initialize pairings for selected rooms - both groups mandatory with 18 students each
    const initialPairings = selectedRooms.map((room) => ({
      id: `${room.room_id}-${Date.now()}`,
      room,
      group_primary: {
        year_level: "",
        sem: "",
        program: "",
      },
      group_secondary: {
        year_level: "",
        sem: "",
        program: "",
      },
      students_primary: 18,
      students_secondary: 18,
    }));
    setRoomPairings(initialPairings);
  };

  const updatePairing = (id: string, field: keyof RoomPairing, value: any) => {
    setRoomPairings((prev) =>
      prev.map((pairing) => {
        if (pairing.id === id) {
          const updated = { ...pairing, [field]: value };
          return updated;
        }
        return pairing;
      }),
    );
  };

  // Helper function to get available semesters based on year level
  const getAvailableSemestersForYear = (yearLevel: string): string[] => {
    if (!yearLevel) return availableSemesters;

    switch (yearLevel) {
      case "1":
        return ["1"];
      case "2":
        return ["3"];
      case "3":
        return ["5"];
      case "4":
        return ["7", "8"];
      default:
        return availableSemesters;
    }
  };

  // Helper function to get available programs based on year level
  const getAvailableProgramsForYear = (yearLevel: string): string[] => {
    if (!yearLevel) return availablePrograms;

    switch (yearLevel) {
      case "1":
        return ["CST"];
      case "2":
        return ["CST"];
      case "3":
        return ["CS", "CT"];
      case "4":
        return availablePrograms.filter((p) => !["CST"].includes(p));
      default:
        return availablePrograms;
    }
  };

  const handleSave = () => {
    console.log("=== ROOM ASSIGNMENT DATA ===");
    console.log("\nRoom Pairings:");

    roomPairings.forEach((pairing, index) => {
      console.log(`\n${index + 1}. ${pairing.room.room_number}`);
      console.log(
        "   Primary Group:",
        `Year ${pairing.group_primary.year_level}, Sem ${pairing.group_primary.sem}, ${pairing.group_primary.program}`,
        "-",
        pairing.students_primary,
        "students",
      );
      console.log(
        "   Secondary Group:",
        `Year ${pairing.group_secondary.year_level}, Sem ${pairing.group_secondary.sem}, ${pairing.group_secondary.program}`,
        "-",
        pairing.students_secondary,
        "students",
      );
      console.log(
        "   Total:",
        pairing.students_primary + pairing.students_secondary,
        "/ 36",
      );
    });

    toast.success("Assignment data logged to console!");
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Room Assignment"
        description="Assign rooms and exams for exam seating"
      />

      {/* Student Statistics - Always visible at top */}
      <Card className="p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5" />
          Student Statistics
        </h3>

        {loading && !studentStats ? (
          <div className="text-center py-8">
            <div className="animate-pulse text-muted-foreground">
              Loading student data...
            </div>
          </div>
        ) : studentStats ? (
          <div className="space-y-6">
            {/* Total Students */}
            <div className="bg-primary/5 rounded-lg p-4">
              <div className="text-sm text-muted-foreground">
                Total Students
              </div>
              <div className="text-3xl font-bold text-primary">
                {studentStats.total}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Year 1 */}
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">First Year</h4>
                  <Badge variant="outline">{studentStats.year1} students</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  Program: CST
                </div>
              </div>

              {/* Year 2 */}
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Second Year</h4>
                  <Badge variant="outline">{studentStats.year2} students</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  Program: CST
                </div>
              </div>

              {/* Year 3 */}
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Third Year</h4>
                  <Badge variant="outline">{studentStats.year3} students</Badge>
                </div>
                <div className="space-y-2 mt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">CS:</span>
                    <span className="font-semibold">
                      {studentStats.year3_cs}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">CT:</span>
                    <span className="font-semibold">
                      {studentStats.year3_ct}
                    </span>
                  </div>
                </div>
              </div>

              {/* Year 4 */}
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Fourth Year</h4>
                  <Badge variant="outline">{studentStats.year4} students</Badge>
                </div>
                <div className="space-y-1 mt-2 max-h-32 overflow-y-auto">
                  {Object.entries(studentStats.year4_programs)
                    .sort((a, b) => b[1] - a[1])
                    .map(([program, count]) => (
                      <div
                        key={program}
                        className="flex justify-between text-sm"
                      >
                        <span className="text-muted-foreground">
                          {program}:
                        </span>
                        <span className="font-semibold">{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No data loaded
          </div>
        )}
      </Card>

      {/* Progress Steps */}
      <div className="mb-6">
        <div className="flex items-center justify-center gap-4">
          <div
            className={`flex items-center gap-2 ${currentStep >= 1 ? "text-primary" : "text-muted-foreground"}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 1 ? "bg-primary text-white" : "bg-muted"}`}
            >
              {currentStep > 1 ? <CheckCircle2 className="h-5 w-5" /> : "1"}
            </div>
            <span className="font-medium">Select Rooms</span>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
          <div
            className={`flex items-center gap-2 ${currentStep >= 2 ? "text-primary" : "text-muted-foreground"}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 2 ? "bg-primary text-white" : "bg-muted"}`}
            >
              2
            </div>
            <span className="font-medium">Student Pairing</span>
          </div>
        </div>
      </div>

      {/* Step 1: Room Selection */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <DoorOpen className="h-5 w-5" />
                Select Rooms
              </h3>
              <Badge variant="outline">{selectedRooms.length} selected</Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
              {availableRooms.map((room) => {
                const isSelected = selectedRooms.some(
                  (r) => r.room_id === room.room_id,
                );
                return (
                  <div
                    key={room.room_id}
                    onClick={() => toggleRoomSelection(room)}
                    className={`
                      border-2 rounded-lg p-4 cursor-pointer transition-all
                      ${isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}
                    `}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-semibold text-lg">
                        {room.room_number}
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Capacity: {room.capacity}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {room.rows}×{room.cols} layout
                    </div>
                  </div>
                );
              })}
            </div>

            <Button
              onClick={proceedToStep2}
              disabled={selectedRooms.length === 0}
              className="w-full"
            >
              Continue to Student Pairing
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Card>
        </div>
      )}

      {/* Step 2: Student Pairing */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Room & Student Group Pairing
              </h3>
              <Badge variant="outline">
                {selectedRooms.length} room
                {selectedRooms.length !== 1 ? "s" : ""}
              </Badge>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-pulse text-muted-foreground">
                  Loading options...
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {roomPairings.map((pairing) => (
                  <Card key={pairing.id} className="p-4 border-2">
                    <div className="space-y-4">
                      {/* Room Info */}
                      <div className="flex items-center justify-between pb-3 border-b">
                        <div>
                          <div className="font-semibold text-lg">
                            {pairing.room.room_number}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Capacity: {pairing.room.capacity} (
                            {pairing.room.rows}×{pairing.room.cols})
                          </div>
                        </div>
                        <Badge
                          variant={
                            pairing.students_primary +
                              pairing.students_secondary >
                            36
                              ? "destructive"
                              : "default"
                          }
                        >
                          {pairing.students_primary +
                            pairing.students_secondary}{" "}
                          / 36
                        </Badge>
                      </div>

                      {/* Primary Group */}
                      <div>
                        <Label className="text-base font-semibold mb-3 block">
                          Primary Group
                        </Label>
                        <div className="grid grid-cols-4 gap-3">
                          <div>
                            <Label className="text-xs">Year Level</Label>
                            <Select
                              value={pairing.group_primary.year_level || ""}
                              onValueChange={(value) => {
                                // Auto-set semester and program based on year
                                let sem = "";
                                let program = "";

                                switch (value) {
                                  case "1":
                                    sem = "1";
                                    program = "CST";
                                    break;
                                  case "2":
                                    sem = "3";
                                    program = "CST";
                                    break;
                                  case "3":
                                    sem = "5";
                                    program = ""; // CS or CT - let user choose
                                    break;
                                  case "4":
                                    sem = ""; // 7 or 8 - let user choose
                                    program = ""; // Multiple options
                                    break;
                                }

                                updatePairing(pairing.id, "group_primary", {
                                  year_level: value,
                                  sem: sem,
                                  program: program,
                                });
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Year" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableYearLevels.map((year) => (
                                  <SelectItem key={year} value={year}>
                                    Year {year}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-xs">Semester</Label>
                            <Select
                              value={pairing.group_primary.sem || ""}
                              onValueChange={(value) => {
                                updatePairing(pairing.id, "group_primary", {
                                  ...pairing.group_primary,
                                  sem: value,
                                });
                              }}
                              disabled={
                                !pairing.group_primary.year_level ||
                                pairing.group_primary.year_level === "1" ||
                                pairing.group_primary.year_level === "2" ||
                                pairing.group_primary.year_level === "3"
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Sem" />
                              </SelectTrigger>
                              <SelectContent>
                                {getAvailableSemestersForYear(
                                  pairing.group_primary.year_level,
                                ).map((sem) => (
                                  <SelectItem key={sem} value={sem}>
                                    Sem {sem}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-xs">Program</Label>
                            <Select
                              value={pairing.group_primary.program || ""}
                              onValueChange={(value) => {
                                updatePairing(pairing.id, "group_primary", {
                                  ...pairing.group_primary,
                                  program: value,
                                });
                              }}
                              disabled={
                                !pairing.group_primary.year_level ||
                                pairing.group_primary.year_level === "1" ||
                                pairing.group_primary.year_level === "2"
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Program" />
                              </SelectTrigger>
                              <SelectContent>
                                {getAvailableProgramsForYear(
                                  pairing.group_primary.year_level,
                                ).map((program) => (
                                  <SelectItem key={program} value={program}>
                                    {program}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-xs">Students</Label>
                            <Input
                              type="number"
                              value={18}
                              disabled
                              className="bg-muted"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Secondary Group */}
                      <div>
                        <Label className="text-base font-semibold mb-3 block">
                          Secondary Group
                        </Label>
                        <div className="grid grid-cols-4 gap-3">
                          <div>
                            <Label className="text-xs">Year Level</Label>
                            <Select
                              value={pairing.group_secondary.year_level || ""}
                              onValueChange={(value) => {
                                // Auto-set semester and program based on year
                                let sem = "";
                                let program = "";

                                switch (value) {
                                  case "1":
                                    sem = "1";
                                    program = "CST";
                                    break;
                                  case "2":
                                    sem = "3";
                                    program = "CST";
                                    break;
                                  case "3":
                                    sem = "5";
                                    program = ""; // CS or CT - let user choose
                                    break;
                                  case "4":
                                    sem = ""; // 7 or 8 - let user choose
                                    program = ""; // Multiple options
                                    break;
                                }

                                updatePairing(pairing.id, "group_secondary", {
                                  year_level: value,
                                  sem: sem,
                                  program: program,
                                });
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Year" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableYearLevels.map((year) => (
                                  <SelectItem key={year} value={year}>
                                    Year {year}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-xs">Semester</Label>
                            <Select
                              value={pairing.group_secondary.sem || ""}
                              onValueChange={(value) => {
                                updatePairing(pairing.id, "group_secondary", {
                                  ...pairing.group_secondary,
                                  sem: value,
                                });
                              }}
                              disabled={
                                !pairing.group_secondary.year_level ||
                                pairing.group_secondary.year_level === "1" ||
                                pairing.group_secondary.year_level === "2" ||
                                pairing.group_secondary.year_level === "3"
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Sem" />
                              </SelectTrigger>
                              <SelectContent>
                                {getAvailableSemestersForYear(
                                  pairing.group_secondary.year_level,
                                ).map((sem) => (
                                  <SelectItem key={sem} value={sem}>
                                    Sem {sem}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-xs">Program</Label>
                            <Select
                              value={pairing.group_secondary.program || ""}
                              onValueChange={(value) => {
                                updatePairing(pairing.id, "group_secondary", {
                                  ...pairing.group_secondary,
                                  program: value,
                                });
                              }}
                              disabled={
                                !pairing.group_secondary.year_level ||
                                pairing.group_secondary.year_level === "1" ||
                                pairing.group_secondary.year_level === "2"
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Program" />
                              </SelectTrigger>
                              <SelectContent>
                                {getAvailableProgramsForYear(
                                  pairing.group_secondary.year_level,
                                ).map((program) => (
                                  <SelectItem
                                    key={program}
                                    value={program}
                                    disabled={
                                      pairing.group_primary.year_level ===
                                        pairing.group_secondary.year_level &&
                                      pairing.group_primary.sem ===
                                        pairing.group_secondary.sem &&
                                      pairing.group_primary.program === program
                                    }
                                  >
                                    {program}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-xs">Students</Label>
                            <Input
                              type="number"
                              value={18}
                              disabled
                              className="bg-muted"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Warnings */}
                      {pairing.students_primary + pairing.students_secondary >
                        36 && (
                        <div className="flex items-center gap-2 text-destructive text-sm">
                          <AlertCircle className="h-4 w-4" />
                          <span>Exceeds room capacity!</span>
                        </div>
                      )}

                      {pairing.group_primary.year_level &&
                        pairing.group_secondary.year_level &&
                        pairing.group_primary.year_level ===
                          pairing.group_secondary.year_level &&
                        pairing.group_primary.sem ===
                          pairing.group_secondary.sem &&
                        pairing.group_primary.program ===
                          pairing.group_secondary.program &&
                        pairing.group_primary.program !== "" && (
                          <div className="flex items-center gap-2 text-amber-600 text-sm">
                            <AlertCircle className="h-4 w-4" />
                            <span>
                              Warning: Same student group assigned twice!
                            </span>
                          </div>
                        )}
                    </div>
                  </Card>
                ))}
              </div>
            )}

            <div className="flex gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(1)}
                className="flex-1"
              >
                Back
              </Button>
              <Button onClick={handleSave} className="flex-1">
                Save Assignment (Check Console)
              </Button>
            </div>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
};

export default RoomAssignment;
