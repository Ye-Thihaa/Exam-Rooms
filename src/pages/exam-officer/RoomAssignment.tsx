import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import PageHeader from "@/components/shared/PageHeader";
import { getAvailableRooms, Room } from "@/services/Roomqueries";
import {
  getTotalStudentCount,
  getStudentsByYearLevel,
  getDistinctStudentGroups,
  getUnassignedCountForGroup as getUnassignedCountFromDB,
  StudentGroup as DBStudentGroup,
} from "@/services/studentQueries";
import { toast } from "sonner";
import {
  ProgressSteps,
  RoomSelectionStep,
  StudentPairingStep,
  StudentStatisticsCard,
} from "@/components/roomassign/RoomAssignmentComponents";
import {
  saveExamRoomAssignments,
  ExamRoomInsert,
} from "@/services/examroomQueries";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface StudentStats {
  total: number;
  byGroup: Map<string, { total: number; assigned: number }>;
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

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const MAX_ROOM_CAPACITY = 36;

const PROGRAM_DISPLAY: Record<string, string> = {
  CST: "Computer Science and Technology",
  CS: "Computer Science",
  CT: "Computer Technology",
};

// ─────────────────────────────────────────────
// Group key helper
// ─────────────────────────────────────────────

const groupKey = (
  yearLevel: string | number,
  sem: string | number,
  program: string,
  specialization: string,
) => `${yearLevel}|${sem}|${program}|${specialization}`;

// ─────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────

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

/**
 * Fetches all distinct unassigned groups from the DB and builds:
 * - rawGroups: for driving dropdown options
 * - groupCounts: map of group key → unassigned count (for validation)
 * - studentStats: total + per-group counts for the stats card
 */
const useAvailableOptions = () => {
  const [rawGroups, setRawGroups] = useState<DBStudentGroup[]>([]);
  const [groupCounts, setGroupCounts] = useState<Map<string, number>>(
    new Map(),
  );
  const [studentStats, setStudentStats] = useState<StudentStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setStatsLoading(true);

      const [total, groups] = await Promise.all([
        getTotalStudentCount(),
        getDistinctStudentGroups(),
      ]);

      setRawGroups(groups);

      // Fetch unassigned count for every distinct group in parallel
      const entries = await Promise.all(
        groups.map(async (g) => {
          const count = await getUnassignedCountFromDB(
            g.year_level,
            g.sem,
            g.major,
            g.specialization,
          );
          return [groupKey(g.year_level, g.sem, g.major, g.specialization), count] as [string, number];
        }),
      );

      const counts = new Map<string, number>(entries);
      setGroupCounts(counts);

      // Build stats: total + per-group { total, assigned } derived from DB groups
      // We fetch total students per group (assigned + unassigned) by querying all students
      const allYearLevels = [...new Set(groups.map((g) => g.year_level))];
      const allStudents = (
        await Promise.all(allYearLevels.map((y) => getStudentsByYearLevel(y)))
      ).flat();

      const byGroup = new Map<string, { total: number; assigned: number }>();
      allStudents.forEach((s) => {
        if (!s.major || s.sem == null || !s.specialization) return;
        const key = groupKey(s.year_level, s.sem, s.major, s.specialization ?? "");
        const existing = byGroup.get(key) ?? { total: 0, assigned: 0 };
        byGroup.set(key, {
          total: existing.total + 1,
          assigned: existing.assigned + (s.is_assigned ? 1 : 0),
        });
      });

      setStudentStats({ total, byGroup });
      toast.success("Student statistics loaded");
    } catch (error) {
      console.error("Error loading groups:", error);
      toast.error("Failed to load student data");
    } finally {
      setStatsLoading(false);
    }
  };

  // ── Dropdown helpers — all driven purely from rawGroups ──

  const yearLevels = [
    ...new Set(rawGroups.map((g) => g.year_level.toString())),
  ].sort();

  const getSemestersForYear = (yearLevel: string): string[] => {
    if (!yearLevel)
      return [...new Set(rawGroups.map((g) => g.sem.toString()))].sort();
    return [
      ...new Set(
        rawGroups
          .filter((g) => g.year_level.toString() === yearLevel)
          .map((g) => g.sem.toString()),
      ),
    ].sort();
  };

  const getProgramsForYear = (yearLevel: string): string[] => {
    if (!yearLevel)
      return [
        ...new Set(rawGroups.map((g) => g.major).filter(Boolean)),
      ].sort();
    return [
      ...new Set(
        rawGroups
          .filter((g) => g.year_level.toString() === yearLevel)
          .map((g) => g.major)
          .filter(Boolean),
      ),
    ].sort();
  };

  const getSpecializationsForYear = (
    yearLevel: string,
    program?: string,
  ): string[] => {
    if (!yearLevel) return [];
    return [
      ...new Set(
        rawGroups
          .filter(
            (g) =>
              g.year_level.toString() === yearLevel &&
              (!program || g.major === program),
          )
          .map((g) => g.specialization)
          .filter(Boolean),
      ),
    ].sort();
  };

  const getDefaultGroupValues = (
    yearLevel: string,
  ): Pick<StudentGroup, "sem" | "program" | "specialization"> => {
    const yearsGroups = rawGroups.filter(
      (g) => g.year_level.toString() === yearLevel,
    );

    const sems = [
      ...new Set(yearsGroups.map((g) => g.sem.toString())),
    ].sort();
    const programs = [
      ...new Set(yearsGroups.map((g) => g.major).filter(Boolean)),
    ].sort();

    const sem = sems.length === 1 ? sems[0] : "";
    const program = programs.length === 1 ? programs[0] : "";

    const specs = [
      ...new Set(
        yearsGroups
          .filter((g) => !program || g.major === program)
          .map((g) => g.specialization)
          .filter(Boolean),
      ),
    ].sort();

    const specialization = specs.length === 1 ? specs[0] : "";

    return { sem, program, specialization };
  };

  return {
    yearLevels,
    getSemestersForYear,
    getProgramsForYear,
    getSpecializationsForYear,
    getDefaultGroupValues,
    groupCounts,
    studentStats,
    statsLoading,
    rawGroups,
  };
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

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

