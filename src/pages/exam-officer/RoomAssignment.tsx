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
  year1_assigned: number;
  year1_unassigned: number;
  year2: number;
  year2_assigned: number;
  year2_unassigned: number;
  year3: number;
  year3_cs: number;
  year3_cs_assigned: number;
  year3_cs_unassigned: number;
  year3_ct: number;
  year3_ct_assigned: number;
  year3_ct_unassigned: number;
  year4: number;
  year4_programs: Record<string, number>;
  year4_specializations: Record<string, { total: number; assigned: number }>;
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

// Specialization options per year level
const SPECIALIZATION_OPTIONS: Record<string, string[]> = {
  "1": ["CST"],
  "2": ["CST"],
  "3": ["CS", "CT"],
  "4": ["SE", "KE", "HPC", "BIS", "CN", "ES", "CSEC"],
};

// Program-to-Specialization mapping for Year 4
const PROGRAM_SPECIALIZATION_MAP: Record<string, string[]> = {
  CS: ["SE", "KE", "HPC", "BIS"],
  CT: ["CN", "ES", "CSEC"],
};

// Default semester per year level
const YEAR_SEMESTER_MAP: Record<string, string> = {
  "1": "1",
  "2": "1",
  "3": "1",
  "4": "1",
};

// Available programs per year level
const YEAR_PROGRAM_MAP: Record<string, string[]> = {
  "1": ["CST"],
  "2": ["CST"],
  "3": ["CS", "CT"],
  "4": ["CS", "CT"],
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

      // Year 1 breakdown
      const year1_assigned = year1.filter((s) => s.is_assigned).length;
      const year1_unassigned = year1.length - year1_assigned;

      // Year 2 breakdown
      const year2_assigned = year2.filter((s) => s.is_assigned).length;
      const year2_unassigned = year2.length - year2_assigned;

      // Year 3 breakdown
      const year3_cs = year3.filter((s) =>
        ["CS", "Computer Science"].includes(s.major || ""),
      );
      const year3_ct = year3.filter((s) =>
        ["CT", "Computer Technology"].includes(s.major || ""),
      );

      const year3_cs_assigned = year3_cs.filter((s) => s.is_assigned).length;
      const year3_cs_unassigned = year3_cs.length - year3_cs_assigned;
      const year3_ct_assigned = year3_ct.filter((s) => s.is_assigned).length;
      const year3_ct_unassigned = year3_ct.length - year3_ct_assigned;

      // Year 4 breakdown by specialization
      const year4_cs = year4.filter((s) =>
        ["CS", "Computer Science"].includes(s.major || ""),
      );
      const year4_ct = year4.filter((s) =>
        ["CT", "Computer Technology"].includes(s.major || ""),
      );

      // CS specializations
      const year4_se = year4_cs.filter((s) => s.specialization === "SE");
      const year4_ke = year4_cs.filter((s) => s.specialization === "KE");
      const year4_bis = year4_cs.filter((s) => s.specialization === "BIS");
      const year4_hpc = year4_cs.filter((s) => s.specialization === "HPC");

      // CT specializations
      const year4_cn = year4_ct.filter((s) => s.specialization === "CN");
      const year4_csec = year4_ct.filter((s) => s.specialization === "CSEC");
      const year4_es = year4_ct.filter((s) => s.specialization === "ES");

      setStudentStats({
        total,
        year1: year1.length,
        year1_assigned,
        year1_unassigned,
        year2: year2.length,
        year2_assigned,
        year2_unassigned,
        year3: year3.length,
        year3_cs: year3_cs.length,
        year3_cs_assigned,
        year3_cs_unassigned,
        year3_ct: year3_ct.length,
        year3_ct_assigned,
        year3_ct_unassigned,
        year4: year4.length,
        year4_programs: {
          "Computer Science": year4_cs.length,
          "Computer Technology": year4_ct.length,
        },
        year4_specializations: {
          SE: {
            total: year4_se.length,
            assigned: year4_se.filter((s) => s.is_assigned).length,
          },
          KE: {
            total: year4_ke.length,
            assigned: year4_ke.filter((s) => s.is_assigned).length,
          },
          BIS: {
            total: year4_bis.length,
            assigned: year4_bis.filter((s) => s.is_assigned).length,
          },
          HPC: {
            total: year4_hpc.length,
            assigned: year4_hpc.filter((s) => s.is_assigned).length,
          },
          CN: {
            total: year4_cn.length,
            assigned: year4_cn.filter((s) => s.is_assigned).length,
          },
          CSEC: {
            total: year4_csec.length,
            assigned: year4_csec.filter((s) => s.is_assigned).length,
          },
          ES: {
            total: year4_es.length,
            assigned: year4_es.filter((s) => s.is_assigned).length,
          },
        },
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

// Find this function around line 339
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
    students_primary: 0,
    students_secondary: 0,
  }));
};

// Get default values when year level is selected
const getDefaultGroupValues = (
  yearLevel: string,
): Pick<StudentGroup, "sem" | "program" | "specialization"> => {
  const sem = YEAR_SEMESTER_MAP[yearLevel] || "";
  const programs = YEAR_PROGRAM_MAP[yearLevel] || [];
  const program = programs.length === 1 ? programs[0] : "";

  let specialization = "";

  if (yearLevel === "1" || yearLevel === "2") {
    specialization = "CST";
  } else if (yearLevel === "3" && program) {
    specialization = program;
  }

  return { sem, program, specialization };
};

