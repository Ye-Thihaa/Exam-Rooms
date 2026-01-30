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
  getDefaultGroupValues: (
    yearLevel: string,
  ) => Pick<StudentGroup, "sem" | "program">;
}

const RoomPairingCard: React.FC<RoomPairingCardProps> = ({
  pairing,
  availableOptions,
  onUpdate,
  getAvailableSemestersForYear,
  getAvailableProgramsForYear,
  getDefaultGroupValues,
}) => {
  const totalStudents = pairing.students_primary + pairing.students_secondary;
  const exceedsCapacity = totalStudents > 36;

  const isDuplicateGroup =
    pairing.group_primary.year_level &&
    pairing.group_secondary.year_level &&
    pairing.group_primary.year_level === pairing.group_secondary.year_level &&
    pairing.group_primary.sem === pairing.group_secondary.sem &&
    pairing.group_primary.program === pairing.group_secondary.program &&
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

    onUpdate(pairing.id, groupType, {
      ...currentGroup,
      [field]: value,
    });
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

        {/* Primary Group */}
        <StudentGroupSelector
          label="Primary Group"
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
          onYearChange={(value) => handleYearChange("group_primary", value)}
          onSemesterChange={(value) =>
            handleFieldChange("group_primary", "sem", value)
          }
          onProgramChange={(value) =>
            handleFieldChange("group_primary", "program", value)
          }
          studentCount={pairing.students_primary}
        />

        {/* Secondary Group */}
        <StudentGroupSelector
          label="Secondary Group"
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
          onYearChange={(value) => handleYearChange("group_secondary", value)}
          onSemesterChange={(value) =>
            handleFieldChange("group_secondary", "sem", value)
          }
          onProgramChange={(value) =>
            handleFieldChange("group_secondary", "program", value)
          }
          studentCount={pairing.students_secondary}
          disabledProgram={
            pairing.group_primary.year_level ===
              pairing.group_secondary.year_level &&
            pairing.group_primary.sem === pairing.group_secondary.sem
              ? pairing.group_primary.program
              : undefined
          }
        />

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
