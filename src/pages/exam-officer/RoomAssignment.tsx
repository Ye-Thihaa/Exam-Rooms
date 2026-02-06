import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import PageHeader from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAvailableRooms, Room } from "@/services/Roomqueries";
import {
  getTotalStudentCount,
  getStudentsByYearLevel,
} from "@/services/studentQueries";
import { CheckCircle2, ArrowRight, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import StudentStatisticsCard from "../../components/roomassign/StudentStatisticsCard";
import ProgressSteps from "../../components/roomassign/ProgressSteps";
import RoomSelectionStep from "../../components/roomassign/RoomSelectionStep";
import StudentPairingStep from "../../components/roomassign/StudentPairingStep";
import {
  saveExamRoomAssignments,
  ExamRoomInsert,
} from "@/services/examroomQueries";

// Types
interface StudentStats {
  total: number;
  year1: number;
  year2: number;
  year3: number;
  year3_cs: number;
  year3_ct: number;
  year4: number;
  year4_programs: Record<string, number>;
  year4_specializations: Record<string, number>; // ✅ ADDED
}

export interface RoomPairing {
  id: string;
  room: Room;
  group_primary: StudentGroup;
  group_secondary: StudentGroup;
  students_primary: number;
  students_secondary: number;
}

export interface StudentGroup {
  year_level: string;
  sem: string;
  program: string;
  specialization: string;
}

interface AvailableOptions {
  yearLevels: string[];
  semesters: string[];
  programs: string[];
  specializations: string[];
}

// Constants
const STUDENTS_PER_GROUP = 18;
const MAX_ROOM_CAPACITY = 36;

// Year level display mapping
const YEAR_LEVEL_DISPLAY: Record<string, string> = {
  "1": "First Year",
  "2": "Second Year",
  "3": "Third Year",
  "4": "Fourth Year",
};

// Semester display mapping (odd = First, even = Second)
const getSemesterDisplay = (sem: string): string => {
  const semNum = parseInt(sem);
  return semNum % 2 === 1 ? "First Semester" : "Second Semester";
};

// Program display mapping
const PROGRAM_DISPLAY: Record<string, string> = {
  CST: "Computer Science and Technology",
  CS: "Computer Science",
  CT: "Computer Technology",
};

// ✅ UPDATED: Specialization options per year level
const SPECIALIZATION_OPTIONS: Record<string, string[]> = {
  "1": ["CST"], // Year 1: Only CST
  "2": ["CST"], // Year 2: Only CST
  "3": ["CS", "CT"], // Year 3: CS or CT (matches program)
  "4": ["SE", "KE", "HPC", "BIS", "CN", "ES", "CSEC"], // Year 4: All specializations
};

// ✅ UPDATED: Program-to-Specialization mapping for Year 4
const PROGRAM_SPECIALIZATION_MAP: Record<string, string[]> = {
  CS: ["SE", "KE", "HPC", "BIS"], // CS program -> these specializations
  CT: ["CN", "ES", "CSEC"], // CT program -> these specializations
};

// Default semester per year level
const YEAR_SEMESTER_MAP: Record<string, string> = {
  "1": "1",
  "2": "1",
  "3": "1",
  "4": "1", // Default to semester 1, but Year 4 can also choose semester 2
};

// Available programs per year level
const YEAR_PROGRAM_MAP: Record<string, string[]> = {
  "1": ["CST"],
  "2": ["CST"],
  "3": ["CS", "CT"],
  "4": ["CS", "CT"], // Year 4 has both CS and CT programs
};

// Hooks
const useRooms = () => {
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [selectedRooms, setSelectedRooms] = useState<Room[]>([]);

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      const rooms = await getAvailableRooms();
      setAvailableRooms(rooms);
    } catch (error) {
      console.error("Error loading rooms:", error);
      toast.error("Failed to load rooms");
    }
  };

  const toggleRoomSelection = (room: Room) => {
    setSelectedRooms((prev) => {
      const isSelected = prev.some((r) => r.room_id === room.room_id);
      return isSelected
        ? prev.filter((r) => r.room_id !== room.room_id)
        : [...prev, room];
    });
  };

  return { availableRooms, selectedRooms, toggleRoomSelection };
};

