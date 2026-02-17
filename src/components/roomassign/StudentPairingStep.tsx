import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import {
  RoomPairing,
  StudentGroup,
} from "../../pages/exam-officer/RoomAssignment";
import RoomPairingCard from "./RoomPairingCard";

interface StudentPairingStepProps {
  roomPairings: RoomPairing[];
  availableOptions: {
    yearLevels: string[];
    semesters: string[];
    programs: string[];
    specializations: string[];
  };
  onUpdatePairing: (id: string, field: keyof RoomPairing, value: any) => void;
  onBack: () => void;
  onSave: () => void;
  isSaving: boolean;
  studentStats: StudentStats | null;

  getAvailableSemestersForYear: (
    yearLevel: string,
    allSemesters: string[],
  ) => string[];
  getAvailableProgramsForYear: (
    yearLevel: string,
    allPrograms: string[],
  ) => string[];
  getAvailableSpecializationsForYear: (
    yearLevel: string,
    program?: string,
  ) => string[];
  getDefaultGroupValues: (
    yearLevel: string,
  ) => Pick<StudentGroup, "sem" | "program" | "specialization">;
  getUnassignedCountForGroup: (
    group: StudentGroup,
    studentStats: StudentStats | null,
  ) => number;
  getTotalAssignedForGroup: (
    group: StudentGroup,
    allPairings: RoomPairing[],
    excludePairingId?: string,
  ) => number;
}

// Re-export StudentStats type (or import from shared types)
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

const MAX_ROOM_CAPACITY = 36;

// Calculate total pre-assigned students for a group across all pairings
const getTotalPreAssignedForGroup = (
  group: StudentGroup,
  allPairings: RoomPairing[],
): number => {
  if (
    !group.year_level ||
    !group.sem ||
    !group.program ||
    !group.specialization
  )
    return 0;

  return allPairings.reduce((total, pairing) => {
    let count = 0;
    if (
      pairing.group_primary.year_level === group.year_level &&
      pairing.group_primary.sem === group.sem &&
      pairing.group_primary.program === group.program &&
      pairing.group_primary.specialization === group.specialization
    ) {
      count += pairing.students_primary || 0;
    }
    if (
      pairing.group_secondary.year_level === group.year_level &&
      pairing.group_secondary.sem === group.sem &&
      pairing.group_secondary.program === group.program &&
      pairing.group_secondary.specialization === group.specialization
    ) {
      count += pairing.students_secondary || 0;
    }
    return total + count;
  }, 0);
};

