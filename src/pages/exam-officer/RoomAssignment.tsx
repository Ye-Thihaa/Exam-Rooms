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
import { CheckCircle2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import StudentStatisticsCard from "../../components/roomassign/StudentStatisticsCard";
import ProgressSteps from "../../components/roomassign/ProgressSteps";
import RoomSelectionStep from "../../components/roomassign/RoomSelectionStep";
import StudentPairingStep from "../../components/roomassign/StudentPairingStep";

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
}

interface AvailableOptions {
  yearLevels: string[];
  semesters: string[];
  programs: string[];
}

// Constants
const STUDENTS_PER_GROUP = 18;
const MAX_ROOM_CAPACITY = 36;

const YEAR_SEMESTER_MAP: Record<string, string> = {
  "1": "1",
  "2": "3",
  "3": "5",
};

const YEAR_PROGRAM_MAP: Record<string, string[]> = {
  "1": ["CST"],
  "2": ["CST"],
  "3": ["CS", "CT"],
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
        ["CS", "Computer Science"].includes(s.major),
      ).length;

      const year3_ct = year3.filter((s) =>
        ["CT", "Computer Technology"].includes(s.major),
      ).length;

      const year4_programs = year4.reduce(
        (acc, student) => {
          const program = student.major || "Unknown";
          acc[program] = (acc[program] || 0) + 1;
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
        ...new Set(allStudents.map((s) => s.sem.toString())),
      ].sort();

      const programs = [...new Set(allStudents.map((s) => s.major))]
        .filter(Boolean)
        .sort();

      setOptions({ yearLevels, semesters, programs });
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
    group_primary: { year_level: "", sem: "", program: "" },
    group_secondary: { year_level: "", sem: "", program: "" },
    students_primary: STUDENTS_PER_GROUP,
    students_secondary: STUDENTS_PER_GROUP,
  }));
};

const getDefaultGroupValues = (
  yearLevel: string,
): Pick<StudentGroup, "sem" | "program"> => {
  const sem = YEAR_SEMESTER_MAP[yearLevel] || "";
  const programs = YEAR_PROGRAM_MAP[yearLevel] || [];
  const program = programs.length === 1 ? programs[0] : "";

  return { sem, program };
};

const getAvailableSemestersForYear = (
  yearLevel: string,
  allSemesters: string[],
): string[] => {
  if (!yearLevel) return allSemesters;

  if (yearLevel === "4") {
    return ["7", "8"];
  }

  const sem = YEAR_SEMESTER_MAP[yearLevel];
  return sem ? [sem] : allSemesters;
};

const getAvailableProgramsForYear = (
  yearLevel: string,
  allPrograms: string[],
): string[] => {
  if (!yearLevel) return allPrograms;

  if (yearLevel === "4") {
    return allPrograms.filter((p) => p !== "CST");
  }

  return YEAR_PROGRAM_MAP[yearLevel] || allPrograms;
};

const logAssignmentData = (pairings: RoomPairing[]) => {
  console.log("=== ROOM ASSIGNMENT DATA ===");
  console.log("\nRoom Pairings:");

  pairings.forEach((pairing, index) => {
    const totalStudents = pairing.students_primary + pairing.students_secondary;

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
    console.log("   Total:", totalStudents, "/ 36");
  });

  toast.success("Assignment data logged to console!");
};

// Main Component
const RoomAssignment: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [roomPairings, setRoomPairings] = useState<RoomPairing[]>([]);

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

  const handleSave = () => {
    logAssignmentData(roomPairings);
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
          getAvailableSemestersForYear={getAvailableSemestersForYear}
          getAvailableProgramsForYear={getAvailableProgramsForYear}
          getDefaultGroupValues={getDefaultGroupValues}
        />
      )}
    </DashboardLayout>
  );
};

export default RoomAssignment;