const useStudentStats = () => {
  const [studentStats, setStudentStats] = useState<StudentStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStudentStatistics();
  }, []);

  const loadStudentStatistics = async () => {
    try {
      setLoading(true);

      const [total, year1, year2, year3, year4] = await Promise.all([
        getTotalStudentCount(),
        getStudentsByYearLevel(1),
        getStudentsByYearLevel(2),
        getStudentsByYearLevel(3),
        getStudentsByYearLevel(4),
      ]);

      const year3_cs = year3.filter((s) =>
        ["CS", "Computer Science"].includes(s.major || ""),
      ).length;

      const year3_ct = year3.filter((s) =>
        ["CT", "Computer Technology"].includes(s.major || ""),
      ).length;

      const year4_programs = year4.reduce(
        (acc, student) => {
          const program = student.major || "Unknown";
          acc[program] = (acc[program] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      // ✅ ADDED: Count Year 4 students by specialization
      const year4_specializations = year4.reduce(
        (acc, student) => {
          const spec = student.specialization || "Unknown";
          acc[spec] = (acc[spec] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      setStudentStats({
        total,
        year1: year1.length,
        year2: year2.length,
        year3: year3.length,
        year3_cs,
        year3_ct,
        year4: year4.length,
        year4_programs,
        year4_specializations,
      });

      toast.success("Student statistics loaded");
    } catch (error) {
      console.error("Error loading student statistics:", error);
      toast.error("Failed to load student statistics");
    } finally {
      setLoading(false);
    }
  };

  return { studentStats, loading };
};

const useAvailableOptions = () => {
  const [options, setOptions] = useState<AvailableOptions>({
    yearLevels: [],
    semesters: [],
    programs: [],
    specializations: [],
  });

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    try {
      const allStudents = (
        await Promise.all([
          getStudentsByYearLevel(1),
          getStudentsByYearLevel(2),
          getStudentsByYearLevel(3),
          getStudentsByYearLevel(4),
        ])
      ).flat();

      const yearLevels = [
        ...new Set(allStudents.map((s) => s.year_level.toString())),
      ].sort();

      const semesters = [
        ...new Set(allStudents.map((s) => s.sem?.toString()).filter(Boolean)),
      ].sort();

      const programs = [...new Set(allStudents.map((s) => s.major))]
        .filter(Boolean)
        .sort();

      // Get all possible specializations from database
      const specializations = [
        ...new Set(allStudents.map((s) => s.specialization).filter(Boolean)),
      ].sort();

      setOptions({ yearLevels, semesters, programs, specializations });
    } catch (error) {
      console.error("Error loading available options:", error);
    }
  };

  return options;
};

// Helper Functions
const createInitialPairings = (rooms: Room[]): RoomPairing[] => {
  return rooms.map((room) => ({
    id: `${room.room_id}-${Date.now()}`,
    room,
    group_primary: { year_level: "", sem: "", program: "", specialization: "" },
    group_secondary: {
      year_level: "",
      sem: "",
      program: "",
      specialization: "",
    },
    students_primary: STUDENTS_PER_GROUP,
    students_secondary: STUDENTS_PER_GROUP,
  }));
};

// ✅ UPDATED: Get default values when year level is selected
const getDefaultGroupValues = (
  yearLevel: string,
): Pick<StudentGroup, "sem" | "program" | "specialization"> => {
  const sem = YEAR_SEMESTER_MAP[yearLevel] || "";
  const programs = YEAR_PROGRAM_MAP[yearLevel] || [];
  const program = programs.length === 1 ? programs[0] : "";

  // Get default specialization based on year and program
  let specialization = "";

  if (yearLevel === "1" || yearLevel === "2") {
    // Year 1 & 2: Always CST
    specialization = "CST";
  } else if (yearLevel === "3" && program) {
    // Year 3: Specialization matches program (CS or CT)
    specialization = program;
  }
  // Year 4: No default, user must select based on program

  return { sem, program, specialization };
};

// ✅ UPDATED: Get available semesters for a year level
const getAvailableSemestersForYear = (
  yearLevel: string,
  allSemesters: string[],
): string[] => {
  if (!yearLevel) return allSemesters;

  if (yearLevel === "4") {
    // Year 4 can have semester 1 or 2
    return ["1", "2"];
  }

  // Year 1-3: Fixed to semester 1
  const sem = YEAR_SEMESTER_MAP[yearLevel];
  return sem ? [sem] : allSemesters;
};

// Get available programs for a year level
const getAvailableProgramsForYear = (
  yearLevel: string,
  allPrograms: string[],
): string[] => {
  if (!yearLevel) return allPrograms;
  return YEAR_PROGRAM_MAP[yearLevel] || allPrograms;
};

// ✅ NEW: Get available specializations for a year level and program
const getAvailableSpecializationsForYear = (
  yearLevel: string,
  program?: string,
): string[] => {
  if (!yearLevel) return [];

  if (yearLevel === "4" && program) {
    // Year 4: Filter by program
    return PROGRAM_SPECIALIZATION_MAP[program] || [];
  }

  // Year 1-3: Return fixed options
  return SPECIALIZATION_OPTIONS[yearLevel] || [];
};

const logAssignmentData = (pairings: RoomPairing[]) => {
  console.log("=== ROOM ASSIGNMENT DATA ===");
  console.log("\nRoom Pairings:");

  pairings.forEach((pairing, index) => {
    const totalStudents = pairing.students_primary + pairing.students_secondary;

    console.log(`\n${index + 1}. ${pairing.room.room_number}`);
    console.log(
      "   Primary Group:",
      `Year ${pairing.group_primary.year_level}, Sem ${pairing.group_primary.sem}, ${PROGRAM_DISPLAY[pairing.group_primary.program] || pairing.group_primary.program}, Specialization: ${pairing.group_primary.specialization}`,
      "-",
      pairing.students_primary,
      "students",
    );
    console.log(
      "   Secondary Group:",
      `Year ${pairing.group_secondary.year_level}, Sem ${pairing.group_secondary.sem}, ${PROGRAM_DISPLAY[pairing.group_secondary.program] || pairing.group_secondary.program}, Specialization: ${pairing.group_secondary.specialization}`,
      "-",
      pairing.students_secondary,
      "students",
    );
    console.log("   Total:", totalStudents, "/ 36");
  });
};

/**
 * Validate room pairings before saving
 */
const validatePairings = (
  pairings: RoomPairing[],
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  pairings.forEach((pairing, index) => {
    const roomLabel = `Room ${pairing.room.room_number}`;

    // Check if primary group is filled
    if (
      !pairing.group_primary.year_level ||
      !pairing.group_primary.sem ||
      !pairing.group_primary.program ||
      !pairing.group_primary.specialization
    ) {
      errors.push(`${roomLabel}: Primary group is incomplete`);
    }

    // Check if secondary group is filled
    if (
      !pairing.group_secondary.year_level ||
      !pairing.group_secondary.sem ||
      !pairing.group_secondary.program ||
      !pairing.group_secondary.specialization
    ) {
      errors.push(`${roomLabel}: Secondary group is incomplete`);
    }

    // Check total capacity
    const totalStudents = pairing.students_primary + pairing.students_secondary;
    if (totalStudents > MAX_ROOM_CAPACITY) {
      errors.push(
        `${roomLabel}: Total students (${totalStudents}) exceeds capacity (${MAX_ROOM_CAPACITY})`,
      );
    }

    if (totalStudents === 0) {
      errors.push(`${roomLabel}: No students assigned`);
    }
  });

  return { valid: errors.length === 0, errors };
};

/**
 * Convert room pairings to database format
 */
const convertPairingsToExamRooms = (
  pairings: RoomPairing[],
  examId: number,
): ExamRoomInsert[] => {
  return pairings.map((pairing) => ({
    exam_id: examId,
    room_id: pairing.room.room_id,
    assigned_capacity: pairing.students_primary + pairing.students_secondary,

    // ✅ Store as number strings
    year_level_primary: pairing.group_primary.year_level, // "1", "2", "3", "4"
    sem_primary: pairing.group_primary.sem, // "1" or "2" (actual semester, not cumulative)

    program_primary:
      PROGRAM_DISPLAY[pairing.group_primary.program] ||
      pairing.group_primary.program,
    specialization_primary: pairing.group_primary.specialization,
    students_primary: pairing.students_primary,

    year_level_secondary: pairing.group_secondary.year_level,
    sem_secondary: pairing.group_secondary.sem, // "1" or "2" (actual semester)

    program_secondary:
      PROGRAM_DISPLAY[pairing.group_secondary.program] ||
      pairing.group_secondary.program,
    specialization_secondary: pairing.group_secondary.specialization,
    students_secondary: pairing.students_secondary,
  }));
};

// Main Component
const RoomAssignment: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [roomPairings, setRoomPairings] = useState<RoomPairing[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<number>(1);
  const [isSaving, setIsSaving] = useState(false);

  const { availableRooms, selectedRooms, toggleRoomSelection } = useRooms();
  const { studentStats, loading: statsLoading } = useStudentStats();
  const availableOptions = useAvailableOptions();

  const handleProceedToStep2 = () => {
    if (selectedRooms.length === 0) {
      toast.error("Please select at least one room");
      return;
    }

    setCurrentStep(2);
    setRoomPairings(createInitialPairings(selectedRooms));
  };

  const handleUpdatePairing = (
    id: string,
    field: keyof RoomPairing,
    value: any,
  ) => {
    setRoomPairings((prev) =>
      prev.map((pairing) =>
        pairing.id === id ? { ...pairing, [field]: value } : pairing,
      ),
    );
  };

  const handleSave = async () => {
    const validation = validatePairings(roomPairings);

    if (!validation.valid) {
      toast.error("Validation failed");
      validation.errors.forEach((error) => {
        console.error(error);
        toast.error(error);
      });
      return;
    }

    logAssignmentData(roomPairings);

    setIsSaving(true);
    try {
      const examRooms = convertPairingsToExamRooms(
        roomPairings,
        selectedExamId,
      );
      const result = await saveExamRoomAssignments(selectedExamId, examRooms);

      if (result.success) {
        toast.success(
          `Successfully saved ${roomPairings.length} room assignments!`,
        );
        console.log("Saved data:", result.data);
      } else {
        toast.error("Failed to save room assignments");
        console.error("Save error:", result.error);
      }
    } catch (error) {
      console.error("Exception saving room assignments:", error);
      toast.error("An error occurred while saving");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Room Assignment"
        description="Assign rooms and exams for exam seating"
      />

      <StudentStatisticsCard
        studentStats={studentStats}
        loading={statsLoading}
      />

      <ProgressSteps currentStep={currentStep} />

      {currentStep === 1 ? (
        <RoomSelectionStep
          availableRooms={availableRooms}
          selectedRooms={selectedRooms}
          onToggleRoom={toggleRoomSelection}
          onProceed={handleProceedToStep2}
        />
      ) : (
        <StudentPairingStep
          roomPairings={roomPairings}
          availableOptions={availableOptions}
          onUpdatePairing={handleUpdatePairing}
          onBack={() => setCurrentStep(1)}
          onSave={handleSave}
          isSaving={isSaving}
          getAvailableSemestersForYear={getAvailableSemestersForYear}
          getAvailableProgramsForYear={getAvailableProgramsForYear}
          getAvailableSpecializationsForYear={
            getAvailableSpecializationsForYear
          }
          getDefaultGroupValues={getDefaultGroupValues}
        />
      )}
    </DashboardLayout>
  );
};

export default RoomAssignment;
