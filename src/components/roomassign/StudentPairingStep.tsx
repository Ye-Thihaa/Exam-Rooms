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

  getAvailableSemestersForYear: (
    yearLevel: string,
    allSemesters: string[],
  ) => string[];

  getAvailableProgramsForYear: (
    yearLevel: string,
    allPrograms: string[],
  ) => string[];

  getAvailableSpecializationsForYear: (yearLevel: string) => string[];

  getDefaultGroupValues: (
    yearLevel: string,
  ) => Pick<StudentGroup, "sem" | "program" | "specialization">;
}

const StudentPairingStep: React.FC<StudentPairingStepProps> = ({
  roomPairings,
  availableOptions,
  onUpdatePairing,
  onBack,
  onSave,
  isSaving,
  getAvailableSemestersForYear,
  getAvailableProgramsForYear,
  getAvailableSpecializationsForYear,
  getDefaultGroupValues,
}) => {
  // Calculate total students across all pairings
  const totalStudents = roomPairings.reduce(
    (sum, pairing) =>
      sum + (pairing.students_primary || 0) + (pairing.students_secondary || 0),
    0,
  );

  // Check if total exceeds maximum
  const exceedsMaximum = totalStudents > 36;

  return (
    <div className="space-y-6">
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
              {totalStudents}/36 students total
            </Badge>
          </div>
        </div>

        {exceedsMaximum && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">
              ⚠️ Total student count ({totalStudents}) exceeds the maximum limit
              of 36. Please reduce the number of students.
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