const StudentPairingStep: React.FC<StudentPairingStepProps> = ({
  roomPairings,
  availableOptions,
  onUpdatePairing,
  onBack,
  onSave,
  isSaving,
  studentStats,
  getAvailableSemestersForYear,
  getAvailableProgramsForYear,
  getAvailableSpecializationsForYear,
  getDefaultGroupValues,
  getUnassignedCountForGroup,
  getTotalAssignedForGroup,
}) => {
  const totalStudents = roomPairings.reduce(
    (sum, pairing) =>
      sum + (pairing.students_primary || 0) + (pairing.students_secondary || 0),
    0,
  );

  const roomsOverCapacity = roomPairings.filter(
    (pairing) =>
      (pairing.students_primary || 0) + (pairing.students_secondary || 0) >
      MAX_ROOM_CAPACITY,
  );

  const exceedsMaximum = roomsOverCapacity.length > 0;

  // Build a summary of pre-assigned counts per group key for the summary panel
  type GroupSummary = {
    label: string;
    unassignedInDB: number;
    preAssigned: number;
    remaining: number;
  };

  const groupSummaryMap = new Map<string, GroupSummary>();

  roomPairings.forEach((pairing) => {
    [
      {
        group: pairing.group_primary,
        students: pairing.students_primary || 0,
      },
      {
        group: pairing.group_secondary,
        students: pairing.students_secondary || 0,
      },
    ].forEach(({ group, students }) => {
      if (
        !group.year_level ||
        !group.sem ||
        !group.program ||
        !group.specialization
      )
        return;

      const key = `${group.year_level}|${group.sem}|${group.program}|${group.specialization}`;
      if (!groupSummaryMap.has(key)) {
        const unassignedInDB = getUnassignedCountForGroup(group, studentStats);
        const preAssigned = getTotalPreAssignedForGroup(group, roomPairings);
        groupSummaryMap.set(key, {
          label: `Year ${group.year_level} Sem ${group.sem} - ${group.program} ${group.specialization}`,
          unassignedInDB,
          preAssigned,
          remaining: unassignedInDB - preAssigned,
        });
      }
    });
  });

  const groupSummaries = Array.from(groupSummaryMap.values());

  return (
    <div className="space-y-6">
      {/* Pre-assignment Summary Panel */}
      {groupSummaries.length > 0 && (
        <Card className="p-6">
          <h3 className="text-base font-semibold mb-3">
            Pre-Assignment Summary
          </h3>
          <div className="space-y-2">
            {groupSummaries.map((summary, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-sm py-2 border-b last:border-0"
              >
                <span className="font-medium text-gray-700">
                  {summary.label}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-gray-500">
                    Unassigned (DB):{" "}
                    <span className="font-medium text-gray-800">
                      {summary.unassignedInDB}
                    </span>
                  </span>
                  <span className="text-blue-600">
                    Pre-assigned:{" "}
                    <span className="font-semibold">{summary.preAssigned}</span>
                  </span>
                  <span
                    className={
                      summary.remaining < 0
                        ? "text-red-600 font-semibold"
                        : summary.remaining === 0
                          ? "text-green-600 font-semibold"
                          : "text-orange-600 font-semibold"
                    }
                  >
                    Remaining: {summary.remaining}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            Room & Student Group Pairing
          </h3>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {roomPairings.length} room{roomPairings.length !== 1 ? "s" : ""}
            </Badge>
            <Badge variant={exceedsMaximum ? "destructive" : "secondary"}>
              {totalStudents} students total
            </Badge>
          </div>
        </div>

        {exceedsMaximum && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">
              ⚠️ The following room(s) exceed the {MAX_ROOM_CAPACITY}-student
              capacity limit:{" "}
              {roomsOverCapacity
                .map(
                  (p) =>
                    `${p.room.room_number} (${(p.students_primary || 0) + (p.students_secondary || 0)} students)`,
                )
                .join(", ")}
              . Please reduce the number of students per room.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {roomPairings.map((pairing) => (
            <RoomPairingCard
              key={pairing.id}
              pairing={pairing}
              availableOptions={availableOptions}
              onUpdate={onUpdatePairing}
              getAvailableSemestersForYear={getAvailableSemestersForYear}
              getAvailableProgramsForYear={getAvailableProgramsForYear}
              getAvailableSpecializationsForYear={
                getAvailableSpecializationsForYear
              }
              getDefaultGroupValues={getDefaultGroupValues}
              // Pass real-time remaining counts
              getPrimaryRemaining={() => {
                const g = pairing.group_primary;
                if (!g.year_level || !g.sem || !g.program || !g.specialization)
                  return null;
                const dbUnassigned = getUnassignedCountForGroup(
                  g,
                  studentStats,
                );
                const otherPreAssigned = getTotalAssignedForGroup(
                  g,
                  roomPairings,
                  pairing.id,
                );
                return (
                  dbUnassigned -
                  otherPreAssigned -
                  (pairing.students_primary || 0)
                );
              }}
              getSecondaryRemaining={() => {
                const g = pairing.group_secondary;
                if (!g.year_level || !g.sem || !g.program || !g.specialization)
                  return null;
                const dbUnassigned = getUnassignedCountForGroup(
                  g,
                  studentStats,
                );
                const otherPreAssigned = getTotalAssignedForGroup(
                  g,
                  roomPairings,
                  pairing.id,
                );
                return (
                  dbUnassigned -
                  otherPreAssigned -
                  (pairing.students_secondary || 0)
                );
              }}
            />
          ))}
        </div>

        <div className="flex gap-2 mt-6">
          <Button
            variant="outline"
            onClick={onBack}
            className="flex-1"
            disabled={isSaving}
          >
            Back
          </Button>
          <Button
            onClick={onSave}
            className="flex-1"
            disabled={isSaving || exceedsMaximum}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Assignment"
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default StudentPairingStep;