// Get available semesters for a year level
const getAvailableSemestersForYear = (
  yearLevel: string,
  allSemesters: string[],
): string[] => {
  if (!yearLevel) return allSemesters;

  if (yearLevel === "4") {
    return ["1", "2"];
  }

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

// Get available specializations for a year level and program
const getAvailableSpecializationsForYear = (
  yearLevel: string,
  program?: string,
): string[] => {
  if (!yearLevel) return [];

  if (yearLevel === "4" && program) {
    return PROGRAM_SPECIALIZATION_MAP[program] || [];
  }

  return SPECIALIZATION_OPTIONS[yearLevel] || [];
};

// ✅ NEW: Get unassigned count for a specific student group
const getUnassignedCountForGroup = (
  group: StudentGroup,
  studentStats: StudentStats | null,
): number => {
  if (!studentStats || !group.year_level) return 0;

  const yearLevel = group.year_level;

  // Year 1
  if (yearLevel === "1") {
    return studentStats.year1_unassigned;
  }

  // Year 2
  if (yearLevel === "2") {
    return studentStats.year2_unassigned;
  }

  // Year 3
  if (yearLevel === "3") {
    if (group.program === "CS" || group.specialization === "CS") {
      return studentStats.year3_cs_unassigned;
    }
    if (group.program === "CT" || group.specialization === "CT") {
      return studentStats.year3_ct_unassigned;
    }
    return 0;
  }

  // Year 4
  if (yearLevel === "4" && group.specialization) {
    const spec = studentStats.year4_specializations[group.specialization];
    if (spec) {
      return spec.total - spec.assigned;
    }
  }

  return 0;
};

// ✅ NEW: Calculate total already assigned in all pairings for a specific group
const getTotalAssignedForGroup = (
  group: StudentGroup,
  allPairings: RoomPairing[],
  excludePairingId?: string,
): number => {
  let total = 0;

  allPairings.forEach((pairing) => {
    // Skip the current pairing being edited
    if (excludePairingId && pairing.id === excludePairingId) return;

    // Check if primary group matches
    if (
      pairing.group_primary.year_level === group.year_level &&
      pairing.group_primary.sem === group.sem &&
      pairing.group_primary.program === group.program &&
      pairing.group_primary.specialization === group.specialization
    ) {
      total += pairing.students_primary;
    }

    // Check if secondary group matches
    if (
      pairing.group_secondary.year_level === group.year_level &&
      pairing.group_secondary.sem === group.sem &&
      pairing.group_secondary.program === group.program &&
      pairing.group_secondary.specialization === group.specialization
    ) {
      total += pairing.students_secondary;
    }
  });

  return total;
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
 * Convert room pairings to database format (without exam_id)
 */
const convertPairingsToExamRooms = (
  pairings: RoomPairing[],
): ExamRoomInsert[] => {
  return pairings.map((pairing) => ({
    room_id: pairing.room.room_id,
    assigned_capacity: pairing.students_primary + pairing.students_secondary,

    year_level_primary: pairing.group_primary.year_level,
    sem_primary: pairing.group_primary.sem,
    program_primary:
      PROGRAM_DISPLAY[pairing.group_primary.program] ||
      pairing.group_primary.program,
    specialization_primary: pairing.group_primary.specialization,
    students_primary: pairing.students_primary,

    year_level_secondary: pairing.group_secondary.year_level,
    sem_secondary: pairing.group_secondary.sem,
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

  // ✅ UPDATED: Add validation before updating pairing
  const handleUpdatePairing = (
    id: string,
    field: keyof RoomPairing,
    value: any,
  ) => {
    // Find the current pairing
    const currentPairing = roomPairings.find((p) => p.id === id);
    if (!currentPairing) return;

    // If updating student count, validate against unassigned count
    if (field === "students_primary" || field === "students_secondary") {
      const newCount = parseInt(value) || 0;
      const isPrimary = field === "students_primary";
      const group = isPrimary
        ? currentPairing.group_primary
        : currentPairing.group_secondary;

      // Check if group is fully defined
      if (
        !group.year_level ||
        !group.sem ||
        !group.program ||
        !group.specialization
      ) {
        toast.error(
          "Please select all group details before assigning students",
        );
        return;
      }

      // Get unassigned count for this specific group
      const unassignedCount = getUnassignedCountForGroup(group, studentStats);

      // Get total already assigned across all pairings (excluding current)
      const alreadyAssigned = getTotalAssignedForGroup(group, roomPairings, id);

      // Calculate available count
      const availableCount = unassignedCount - alreadyAssigned;

      // Validate
      if (newCount > availableCount) {
        const groupLabel = `Year ${group.year_level}, Sem ${group.sem}, ${PROGRAM_DISPLAY[group.program] || group.program}, ${group.specialization}`;

        toast.error(
          `Cannot assign ${newCount} students. Only ${availableCount} unassigned students available for ${groupLabel}`,
          { duration: 5000 },
        );

        return; // Don't update the state
      }
    }

    // Proceed with update if validation passes
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
      const examRooms = convertPairingsToExamRooms(roomPairings);

      console.log(
        "📤 Data being sent to database:",
        JSON.stringify(examRooms, null, 2),
      );

      const result = await saveExamRoomAssignments(examRooms);

      if (result.success) {
        toast.success(
          `Successfully saved ${roomPairings.length} room assignments!`,
        );
        console.log("✅ Saved data:", result.data);
      } else {
        toast.error("Failed to save room assignments");
        console.error("❌ Save error:", result.error);
        if (result.error) {
          console.error(
            "Error details:",
            JSON.stringify(result.error, null, 2),
          );
        }
      }
    } catch (error) {
      console.error("❌ Exception saving room assignments:", error);
      toast.error("An error occurred while saving");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Room Assignment"
        description="Assign rooms and student groups for exam seating"
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
