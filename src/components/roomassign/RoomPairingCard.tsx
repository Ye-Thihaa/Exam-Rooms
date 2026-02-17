import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  RoomPairing,
  StudentGroup,
} from "../../pages/exam-officer/RoomAssignment";
import { AlertCircle } from "lucide-react";
import StudentGroupSelector from "./Studentgroupselector";

interface RoomPairingCardProps {
  pairing: RoomPairing;
  availableOptions: {
    yearLevels: string[];
    semesters: string[];
    programs: string[];
    specializations: string[];
  };
  onUpdate: (id: string, field: keyof RoomPairing, value: any) => void;

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

  // ✅ NEW: real-time remaining count callbacks
  getPrimaryRemaining: () => number | null;
  getSecondaryRemaining: () => number | null;
}

// ✅ Helper badge: shows "X left", "Fully assigned", or "X over limit"
const RemainingBadge: React.FC<{ remaining: number | null }> = ({
  remaining,
}) => {
  if (remaining === null) return null;

  const colorClass =
    remaining < 0
      ? "bg-red-100 text-red-700 border-red-300"
      : remaining === 0
        ? "bg-green-100 text-green-700 border-green-300"
        : "bg-orange-100 text-orange-700 border-orange-300";

  const label =
    remaining < 0
      ? `${Math.abs(remaining)} over limit`
      : remaining === 0
        ? "Fully pre-assigned"
        : `${remaining} left`;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}
    >
      {label}
    </span>
  );
};

const RoomPairingCard: React.FC<RoomPairingCardProps> = ({
  pairing,
  availableOptions,
  onUpdate,
  getAvailableSemestersForYear,
  getAvailableProgramsForYear,
  getAvailableSpecializationsForYear,
  getDefaultGroupValues,
  getPrimaryRemaining,
  getSecondaryRemaining,
}) => {
  const totalStudents = pairing.students_primary + pairing.students_secondary;
  const exceedsCapacity = totalStudents > 36;

  // ✅ Compute remaining counts once per render
  const primaryRemaining = getPrimaryRemaining();
  const secondaryRemaining = getSecondaryRemaining();

  const isDuplicateGroup =
    pairing.group_primary.year_level &&
    pairing.group_secondary.year_level &&
    pairing.group_primary.year_level === pairing.group_secondary.year_level &&
    pairing.group_primary.sem === pairing.group_secondary.sem &&
    pairing.group_primary.program === pairing.group_secondary.program &&
    pairing.group_primary.specialization ===
      pairing.group_secondary.specialization &&
    pairing.group_primary.program !== "";

  const handleYearChange = (
    groupType: "group_primary" | "group_secondary",
    yearLevel: string,
  ) => {
    const defaults = getDefaultGroupValues(yearLevel);
    onUpdate(pairing.id, groupType, {
      year_level: yearLevel,
      ...defaults,
    });
  };

  const handleFieldChange = (
    groupType: "group_primary" | "group_secondary",
    field: keyof StudentGroup,
    value: string,
  ) => {
    const currentGroup =
      groupType === "group_primary"
        ? pairing.group_primary
        : pairing.group_secondary;

    const nextGroup: StudentGroup = {
      ...currentGroup,
      [field]: value,
    } as StudentGroup;

    if (field === "program") {
      if (nextGroup.year_level === "1" || nextGroup.year_level === "2") {
        nextGroup.specialization = "CST";
      } else if (nextGroup.year_level === "3") {
        nextGroup.specialization = value;
      } else if (nextGroup.year_level === "4") {
        nextGroup.specialization = "";
      }
    }

    onUpdate(pairing.id, groupType, nextGroup);
  };

  const handleStudentCountChange = (
    groupType: "students_primary" | "students_secondary",
    value: number,
  ) => {
    onUpdate(pairing.id, groupType, value);
  };

  return (
    <Card className="p-4 border-2">
      <div className="space-y-4">
        {/* Room Info */}
        <div className="flex items-center justify-between pb-3 border-b">
          <div>
            <div className="font-semibold text-lg">
              {pairing.room.room_number}
            </div>
            <div className="text-sm text-muted-foreground">
              Capacity: {pairing.room.capacity} ({pairing.room.rows}×
              {pairing.room.cols})
            </div>
          </div>
          <Badge variant={exceedsCapacity ? "destructive" : "default"}>
            {totalStudents} / 36
          </Badge>
        </div>

        {/* ✅ Primary Group — label row with live remaining badge */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">
              Primary Group
            </span>
            <RemainingBadge remaining={primaryRemaining} />
          </div>
          <StudentGroupSelector
            label=""
            group={pairing.group_primary}
            availableYearLevels={availableOptions.yearLevels}
            availableSemesters={getAvailableSemestersForYear(
              pairing.group_primary.year_level,
              availableOptions.semesters,
            )}
            availablePrograms={getAvailableProgramsForYear(
              pairing.group_primary.year_level,
              availableOptions.programs,
            )}
            availableSpecializations={getAvailableSpecializationsForYear(
              pairing.group_primary.year_level,
              pairing.group_primary.program,
            )}
            onYearChange={(value) => handleYearChange("group_primary", value)}
            onSemesterChange={(value) =>
              handleFieldChange("group_primary", "sem", value)
            }
            onProgramChange={(value) =>
              handleFieldChange("group_primary", "program", value)
            }
            onSpecializationChange={(value) =>
              handleFieldChange("group_primary", "specialization", value)
            }
            studentCount={pairing.students_primary}
            onStudentCountChange={(value) =>
              handleStudentCountChange("students_primary", value)
            }
          />
        </div>

        {/* ✅ Secondary Group — label row with live remaining badge */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">
              Secondary Group
            </span>
            <RemainingBadge remaining={secondaryRemaining} />
          </div>
          <StudentGroupSelector
            label=""
            group={pairing.group_secondary}
            availableYearLevels={availableOptions.yearLevels}
            availableSemesters={getAvailableSemestersForYear(
              pairing.group_secondary.year_level,
              availableOptions.semesters,
            )}
            availablePrograms={getAvailableProgramsForYear(
              pairing.group_secondary.year_level,
              availableOptions.programs,
            )}
            availableSpecializations={getAvailableSpecializationsForYear(
              pairing.group_secondary.year_level,
              pairing.group_secondary.program,
            )}
            onYearChange={(value) => handleYearChange("group_secondary", value)}
            onSemesterChange={(value) =>
              handleFieldChange("group_secondary", "sem", value)
            }
            onProgramChange={(value) =>
              handleFieldChange("group_secondary", "program", value)
            }
            onSpecializationChange={(value) =>
              handleFieldChange("group_secondary", "specialization", value)
            }
            studentCount={pairing.students_secondary}
            onStudentCountChange={(value) =>
              handleStudentCountChange("students_secondary", value)
            }
            disabledProgram={
              pairing.group_primary.year_level ===
                pairing.group_secondary.year_level &&
              pairing.group_primary.sem === pairing.group_secondary.sem
                ? pairing.group_primary.program
                : undefined
            }
          />
        </div>

        {/* Warnings */}
        {exceedsCapacity && (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>Exceeds room capacity!</span>
          </div>
        )}

        {isDuplicateGroup && (
          <div className="flex items-center gap-2 text-amber-600 text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>Warning: Same student group assigned twice!</span>
          </div>
        )}
      </div>
    </Card>
  );
};

export default RoomPairingCard;