// Simple map lookup — no hardcoding, works for any year level/sem/program/spec
const getUnassignedCountForGroup = (
  group: StudentGroup,
  _studentStats: StudentStats | null,
  groupCounts: Map<string, number>,
): number => {
  if (
    !group.year_level ||
    !group.sem ||
    !group.program ||
    !group.specialization
  )
    return 0;
  const key = groupKey(
    group.year_level,
    group.sem,
    group.program,
    group.specialization,
  );
  return groupCounts.get(key) ?? 0;
};

const getTotalAssignedForGroup = (
  group: StudentGroup,
  allPairings: RoomPairing[],
  excludePairingId?: string,
): number => {
  let total = 0;

  allPairings.forEach((pairing) => {
    if (excludePairingId && pairing.id === excludePairingId) return;

    if (
      pairing.group_primary.year_level === group.year_level &&
      pairing.group_primary.sem === group.sem &&
      pairing.group_primary.program === group.program &&
      pairing.group_primary.specialization === group.specialization
    ) {
      total += pairing.students_primary;
    }

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
  pairings.forEach((pairing, index) => {
    const totalStudents = pairing.students_primary + pairing.students_secondary;
    console.log(`\n${index + 1}. ${pairing.room.room_number}`);
    console.log(
      "   Primary:",
      `Year ${pairing.group_primary.year_level}, Sem ${pairing.group_primary.sem}, ${pairing.group_primary.program}, ${pairing.group_primary.specialization}`,
      "-",
      pairing.students_primary,
      "students",
    );
    console.log(
      "   Secondary:",
      `Year ${pairing.group_secondary.year_level}, Sem ${pairing.group_secondary.sem}, ${pairing.group_secondary.program}, ${pairing.group_secondary.specialization}`,
      "-",
      pairing.students_secondary,
      "students",
    );
    console.log("   Total:", totalStudents, "/ 36");
  });
};

const validatePairings = (
  pairings: RoomPairing[],
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  pairings.forEach((pairing) => {
    const roomLabel = `Room ${pairing.room.room_number}`;

    if (
      !pairing.group_primary.year_level ||
      !pairing.group_primary.sem ||
      !pairing.group_primary.program ||
      !pairing.group_primary.specialization
    ) {
      errors.push(`${roomLabel}: Primary group is incomplete`);
    }

    if (
      !pairing.group_secondary.year_level ||
      !pairing.group_secondary.sem ||
      !pairing.group_secondary.program ||
      !pairing.group_secondary.specialization
    ) {
      errors.push(`${roomLabel}: Secondary group is incomplete`);
    }

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

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

const RoomAssignment: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [roomPairings, setRoomPairings] = useState<RoomPairing[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const navigate = useNavigate();
  const { availableRooms, selectedRooms, toggleRoomSelection } = useRooms();
  const {
    yearLevels,
    getSemestersForYear,
    getProgramsForYear,
    getSpecializationsForYear,
    getDefaultGroupValues,
    groupCounts,
    studentStats,
    statsLoading,
    rawGroups,
  } = useAvailableOptions();

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
    const currentPairing = roomPairings.find((p) => p.id === id);
    if (!currentPairing) return;

    if (field === "students_primary" || field === "students_secondary") {
      const newCount = parseInt(value) || 0;
      const isPrimary = field === "students_primary";
      const group = isPrimary
        ? currentPairing.group_primary
        : currentPairing.group_secondary;

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

      const unassignedCount = getUnassignedCountForGroup(
        group,
        studentStats,
        groupCounts,
      );
      const alreadyAssigned = getTotalAssignedForGroup(
        group,
        roomPairings,
        id,
      );
      const availableCount = unassignedCount - alreadyAssigned;

      if (newCount > availableCount) {
        toast.error(
          `Cannot assign ${newCount} students. Only ${availableCount} unassigned students available for Year ${group.year_level}, Sem ${group.sem}, ${group.program}, ${group.specialization}`,
          { duration: 5000 },
        );
        return;
      }
    }

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
        navigate("/exam-officer/room-assignments");
      } else {
        toast.error("Failed to save room assignments");
        console.error("❌ Save error:", result.error);
      }
    } catch (error) {
      console.error("❌ Exception saving room assignments:", error);
      toast.error("An error occurred while saving");
    } finally {
      setIsSaving(false);
    }
  };

  const availableOptions = {
    yearLevels,
    semesters: [
      ...new Set(yearLevels.flatMap((y) => getSemestersForYear(y))),
    ].sort(),
    programs: [
      ...new Set(yearLevels.flatMap((y) => getProgramsForYear(y))),
    ].sort(),
    specializations: [
      ...new Set(yearLevels.flatMap((y) => getSpecializationsForYear(y))),
    ].sort(),
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Room Assignment"
        description="Assign rooms and student groups for exam seating"
      />

      <StudentStatisticsCard
        studentStats={studentStats}
        rawGroups={rawGroups}
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
          studentStats={studentStats}
          groupCounts={groupCounts}
          getAvailableSemestersForYear={getSemestersForYear}
          getAvailableProgramsForYear={getProgramsForYear}
          getAvailableSpecializationsForYear={getSpecializationsForYear}
          getDefaultGroupValues={getDefaultGroupValues}
          getUnassignedCountForGroup={(group) =>
            getUnassignedCountForGroup(group, studentStats, groupCounts)
          }
          getTotalAssignedForGroup={getTotalAssignedForGroup}
        />
      )}
    </DashboardLayout>
  );
};

export default RoomAssignment;